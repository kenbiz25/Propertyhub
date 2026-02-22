
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  query as fsQuery,
  orderBy,
  limit,
  getDocs,
  where,
  getCountFromServer,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { ArrowRight } from "lucide-react";

const DEFAULT_CITY_IMAGE =
  "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80";

// ---------- Types ----------
type CityDoc = {
  name: string;
  slug: string;
  image_url?: string;
  featured?: boolean;
  rank?: number;
};

type UICity = {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  featured: boolean;
  properties: number; // computed count
};

// ---------- Data fetch ----------
async function fetchPopularCitiesWithCounts(): Promise<UICity[]> {
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
    const city = String(d.data()?.city ?? "").trim();
    if (!city) return;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  });

  const topCities = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, properties]) => ({ name, properties }));

  if (topCities.length === 0) return [];

  // Try to enrich with images from popular_cities collection
  const enriched: UICity[] = [];
  for (const [idx, item] of topCities.entries()) {
    let image_url: string | undefined;
    let slug = item.name.toLowerCase().replace(/\s+/g, "-");
    try {
      const cityDoc = await getDoc(doc(db, "popular_cities", slug));
      if (cityDoc.exists()) {
        const data = cityDoc.data() as CityDoc;
        image_url = data?.image_url;
        slug = data?.slug ?? slug;
      }
    } catch {
      // ignore
    }

    enriched.push({
      id: `${slug}-${idx}`,
      name: item.name,
      slug,
      image_url,
      featured: idx === 0,
      properties: item.properties,
    });
  }

  return enriched;
}

// ---------- Component ----------
const PopularCities = () => {
  const { data, isLoading, error } = useQuery<UICity[], Error>({
    queryKey: ["popular-cities"],
    queryFn: fetchPopularCitiesWithCounts,
  });

  // Skeletons (match bento layout)
  if (isLoading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Explore by <span className="text-gradient">City</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover properties in Kenya's most sought-after locations
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
            <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden bg-muted animate-pulse" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const cities = (data?.length ?? 0) > 0 ? (data as UICity[]) : [];

  // Choose the featured tile (large bento card)
  const featuredCity =
    cities.find((c) => c.featured) ?? cities[0] ?? null;

  const otherCities = featuredCity
    ? cities.filter((c) => c.id !== featuredCity.id)
    : cities;

  // Rendering helpers
  const cityLink = (city: UICity) =>
    `/listings?city=${encodeURIComponent(city.slug || city.name.toLowerCase())}`;

  const CityTile = ({ city }: { city: UICity }) => (
    <Link
      to={cityLink(city)}
      className="group relative rounded-2xl overflow-hidden"
    >
      <img
        src={
          city.image_url ||
          DEFAULT_CITY_IMAGE
        }
        alt={city.name}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-display text-xl font-bold">{city.name}</h3>
        <p className="text-muted-foreground text-sm">
          {(city.properties ?? 0).toLocaleString()} properties
        </p>
      </div>
    </Link>
  );

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Explore by <span className="text-gradient">City</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover properties in Kenya's most sought-after locations
          </p>
        </div>

        {cities.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <h3 className="font-display text-xl font-semibold mb-2">No cities available yet</h3>
            <p className="text-muted-foreground mb-6">
              Add city coverage to highlight popular locations on the homepage.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/list-property" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                List a Property
              </Link>
              <Link to="/listings" className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2">
                Browse Listings
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
            {/* Large featured card */}
            {featuredCity && (
              <Link
                to={cityLink(featuredCity)}
                className="col-span-2 row-span-2 group relative rounded-2xl overflow-hidden"
              >
                <img
                  src={featuredCity.image_url || DEFAULT_CITY_IMAGE}
                  alt={featuredCity.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display text-3xl font-bold mb-1">
                    {featuredCity.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {(featuredCity.properties ?? 0).toLocaleString()} properties
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 text-primary group-hover:gap-3 transition-all">
                    Explore <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            )}

            {/* Other cities */}
            {otherCities.map((city) => (
              <CityTile key={city.id} city={city} />
            ))}
          </div>
        )}

        {/* Optional: Firestore error hint (kept subtle) */}
        {error && (
          <div className="mt-6 text-center text-red-600 text-sm">
            Failed to load cities.
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularCities;
