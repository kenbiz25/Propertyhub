
import { Search, MapPin, Home, Building2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { collection, getCountFromServer } from "firebase/firestore";

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

  const [rawStats, setRawStats] = useState({
    properties: 10000,
    clients: 5000,
    agents: 500,
    cities: 50,
  });

  const [shouldAnimate, setShouldAnimate] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [inViewTriggered, setInViewTriggered] = useState(false);

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
        const propsSnap = await getCountFromServer(collection(db, "properties"));
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
              Kenya's #1 Property Marketplace
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
            <div className="flex gap-2 mb-6">
              {["buy", "rent", "lease"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
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
            <div className="flex flex-col md:flex-row gap-4">
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
              <Button variant="hero" size="xl" className="shrink-0">
                <Search className="w-5 h-5" />
                Search
              </Button>
            </div>

            {/* Popular Searches */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-muted-foreground">Popular:</span>
              {["Nairobi", "Westlands", "Kilimani", "Mombasa", "Karen"].map((city) => (
                <button key={city} className="text-sm text-primary hover:text-primary/80 transition-colors">
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
