import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";

const WHATSAPP_NUMBER = "254705091683";

export default function WhatsAppSupport() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { if (alive) setVisible(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? (snap.data()?.role as string) : "customer";
        if (alive) setVisible(role === "agent");
      } catch {
        if (alive) setVisible(false);
      }
    });
    return () => { alive = false; unsub(); };
  }, []);

  if (!visible) return null;

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20need%20support`}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp Support"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-green-600"
    >
      WhatsApp Support
    </a>
  );
}
