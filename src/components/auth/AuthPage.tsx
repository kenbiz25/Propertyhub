
// src/components/auth/AuthPage.tsx
import { useEffect, useRef, useState, startTransition } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { ensureUserDocument } from "@/lib/userService";

const provider = new GoogleAuthProvider();
// Choose account each time (remove for silent reuse)
provider.setCustomParameters({ prompt: "select_account" });

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Prevent multiple concurrent popups
  const signingInRef = useRef(false);

  useEffect(() => {
    // Persist session across reloads
    setPersistence(auth, browserLocalPersistence).catch((e) => {
      console.warn("Failed to set auth persistence:", e);
    });
  }, []);

  function friendlyError(err: unknown): string {
    const code = (err as AuthError)?.code;
    switch (code) {
      case "auth/popup-closed-by-user":
        return "Sign-in popup closed before completing. Please try again.";
      case "auth/cancelled-popup-request":
        return "Another sign-in attempt is already in progress.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/unauthorized-domain":
        return "Unauthorized domain for Firebase auth. Add this domain in Firebase Console → Auth → Settings.";
      case "auth/operation-not-allowed":
        return "Google sign-in is disabled. Enable it in Firebase Console → Auth → Sign-in methods.";
      default:
        return "Failed to sign in. Please try again.";
    }
  }

  async function handleGoogle() {
    if (signingInRef.current) return; // guard
    signingInRef.current = true;
    setLoading(true);
    setErrorMsg(null);

    try {
      await signInWithPopup(auth, provider);
      await ensureUserDocument();

      const from = (location.state as any)?.from?.pathname ?? "/";
      startTransition(() => {
        navigate(from, { replace: true });
      });
    } catch (e) {
      console.error("Google sign-in failed:", e);
      setErrorMsg(friendlyError(e));
    } finally {
      setLoading(false);
      signingInRef.current = false;
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Continue to access your dashboard while browsing properties.
        </p>

        {errorMsg && (
          <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 text-left">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Connecting…" : "Continue with Google"}
        </button>

        <p className="mt-3 text-xs text-muted-foreground">
          You’ll return to the page you were viewing after sign-in.
        </p>
      </div>
    </div>
  );
}
