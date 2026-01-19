
// src/hooks/useRoleRedirect.tsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "@/integrations/firebase/client";
import { db } from "@/integrations/firebase/client";

type Role = "superadmin" | "admin" | "agent" | "customer";

interface Options {
  allowedRoles?: Role[];
  fallback?: string;
}

export function useRoleRedirect(options: Options = {}) {
  const { allowedRoles, fallback = "/home" } = options;
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null);
        setLoading(false);
        navigate("/login", { replace: true, state: { from: location } });
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const r = snap.exists() ? (snap.data().role as Role) : null;
        setRole(r);
        setLoading(false);

        const path = location.pathname;
        if (path === "/" || path === "/login") {
          if (r === "superadmin" || r === "admin") navigate("/admin", { replace: true });
          else if (r === "agent") navigate("/agent", { replace: true });
          else navigate("/home", { replace: true });
        }

        if (allowedRoles && r && !allowedRoles.includes(r)) {
          navigate(fallback, { replace: true });
        }
      } catch (e) {
        console.error("Failed to fetch role:", e);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [navigate, location, allowedRoles, fallback]);

  return { role, loading };
}
