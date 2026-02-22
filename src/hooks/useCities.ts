import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { getCitiesForCountry } from "@/lib/constants/countries";

async function fetchCitiesByCountry(country?: string): Promise<string[]> {
  if (!country) return [];

  // 1) Preferred source: cities collection
  try {
    const qCities = query(
      collection(db, "cities"),
      where("country", "==", country),
      limit(300)
    );
    const snap = await getDocs(qCities);
    const list = snap.docs
      .map((d) => String(d.data()?.name ?? d.id))
      .filter(Boolean);
    if (list.length > 0) {
      return Array.from(new Set(list)).sort();
    }
  } catch {
    // ignore and fallback to properties
  }

  // 2) Fallback: derive from properties collection
  try {
    const qProps = query(
      collection(db, "properties"),
      where("country", "==", country),
      where("published", "==", true),
      limit(500)
    );
    const snap = await getDocs(qProps);
    const list = snap.docs
      .map((d) => String(d.data()?.city ?? ""))
      .filter(Boolean);

    const deduped = Array.from(new Set(list)).sort();
    if (deduped.length > 0) return deduped;
  } catch {
    // ignore and fallback to static list
  }

  return getCitiesForCountry(country);
}

export function useCities(country?: string) {
  return useQuery({
    queryKey: ["cities", country],
    queryFn: () => fetchCitiesByCountry(country),
    enabled: !!country,
    staleTime: 1000 * 60 * 10,
  });
}
