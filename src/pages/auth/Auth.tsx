
// src/pages/Auth.tsx
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ⬇️ Firebase imports
import { auth, db } from "@/lib/firebaseClient";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// Minimal country list (expand as needed)
const COUNTRIES = [
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Burundi",
  "Ethiopia",
  "Ghana",
  "Nigeria",
  "South Africa",
  "Other",
];

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    country: "Kenya",
  });

  const navigate = useNavigate();
  const location = useLocation();

  // If a protected route bounced the user here, PostLoginRouter will use it; otherwise it will choose role-based landing.
  const from = (location.state as { from?: Location })?.from?.pathname || null;

  // ✅ Preserve "return‑to" across OAuth round‑trip
  useEffect(() => {
    if (from && from !== "/auth") {
      localStorage.setItem("hh_return_to", from);
    } else {
      localStorage.removeItem("hh_return_to");
    }
  }, [from]);

  // Optional: expose errors carried via query params (if you add any in your OAuth callback flows)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get("error");
    if (err) {
      toast.error("Authentication error: " + err);
    }
  }, [location.search]);

  // ✅ Forgot password handler (Firebase)
  const sendResetEmail = async () => {
    if (!formData.email) {
      toast.info("Enter your email first");
      return;
    }
    try {
      // Optionally add ActionCodeSettings to redirect back to your site:
      // const actionCodeSettings = { url: `${window.location.origin}/auth` };
      await sendPasswordResetEmail(auth, formData.email /*, actionCodeSettings */);
      toast.success("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send reset email");
    }
  };

  // ✅ Sign up ➜ create user in Firebase Auth ➜ create Firestore profile ➜ send verification
  const handleEmailSignUp = async () => {
    const { email, password, fullName, country } = formData;
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Upsert profile document keyed by uid; default role = 'customer'
    try {
      await setDoc(
        doc(db, "profiles", cred.user.uid),
        {
          full_name: fullName,
          country,
          role: "customer",
          kyc_verified: false,
          subscription_active: false,
          created_at: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e: any) {
      console.warn("profiles upsert warning:", e?.message);
    }

    // Send email verification, sign out to enforce verification before full access (optional)
    try {
      await sendEmailVerification(cred.user);
      toast.success("Account created. Check your email to verify your address.");
      // Enforce verification gate (optional):
      await signOut(auth);
    } catch {
      // Even if verification mail fails, user is created; allow manual resend later
      toast.info("Account created. If verification email didn’t arrive, try resending from Profile.");
    }
  };

  // ✅ Sign in ➜ navigate to post-login
  const handleEmailSignIn = async () => {
    const { email, password } = formData;
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // Optional: warn if email not verified
    if (!cred.user.emailVerified) {
      toast.info("Your email is not verified yet. Some features may be limited.");
    }

    toast.success("Signed in successfully");
    // Centralized role-based redirect (PostLoginRouter will read state.from and hh_return_to)
    navigate("/post-login", { replace: true, state: { from } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isSignUp) {
        await handleEmailSignUp();
        // Keep user on Auth page until verified/sign-in
      } else {
        await handleEmailSignIn();
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- OAuth: Google & GitHub ---
  // Uses signInWithPopup for simplicity. If you need full-page redirect, switch to signInWithRedirect.
  const signInWithProvider = async (providerName: "google" | "github") => {
    if (loading) return;
    setLoading(true);

    const provider =
      providerName === "google" ? new GoogleAuthProvider() : new GithubAuthProvider();

    // Optional scopes:
    // if (providerName === "github") provider.addScope("read:user");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Upsert Firestore profile on first OAuth sign-in
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          full_name: user.displayName ?? "",
          country: formData.country || "Other",
          role: "customer",
          kyc_verified: false,
          subscription_active: false,
          created_at: new Date().toISOString(),
        },
        { merge: true }
      );

      toast.success(`Signed in with ${providerName}`);
      navigate("/post-login", { replace: true, state: { from } });
    } catch (err: any) {
      toast.error(err?.message ?? `Sign in with ${providerName} failed`);
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
  };

  // (Optional) If you want to auto-redirect signed-in users away from /auth:
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If already logged in and you prefer skipping the auth page:
        // navigate("/post-login", { replace: true, state: { from } });
      }
    });
    return () => unsub();
  }, [navigate, from]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center glow-orange">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">
              House<span className="text-primary">hunter</span>
            </span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp
                ? "Start your property journey with Househunter"
                : "Sign in to access your account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      required={isSignUp}
                    />
                  </div>
                </div>

                {/* Country dropdown (for filtering later) */}
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(v) => setFormData({ ...formData, country: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={sendResetEmail}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                "Loading..."
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">or continue with</span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => signInWithProvider("google")}
              disabled={loading}
            >
              {/* Google */}
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <Button
              variant="outline"
              type="button"
              onClick={() => signInWithProvider("github")}
              disabled={loading}
            >
              {/* GitHub */}
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.387.6.111.82-.261.82-.58 0-.287-.01-1.046-.016-2.054-3.338.726-4.042-1.61-4.042-1.61-.546-1.386-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.761-1.605-2.665-.303-5.466-1.332-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.523.117-3.176 0 0 1.009-.322 3.31 1.23a11.52 11.52 0 0 1 3.016-.405c1.024.005 2.055.138 3.016.405 2.3-1.552 3.307-1.23 3.307-1.23.655 1.653.243 2.873.119 3.176.77.84 1.234 1.911 1.234 3.221 0 4.61-2.807 5.625-5.479 5.921.43.372.814 1.102.814 2.222 0 1.604-.015 2.894-.015 3.289 0 .321.218.697.826.579C20.565 21.796 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </Button>
          </div>

          {/* Toggle */}
          <p className="text-center mt-8 text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-orange-600/20" />
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200"
          alt="Beautiful home"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        {/* Overlay Content */}
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="font-display text-2xl font-bold mb-2">Find Your Dream Home</h2>
            <p className="text-muted-foreground">
              Join thousands of Kenyans who have found their perfect property through Househunter.
            </p>
            <div className="flex gap-8 mt-4 pt-4 border-t border-border">
              <div>
                <p className="font-display text-2xl font-bold text-primary">10K+</p>
                <p className="text-sm text-muted-foreground">Properties</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-primary">5K+</p>
                <p className="text-sm text-muted-foreground">Happy Users</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-primary">47</p>
                <p className="text-sm text-muted-foreground">Counties</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
