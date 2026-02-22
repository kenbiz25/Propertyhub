
import { Search, MapPin, Home, Building2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { collection, documentId, getCountFromServer, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { formatKes } from "@/lib/constants/boosting";

// Count‑up animation hook
function useCountUp(target: number, durationMs = 1200, start = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) {
      setValue(target);
      return;
    }

    const t0 = performance.now();
    const animate = (t: number) => {
      const progress = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.floor(target * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [start, target, durationMs]);

  return value;
}

const Hero = () => {
  const [activeTab, setActiveTab] = useState<"rent" | "buy" | "lease">("buy");
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  const [rawStats, setRawStats] = useState({
    properties: 10000,
    clients: 5000,
    agents: 500,
    cities: 50,
  });

  const [shouldAnimate, setShouldAnimate] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [inViewTriggered, setInViewTriggered] = useState(false);
  const [promoted, setPromoted] = useState<any[]>([]);
  const [promotedLoading, setPromotedLoading] = useState(true);

  // 1. Decide if this user should animate (only once)
  useEffect(() => {
    const uid = auth.currentUser?.uid ?? "anon"; // different memory for each user
    const key = `heroCountersShown_v1:${uid}`;
    const seen = localStorage.getItem(key);

    if (!seen) {
      setShouldAnimate(true);
      localStorage.setItem(key, "1");
    } else {
      setShouldAnimate(false);
    }
  }, []);

  // 2. Load stats from Firestore
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const publishedPropsQ = query(
          collection(db, "properties"),
          where("status", "==", "published")
        );
        const propsSnap = await getCountFromServer(publishedPropsQ);
        const citiesSnap = await getCountFromServer(collection(db, "popular_cities"));

        setRawStats({
          properties: propsSnap.data().count || 0,
          clients: 5000,
          agents: 500,
          cities: citiesSnap.data().count || 0,
        });
      } catch (err) {
        console.error("[Hero] Failed to fetch stats:", err);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchPromoted = async () => {
      try {
        const now = new Date();
        const boostsQ = query(
          collection(db, "boost_requests"),
          where("status", "==", "active"),
          where("end_at", ">", now),
          orderBy("end_at", "asc"),
          limit(3)
        );
        const boostsSnap = await getDocs(boostsQ);
        const boostDocs = boostsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

        const listingIds = boostDocs.map((b) => b.listing_id).filter(Boolean);
        if (!listingIds.length) {
          setPromoted([]);
          setPromotedLoading(false);
          return;
        }

        const listingsQ = query(
          collection(db, "properties"),
          where(documentId(), "in", listingIds),
          where("status", "==", "published")
        );
        const listingsSnap = await getDocs(listingsQ);
        const listingMap = new Map(
          listingsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }])
        );

        const enriched = boostDocs
          .map((boost) => ({
            ...boost,
            listing: listingMap.get(boost.listing_id),
          }))
          .filter((item) => item.listing);

        setPromoted(enriched);
      } catch (err) {
        console.error("[Hero] Failed to fetch promoted slots:", err);
        setPromoted([]);
      } finally {
        setPromotedLoading(false);
      }
    };

    fetchPromoted();
  }, []);

  // 3. Trigger animation when stats scroll into view
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInViewTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const start = shouldAnimate && inViewTriggered;

  // 4. Count-up animated values
  const propertiesVal = useCountUp(rawStats.properties, 1200, start);
  const clientsVal = useCountUp(rawStats.clients, 1200, start);
  const agentsVal = useCountUp(rawStats.agents, 1200, start);
  const citiesVal = useCountUp(rawStats.cities, 1200, start);
  const popularCities = ["Nairobi", "Westlands", "Kilimani", "Mombasa", "Karen"];

  const handleSearch = (overrideLocation?: string) => {
    const query = (overrideLocation ?? location).trim();
    const params = new URLSearchParams();
    const typeParam = activeTab === "buy" ? "sale" : activeTab;

    if (typeParam && typeParam !== "all") {
      params.set("type", typeParam);
    }

    if (query) {
      params.set("q", query);
    }

    const suffix = params.toString();
    navigate(suffix ? `/listings?${suffix}` : "/listings");
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl" />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">
              Kenya Properties Marketplace
            </span>
          </div>

          {/* Heading */}
          <h1
            className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            Find Your Perfect
            <span className="block text-gradient">Home in Africa</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Discover verified properties across Kenya and beyond.
            Rent, buy, or lease with confidence through trusted agents.
          </p>

          {/* Search Box */}
          <div
            className="glass-card rounded-2xl p-6 md:p-8 max-w-3xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {["buy", "rent", "lease"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {tab === "buy" && <Home className="w-4 h-4" />}
                  {tab === "rent" && <Key className="w-4 h-4" />}
                  {tab === "lease" && <Building2 className="w-4 h-4" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form
              className="flex flex-col md:flex-row gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleSearch();
              }}
            >
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by city, neighborhood, or address..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <Button type="submit" variant="hero" size="xl" className="shrink-0">
                <Search className="w-5 h-5" />
                Search
              </Button>
            </form>

            {/* Promoted Slots */}
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">Promoted Slots</div>
                <Link to="/agent/pricing" className="text-xs text-primary hover:text-primary/80">
                  Boost your listing
                </Link>
              </div>

              {promotedLoading ? (
                <div className="text-sm text-muted-foreground">Loading promoted listings…</div>
              ) : promoted.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No promoted listings yet. Be the first to boost your property.
                </div>
              ) : (
                <div className="grid gap-3">
                  {(() => {
                    const premium = promoted.find((p) => p.slot_type === "premium") ?? promoted[0];
                    const standard = promoted.filter((p) => p.id !== premium?.id).slice(0, 2);

                    const renderCard = (item: any, tag: string) => {
                      const priceValue = Number(item.listing.price ?? 0);
                      const priceText = Number.isFinite(priceValue) && priceValue > 0
                        ? formatKes(priceValue)
                        : "KES —";

                      return (
                      <Link
                        key={item.id}
                        to={`/listing/${item.listing.id}`}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border border-border/50 bg-background/60 p-3 hover:border-primary/60 transition"
                      >
                        <div className="h-16 w-20 rounded-md overflow-hidden bg-muted">
                          {item.listing.thumbnail_url || item.listing.image || item.listing.image_urls?.[0] ? (
                            <img
                              src={item.listing.thumbnail_url ?? item.listing.image ?? item.listing.image_urls?.[0]}
                              alt={item.listing.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-primary font-semibold">{tag}</div>
                          <div className="text-sm font-semibold text-white truncate">
                            {item.listing.title ?? "Untitled Listing"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {[item.listing.neighborhood, item.listing.city, item.listing.country]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        </div>
                        <div className="sm:ml-auto text-sm font-semibold text-primary text-left sm:text-right">
                          {priceText}
                        </div>
                      </Link>
                    );
                    };

                    return (
                      <>
                        {premium && renderCard(premium, "Premium Spotlight")}
                        {standard.map((item) => renderCard(item, "Standard Boost"))}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Popular Searches */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-muted-foreground">Popular:</span>
              {popularCities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleSearch(city)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Stats (animated once per user) */}
          <div
            ref={statsRef}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            {[
              { value: propertiesVal.toLocaleString(), label: "Properties Listed" },
              { value: clientsVal.toLocaleString(), label: "Happy Clients" },
              { value: agentsVal.toLocaleString(), label: "Verified Agents" },
              { value: citiesVal.toLocaleString(), label: "Cities Covered" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold text-gradient">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
