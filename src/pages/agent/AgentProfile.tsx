
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { startConversation } from "@/features/messaging/api";

type Agent = { id: string; full_name: string | null; company: string | null; location: string | null; avatar_url: string | null };
type PropertyCardRow = { id: string; title: string; price: number | null; thumbnail_url: string | null; city: string | null; neighborhood: string | null };

export default function AgentProfile() {
  const { id } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [listings, setListings] = useState<PropertyCardRow[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,full_name,company,location,avatar_url")
        .eq("id", id).single();
      setAgent(prof ?? null);

      const { data: props } = await supabase
        .from("properties")
        .select("id,title,price,thumbnail_url,city,neighborhood")
        .eq("agent_id", id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(12);
      setListings((props ?? []) as PropertyCardRow[]);
    })();
  }, [id]);

  const contact = async () => {
    if (!id) return;
    const convId = await startConversation(id);
    window.location.href = "/messages"; // load conversation inside your messages page
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="glass-card rounded-2xl p-6 flex items-center gap-6 mb-8">
          <img
            src={agent?.avatar_url ?? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400"}
            alt={agent?.full_name ?? "Agent"}
            className="w-20 h-20 rounded-xl object-cover"
          />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{agent?.full_name ?? "Agent"}</h1>
            <p className="text-muted-foreground">{agent?.company ?? ""} • {agent?.location ?? ""}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={contact}>Message Agent</Button>
            <Button variant="outline" asChild><Link to="/listings">View Properties</Link></Button>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold mb-4">Listings</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {listings.map((p) => (
            <Link key={p.id} to={`/listing/${p.id}`} className="glass-card rounded-2xl overflow-hidden hover-lift">
              <img
                src={p.thumbnail_url ?? "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"}
                alt={p.title}
                className="w-full h-40 object-cover"
                loading="lazy"
              />
              <div className="p-4">
                <div className="font-display font-semibold">{p.title}</div>
                <div className="text-sm text-muted-foreground">
                  {[p.neighborhood, p.city].filter(Boolean).join(", ")}
                </div>
                <div className="font-display text-primary mt-2">
                  {p.price == null ? "KES —" : `KES ${Number(p.price).toLocaleString("en-KE")}`}
                </div>
              </div>
            </Link>
          ))}
          {listings.length === 0 && (
            <div className="text-muted-foreground">No listings yet.</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
