
// src/pages/agent/DashboardSettings.tsx
import { useEffect, useRef, useState } from "react";
import { User, Mail, Phone, MapPin, Building2, Save } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function DashboardSettings() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    bio: "",
    location: "",
    avatar_url: "",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    inquiries: true,
    reviews: true,
    marketing: false,
  });

  // ✅ Load profile from Firestore
  useEffect(() => {
    const loadProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile((prev) => ({
          ...prev,
          fullName: data.full_name ?? "",
          email: user.email ?? "",
          phone: data.phone ?? "",
          company: data.company ?? "",
          bio: data.bio ?? "",
          location: data.location ?? "",
          avatar_url: data.avatar_url ?? "",
        }));
        setNotifications((prev) => ({
          ...prev,
          ...data.notifications,
        }));
      }
    };
    loadProfile();
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return toast.error("You must be logged in.");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        full_name: profile.fullName,
        phone: profile.phone,
        company: profile.company,
        bio: profile.bio,
        location: profile.location,
        avatar_url: profile.avatar_url,
      });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update profile.");
    }
  };

  const handleSaveNotifications = async () => {
    const user = auth.currentUser;
    if (!user) return toast.error("You must be logged in.");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        notifications,
      });
      toast.success("Notification preferences saved!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save preferences.");
    }
  };

  return (
    <div>
      <DashboardHeader
        title="Settings"
        description="Manage your account settings and preferences."
      />

      <div className="space-y-8 max-w-3xl">
        {/* Profile Settings */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold mb-6">Profile Information</h2>
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 object-cover" />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  Change Photo
                </Button>
                <p className="text-sm text-muted-foreground mt-2">JPG, PNG or GIF. Max size 2MB.</p>
                {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField icon={<User />} id="fullName" name="fullName" value={profile.fullName} onChange={handleProfileChange} label="Full Name" />
              <InputField icon={<Mail />} id="email" name="email" value={profile.email} label="Email" disabled />
              <InputField icon={<Phone />} id="phone" name="phone" value={profile.phone} onChange={handleProfileChange} label="Phone" />
              <InputField icon={<Building2 />} id="company" name="company" value={profile.company} onChange={handleProfileChange} label="Company / Agency" />
              <InputField icon={<MapPin />} id="location" name="location" value={profile.location} onChange={handleProfileChange} label="Location" />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" value={profile.bio} onChange={handleProfileChange} className="mt-2" rows={4} />
            </div>

            <Button onClick={handleSaveProfile}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-display text-xl font-bold mb-6">Notification Preferences</h2>
          <div className="space-y-6">
            {Object.entries(notifications).map(([key, value]) => (
              <PrefRow
                key={key}
                title={key.charAt(0).toUpperCase() + key.slice(1)}
                desc={`Manage ${key} notifications`}
                checked={value}
                onChange={(checked) => setNotifications((prev) => ({ ...prev, [key]: checked }))}
              />
            ))}
            <Button onClick={handleSaveNotifications}>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card rounded-xl p-6 border-destructive/50">
          <h2 className="font-display text-xl font-bold mb-2 text-destructive">Danger Zone</h2>
          <p className="text-muted-foreground mb-4">Once you delete your account, there is no going back.</p>
          <Button variant="destructive">Delete Account</Button>
        </div>
      </div>
    </div>
  );
}

function InputField({ icon, id, name, value, onChange, label, disabled = false }: any) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-2">
        {icon}
        <Input id={id} name={name} value={value} onChange={onChange} className="pl-10" disabled={disabled} />
      </div>
    </div>
  );
}

function PrefRow({ title, desc, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-mutedesc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
