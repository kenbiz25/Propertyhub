
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchProperties,
  fetchProperty,
  insertProperty,
  updateProperty,
  removeProperty,
  // new helpers below
  fetchMyProperties,
  setPropertyStatus,
  requestPromotion,
  toggleFavorite,
} from "./api";
import type { PropertyInsert, PropertyUpdate, PropertyFilters } from "./types";

/* =========================================================================
 * LIST / DETAIL QUERIES
 * ========================================================================= */

export function useProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: () => fetchProperties(filters),
  });
}

export function useProperty(id?: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => (id ? fetchProperty(id) : Promise.reject("Missing id")),
    enabled: !!id,
  });
}

/**
 * Agent-scoped list (current auth user’s properties).
 * Same result shape as fetchProperties: { data, total }
 */
export function useMyProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: ["my-properties", filters],
    queryFn: () => fetchMyProperties(filters),
  });
}

/* =========================================================================
 * CREATE / UPDATE / DELETE MUTATIONS
 * ========================================================================= */

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PropertyInsert) => insertProperty(input),
    onSuccess: () => {
      toast.success("Property created");
      // Invalidate both generic and agent-scoped lists
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["my-properties"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to create property"),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PropertyUpdate }) =>
      updateProperty(id, input),
    onSuccess: () => {
      toast.success("Property updated");
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["my-properties"] });
      qc.invalidateQueries({ queryKey: ["property"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to update property"),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeProperty(id),
    onSuccess: () => {
      toast.success("Property deleted");
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["my-properties"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to delete property"),
  });
}

/* =========================================================================
 * STATUS / PROMOTION / FAVORITES MUTATIONS
 * ========================================================================= */

/**
 * Publish / Draft / Archive status change
 */
export function useSetPropertyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PropertyUpdate["status"] }) =>
      setPropertyStatus(id, status as any),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["my-properties"] });
      qc.invalidateQueries({ queryKey: ["property"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to update status"),
  });
}

/**
 * Agent requests promotion for a property
 */
export function useRequestPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ property_id, note }: { property_id: string; note?: string }) =>
      requestPromotion(property_id, note),
    onSuccess: () => {
      toast.success("Promotion request submitted");
      // Property may reflect promotion_status changes in UI
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["my-properties"] });
      qc.invalidateQueries({ queryKey: ["property"] });
      // Optional: qc.invalidateQueries({ queryKey: ["promotion-requests"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to request promotion"),
  });
}

/**
 * Toggle favorite for current user
 */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ property_id, active }: { property_id: string; active: boolean }) =>
      toggleFavorite(property_id, active),
    onSuccess: () => {
      toast.success("Favorites updated");
      // If you have a favorites query, invalidate it
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to update favorites"),
  });
}
