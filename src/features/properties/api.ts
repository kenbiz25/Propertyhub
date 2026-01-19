
// src/features/properties/api.ts
import { auth, db } from "@/lib/firebaseClient";
import type {
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyFilters,
} from "./types";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  limit as limitDocs,
  QueryConstraint,
  getCountFromServer,
  updateDoc,
} from "firebase/firestore";

const TABLE = "properties";

/**
 * Normalize a property row for UI expectations:
 * - mirror `image` <- `thumbnail_url` if needed
 * - compose `location` if missing
 */
function normalizeRow<T extends Record<string, any>>(p: T): Property {
  const image = p.image ?? p.thumbnail_url ?? null;
  const location =
    p.location ??
    [p.neighborhood, p.city, p.country].filter(Boolean).join(", ");
  return { ...p, image, location } as Property;
}

function includesCi(hay: string | undefined, needle: string): boolean {
  if (!hay) return false;
  return hay.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Build query constraints supported by Firestore (server-side).
 * Partial text filters are applied client-side after retrieval.
 */
function buildConstraints(filters?: PropertyFilters): {
  constraints: QueryConstraint[];
  requiresClientFilter: {
    q?: string;
    city?: string;
    neighborhood?: string;
  };
  page: number;
  pageSize: number;
} {
  const f = filters ?? {};
  const constraints: QueryConstraint[] = [];

  // Sort newest first
  constraints.push(orderBy("created_at", "desc"));

  // Status & type
  if (f.status) constraints.push(where("status", "==", f.status));
  if (f.listing_type) constraints.push(where("listing_type", "==", f.listing_type));
  if (f.property_type) constraints.push(where("property_type", "==", f.property_type));

  // Geography (exact equality)
  if (f.country) constraints.push(where("country", "==", f.country));

  // Price range
  if (typeof f.min_price === "number") constraints.push(where("price", ">=", f.min_price));
  if (typeof f.max_price === "number") constraints.push(where("price", "<=", f.max_price));

  // Bedrooms / Bathrooms
  if (typeof f.min_bedrooms === "number") constraints.push(where("bedrooms", ">=", f.min_bedrooms));
  if (typeof f.min_bathrooms === "number") constraints.push(where("bathrooms", ">=", f.min_bathrooms));

  // Furnishing
  if (f.furnishing) constraints.push(where("furnishing", "==", f.furnishing));

  // Amenities (array contains)
  if (f.amenities?.length) {
    if (f.amenities.length === 1) {
      constraints.push(where("amenities", "array-contains", f.amenities[0]));
    } else {
      // Firestore supports up to 10 values
      const vals = f.amenities.slice(0, 10);
      constraints.push(where("amenities", "array-contains-any", vals));
    }
  }

  // Partial city/neighborhood and free-text search handled client-side
  const requiresClientFilter = {
    q: f.q?.trim() || undefined,
    city: f.city || undefined,           // partial match
    neighborhood: f.neighborhood || undefined, // partial match
  };

  const page = f.page ?? 1;
  const pageSize = f.pageSize ?? 20;

  return { constraints, requiresClientFilter, page, pageSize };
}

/**
 * Fetch list of properties with filters & pagination.
 * Firestore provides count via getCountFromServer on the same aggregate query.
 */
export async function fetchProperties(
  filters?: PropertyFilters
): Promise<{ data: Property[]; total: number }> {
  const { constraints, requiresClientFilter, page, pageSize } = buildConstraints(filters);

  // Total count (without limit)
  const countAgg = query(collection(db, TABLE), ...constraints);
  const countSnap = await getCountFromServer(countAgg);
  const total = countSnap.data().count;

  // Fetch up to page * pageSize then slice last page segment
  const take = page * pageSize;
  const q = query(collection(db, TABLE), ...constraints, limitDocs(take));
  const snap = await getDocs(q);

  let rows = snap.docs.map((d) => normalizeRow({ id: d.id, ...d.data() }));

  // Client-side partial filters (broadened search)
  if (requiresClientFilter.city) {
    rows = rows.filter((p) => includesCi(p.city, requiresClientFilter.city!));
  }
  if (requiresClientFilter.neighborhood) {
    rows = rows.filter((p) => includesCi(p.neighborhood, requiresClientFilter.neighborhood!));
  }
  if (requiresClientFilter.q) {
    const s = requiresClientFilter.q!;
    rows = rows.filter((p) =>
      includesCi(p.title, s) ||
      includesCi(p.description as any, s) ||
      includesCi(p.location, s) ||
      includesCi(p.city, s) ||
      includesCi(p.neighborhood, s)
    );
  }

  // Slice the current page
  const from = (page - 1) * pageSize;
  const data = rows.slice(from, from + pageSize);

  return { data, total };
}

/**
 * Fetch a single property by id.
 */
export async function fetchProperty(id: string): Promise<Property> {
  const ref = doc(db, TABLE, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Property not found");
  return normalizeRow({ id: snap.id, ...snap.data() });
}

/**
 * Insert a new property (owned by current agent if `agent_id` missing).
 * Mirrors image -> thumbnail_url and composes location if missing.
 */
export async function insertProperty(input: PropertyInsert): Promise<Property> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const payload: Record<string, any> = { ...input };

  // Ensure ownership (agent_id)
  if (!payload.agent_id) payload.agent_id = user.uid;

  // Mirror image -> thumbnail_url for UI compatibility
  if (payload.image && !payload.thumbnail_url) {
    payload.thumbnail_url = payload.image;
  }

  // Auto-fill location if not provided
  if (!payload.location) {
    payload.location = [payload.neighborhood, payload.city, payload.country]
      .filter(Boolean)
      .join(", ");
  }

  // Default status
  if (!payload.status) payload.status = "draft";

  // Ensure created_at
  if (!payload.created_at) payload.created_at = new Date().toISOString();

  const docRef = await addDoc(collection(db, TABLE), payload);
  return await fetchProperty(docRef.id);
}

/**
 * Update an existing property by id.
 * - Mirrors image -> thumbnail_url if needed.
 * - Recomputes location if not explicitly provided.
 */
export async function updateProperty(
  id: string,
  input: PropertyUpdate
): Promise<Property> {
  const patch: Record<string, any> = { ...input };

  if (patch.image && !patch.thumbnail_url) {
    patch.thumbnail_url = patch.image;
  }

  if (!patch.location) {
    const current = await fetchProperty(id);
    patch.location = [
      patch.neighborhood ?? current.neighborhood,
      patch.city ?? current.city,
      patch.country ?? current.country,
    ]
      .filter(Boolean)
      .join(", ") || current.location;
  }

  await updateDoc(doc(db, TABLE, id), patch);
  return await fetchProperty(id);
}

/**
 * Delete a property by id.
 */
export async function removeProperty(id: string): Promise<void> {
  await deleteDoc(doc(db, TABLE, id));
}

/* -----------------------------------------------------------------------
 * Agent-centric helpers used by dashboard pages
 * ---------------------------------------------------------------------*/

/**
 * Fetch properties for the current agent (auth.currentUser.uid).
 * Supports filters & pagination (applied after agent constraint).
 */
export async function fetchMyProperties(
  filters?: PropertyFilters
): Promise<{ data: Property[]; total: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  // Constrain by agent_id
  const f = { ...(filters ?? {}) };
  const built = buildConstraints(f);
  const agentConstraint = where("agent_id", "==", user.uid);

  // Total count
  const countAgg = query(collection(db, TABLE), agentConstraint, ...built.constraints);
  const countSnap = await getCountFromServer(countAgg);
  const total = countSnap.data().count;

  // Fetch up to page * pageSize then slice
  const take = built.page * built.pageSize;
  const q = query(collection(db, TABLE), agentConstraint, ...built.constraints, limitDocs(take));
  const snap = await getDocs(q);

  let rows = snap.docs.map((d) => normalizeRow({ id: d.id, ...d.data() }));

  // Client-side partial filters
  const { city, neighborhood, q: free } = built.requiresClientFilter;
  if (city) rows = rows.filter((p) => includesCi(p.city, city));
  if (neighborhood) rows = rows.filter((p) => includesCi(p.neighborhood, neighborhood));
  if (free) {
    rows = rows.filter((p) =>
      includesCi(p.title, free) ||
      includesCi(p.description as any, free) ||
      includesCi(p.location, free) ||
      includesCi(p.city, free) ||
      includesCi(p.neighborhood, free)
    );
  }

  const from = (built.page - 1) * built.pageSize;
  const data = rows.slice(from, from + built.pageSize);

  return { data, total };
}

/**
 * Publish or archive a property.
 */
export async function setPropertyStatus(
  id: string,
  status: Property["status"]
): Promise<void> {
  await updateDoc(doc(db, TABLE, id), { status });
}

/**
 * Request promotion for a property (agent).
 * Relies on `promotion_requests` collection.
 */
export async function requestPromotion(
  property_id: string,
  note?: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  await addDoc(collection(db, "promotion_requests"), {
    property_id,
    agent_id: user.uid,
    status: "pending",
    notes: note ?? null,
    created_at: new Date().toISOString(),
  });
}

/**
 * Toggle favorite for current user.
 * Firestore collection: favorites
 * Document id: `${uid}_${propertyId}`
 */
export async function toggleFavorite(
  property_id: string,
  active: boolean
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const favId = `${user.uid}_${property_id}`;
  const favRef = doc(db, "favorites", favId);

  if (active) {
    await setDoc(favRef, {
      userId: user.uid,
      propertyId: property_id,
      created_at: new Date().toISOString(),
    } as any);
  } else {
    await deleteDoc(favRef);
  }
}
