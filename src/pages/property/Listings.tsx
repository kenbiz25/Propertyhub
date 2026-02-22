
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, MapPin, Bed, Bath, Square, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import SEO from "@/components/SEO";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";
import { useQuery } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebaseClient";
import { collection, getDocs, orderBy, query as fsQuery, where } from "firebase/firestore";

type ListingRow = {
  id: string;
  title: string;
  price: number;
  type: "sale" | "rent" | "lease";
  property_type?: string;
  city: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
  promoted: boolean;
  agent_id?: string;
};

const PROPERTY_TYPES = [
  "all",
  "apartment",
  "house",
  "villa",
  "townhouse",
  "bungalow",
  "maisonette",
  "studio",
  "penthouse",
  "duplex",
  "condo",
  "office",
  "retail",
  "warehouse",
  "industrial",
  "mixed_use",
  "land",
  "farm",
  "commercial",
  "hotel",
  "guesthouse",
] as const;

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80";

function toListingRow(d: any, id: string): ListingRow {
  const image =
    d?.image_url ||
    d?.thumbnail_url ||
    (Array.isArray(d?.images) ? d.images[0] : undefined) ||
    DEFAULT_IMAGE;

  return {
    id,
    title: d?.title ?? "Untitled",
    price: Number(d?.price ?? 0),
    type: (d?.type ?? d?.listing_type ?? "sale") as ListingRow["type"],
    property_type: d?.property_type ?? undefined,
    city: d?.city ?? "",
    neighborhood: d?.neighborhood ?? "",
    bedrooms: Number(d?.bedrooms ?? 0),
    bathrooms: Number(d?.bathrooms ?? 0),
    area: Number(d?.area ?? 0),
    image,
    promoted: Boolean(d?.featured ?? d?.promoted ?? false),
    agent_id: d?.agent_id ?? d?.owner_id ?? undefined,
  };
}

async function fetchListings(): Promise<ListingRow[]> {
  const base = [where("published", "==", true)];

  try {
    const q = fsQuery(collection(db, "properties"), ...base, orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => toListingRow(doc.data(), doc.id));
  } catch {
    const q = fsQuery(collection(db, "properties"), ...base);
    const snap = await getDocs(q);
    return snap.docs.map((doc) => toListingRow(doc.data(), doc.id));
  }
}

const formatPrice = (price: number, type: string) => {
  const formatted = new Intl.NumberFormat("en-KE").format(price);
  return type === "rent" || type === "lease" ? `KES ${formatted}/mo` : `KES ${formatted}`;
};

const Listings = () => {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "all";
  const initialCity = (searchParams.get("city") || "all").toLowerCase();
  const initialSearchQuery = searchParams.get("q") || "";
  const agentFilter = searchParams.get("agent") || "";

  const [activeType, setActiveType] = useState(initialType);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [showCityMenu, setShowCityMenu] = useState(false);

  // More Filters UI
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minBeds, setMinBeds] = useState<number | undefined>(undefined);
  const [minBaths, setMinBaths] = useState<number | undefined>(undefined);
  const [propertyType, setPropertyType] = useState("all");

  // Pagination
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20);
  const [visibleCount, setVisibleCount] = useState<number>(20);

  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [activeType, selectedCity, searchQuery, minPrice, maxPrice, minBeds, minBaths, propertyType, pageSize]);

  const { data: listings = [], isLoading, error } = useQuery<ListingRow[], Error>({
    queryKey: ["listings"],
    queryFn: fetchListings,
  });

  const filteredListings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return listings.filter((listing) => {
      const matchesType = activeType === "all" || listing.type === activeType;
      const matchesPropertyType =
        propertyType === "all" ||
        (listing.property_type ?? "").toLowerCase() === propertyType;
      const matchesCity = selectedCity === "all" || listing.city.toLowerCase() === selectedCity;
      const matchesAgent = !agentFilter || listing.agent_id === agentFilter;
      const matchesSearch =
        listing.title.toLowerCase().includes(q) ||
        listing.neighborhood.toLowerCase().includes(q) ||
        listing.city.toLowerCase().includes(q);
      const matchesMinPrice = typeof minPrice === "number" ? listing.price >= minPrice : true;
      const matchesMaxPrice = typeof maxPrice === "number" ? listing.price <= maxPrice : true;
      const matchesMinBeds = typeof minBeds === "number" ? listing.bedrooms >= minBeds : true;
      const matchesMinBaths = typeof minBaths === "number" ? listing.bathrooms >= minBaths : true;
      return (
        matchesType &&
        matchesPropertyType &&
        matchesCity &&
        matchesAgent &&
        matchesSearch &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesMinBeds &&
        matchesMinBaths
      );
    });
  }, [listings, activeType, propertyType, selectedCity, searchQuery, minPrice, maxPrice, minBeds, minBaths, agentFilter]);

  const visibleListings = filteredListings.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Property Listings in Kenya | Houses, Apartments & Land for Sale & Rent"
        description="Browse thousands of verified property listings across Kenya. Filter by city, price, bedrooms, and property type. Find houses, apartments, plots, and land for sale or rent."
        canonical="/listings"
        schema={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Property Listings in Kenya",
          "description": "Browse verified houses, apartments, and land for sale or rent across Kenya.",
          "url": "https://kenyaproperties.co.ke/listings",
        }}
      />
      <Navbar />

      <main className="pt-20">
        {/* Header */}
        <section className="bg-card border-b border-border py-8">
          <div className="container mx-auto px-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Browse Properties</h1>
            <p className="text-muted-foreground">Discover your perfect home across Kenya</p>
          </div>
        </section>

        {/* Filters */}
        <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-lg border-b border-border py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by location, property name..."
                  className="pl-10 bg-card"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {["all", "sale", "rent", "lease"].map((type) => (
                  <Button
                    key={type}
                    variant={activeType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveType(type)}
                  >
                    {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <Button variant="outline" onClick={() => setShowCityMenu(!showCityMenu)} className="w-full md:w-auto">
                  <MapPin className="w-4 h-4 mr-2" />
                  {selectedCity === "all" ? "All Cities" : selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1)}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>

                {showCityMenu && (
                  <div className="absolute left-0 md:right-0 md:left-auto mt-2 w-full md:w-48 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                    {["all", "nairobi", "mombasa", "kisumu", "nakuru", "eldoret"].map((city) => (
                      <button
                        key={city}
                        className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
                        onClick={() => {
                          setSelectedCity(city);
                          setShowCityMenu(false);
                        }}
                      >
                        {city === "all" ? "All Cities" : city.charAt(0).toUpperCase() + city.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button variant="outline" onClick={() => setShowMoreFilters(true)}>
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>

            {/* Page size selector */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm text-muted-foreground">Show per page:</span>
              <div className="flex gap-2">
                {[20, 50, 100].map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant={pageSize === n ? "default" : "outline"}
                    onClick={() => {
                      setPageSize(n as 20 | 50 | 100);
                      setVisibleCount(n);
                    }}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* More Filters modal */}
          {showMoreFilters && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg glass-card rounded-2xl p-6">
                <h3 className="font-display text-xl font-semibold mb-4">More Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                    >
                      {PROPERTY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type === "all"
                            ? "All Property Types"
                            : type.replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    type="number"
                    placeholder="Min Price (KES)"
                    value={minPrice ?? ""}
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <Input
                    type="number"
                    placeholder="Max Price (KES)"
                    value={maxPrice ?? ""}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <Input
                    type="number"
                    placeholder="Min Bedrooms"
                    value={minBeds ?? ""}
                    onChange={(e) => setMinBeds(e.target.value ? Number(e.target.value) : undefined)}
                  />
                  <Input
                    type="number"
                    placeholder="Min Bathrooms"
                    value={minBaths ?? ""}
                    onChange={(e) => setMinBaths(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMinPrice(undefined);
                      setMaxPrice(undefined);
                      setMinBeds(undefined);
                      setMinBaths(undefined);
                      setPropertyType("all");
                      setShowMoreFilters(false);
                    }}
                  >
                    Clear
                  </Button>
                  <Button onClick={() => setShowMoreFilters(false)}>Apply</Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Listings Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">
                {isLoading ? "Loading properties…" : `${filteredListings.length} properties found`}
              </p>
            </div>

            {error && (
              <div className="mb-6 glass-card rounded-xl p-4 text-sm text-destructive">
                Failed to load listings. Please try again.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass-card rounded-2xl overflow-hidden border animate-pulse">
                      <div className="aspect-[4/3] bg-muted" />
                      <div className="p-5">
                        <div className="h-5 w-2/3 bg-muted rounded mb-3" />
                        <div className="h-4 w-1/2 bg-muted rounded" />
                      </div>
                    </div>
                  ))
                : visibleListings.map((listing) => (
                    <Link key={listing.id} to={`/listing/${listing.id}`} className="group glass-card rounded-2xl overflow-hidden hover-lift">
                      <div className="relative aspect-[4/3]">
                        <img
                          src={listing.image}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        {listing.promoted && (
                          <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                            Featured
                          </span>
                        )}

                    <FavoriteButton
                      className="absolute top-3 right-3"
                      active={isFavorite(listing.id)}
                      onToggle={async () => {
                        try {
                          if (!auth.currentUser) {
                            window.location.href = `/auth?from=/listing/${listing.id}`;
                            return;
                          }
                          await toggleFavorite(listing.id);
                        } catch (err: any) {
                          if (err?.message === "AUTH_REQUIRED") {
                            window.location.href = `/auth?from=/listing/${listing.id}`;
                          } else {
                            console.error("[Listings] toggleFavorite error:", err);
                          }
                        }
                      }}
                    />

                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="inline-block px-2 py-1 bg-background/80 backdrop-blur-sm text-xs font-medium rounded capitalize">
                        For {listing.type}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-display font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                        {listing.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                      <MapPin className="w-4 h-4" />
                      {listing.neighborhood}, {listing.city}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      {listing.bedrooms > 0 && (
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {listing.bedrooms}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        {listing.bathrooms}
                      </div>
                      <div className="flex items-center gap-1">
                        <Square className="w-4 h-4" />
                        {listing.area} m²
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <p className="font-display font-bold text-xl text-primary">
                        {formatPrice(listing.price, listing.type)}
                      </p>
                    </div>
                  </div>
                    </Link>
                  ))}
            </div>

            {/* Lazy Load */}
            {visibleCount < filteredListings.length && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={() => setVisibleCount((c) => Math.min(c + pageSize, filteredListings.length))}>
                  Load more
                </Button>
              </div>
            )}

            {!isLoading && visibleListings.length === 0 && (
              <div className="text-center py-16 glass-card rounded-2xl">
                <p className="text-muted-foreground text-lg">No properties found matching your criteria.</p>
                <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveType("all");
                      setSelectedCity("all");
                      setSearchQuery("");
                      setMinPrice(undefined);
                      setMaxPrice(undefined);
                      setMinBeds(undefined);
                      setMinBaths(undefined);
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button asChild>
                    <Link to="/list-property">List a Property</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Listings;
