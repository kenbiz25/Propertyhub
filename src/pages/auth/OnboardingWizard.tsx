
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function OnboardingWizard() {
  const { data } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) throw new Error("Profile missing");
      return snap.data();
    },
  });

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");

  const saveProfile = useMutation({
    mutationFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");
      await updateDoc(doc(db, "users", user.uid), { full_name: fullName });
    },
    onSuccess: () => setStep(2),
  });

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Welcome</h1>
      {step === 1 && (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm">Full name</span>
            <input
              className="mt-1 w-full border rounded p-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => saveProfile.mutate()}
          >
            Continue
          </button>
        </div>
      )}
      {step === 2 && data?.role === "agent" && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            To unlock agent features, please subscribe.
          </p>
          <a
            className="mt-2 inline-block px-4 py-2 bg-green-600 text-white rounded"
            href="/subscription/billing"
          >
            Subscribe
          </a>
        </div>
      )}
      {step === 2 && data?.role !== "agent" && (
        <div className="mt-4">
          <a
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded"
            href="/post-login"
          >
            Finish
          </a>
        </div>
      )}
    </div>
  );
}

export default OnboardingWizard;
