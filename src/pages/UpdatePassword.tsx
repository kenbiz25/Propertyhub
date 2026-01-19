
// src/pages/UpdatePassword.tsx
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebaseClient"; // <-- ensure you have src/lib/firebase.ts from earlier

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You need to be signed in to update your password.");
        navigate("/auth");
        return;
      }

      // Basic client-side guard (optional)
      if (!password || password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }

      await updatePassword(user, password);

      toast.success("Password updated successfully. Please sign in again.");
      // Sign-out after password change is recommended for security.
      // It ensures the new credential flow is enforced.
      await auth.signOut();
      navigate("/auth");
    } catch (err: any) {
      // Handle recent-login requirement
      if (err?.code === "auth/requires-recent-login") {
        toast.warning("Please re-authenticate to update your password.");
        navigate("/reauth"); // implement a simple reauth page (below)
      } else {
        toast.error(err?.message || "Could not update password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Update Password</h1>

      <input
        type="password"
        className="border rounded px-3 py-2 w-full mb-4"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />

      <button
        className="btn btn-primary"
        onClick={handleUpdate}
        disabled={loading}
      >
        {loading ? "Updating..." : "Update"}
      </button>
    </div>
  );
}
