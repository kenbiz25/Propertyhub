
// src/pages/auth/PostLoginRouter.tsx
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, setDoc } from "firebase/firestore";

/** Pages to never return to */
const SAFE_BLOCKLIST = new Set(["/auth", "/oauth/callback", "/post-login"]);

/** Final destinations per role (UPDATED: agent → /agent) */
const DEFAULT_DEST = {
  customer: "/customer",
  agent: "/agent",      // ✅ updated to match your router structure
  admin: "/admin",
  superadmin: "/admin",
};

function normalizePath(path: string | null): string | null {
  if (!path) return null;
  try {
    if (path.startsWith("http")) {
      const u = new URL(path);
      return u.pathname;
    }
    const qIdx = path.indexOf("?");
    const clean = qIdx >= 0 ? path.slice(0, qIdx) : path;
    return clean.startsWith("/") ? clean : `/${clean}`;
  } catch {
    return null;
  }
}

export default function PostLoginRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  const fromState = (location.state as any)?.from?.pathname ?? null;
  const fromStorage =
    typeof window !== "undefined" ? localStorage.getItem("hh_return_to") : null;

  const returnTo = useMemo(
    () => normalizePath(fromState || fromStorage || null),
    [fromState, fromStorage]
  );

  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }

      // Ensure Firestore user doc exists / read role
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      let role: "customer" | "agent" | "admin" | "superadmin" = "customer";

      if (!snap.exists()) {
        await setDoc(ref, {
          email: user.email,
          role: "customer",
          created_at: new Date().toISOString(),
          kyc_verified: false,
          subscription_active: false,
        });
      } else {
        role = (snap.data()?.role ?? "customer") as typeof role;
      }

      // Cache role for DashboardLayout to consume without flicker
      try {
        localStorage.setItem("hh_role", role);
      } catch {}

      // Respect "return to" if set and safe
      if (returnTo && !SAFE_BLOCKLIST.has(returnTo)) {
        try {
          localStorage.removeItem("hh_return_to");
        } catch {}
        navigate(returnTo, { replace: true });
        return;
      }

      // Final role-based redirects
      if (role === "agent") {
        navigate(DEFAULT_DEST.agent, { replace: true });
        return;
      }
      if (role === "admin" || role === "superadmin") {
        navigate(DEFAULT_DEST.admin, { replace: true });
        return;
      }

      // Default: customer
      navigate(DEFAULT_DEST.customer, { replace: true });
    })();
  }, [navigate, returnTo]);

  return (
    <div className="p-6 text-sm text-muted-foreground">
      Finalizing sign‑in… Redirecting…
    </div>
  );
}
