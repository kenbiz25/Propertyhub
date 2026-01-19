
// src/components/auth/withRoleGuard.tsx
import React, { ComponentType, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";

type Role = "customer" | "agent" | "admin" | "superadmin";

type GuardState = {
  loading: boolean;
  signedIn: boolean;
  allow: boolean;
  role?: Role;
  error?: string;
};

/**
 * Firebase version: Wrap a page component and allow only users whose role is in `allowedRoles`.
 * Source of truth for role:
 *   1) Firestore: users/{uid}.role  (primary, editable in admin tools)
 *   2) Custom claims: user.getIdTokenResult().claims.role (optional fallback for server-set roles)
 *
 * Redirects:
 *   - Not signed-in -> /auth
 *   - Signed-in but not allowed -> /unauthorized
 */
export function withRoleGuard<P>(
  Wrapped: ComponentType<P>,
  allowedRoles: Role[]
) {
  return function Guarded(props: P) {
    const [state, setState] = useState<GuardState>({
      loading: true,
      signedIn: false,
      allow: false,
    });

    // Stable reference to avoid re-runs unless roles change
    const roles = useMemo(() => allowedRoles, [allowedRoles]);

    useEffect(() => {
      let alive = true;

      (async () => {
        // 1) Check current user quickly
        const user = auth.currentUser;
        if (!user) {
          if (alive) setState({ loading: false, signedIn: false, allow: false });
          return;
        }

        // 2) Try Firestore first: users/{uid}.role
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          let role: Role | undefined = snap.exists()
            ? (snap.data()?.role as Role | undefined)
            : undefined;

          // 3) Optional fallback: custom claims (server-enforced)
          if (!role) {
            const token = await user.getIdTokenResult();
            const claimRole = token.claims?.role as Role | undefined;
            role = claimRole;
          }

          // 4) Default to "customer" if nothing found (you can change this)
          if (!role) role = "customer";

          const allow = roles.includes(role);
          if (alive) {
            setState({
              loading: false,
              signedIn: true,
              allow,
              role,
            });
          }
        } catch (err: any) {
          if (alive) {
            setState({
              loading: false,
              signedIn: true,
              allow: false,
              error: err?.message ?? "Failed to read role",
            });
          }
        }
      })();

      return () => {
        alive = false;
      };
    }, [roles]);

    if (state.loading) {
      return <div className="p-6">Checking permissions…</div>;
    }
    if (!state.signedIn) {
      return <Navigate to="/auth" replace />;
    }
    if (!state.allow) {
      return <Navigate to="/unauthorized" replace />;
    }
    return <Wrapped {...props} />;
  };
}
