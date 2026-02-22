import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  query as fsQuery,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { MapPin, Bed, Bath, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatPrice = (price: number) =>
  `KES ${new Intl.NumberFormat("en-KE").format(price)}`;

type BoostEntry = {
  id: string;
  slot_type: "premium" | "standard";
  listing_id: string;
  listing_title?: string;
  listing_image?: string;
  price_kes?: number;
  property?: {
    id: string;
    title: string;
    price: number;
    city: string;
    neighborhood: string;
    bedrooms: number;
    bathrooms: number;
    thumbnail_url: string;
    listing_type: string;
  } | null;
};

export default function PromotedListings() {
  const { data: slots } = useQuery<BoostEntry[]>({
    queryKey: ["homepage-promoted"],
    queryFn: async () => {
      const now = Timestamp.now();
      const q = fsQuery(
        collection(db, "boost_requests"),
        where("status", "==", "active"),
        where("end_at", ">", now),
        orderBy("end_at", "asc"),
        limit(3)
      );
      const snap = await getDocs(q);
      const boosts = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

      // Enrich with property docs
      const enriched = await Promise.all(
        boosts.map(async (b) => {
          if (!b.listing_id) return { ...b, property: null };
          try {
            const pSnap = await getDoc(doc(db, "properties", b.listing_id));
            if (!pSnap.exists()) return { ...b, property: null };
            const d = pSnap.data() as any;
            return {
              ...b,
              property: {
                id: pSnap.id,
                title: d.title ?? b.listing_title ?? "Property",
                price: Number(d.price ?? 0),
                city: d.city ?? "",
                neighborhood: d.neighborhood ?? "",
                bedrooms: Number(d.bedrooms ?? 0),
                bathrooms: Number(d.bathrooms ?? 0),
                thumbnail_url: d.thumbnail_url ?? d.image_urls?.[0] ?? b.listing_image ?? "",
                listing_type: d.listing_type ?? d.type ?? "sale",
              },
            };
          } catch {
            return { ...b, property: null };
          }
        })
      );

      return enriched.filter((b) => b.property) as BoostEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!slots || slots.length === 0) return null;

  // Slot A = first premium (or first available), Slot B = first standard (or second available)
  const slotA = slots.find((s) => s.slot_type === "premium") ?? slots[0];
  const slotB = slots.find((s) => s.slot_type === "standard" && s.id !== slotA?.id) ?? slots.find((s) => s.id !== slotA?.id);

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/20">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Sponsored Listings</h2>
            <p className="text-sm text-muted-foreground">Promoted properties from verified agents</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Slot A – Premium (full-width banner, ~60%) */}
          {slotA?.property && (
            <Link
              to={`/listing/${slotA.property.id}`}
              className="md:col-span-3 group relative overflow-hidden rounded-2xl border border-primary/30 hover-lift"
            >
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={slotA.property.thumbnail_url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"}
                  alt={slotA.property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Sponsored badge */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wide">
                    <Zap className="w-3 h-3" /> Sponsored
                  </span>
                  <span className={`px-2 py-1 rounded-full text-[11px] font-semibold uppercase ${slotA.property.listing_type === "rent" ? "bg-blue-500/90 text-white" : "bg-green-500/90 text-white"}`}>
                    For {slotA.property.listing_type}
                  </span>
                </div>

                {/* Content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-display text-xl font-bold text-white mb-1 line-clamp-1">
                    {slotA.property.title}
                  </h3>
                  <div className="flex items-center gap-1 text-white/80 text-sm mb-3">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {[slotA.property.neighborhood, slotA.property.city].filter(Boolean).join(", ")}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl font-bold text-white">
                      {formatPrice(slotA.property.price)}
                    </span>
                    <div className="flex items-center gap-3 text-white/80 text-sm">
                      {slotA.property.bedrooms > 0 && (
                        <span className="flex items-center gap-1"><Bed className="w-4 h-4" />{slotA.property.bedrooms}</span>
                      )}
                      {slotA.property.bathrooms > 0 && (
                        <span className="flex items-center gap-1"><Bath className="w-4 h-4" />{slotA.property.bathrooms}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Slot B – Standard card (~40%) */}
          {slotB?.property && (
            <Link
              to={`/listing/${slotB.property.id}`}
              className="md:col-span-2 group relative overflow-hidden rounded-2xl border border-border hover-lift flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={slotB.property.thumbnail_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80"}
                  alt={slotB.property.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-[11px] font-bold uppercase">
                    <Zap className="w-3 h-3" /> Sponsored
                  </span>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1 bg-card">
                <span className={`self-start px-2 py-0.5 rounded-full text-[11px] font-semibold ${slotB.property.listing_type === "rent" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}>
                  For {slotB.property.listing_type}
                </span>
                <h3 className="font-display font-bold text-foreground line-clamp-2 leading-snug">
                  {slotB.property.title}
                </h3>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {[slotB.property.neighborhood, slotB.property.city].filter(Boolean).join(", ")}
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                  {slotB.property.bedrooms > 0 && (
                    <span className="flex items-center gap-1"><Bed className="w-3.5 h-3.5" />{slotB.property.bedrooms} bd</span>
                  )}
                  {slotB.property.bathrooms > 0 && (
                    <span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{slotB.property.bathrooms} ba</span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-display text-lg font-bold text-primary">
                    {formatPrice(slotB.property.price)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="w-3 h-3" /> View
                  </span>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* CTA for agents */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Want your property here? Boost it from KES 200/day.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/agent/pricing">See Boost Pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
