
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id,plan,status,current_period_end,stripe_customer_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error) setSub(data ?? null);
    })();
  }, []);

  const manageBilling = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Edge Function to create portal session
      const endpoint = `${import.meta.env.VITE_EDGE_BASE_URL}/create-portal-session`;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (!resp.ok) throw new Error("Failed to start portal session");
      const { url } = await resp.json();
      window.location.href = url;
    } catch (e: any) {
      alert(e?.message ?? "Could not open billing portal.");
    } finally {
      setLoading(false);
    }
  };

  const nextRenewal = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("en-KE")
    : "—";

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
