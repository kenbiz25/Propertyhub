
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
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { ArrowRight } from "lucide-react";

// ---------- Mock fallback (keeps your look during migration) ----------
const mockCities = [
  {
    id: "mock-nairobi",
    name: "Nairobi",
    slug: "nairobi",
    properties: 3500,
    image_url:
      "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80",
    featured: true,
  },
  {
    id: "mock-mombasa",
    name: "Mombasa",
    slug: "mombasa",
    properties: 1200,
    image_url:
      "https://images.unsplash.com/photo-1596005554384-d293674c91d7?w=800&q=80",
    featured: false,
  },
  {
    id: "mock-kisumu",
    name: "Kisumu",
    slug: "kisumu",
    properties: 650,
    image_url:
      "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800&q=80",
    featured: false,
  },
  {
    id: "mock-nakuru",
    name: "Nakuru",
    slug: "nakuru",
    properties: 480,
    image_url:
      "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80",
    featured: false,
  },
  {
    id: "mock-eldoret",
    name: "Eldoret",
    slug: "eldoret",
    properties: 320,
    image_url:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80",
    featured: false,
  },
];

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
  // Try ordered by rank for consistent layout
  let citiesSnap;
  try {
    const q1 = fsQuery(
      collection(db, "popular_cities"),
      orderBy("rank", "asc"),
      limit(8)
    );
    citiesSnap = await getDocs(q1);
  } catch {
    // Fallback: no order (e.g., rank missing or index not ready)
    const q2 = fsQuery(collection(db, "popular_cities"), limit(8));
    citiesSnap = await getDocs(q2);
  }

  const cities = citiesSnap.docs.map((d) => {
    const data = d.data() as CityDoc;
    return {
      id: d.id,
      name: data?.name ?? "Unknown",
      slug: data?.slug ?? d.id,
      image_url: data?.image_url,
      featured: Boolean(data?.featured),
      properties: 0, // will compute next
    } as UICity;
  });

  if (cities.length === 0) {
    // Nothing in Firestore yet → return empty; component will show mock fallback
    return [];
  }

  // Compute listing counts per city via aggregate query on `properties`
  // Prefer matching on `city_slug`; change to 'city' if that's your field.
  const countPromises = cities.map(async (city) => {
    try {
      const propsQ = fsQuery(
        collection(db, "properties"),
        where("published", "==", true),
        where("city_slug", "==", city.slug)
      );
      const agg = await getCountFromServer(propsQ);
      return { ...city, properties: agg.data().count };
    } catch {
      // If aggregate not available, leave count as 0 (UI still renders)
      return { ...city, properties: 0 };
    }
  });

  return Promise.all(countPromises);
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

  // Use Firestore data if present, otherwise mock fallback
  const cities = (data?.length ?? 0) > 0 ? (data as UICity[]) : mockCities;

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
          "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80"
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

        {/* Cities Grid - Bento style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px]">
          {/* Large featured card */}
          {featuredCity && (
            <Link
              to={cityLink(featuredCity)}
              className="col-span-2 row-span-2 group relative rounded-2xl overflow-hidden"
            >
              <img
                src={
                  featuredCity.image_url ||
                  "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80"
                }
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

        {/* Optional: Firestore error hint (kept subtle) */}
        {error && (
          <div className="mt-6 text-center text-red-600 text-sm">
            Failed to load cities. Showing defaults.
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularCities;
