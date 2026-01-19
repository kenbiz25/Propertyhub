
// src/pages/OAuthCallback.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebaseClient";
import { getRedirectResult, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // Try to resolve the provider redirect result.
        // If the user signed in via popup, this will be null, and we just check auth.currentUser.
        const redirectResult = await getRedirectResult(auth);

        // If redirectResult exists, you can access result.user and result.providerId.
        // Not strictly needed if you rely on auth.currentUser for the session.
        if (redirectResult?.user) {
          // Optionally: do any provider-specific post-processing here
          // e.g., persist profile fields to Firestore.
        }

        // Verify we have a session (signed-in user).
        const user = auth.currentUser;
        if (!user) {
          // No user found → go back to the auth page and show a message
          navigate("/auth?error=session_missing", { replace: true });
          return;
        }

        // Optional: read custom claims to keep your role-based routing consistent
        // Assumes you set a `role` claim ('customer' | 'agent' | 'admin' | 'superadmin') via Cloud Functions or Admin SDK
        try {
          const idTokenResult = await user.getIdTokenResult(true);
          const role = (idTokenResult.claims.role as string) || "customer";

          // If you want to branch here, you can—but you already have a centralized post-login router.
          // Example branching:
          // if (role === "agent") navigate("/agent/dashboard", { replace: true });
          // else if (role === "admin") navigate("/admin", { replace: true });
          // else navigate("/dashboard", { replace: true });
        } catch {
          // If claims aren’t available yet, continue to post-login where you can fetch role/profile
        }

        // ✅ Centralized role-based redirect (honors return-to + onboarding gates)
        navigate("/post-login", { replace: true });
      } catch (e: any) {
        // Handle common Firebase Auth errors cleanly
        // Examples: auth/account-exists-with-different-credential, auth/operation-not-allowed, auth/invalid-credential
        console.error("OAuth callback exception:", e);
        const code = e?.code || "oauth_exception";
        navigate(`/auth?error=${encodeURIComponent(code)}`, { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Finishing sign‑in…</p>
    </div>
  );
}
