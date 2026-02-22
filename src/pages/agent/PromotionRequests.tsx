
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebaseClient";
import { collection, documentId, getDocs, orderBy, query, where } from "firebase/firestore";

type Row = {
  id: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: any;
  property_id?: string | null;
  property_title?: string | null;
  property?: { id: string; title: string } | null;
};

export default function PromotionRequests() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const q = query(
        collection(db, "promotion_requests"),
        where("agent_id", "==", uid),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Row[];

      const ids = items
        .map((r) => r.property_id)
        .filter(Boolean) as string[];

      if (ids.length) {
        const propsQ = query(collection(db, "properties"), where(documentId(), "in", ids.slice(0, 10)));
        const propsSnap = await getDocs(propsQ);
        const map = new Map(propsSnap.docs.map((d) => [d.id, d.data()]));

        const enriched = items.map((r) => ({
          ...r,
          property: r.property_title
            ? { id: r.property_id ?? "", title: r.property_title }
            : r.property_id
            ? { id: r.property_id, title: (map.get(r.property_id) as any)?.title ?? r.property_id }
            : null,
        }));
        setRows(enriched);
      } else {
        setRows(items);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <h1 className="font-display text-2xl font-bold mb-6">My Promotion Requests</h1>
        <div className="space-y-3">
          {rows.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-muted-foreground">
              No promotion requests yet.
            </div>
          ) : rows.map((r) => (
            <div key={r.id} className="glass-card rounded-2xl p-6 flex items-center justify-between">
              <div>
                <div className="font-display">{r.property?.title ?? r.property?.id ?? "Property"}</div>
                <div className="text-sm text-muted-foreground">
                  Requested: {r.created_at?.toDate?.()?.toLocaleString("en-KE") ?? ""}
                </div>
                {r.notes && <div className="text-sm mt-1">Note: {r.notes}</div>}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs ${
                r.status === "approved" ? "bg-green-600 text-white"
                : r.status === "rejected" ? "bg-destructive text-destructive-foreground"
                : "bg-gray-600 text-white"
              }`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Button asChild variant="outline">
            <Link to="/agent">Back to Dashboard</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
