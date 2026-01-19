
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";
import { Link } from "react-router-dom";

export default function AccountInquiries() {
  const u = auth.currentUser;
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!u) return;
    const q = fsQuery(collection(db, "user_inquiries", u.uid, "properties"), orderBy("created_at", "desc"));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [u?.uid]);
  if (!u) return <div className="p-6">Please sign in to view your inquiries.</div>;
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-muted-foreground">You haven’t contacted any agents yet.</div>
      ) : items.map((i) => (
        <Link key={i.id} to={`/listing/${i.property_id}`} className="block glass-card rounded-2xl p-4 hover:bg-card">
          <div className="text-sm text-muted-foreground">{new Date(i.created_at?.toDate?.() || Date.now()).toLocaleString()}</div>
          <div className="font-medium mt-1">{i.message}</div>
        </Link>
      ))}
    </div>
  );
}
