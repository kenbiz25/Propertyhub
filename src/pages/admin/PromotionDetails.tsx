
// src/pages/admin/PromotionDetails.tsx
import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withRoleGuard } from "@/components/auth/withRoleGuard";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

function PromotionDetails() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["promotion", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing id");
      const snap = await getDoc(doc(db, "promotions", id));
      if (!snap.exists()) throw new Error("Promotion not found");
      return { id: snap.id, ...snap.data() } as {
        id: string;
        property_id: string;
        status: "pending" | "approved" | "rejected";
        created_at: string;
        notes?: string;
      };
    },
    enabled: !!id,
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing id");
      await updateDoc(doc(db, "promotions", id), {
        status: "approved",
        decided_at: serverTimestamp(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promotion", id] }),
  });

  const rejectMut = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing id");
      await updateDoc(doc(db, "promotions", id), {
        status: "rejected",
        decided_at: serverTimestamp(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promotion", id] }),
  });

  if (isLoading) return <div>Loading…</div>;
  if (error) return <div className="text-red-600">Failed to load.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Promotion Request</h1>
      <div className="mt-4 border rounded p-4 bg-white">
        <p><strong>ID:</strong> {data!.id}</p>
        <p><strong>Property:</strong> {data!.property_id}</p>
        <p><strong>Status:</strong> {data!.status}</p>
        <p><strong>Submitted:</strong> {new Date(data!.created_at).toLocaleString()}</p>
        {data!.notes && <p><strong>Notes:</strong> {data!.notes}</p>}

        <div className="mt-4 space-x-2">
          <button
            className="px-3 py-1 bg-green-600 text-white rounded"
            onClick={() => approveMut.mutate()}
            disabled={approveMut.isPending}
          >
            Approve
          </button>
          <button
            className="px-3 py-1 bg-red-600 text-white rounded"
            onClick={() => rejectMut.mutate()}
            disabled={rejectMut.isPending}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default withRoleGuard(PromotionDetails, ["admin", "superadmin"]);