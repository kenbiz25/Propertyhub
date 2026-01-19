
// src/components/auth/RequireAuth.tsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth } from "@/lib/firebaseClient";

type AuthState = { status: "loading" | "in" | "out" };

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    setAuthState({ status: auth.currentUser ? "in" : "out" });

    const unsub = auth.onAuthStateChanged((user) => {
      if (!mounted) return;
      setAuthState({ status: user ? "in" : "out" });
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  if (authState.status === "loading") {
    return <div className="p-6 text-sm text-muted-foreground">Checking session…</div>;
  }

  if (authState.status === "out") {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
