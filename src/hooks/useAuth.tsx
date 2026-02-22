
import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import {
  User as FirebaseUser,
  IdTokenResult,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebaseClient"; // <-- ensure src/lib/firebase.ts exports `auth`

interface AuthContextType {
  user: FirebaseUser | null;
  session: IdTokenResult | null; // Firebase version of "session" (contains token + custom claims)
  loading: boolean;
  emailConfirmed: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  setReturnTo: (path: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [session, setSession] = useState<IdTokenResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  // Safe localStorage helpers (SSR-aware)
  const setReturnTo = (path: string | null) => {
    if (typeof window === "undefined") return;
    try {
      if (!path) localStorage.removeItem("hh_return_to");
      else localStorage.setItem("hh_return_to", path);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    let mounted = true;

    setPersistence(auth, browserLocalPersistence).catch((e) => {
      console.warn("[useauth] setPersistence failed:", e);
    });

    // Subscribe to auth state changes FIRST to avoid races
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted) return;

      setUser(u);
      setEmailConfirmed(!!u?.emailVerified);

      if (u) {
        try {
          // Pull IdTokenResult to expose custom claims (e.g., role) to guards
          const tokenResult = await u.getIdTokenResult(true);
          setSession(tokenResult);
        } catch (e) {
          console.warn("[useauth] getIdTokenResult failed:", e);
          setSession(null);
        }
      } else {
        // Signed out
        try {
          if (typeof window !== "undefined") localStorage.removeItem("hh_return_to");
        } catch {}
        setSession(null);
      }

      setLoading(false);
    });

    // Seed initial state (in case onAuthStateChanged fires slightly later)
    (async () => {
      const curr = auth.currentUser;
      if (!mounted) return;
      setUser(curr ?? null);
      setEmailConfirmed(!!curr?.emailVerified);
      if (curr) {
        try {
          const tokenResult = await curr.getIdTokenResult(true);
          setSession(tokenResult);
        } catch {
          setSession(null);
        }
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ) => {
    try {
      // Persist current path to return after auth (optional)
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname + window.location.search;
        setReturnTo(currentPath);
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Optionally set display name
      if (fullName) {
        try {
          await updateProfile(cred.user, { displayName: fullName });
        } catch (e) {
          console.warn("[useauth] updateProfile failed:", e);
        }
      }

      // Send email verification
      try {
        const redirectUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/post-login`
            : undefined;

        await sendEmailVerification(cred.user, {
          url: redirectUrl, // requires Email Action settings (authorized domains) in Firebase console
          handleCodeInApp: true,
        });
      } catch (e) {
        console.warn("[useauth] sendEmailVerification failed:", e);
      }

      return { error: null };
    } catch (e: any) {
      return { error: e ?? null };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Persist desired return-to before sign-in (optional)
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname + window.location.search;
        setReturnTo(currentPath);
      }

      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (e: any) {
      return { error: e ?? null };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setReturnTo(null);
      return { error: null };
    } catch (e: any) {
      return { error: e ?? null };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        emailConfirmed,
        signUp,
        signIn,
        signOut,
        setReturnTo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}