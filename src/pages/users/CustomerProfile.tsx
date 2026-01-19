
// src/pages/CustomerProfile.tsx

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { withRoleGuard } from "@/components/auth/withRoleGuard";

import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type Profile = {
  id: string;
  full_name?: string;
  phone?: string;
  role?: "customer" | "agent" | "admin" | "superadmin";
};

function CustomerProfile() {
  const user = auth.currentUser;

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery<Profile, Error>({
    queryKey: ["me-profile", user?.uid],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("You must be signed in.");

      // Your app stores user data in "users/{uid}"
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        throw new Error(
          "Profile not found. Contact support or complete onboarding."
        );
      }

      return { id: snap.id, ...(snap.data() as Omit<Profile, "id">) };
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  // --- UPDATE MUTATION ---
  const updateMutation = useMutation({
    mutationFn: async (payload: { full_name: string; phone: string }) => {
      if (!user) throw new Error("Not signed in.");
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        full_name: payload.full_name,
        phone: payload.phone,
      });
    },
  });

  if (!user) {
    return <div className="text-red-600 p-6">Please sign in to continue.</div>;
  }

  if (isLoading) return <div className="p-6">Loading profile…</div>;

  if (error)
    return (
      <div className="text-red-600 p-6">
        Error loading profile: {error.message}
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-10 max-w-xl">
      <h1 className="font-display text-3xl font-semibold mb-6">My Profile</h1>

      <div className="glass-card rounded-2xl p-6 space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            className="w-full rounded-xl border border-border bg-secondary p-3 focus:ring-2 focus:ring-primary focus:outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={updateMutation.isLoading}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            className="w-full rounded-xl border border-border bg-secondary p-3 focus:ring-2 focus:ring-primary focus:outline-none"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={updateMutation.isLoading}
          />
        </div>

        {/* Save Button */}
        <button
          className="w-full px-4 py-3 text-center rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-60"
          disabled={updateMutation.isLoading}
          onClick={() => updateMutation.mutate({ full_name: fullName, phone })}
        >
          {updateMutation.isLoading ? "Saving…" : "Save Changes"}
        </button>

        {/* Feedback */}
        {updateMutation.isError && (
          <p className="text-red-600">
            {(updateMutation.error as Error)?.message}
          </p>
        )}

        {updateMutation.isSuccess && (
          <p className="text-green-600">Profile updated successfully! 🎉</p>
        )}
      </div>
    </div>
  );
}

export default withRoleGuard(CustomerProfile, [
  "customer",
  "agent",
  "admin",
  "superadmin",
]);
