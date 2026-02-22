
// src/pages/agent/TeamMembers.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withRoleGuard } from "@/components/auth/withRoleGuard";
import { auth, db } from "@/lib/firebaseClient";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function TeamMembers() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const q = query(
        collection(db, "team_members"),
        where("agent_id", "==", uid),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  const [email, setEmail] = useState('');
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not authenticated");
      if (!email.trim()) throw new Error("Email is required");
      await addDoc(collection(db, "team_members"), {
        agent_id: uid,
        email: email.trim().toLowerCase(),
        created_at: serverTimestamp(),
      });
    },
    onSuccess: () => {
      setEmail('');
      qc.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Team Members</h1>
      <div className="mt-4 space-y-4">
        <Input
          placeholder="Assistant email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
          {inviteMutation.isPending ? "Inviting…" : "Invite"}
        </Button>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Current Team</h2>
        <ul className="mt-2 space-y-2">
          {data?.map((m) => (
            <li key={m.id} className="p-2 border rounded">{m.email}</li>
          ))}
          {data?.length === 0 && (
            <li className="text-sm text-muted-foreground">No team members yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default withRoleGuard(TeamMembers, ['agent', 'admin', 'superadmin']);