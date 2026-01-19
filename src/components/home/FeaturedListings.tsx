
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

        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-4">
          <MapPin className="w-4 h-4 text-primary" />
          {property.address}
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

// If no live data yet, we render your original mock to preserve UX.
const mockFeatured: UIProperty[] = [
  {
    id: "1",
    title: "Modern Penthouse in Westlands",
    price: 45000000,
    currency: "KES",
    type: "sale",
    city: "Nairobi",
    address: "Westlands, Nairobi",
    bedrooms: 4,
    bathrooms: 3,
    area: 280,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    isPromoted: true,
    isVerified: true,
  },
  {
    id: "2",
    title: "Cozy 2BR Apartment in Kilimani",
    price: 85000,
    currency: "KES",
    type: "rent",
    city: "Nairobi",
    address: "Kilimani, Nairobi",
    bedrooms: 2,
    bathrooms: 2,
    area: 120,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    isPromoted: false,
    isVerified: true,
  },
  {
    id: "3",
    title: "Beachfront Villa in Nyali",
    price: 120000000,
    currency: "KES",
    type: "sale",
    city: "Mombasa",
    address: "Nyali, Mombasa",
    bedrooms: 5,
    bathrooms: 4,
    area: 450,
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
    isPromoted: true,
    isVerified: true,
  },
  {
    id: "4",
    title: "Commercial Space in CBD",
    price: 250000,
    currency: "KES",
    type: "lease",
    city: "Nairobi",
    address: "CBD, Nairobi",
    bedrooms: 0,
    bathrooms: 2,
    area: 500,
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
    isPromoted: false,
    isVerified: true,
  },
  {
    id: "5",
    title: "Family Home in Karen",
    price: 75000000,
    currency: "KES",
    type: "sale",
    city: "Nairobi",
    address: "Karen, Nairobi",
    bedrooms: 5,
    bathrooms: 4,
    area: 380,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    isPromoted: true,
    isVerified: true,
  },
  {
    id: "6",
    title: "Studio Apartment in Lavington",
    price: 45000,
    currency: "KES",
    type: "rent",
    city: "Nairobi",
    address: "Lavington, Nairobi",
    bedrooms: 1,
    bathrooms: 1,
    area: 55,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    isPromoted: false,
    isVerified: true,
  },
];

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
  const base = [where("published", "==", true), where("featured", "==", true)];

  // Try: newest first
  try {
    const q1 = fsQuery(
      collection(db, "properties"),
      ...base,
      orderBy("created_at", "desc"),
      limit(6)
    );
    const s1 = await getDocs(q1);
    const items1 = s1.docs.map((doc) => toUIProperty(doc.data(), doc.id));
    if (items1.length > 0) return items1;
  } catch {
    // If index/field not ready, fall through to unsorted query
  }

  // Fallback: unsorted
  const q2 = fsQuery(collection(db, "properties"), ...base, limit(6));
  const s2 = await getDocs(q2);
  const items2 = s2.docs.map((doc) => toUIProperty(doc.data(), doc.id));
  return items2;
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

  const items = (data?.length ?? 0) > 0 ? (data as UIProperty[]) : mockFeatured;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedListings;
