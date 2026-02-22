
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebaseClient";
import { addDoc, collection, doc, documentId, getDoc, getDocs, limit, orderBy, query as fsQuery, serverTimestamp, where } from "firebase/firestore";
import { Textarea } from "@/components/ui/textarea";
import { Star, Facebook, Instagram, Twitter, Music2, MessageCircle, CheckCircle } from "lucide-react";

type SocialLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  whatsapp?: string;
  tiktok?: string;
};

type Agent = {
  id: string;
  full_name: string | null;
  company: string | null;
  location: string | null;
  avatar_url: string | null;
  socials?: SocialLinks;
  agent_code?: number;
  kyc_verified?: boolean;
  kyc_submitted?: boolean;
};
type PropertyCardRow = { id: string; title: string; price: number | null; thumbnail_url: string | null; city: string | null; neighborhood: string | null };

export default function AgentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [listings, setListings] = useState<PropertyCardRow[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const agentSnap = await getDoc(doc(db, "users", id));
      if (agentSnap.exists()) {
        const data = agentSnap.data() as any;
        setAgent({
          id: agentSnap.id,
          full_name: data.full_name ?? data.display_name ?? data.name ?? null,
          company: data.company ?? null,
          location:
            data.location ?? [data.city, data.country].filter(Boolean).join(", ") ?? null,
          avatar_url: data.avatar_url ?? data.photoURL ?? null,
          socials: data?.socials ?? {},
          agent_code: typeof data?.agent_code === "number" ? data.agent_code : undefined,
          kyc_verified: !!data?.kyc_verified,
          kyc_submitted: !!data?.kyc_submitted,
        });
      } else {
        setAgent(null);
      }

      const propsQ = fsQuery(
        collection(db, "properties"),
        where("agent_id", "==", id),
        where("status", "==", "published"),
        orderBy("created_at", "desc"),
        limit(12)
      );
      const propsSnap = await getDocs(propsQ);
      const props = propsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PropertyCardRow[];
      setListings(props);

      const ids = props.map((p) => p.id).filter(Boolean);
      if (ids.length === 0) {
        setTotalLikes(0);
        return;
      }

      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));

      let likes = 0;
      for (const chunk of chunks) {
        try {
          const likesQ = fsQuery(
            collection(db, "property_like_agg"),
            where(documentId(), "in", chunk)
          );
          const likesSnap = await getDocs(likesQ);
          likesSnap.forEach((d) => {
            const data = d.data() as any;
            likes += Number(data?.count_48h ?? 0);
          });
        } catch {
          // ignore if index missing or collection empty
        }
      }
      setTotalLikes(likes);
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const q = fsQuery(
        collection(db, "agent_reviews"),
        where("agent_id", "==", id),
        orderBy("created_at", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();
  }, [id]);

  const contact = () => {
    const waHandle = agent?.socials?.whatsapp?.replace(/[^0-9]/g, "") || "254705091683";
    const text = encodeURIComponent(`Hi ${agent?.full_name ?? "Agent"}, I'd like to enquire about your listings.`);
    window.open(`https://wa.me/${waHandle}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const submitReview = async () => {
    if (!id || !auth.currentUser) return;
    if (!reviewComment.trim()) return;
    try {
      setReviewSubmitting(true);
      await addDoc(collection(db, "agent_reviews"), {
        agent_id: id,
        author_uid: auth.currentUser.uid,
        author_name: auth.currentUser.displayName ?? auth.currentUser.email ?? "Anonymous",
        rating: reviewRating,
        comment: reviewComment.trim(),
        created_at: serverTimestamp(),
      });
      setReviewComment("");
      setReviewRating(5);
      const q = fsQuery(
        collection(db, "agent_reviews"),
        where("agent_id", "==", id),
        orderBy("created_at", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const normalizeSocialUrl = (value: string, type: keyof SocialLinks) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const handle = trimmed.replace(/^@/, "");
    switch (type) {
      case "facebook":
        return `https://www.facebook.com/${handle}`;
      case "instagram":
        return `https://www.instagram.com/${handle}`;
      case "twitter":
        return `https://twitter.com/${handle}`;
      case "whatsapp": {
        const digits = handle.replace(/[^0-9]/g, "");
        return digits ? `https://wa.me/${digits}` : "";
      }
      case "tiktok":
        return `https://www.tiktok.com/@${handle}`;
      default:
        return trimmed;
    }
  };

  const socialItems = (() => {
    const socials = agent?.socials;
    if (!socials) return [] as { label: string; href: string; Icon: ComponentType<{ className?: string }> }[];
    const items = [
      { key: "facebook", label: "Facebook", Icon: Facebook },
      { key: "instagram", label: "Instagram", Icon: Instagram },
      { key: "twitter", label: "Twitter", Icon: Twitter },
      { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
      { key: "tiktok", label: "TikTok", Icon: Music2 },
    ] as const;

    return items
      .map((item) => {
        const value = socials[item.key];
        const href = value ? normalizeSocialUrl(value, item.key) : "";
        return href ? { label: item.label, href, Icon: item.Icon } : null;
      })
        .filter(Boolean) as { label: string; href: string; Icon: ComponentType<{ className?: string }> }[];
  })();

  const agentName = agent?.full_name ?? agent?.company ?? "Agent";
  const agentLocation = agent?.location ?? "Kenya";
  const agentSeoTitle = `${agentName} – Real Estate Agent in ${agentLocation} | Kenya Properties`;
  const agentSeoDesc = `View ${agentName}'s property listings${agent?.company ? ` at ${agent.company}` : ""} in ${agentLocation}. Browse verified houses, apartments and land for sale or rent.`;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={agentSeoTitle}
        description={agentSeoDesc}
        canonical={`/agents/${id}`}
        image={agent?.avatar_url ?? undefined}
        imageAlt={`${agentName} – Kenya Properties agent`}
        schema={agent ? {
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          "name": agentName,
          "url": `https://kenyaproperties.co.ke/agents/${id}`,
          "image": agent.avatar_url ?? undefined,
          "description": agentSeoDesc,
          "areaServed": { "@type": "Place", "name": agentLocation },
        } : undefined}
      />
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="glass-card rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-orange-600/10" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={agent?.avatar_url ?? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400"}
                  alt={agent?.full_name ?? "Agent"}
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-primary/20"
                />
                {agent?.kyc_verified && (
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-600 flex items-center justify-center ring-2 ring-background">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold">{agent?.full_name ?? "Agent"}</h1>
                <p className="text-muted-foreground">{agent?.company ?? ""} • {agent?.location ?? ""}</p>
                {typeof agent?.agent_code === "number" && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Agent Code: <span className="font-semibold text-foreground">#{agent.agent_code}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:ml-auto">
              <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-2">
                <div className="text-xs text-muted-foreground">Properties</div>
                <div className="text-lg font-semibold">{listings.length}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-2">
                <div className="text-xs text-muted-foreground">Total Likes</div>
                <div className="text-lg font-semibold">{totalLikes}</div>
                <div className="text-[10px] text-muted-foreground">last 48h</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={contact} className="bg-green-600 hover:bg-green-700">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp Agent
                </Button>
                {id && (
                  <Button variant="outline" asChild>
                    <Link to={`/listings?agent=${encodeURIComponent(id)}`}>View Properties</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {agent?.bio && (
            <p className="relative mt-4 text-sm text-muted-foreground max-w-3xl animate-fade-in">
              {agent.bio}
            </p>
          )}

          {socialItems.length > 0 && (
            <div className="relative mt-4 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Follow</span>
              <div className="flex gap-2">
                {socialItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-primary hover:bg-muted"
                    aria-label={`Follow on ${item.label}`}
                  >
                    <item.Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          )}
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

        <div className="mt-10 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Agent Reviews</h2>
            {!auth.currentUser && (
              <Button variant="outline" asChild>
                <Link to="/auth">Sign in to review</Link>
              </Button>
            )}
          </div>

          {auth.currentUser && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rating</span>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((v) => (
                    <option key={v} value={v}>{v} Star{v > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience with this agent..."
              />
              <Button onClick={submitReview} disabled={reviewSubmitting || !reviewComment.trim()}>
                {reviewSubmitting ? "Submitting…" : "Submit Review"}
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {reviews.length === 0 && (
              <div className="text-sm text-muted-foreground">No reviews yet.</div>
            )}
            {reviews.map((review) => (
              <div key={review.id} className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{review.author_name ?? "Anonymous"}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < (review.rating ?? 0) ? "text-yellow-500 fill-yellow-500" : "text-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {review.created_at?.toDate?.()?.toLocaleDateString?.() ?? ""}
                  </span>
                </div>
                <p className="text-muted-foreground">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
