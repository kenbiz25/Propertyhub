
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, MapPin, Bed, Bath, Square, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useFavorites } from "@/hooks/useFavorites";
import { auth } from "@/lib/firebaseClient";

// ------- Keep your mockListings as-is above -------

const formatPrice = (price: number, type: string) => {
  const formatted = new Intl.NumberFormat("en-KE").format(price);
  return type === "rent" || type === "lease" ? `KES ${formatted}/mo` : `KES ${formatted}`;
};

const Listings = () => {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "all";
  const initialCity = (searchParams.get("city") || "all").toLowerCase();

  const [activeType, setActiveType] = useState(initialType);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCityMenu, setShowCityMenu] = useState(false);

  // More Filters UI
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minBeds, setMinBeds] = useState<number | undefined>(undefined);
  const [minBaths, setMinBaths] = useState<number | undefined>(undefined);

  // Pagination
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20);
  const [visibleCount, setVisibleCount] = useState<number>(20);

  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [activeType, selectedCity, searchQuery, minPrice, maxPrice, minBeds, minBaths, pageSize]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return mockListings.filter((listing) => {
      const matchesType = activeType === "all" || listing.type === activeType;
      const matchesCity = selectedCity === "all" || listing.city.toLowerCase() === selectedCity;
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
        matchesCity &&
        matchesSearch &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesMinBeds &&
        matchesMinBaths
      );
    });
  }, [activeType, selectedCity, searchQuery, minPrice, maxPrice, minBeds, minBaths]);

  const visibleListings = filteredListings.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-background">
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
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by location, property name..."
                  className="pl-10 bg-card"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
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
                  <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
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
            <div className="mt-4 flex items-center gap-3">
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
              <p className="text-muted-foreground">{filteredListings.length} properties found</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleListings.map((listing) => (
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

            {visibleListings.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">No properties found matching your criteria.</p>
                <Button
                  variant="outline"
                  className="mt-4"
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
