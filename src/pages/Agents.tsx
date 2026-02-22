import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Star, Building2, CheckCircle, Facebook, Instagram, Twitter, Music2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layouts/Navbar";
import Footer from "@/components/layouts/Footer";
import SEO from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query as fsQuery, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

type Agent = {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  image: string;
  listings: number;
  rating: number;
  reviews: number;
  verified: boolean;
  specialties: string[];
  socials?: SocialLinks;
  agent_code?: number;
  listingTypes?: Array<"rent" | "sale" | "lease">;
};

type SocialLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  whatsapp?: string;
  tiktok?: string;
};

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80";

async function fetchAgents(): Promise<Agent[]> {
  const agentsQ = fsQuery(collection(db, "users"), where("role", "==", "agent"));
  const agentsSnap = await getDocs(agentsQ);

  const agents = agentsSnap.docs.map((d) => {
    const data = d.data() as any;
    const name = data?.full_name ?? data?.name ?? data?.displayName ?? "Agent";
    const location = data?.city ?? data?.location ?? data?.country ?? "";
    return {
      id: d.id,
      name,
      title: data?.title ?? "Property Agent",
      company: data?.company ?? data?.agency ?? "Independent",
      location,
      image: data?.photoURL ?? data?.avatar_url ?? DEFAULT_AVATAR,
      listings: Number(data?.listings ?? data?.listing_count ?? 0),
      rating: Number(data?.rating ?? 0),
      reviews: Number(data?.reviews ?? 0),
      verified: Boolean(data?.kyc_verified ?? data?.verified ?? false),
      specialties: Array.isArray(data?.specialties) ? data.specialties : [],
      socials: data?.socials ?? {},
      agent_code: typeof data?.agent_code === "number" ? data.agent_code : undefined,
      listingTypes: [],
    } as Agent;
  });

  const typeMap = new Map<string, Set<"rent" | "sale" | "lease">>();
  const countMap = new Map<string, number>();

  try {
    const propsQ = fsQuery(collection(db, "properties"), where("status", "==", "published"));
    const propsSnap = await getDocs(propsQ);
    propsSnap.forEach((doc) => {
      const data = doc.data() as any;
      const agentId = data?.agent_id ?? data?.owner_id;
      if (!agentId) return;
      const type = (data?.listing_type ?? data?.type ?? "sale") as "rent" | "sale" | "lease";
      if (!typeMap.has(agentId)) typeMap.set(agentId, new Set());
      typeMap.get(agentId)?.add(type);
      countMap.set(agentId, (countMap.get(agentId) ?? 0) + 1);
    });
  } catch {
    const propsQ = fsQuery(collection(db, "properties"), where("published", "==", true));
    const propsSnap = await getDocs(propsQ);
    propsSnap.forEach((doc) => {
      const data = doc.data() as any;
      const agentId = data?.agent_id ?? data?.owner_id;
      if (!agentId) return;
      const type = (data?.listing_type ?? data?.type ?? "sale") as "rent" | "sale" | "lease";
      if (!typeMap.has(agentId)) typeMap.set(agentId, new Set());
      typeMap.get(agentId)?.add(type);
      countMap.set(agentId, (countMap.get(agentId) ?? 0) + 1);
    });
  }

  return agents.map((agent) => {
    const types = Array.from(typeMap.get(agent.id) ?? []);
    const count = countMap.get(agent.id);
    return {
      ...agent,
      listingTypes: types,
      listings: typeof count === "number" ? count : agent.listings,
    } as Agent;
  });
}

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

const getSocialItems = (socials?: SocialLinks) => {
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
};

const Agents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedListingType, setSelectedListingType] = useState("all");

  const { data: agents = [], isLoading, error } = useQuery<Agent[], Error>({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => {
      if (a.location) set.add(a.location.toLowerCase());
    });
    return ["all", ...Array.from(set).sort()];
  }, [agents]);

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === "all" || agent.location.toLowerCase() === selectedCity;
    const matchesType =
      selectedListingType === "all" ||
      (agent.listingTypes ?? []).includes(selectedListingType as "rent" | "sale" | "lease");
    return matchesSearch && matchesCity && matchesType;
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find Real Estate Agents in Kenya | Verified Property Agents"
        description="Browse verified real estate agents and property developers across Kenya. Connect with trusted agents in Nairobi, Mombasa, Kiambu, and all 47 counties."
        canonical="/agents"
        schema={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Real Estate Agents in Kenya",
          "description": "Directory of verified real estate agents and property developers in Kenya.",
          "url": "https://kenyaproperties.co.ke/agents",
        }}
      />
      <Navbar />

      <main className="pt-20">
        {/* Header */}
        <section className="bg-card border-b border-border py-8">
          <div className="container mx-auto px-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Find an Agent
            </h1>
            <p className="text-muted-foreground">
              Connect with verified property professionals across Kenya
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-lg border-b border-border py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or company..."
                  className="pl-10 bg-card"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto md:flex-wrap pb-1">
                {cityOptions.map((city) => (
                  <Button
                    key={city}
                    variant={selectedCity === city ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCity(city)}
                  >
                    {city === "all" ? "All Cities" : city.charAt(0).toUpperCase() + city.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto md:flex-wrap pb-1">
                {(["all", "rent", "sale", "lease"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={selectedListingType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedListingType(type)}
                  >
                    {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Agents Grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">
                {isLoading ? "Loading agents…" : `${filteredAgents.length} agents found`}
              </p>
            </div>

            {error && (
              <div className="mb-6 glass-card rounded-xl p-4 text-sm text-destructive">
                Failed to load agents. Please try again.
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass-card rounded-2xl overflow-hidden border animate-pulse">
                      <div className="p-6">
                        <div className="h-6 w-2/3 bg-muted rounded mb-3" />
                        <div className="h-4 w-1/2 bg-muted rounded" />
                      </div>
                    </div>
                  ))
                : filteredAgents.map((agent) => {
                const socialItems = getSocialItems(agent.socials);
                const primarySocial = socialItems[0];
                return (
                <div key={agent.id} className="glass-card rounded-2xl overflow-hidden hover-lift">
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative">
                        <img
                          src={agent.image}
                          alt={agent.name}
                          className="w-20 h-20 rounded-xl object-cover"
                        />
                        {agent.verified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-lg">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.title}</p>
                        <p className="text-sm text-primary">{agent.company}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {agent.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {agent.listings} listings
                      </div>
                      {typeof agent.agent_code === "number" && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs uppercase tracking-wide">Code</span>
                          <span className="font-semibold text-foreground">#{agent.agent_code}</span>
                        </div>
                      )}
                    </div>

                    {(agent.rating > 0 || agent.reviews > 0) && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{agent.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-muted-foreground">({agent.reviews} reviews)</span>
                      </div>
                    )}

                    {agent.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {agent.specialties.map((specialty, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs bg-muted rounded-full"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
                      <Button size="sm" className="flex-1" asChild>
                        <Link to={`/agents/${agent.id}`}>View Profile</Link>
                      </Button>
                    </div>

                    {socialItems.length > 0 && (
                      <div className="flex items-center justify-between pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Follow</span>
                          <div className="flex gap-2">
                            {socialItems.map((item) => (
                              <a
                                key={item.label}
                                href={item.href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-primary hover:bg-muted"
                                aria-label={`Follow on ${item.label}`}
                              >
                                <item.Icon className="w-4 h-4" />
                              </a>
                            ))}
                          </div>
                        </div>
                        {primarySocial && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={primarySocial.href} target="_blank" rel="noreferrer">
                              Follow
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>

            {filteredAgents.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">
                  No agents found matching your criteria.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCity("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-card border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Are You a Property Agent?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join our network of verified professionals and reach thousands of property seekers.
            </p>
            <Button asChild size="lg">
              <Link to="/list-property">Join as an Agent</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Agents;
