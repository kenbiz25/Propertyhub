
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  query as fsQuery,
  where,
  orderBy,
  limit,
  getDocs,
  documentId,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { MapPin, Bed, Bath, Square, Heart, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------- UI helpers & card ----------

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
};

type UIProperty = {
  id: string;
  title: string;
  price: number;
  currency: string;
  type: "sale" | "rent" | "lease";
  city: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
  isPromoted: boolean; // mirrors 'featured'
  isVerified: boolean;
};

const PropertyCard = ({ property }: { property: UIProperty }) => {
  return (
    <Link
      to={`/listing/${property.id}`}
      className="group block glass-card rounded-2xl overflow-hidden hover-lift"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          {property.isPromoted && (
            <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              property.type === "sale"
                ? "bg-green-500/90 text-white"
                : property.type === "rent"
                ? "bg-blue-500/90 text-white"
                : "bg-purple-500/90 text-white"
            }`}
          >
            For {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
          </span>
        </div>

        {/* Favorite button */}
        <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background transition-all">
          <Heart className="w-5 h-5" />
        </button>

        {/* Price tag */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="inline-block px-4 py-2 rounded-lg bg-background/90 backdrop-blur-sm">
            <span className="font-display text-xl font-bold text-foreground">
              {formatPrice(property.price, property.currency)}
            </span>
            {property.type === "rent" && (
              <span className="text-muted-foreground text-sm">/month</span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
          {property.title}
        </h3>

        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-4 line-clamp-1">
          <MapPin className="w-4 h-4 text-primary" />
          {property.address}
        </div>

        {/* Features */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {property.bedrooms > 0 && (
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              {property.bedrooms} Beds
            </div>
          )}
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            {property.bathrooms} Baths
          </div>
          <div className="flex items-center gap-1">
            <Square className="w-4 h-4" />
            {property.area} m²
          </div>
        </div>
      </div>
    </Link>
  );
};

// ---------- Firestore fetch & mapping ----------

// Map Firestore document → UI shape, preserving your design fields.
function toUIProperty(d: any, id: string): UIProperty {
  const image =
    d?.image_url ||
    d?.thumbnail_url ||
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";

  return {
    id,
    title: d?.title ?? "Untitled",
    price: Number(d?.price ?? 0),
    currency: d?.currency ?? "KES",
    type: (d?.type as UIProperty["type"]) ?? "sale",
    city: d?.city ?? "Nairobi",
    address: d?.address ?? d?.location ?? "Nairobi, Kenya",
    bedrooms: Number(d?.bedrooms ?? 0),
    bathrooms: Number(d?.bathrooms ?? 0),
    area: Number(d?.area ?? 0),
    image,
    isPromoted: Boolean(d?.featured ?? false),
    isVerified: Boolean(d?.isVerified ?? d?.verified ?? true),
  };
}

async function fetchFeatured(): Promise<UIProperty[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const q = fsQuery(
    collection(db, "view_events"),
    where("created_at", ">=", cutoff),
    orderBy("created_at", "desc"),
    limit(500)
  );
  const snap = await getDocs(q);

  const counts = new Map<string, number>();
  snap.docs.forEach((d) => {
    const pid = d.data()?.property_id;
    if (!pid) return;
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
  });

  const topIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  const propsQ = fsQuery(
    collection(db, "properties"),
    where(documentId(), "in", topIds),
    where("status", "==", "published")
  );
  const propsSnap = await getDocs(propsQ);

  return propsSnap.docs.map((d) => toUIProperty(d.data(), d.id));
}

// ---------- Component ----------

const FeaturedListings = () => {
  const { data, isLoading, error } = useQuery<UIProperty[], Error>({
    queryKey: ["featured-listings"],
    queryFn: fetchFeatured,
  });

  // If loading, show subtle skeletons that match your card grid
  if (isLoading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Featured <span className="text-gradient">Properties</span>
              </h2>
              <p className="text-muted-foreground">
                Handpicked properties from trusted agents across Kenya
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/listings">
                View All Properties
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden border animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-5">
                  <div className="h-5 w-2/3 bg-muted rounded mb-3" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If Firestore fails, show message but keep page usable
  if (error) {
    console.error("[FeaturedListings] Error:", error);
  }

  const items = (data?.length ?? 0) > 0 ? (data as UIProperty[]) : [];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Featured <span className="text-gradient">Properties</span>
            </h2>
            <p className="text-muted-foreground">
              Handpicked properties from trusted agents across Kenya
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/listings">
              View All Properties
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <h3 className="font-display text-xl font-semibold mb-2">No featured listings yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to feature your property and reach thousands of buyers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/list-property">List a Property</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/listings">Browse All</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedListings;
