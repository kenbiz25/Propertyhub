
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
  property: { id: string; title: string } | null;
};

export default function PromotionRequests() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("promotion_requests")
        .select("id,status,notes,created_at,property:properties(id,title)")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setRows((data ?? []) as Row[]);
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
                  Requested: {new Date(r.created_at).toLocaleString("en-KE")}
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
            <a href="/agent/dashboard">Back to Dashboard</a>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
