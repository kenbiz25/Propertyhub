import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { getCitiesForCountry } from "@/lib/constants/countries";

async function fetchCitiesByCountry(country?: string): Promise<string[]> {
  if (!country) return [];

  // Always start with the full static list so no towns are ever missing
  const staticList = getCitiesForCountry(country);
  const extra = new Set<string>();

  // Merge any additional cities from the Firestore cities collection
  try {
    const qCities = query(
      collection(db, "cities"),
      where("country", "==", country),
      limit(300)
    );
    const snap = await getDocs(qCities);
    snap.docs.forEach((d) => {
      const name = String(d.data()?.name ?? d.id).trim();
      if (name) extra.add(name);
    });
  } catch { /* ignore */ }

  // Merge any cities that appear on published properties
  try {
    const qProps = query(
      collection(db, "properties"),
      where("country", "==", country),
      where("status", "==", "published"),
      limit(500)
    );
    const snap = await getDocs(qProps);
    snap.docs.forEach((d) => {
      const city = String(d.data()?.city ?? "").trim();
      if (city) extra.add(city);
    });
  } catch { /* ignore */ }

  // Static list first (already sorted), then any new names from Firestore
  const staticSet = new Set(staticList);
  const newFromFirestore = Array.from(extra).filter((c) => !staticSet.has(c)).sort();
  return [...staticList, ...newFromFirestore];
}

export function useCities(country?: string) {
  return useQuery({
    queryKey: ["cities", country],
    queryFn: () => fetchCitiesByCountry(country),
    enabled: !!country,
    staleTime: 1000 * 60 * 10,
  });
}
