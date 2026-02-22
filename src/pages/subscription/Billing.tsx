
import { useEffect, useState } from "react";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebaseClient";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

type SubRow = {
  id: string;
  plan: "basic" | "agent" | "premium";
  status: "active" | "past_due" | "canceled";
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

export default function Billing() {
  const [sub, setSub] = useState<SubRow | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const q = query(
        collection(db, "subscriptions"),
        where("user_id", "==", uid),
        orderBy("created_at", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      const row = snap.docs[0]?.data() as SubRow | undefined;
      setSub(row ?? null);
    })();
  }, []);

  const manageBilling = async () => {
    if (loading) return;
    setLoading(true);
    try {
      navigate("/subscription/portal");
    } catch (e: any) {
      alert(e?.message ?? "Could not open billing portal.");
    } finally {
      setLoading(false);
    }
  };

  const endDate = (sub as any)?.current_period_end?.toDate?.() ?? sub?.current_period_end;
  const nextRenewal = endDate ? new Date(endDate).toLocaleDateString("en-KE") : "—";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto glass-card rounded-2xl p-6">
          <h1 className="font-display text-2xl font-bold mb-4">Billing</h1>
          <p className="text-muted-foreground mb-6">
            Manage your subscription, payment method, and invoices via Stripe.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="font-medium capitalize">{sub?.plan ?? "basic"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{sub?.status ?? "none"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Next renewal</span>
              <span className="font-medium">{nextRenewal}</span>
            </div>
          </div>

          <Button className="mt-6 w-full" onClick={manageBilling} disabled={loading}>
            {loading ? "Opening…" : "Manage Billing"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
