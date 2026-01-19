
// src/pages/admin/AdminConsole.tsx
import React from "react";
import { withRoleGuard } from "@/components/auth/withRoleGuard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Building2, Star, Wallet, ShieldCheck, ActivitySquare } from "lucide-react";
import { db } from "@/lib/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection, query, where, getCountFromServer, getDocs, orderBy, limit, updateDoc, doc
} from "firebase/firestore";

async function safeCount(col: string, q?: ReturnType<typeof query>) {
  try {
    const aggQ = q ?? query(collection(db, col));
    const snap = await getCountFromServer(aggQ);
    return snap.data().count;
  } catch (err: any) {
    if (err?.code === "permission-denied") {
      const docsSnap = await getDocs(q ?? query(collection(db, col)));
      return docsSnap.size;
    }
    throw err;
  }
}

/* ---------- Overview Metrics ---------- */
function OverviewMetrics() {
  const { data } = useQuery({
    queryKey: ["admin-overview-metrics"],
    queryFn: async () => {
      const usersCount      = await safeCount("users");
      const propertiesCount = await safeCount("properties");
      const promotionsCount = await safeCount("promotions");

      let mrrCents = 0;
      try {
        const subsQ = query(collection(db, "subscriptions"), where("status", "==", "active"));
        const snap = await getDocs(subsQ);
        mrrCents = snap.docs.reduce((sum, d) => sum + (Number(d.data()?.amount_cents ?? 0) || 0), 0);
      } catch (_) {}

      return { usersCount, propertiesCount, promotionsCount, mrrCents };
    },
  });

  const mrrUsd = ((data?.mrrCents ?? 0) / 100).toFixed(2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard title="Total Users"        value={data?.usersCount ?? 0}      change="+2.1% MoM" changeType="positive" icon={Users} />
      <StatsCard title="Total Properties"   value={data?.propertiesCount ?? 0} change="+8 this week" changeType="positive" icon={Building2} />
      <StatsCard title="Promotion Requests" value={data?.promotionsCount ?? 0} change="Pending approvals" changeType="neutral" icon={Star} />
      <StatsCard title="MRR (USD)"          value={mrrUsd}                     change="Active subs" changeType="neutral" icon={Wallet} />
    </div>
  );
}

/* ---------- Tabs ---------- */
function ModerationTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["reports-pending"],
    queryFn: async () => {
      const q = query(collection(db, "reports"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      await updateDoc(doc(db, "reports", id), { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports-pending"] }),
  });

  if (isLoading) return <div className="p-4 text-gray-400">Loading moderation queue…</div>;

  return (
    <div className="space-y-3">
      {data?.map((r) => (
        <div key={r.id} className="glass-card rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="font-display">{r.listing_id}</div>
            {r.reason && <div className="text-sm text-muted-foreground mt-1">Reason: {r.reason}</div>}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}>Approve</Button>
            <Button variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}>Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PromotionRequestsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["promotion-requests"],
    queryFn: async () => {
      const q = query(collection(db, "promotion_requests"), orderBy("created_at", "desc"), limit(200));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  if (isLoading) return <div className="p-4 text-gray-400">Loading requests…</div>;

  return (
    <div className="space-y-3">
      {data?.map((r) => (
        <div key={r.id} className="glass-card rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="font-display">{r.property_id}</div>
            <div className="text-sm text-muted-foreground">
              Requested: {new Date(r.created_at).toLocaleString("en-KE")} • Agent: {r.agent_id}
            </div>
            {r.notes && <div className="text-sm mt-1">Note: {r.notes}</div>}
          </div>
          <div className="flex gap-2">
            <Button asChild><a href={`/admin/promotions/${r.id}`}>Details</a></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RolesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const q = query(collection(db, "users"), orderBy("created_at", "desc"), limit(200));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "customer" | "agent" | "admin" | "superadmin" }) => {
      await updateDoc(doc(db, "users", id), { role });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-list"] }),
  });

  return (
    <div className="space-y-3">
      {data?.map((u) => (
        <div key={u.id} className="glass-card rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="font-display">{u.full_name ?? u.email ?? u.id}</div>
            <div className="text-sm text-muted-foreground">Current role: {u.role ?? "customer"}</div>
          </div>
          <div className="flex gap-2">
            {(["customer", "agent", "admin", "superadmin"] as const).map((role) => (
              <Button
                key={role}
                variant={u.role === role ? "default" : "outline"}
                onClick={() => setRole.mutate({ id: u.id, role })}
              >
                {role[0].toUpperCase() + role.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WebhookLogsTab() {
  const { data } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const q = query(collection(db, "webhook_logs"), orderBy("created_at", "desc"), limit(50));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="font-display text-lg font-bold text-white">Webhook Status</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2">Event</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((log: any) => (
              <tr key={log.id}>
                <td className="border p-2">{log.event_type}</td>
                <td className="border p-2">{log.status}</td>
                <td className="border p-2">{new Date(log.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminConsole() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Admin Console"
        description="Moderate content, manage requests and roles, and monitor system health."
      />

      <OverviewMetrics />

      <div className="glass-card rounded-2xl p-6">
        <Tabs defaultValue="moderation">
          <TabsList className="mb-4">
            <TabsTrigger value="moderation"><ShieldCheck className="w-4 h-4 mr-2" />Moderation</TabsTrigger>
            <TabsTrigger value="promotions"><Star className="w-4 h-4 mr-2" />Promotions</TabsTrigger>
            <TabsTrigger value="roles"><Users className="w-4 h-4 mr-2" />Roles</TabsTrigger>
            <TabsTrigger value="webhooks"><ActivitySquare className="w-4 h-4 mr-2" />Webhooks</TabsTrigger>
            <TabsTrigger value="analytics"><Wallet className="w-4 h-4 mr-2" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="moderation"><ModerationTab /></TabsContent>
          <TabsContent value="promotions"><PromotionRequestsTab /></TabsContent>
          <TabsContent value="roles"><RolesTab /></TabsContent>
          <TabsContent value="webhooks"><WebhookLogsTab /></TabsContent>
          <TabsContent value="analytics">
            <div className="p-4 text-sm text-muted-foreground">
              Add charts here as needed (growth, daily signups, approvals, churn).
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default withRoleGuard(AdminConsole, ["admin", "superadmin"]);
