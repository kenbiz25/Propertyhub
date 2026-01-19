
// src/lib/userService.ts
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export type AppRole = "customer" | "agent" | "admin" | "superadmin";

export async function ensureUserDocument() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    email: user.email ?? null,
    name: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    role: "customer" as AppRole,         // default role
    kyc_verified: false,
    subscription_active: false,
    features: { promotions: true },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}