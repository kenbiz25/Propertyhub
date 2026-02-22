
// src/pages/CustomerProfile.tsx

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { withRoleGuard } from "@/components/auth/withRoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type Profile = {
  id: string;
  full_name?: string;
  phone?: string;
  company?: string;
  location?: string;
  bio?: string;
  avatar_url?: string;
  socials?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
    tiktok?: string;
  };
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
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tiktok, setTiktok] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setCompany(profile.company ?? "");
      setLocation(profile.location ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setFacebook(profile.socials?.facebook ?? "");
      setInstagram(profile.socials?.instagram ?? "");
      setTwitter(profile.socials?.twitter ?? "");
      setWhatsapp(profile.socials?.whatsapp ?? "");
      setTiktok(profile.socials?.tiktok ?? "");
    }
  }, [profile]);

  // --- UPDATE MUTATION ---
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in.");
      const ref = doc(db, "users", user.uid);
      const base = {
        full_name: fullName,
        phone,
      };

      if (profile?.role === "agent") {
        await updateDoc(ref, {
          ...base,
          company,
          location,
          bio,
          avatar_url: avatarUrl,
          socials: {
            facebook,
            instagram,
            twitter,
            whatsapp,
            tiktok,
          },
        });
      } else {
        await updateDoc(ref, base);
      }
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
          <Label className="block text-sm font-medium mb-1">Full Name</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={updateMutation.isLoading}
          />
        </div>

        {/* Phone */}
        <div>
          <Label className="block text-sm font-medium mb-1">Phone Number</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={updateMutation.isLoading}
          />
        </div>

        {profile?.role === "agent" && (
          <>
            <div>
              <Label className="block text-sm font-medium mb-1">Company</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={updateMutation.isLoading}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={updateMutation.isLoading}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Avatar URL</Label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                disabled={updateMutation.isLoading}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Bio</Label>
              <Textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={updateMutation.isLoading}
              />
            </div>

            <div>
              <h2 className="text-sm font-semibold">Social Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <Label className="block text-sm font-medium mb-1">Facebook</Label>
                  <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} disabled={updateMutation.isLoading} />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">Instagram</Label>
                  <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} disabled={updateMutation.isLoading} />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">Twitter</Label>
                  <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} disabled={updateMutation.isLoading} />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">WhatsApp</Label>
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={updateMutation.isLoading} />
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">TikTok</Label>
                  <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} disabled={updateMutation.isLoading} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <Button
          className="w-full"
          disabled={updateMutation.isLoading}
          onClick={() => updateMutation.mutate()}
        >
          {updateMutation.isLoading ? "Saving…" : "Save Changes"}
        </Button>

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
