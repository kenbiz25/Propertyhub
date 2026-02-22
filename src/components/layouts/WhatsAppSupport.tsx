import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { auth, db } from "@/lib/firebaseClient";
import { doc, getDoc } from "firebase/firestore";

const WHATSAPP_NUMBER = "254705091683";

export default function WhatsAppSupport() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        if (alive) setVisible(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? (snap.data()?.role as string) : "customer";
        if (alive) setVisible(role === "agent");
      } catch {
        if (alive) setVisible(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!visible) return null;

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with support on WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:bg-green-600"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
