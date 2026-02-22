
// src/pages/agent/AgentKyc.tsx
import React, { useEffect, useMemo, useState } from "react";
import { withRoleGuard } from "../../components/auth/withRoleGuard";
import { auth, db, storage } from "@/lib/firebaseClient";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type DocKey =
  | "national_id"
  | "kra_pin"
  | "business_registration"
  | "professional_license"
  | "proof_of_address";

const REQUIRED_DOCS: { key: DocKey; label: string; hint: string }[] = [
  { key: "national_id", label: "National ID or Passport", hint: "Clear photo/scan" },
  { key: "kra_pin", label: "KRA PIN Certificate", hint: "PDF or image" },
  { key: "business_registration", label: "Business Registration", hint: "If applicable" },
  { key: "professional_license", label: "Professional License", hint: "E.g. real estate license" },
  { key: "proof_of_address", label: "Proof of Address", hint: "Utility bill or bank statement" },
];

function AgentKyc() {
  const [files, setFiles] = useState<Partial<Record<DocKey, File>>>({});
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
    })();
  }, []);

  const missingDocs = useMemo(() => {
    return REQUIRED_DOCS.filter((d) => !files[d.key]);
  }, [files]);

  const handleFileChange = (key: DocKey, file?: File | null) => {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const uploadAll = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Please sign in to continue.");
      return;
    }

    if (missingDocs.length > 0) {
      toast.error("Please upload all required documents.");
      return;
    }

    setLoading(true);
    try {
      const uploaded: Record<string, { url: string; name: string; type: string }> = {};

      for (const docDef of REQUIRED_DOCS) {
        const file = files[docDef.key];
        if (!file) continue;
        const ext = file.name.split(".").pop() || "bin";
        const storageRef = ref(storage, `kyc/${user.uid}/${docDef.key}.${ext}`);
        await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
        const url = await getDownloadURL(storageRef);
        uploaded[docDef.key] = { url, name: file.name, type: file.type };
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          kyc_documents: uploaded,
          kyc_submitted: true,
          kyc_verified: false,
          kyc_submitted_at: serverTimestamp(),
        },
        { merge: true }
      );

      setProfile((p: any) => ({
        ...(p || {}),
        kyc_documents: uploaded,
        kyc_submitted: true,
        kyc_verified: false,
      }));
      toast.success("Documents uploaded. Awaiting admin approval.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload documents.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Agent Verification (KYC)</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload the required documents to verify your agency and unlock trust badges.
      </p>

      {profile?.kyc_verified ? (
        <div className="mt-4 rounded-lg border border-green-600/40 bg-green-600/10 px-4 py-3 text-sm text-green-300">
          Verified — your badge is active on your public profile.
        </div>
      ) : profile?.kyc_submitted ? (
        <div className="mt-4 rounded-lg border border-amber-600/40 bg-amber-600/10 px-4 py-3 text-sm text-amber-300">
          Submitted — awaiting admin approval.
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {REQUIRED_DOCS.map((docDef) => (
          <div key={docDef.key} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-medium">{docDef.label}</div>
                <div className="text-xs text-muted-foreground">{docDef.hint}</div>
              </div>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(docDef.key, e.target.files?.[0])}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={uploadAll} disabled={loading}>
          {loading ? "Uploading…" : "Submit for Verification"}
        </Button>
        {missingDocs.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {missingDocs.length} document(s) missing
          </span>
        )}
      </div>
    </div>
  );
}

export default withRoleGuard(AgentKyc, ["agent", "admin", "superadmin"]);
