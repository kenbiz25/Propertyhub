
// src/pages/admin/AdminConsole.tsx
import React, { useState } from "react";
import { withRoleGuard } from "@/components/auth/withRoleGuard";
import { Link, useSearchParams } from "react-router-dom";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, Building2, Star, Wallet, ShieldCheck, ActivitySquare, Zap, CheckCircle, XCircle, Clock } from "lucide-react";
import { db } from "@/lib/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection, query, where, getCountFromServer, getDocs, orderBy, limit, updateDoc, doc, serverTimestamp, Timestamp, runTransaction
} from "firebase/firestore";

const assignAgentCodeIfMissing = async (userId: string) => {
  await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await tx.get(userRef);
    const userData = userSnap.data() as any;
    if (userData?.agent_code) return;

    const counterRef = doc(db, "meta", "agent_codes");
    const counterSnap = await tx.get(counterRef);
    const next = Number(counterSnap.data()?.next_code ?? 1) || 1;

    tx.set(counterRef, { next_code: next + 1 }, { merge: true });
    tx.set(userRef, { agent_code: next }, { merge: true });
  });
};

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
  const role = typeof window !== "undefined" ? localStorage.getItem("hh_role") : null;
  const isSuperAdmin = role === "superadmin";
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

  const removeListing = useMutation({
    mutationFn: async ({ listingId, reportId }: { listingId: string; reportId: string }) => {
      await updateDoc(doc(db, "properties", listingId), {
        status: "archived",
        removed_at: serverTimestamp(),
        removed_reason: "moderation",
      });
      await updateDoc(doc(db, "reports", reportId), { status: "approved" });
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
            <Button
              variant="destructive"
              disabled={!isSuperAdmin || !r.listing_id}
              onClick={() => removeListing.mutate({ listingId: r.listing_id, reportId: r.id })}
            >
              Remove Listing
            </Button>
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
            <Button asChild><Link to={`/admin/promotions/${r.id}`}>Details</Link></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

type CampaignStatus = "all" | "pending" | "active" | "expired" | "rejected";

function CampaignsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus>("all");
  const [overrideDays, setOverrideDays] = useState<Record<string, number>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ["boost-requests"],
    queryFn: async () => {
      const q = query(collection(db, "boost_requests"), orderBy("created_at", "desc"), limit(200));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
    refetchInterval: 20000,
  });

  const activate = useMutation({
    mutationFn: async ({ id, durationDays }: { id: string; durationDays: number }) => {
      const now = new Date();
      const endAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, "boost_requests", id), {
        status: "active",
        paid_at: serverTimestamp(),
        start_at: serverTimestamp(),
        end_at: Timestamp.fromDate(endAt),
        activated_days: durationDays,
        updated_at: serverTimestamp(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boost-requests"] }),
  });

  const reject = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await updateDoc(doc(db, "boost_requests", id), {
        status: "rejected",
        updated_at: serverTimestamp(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boost-requests"] }),
  });

  const now = Date.now();

  const rowStatus = (r: any): CampaignStatus => {
    if (r.status === "rejected") return "rejected";
    if (r.status === "active") {
      const endMs = r.end_at?.toDate?.()?.getTime?.() ?? 0;
      return endMs < now ? "expired" : "active";
    }
    return "pending";
  };

  const filtered = statusFilter === "all" ? data : data.filter((r) => rowStatus(r) === statusFilter);

  const statusCounts = {
    all: data.length,
    pending: data.filter((r) => rowStatus(r) === "pending").length,
    active: data.filter((r) => rowStatus(r) === "active").length,
    expired: data.filter((r) => rowStatus(r) === "expired").length,
    rejected: data.filter((r) => rowStatus(r) === "rejected").length,
  };

  const statusBadge = (s: CampaignStatus) => {
    const map: Record<CampaignStatus, string> = {
      all: "",
      pending: "bg-yellow-500/20 text-yellow-400",
      active: "bg-green-500/20 text-green-400",
      expired: "bg-gray-500/20 text-gray-400",
      rejected: "bg-red-500/20 text-red-400",
    };
    return map[s] || "";
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading campaigns…</div>;

  return (
    <div className="space-y-4">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "active", "expired", "rejected"] as CampaignStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Listing", "Agent", "Slot", "Duration", "Price (KES)", "M-Pesa Code", "Submitted", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No campaigns found.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const status = rowStatus(r);
              const defaultDays = Number(r.duration_days ?? 7) || 7;
              const days = overrideDays[r.id] ?? defaultDays;
              const createdAt = r.created_at?.toDate?.();
              const endAt = r.end_at?.toDate?.();

              return (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[160px] truncate">
                    {r.listing_title ?? r.listing_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">
                    {r.agent_email ?? r.agent_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.slot_type === "premium" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {r.slot_type ?? "standard"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.duration_label ?? `${defaultDays}d`}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">
                    {r.price_kes ? `KES ${Number(r.price_kes).toLocaleString("en-KE")}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.mpesa_code ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {createdAt ? createdAt.toLocaleDateString("en-KE") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusBadge(status)}`}>
                      {status}
                      {status === "active" && endAt && (
                        <span className="ml-1 text-[10px]">until {endAt.toLocaleDateString("en-KE")}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {status === "pending" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={days}
                          onChange={(e) => setOverrideDays((prev) => ({ ...prev, [r.id]: Number(e.target.value) || defaultDays }))}
                          className="w-16 rounded border border-border bg-background px-2 py-1 text-xs text-center"
                          title="Override days"
                        />
                        <span className="text-xs text-muted-foreground">days</span>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => activate.mutate({ id: r.id, durationDays: days })}
                          disabled={activate.isPending}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Activate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => reject.mutate({ id: r.id })}
                          disabled={reject.isPending}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {status === "active" && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" /> Live
                      </span>
                    )}
                    {status === "expired" && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" /> Expired
                      </span>
                    )}
                    {status === "rejected" && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400">
                        <XCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
      await runTransaction(db, async (tx) => {
        const userRef = doc(db, "users", id);
        const userSnap = await tx.get(userRef);
        const userData = userSnap.data() as any;
        const update: Record<string, any> = { role };

        if (role === "agent" && !userData?.agent_code) {
          const counterRef = doc(db, "meta", "agent_codes");
          const counterSnap = await tx.get(counterRef);
          const next = Number(counterSnap.data()?.next_code ?? 1) || 1;
          tx.set(counterRef, { next_code: next + 1 }, { merge: true });
          update.agent_code = next;
        }

        tx.set(userRef, update, { merge: true });
      });
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
            {u.agent_code && (
              <div className="text-xs text-muted-foreground">Agent code: {u.agent_code}</div>
            )}
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

function AgentProfilesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["agents-list"],
    queryFn: async () => {
      const q = query(collection(db, "users"), where("role", "==", "agent"), orderBy("created_at", "desc"), limit(200));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<any>({});

  const onSelect = (u: any) => {
    setSelectedId(u.id);
    setForm({
      full_name: u.full_name ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      company: u.company ?? "",
      location: u.location ?? "",
      bio: u.bio ?? "",
      socials: {
        facebook: u.socials?.facebook ?? "",
        instagram: u.socials?.instagram ?? "",
        twitter: u.socials?.twitter ?? "",
        whatsapp: u.socials?.whatsapp ?? "",
        tiktok: u.socials?.tiktok ?? "",
      },
    });
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      await updateDoc(doc(db, "users", selectedId), {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        location: form.location,
        bio: form.bio,
        socials: form.socials,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents-list"] }),
  });

  const assignCode = useMutation({
    mutationFn: async (id: string) => assignAgentCodeIfMissing(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents-list"] }),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-3">
        {data?.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u)}
            className={`w-full text-left glass-card rounded-2xl p-4 border ${selectedId === u.id ? "border-primary" : "border-transparent"}`}
          >
            <div className="font-display">{u.full_name ?? u.email ?? u.id}</div>
            <div className="text-xs text-muted-foreground">Agent code: {u.agent_code ?? "—"}</div>
          </button>
        ))}
      </div>

      <div className="lg:col-span-2 glass-card rounded-2xl p-6">
        {!selectedId ? (
          <div className="text-sm text-muted-foreground">Select an agent to edit their profile.</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Edit Agent Profile</h3>
              <Button variant="outline" onClick={() => assignCode.mutate(selectedId)}>
                Assign Code
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={form.full_name ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={form.email ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={form.company ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} value={form.bio ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, bio: e.target.value }))} />
              </div>
            </div>

            <div>
              <h4 className="font-display text-base font-semibold mb-3">Socials</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input id="facebook" value={form.socials?.facebook ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, socials: { ...f.socials, facebook: e.target.value } }))} />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" value={form.socials?.instagram ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, socials: { ...f.socials, instagram: e.target.value } }))} />
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input id="twitter" value={form.socials?.twitter ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, socials: { ...f.socials, twitter: e.target.value } }))} />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input id="whatsapp" value={form.socials?.whatsapp ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, socials: { ...f.socials, whatsapp: e.target.value } }))} />
                </div>
                <div>
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input id="tiktok" value={form.socials?.tiktok ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, socials: { ...f.socials, tiktok: e.target.value } }))} />
                </div>
              </div>
            </div>

            <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function KycApprovalsTab() {
  const qc = useQueryClient();
  const [reasons, setReasons] = React.useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["kyc-approvals"],
    queryFn: async () => {
      const q = query(
        collection(db, "users"),
        where("kyc_submitted", "==", true),
        where("kyc_verified", "==", false),
        orderBy("kyc_submitted_at", "desc"),
        limit(200)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    },
  });

  const approve = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await updateDoc(doc(db, "users", id), {
        kyc_verified: true,
        kyc_verified_at: serverTimestamp(),
        kyc_rejected: false,
        kyc_rejected_reason: null,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kyc-approvals"] }),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await updateDoc(doc(db, "users", id), {
        kyc_verified: false,
        kyc_rejected: true,
        kyc_rejected_reason: reason ?? null,
        kyc_rejected_at: serverTimestamp(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kyc-approvals"] }),
  });

  if (isLoading) return <div className="p-4 text-gray-400">Loading KYC submissions…</div>;

  return (
    <div className="space-y-3">
      {data?.map((u) => {
        const docs = u.kyc_documents as Record<string, { url?: string; name?: string; type?: string }> | undefined;
        const reason = reasons[u.id] ?? "";
        return (
          <div key={u.id} className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="font-display">{u.full_name ?? u.email ?? u.id}</div>
                <div className="text-xs text-muted-foreground">User ID: {u.id}</div>
                {u.agent_code && (
                  <div className="text-xs text-muted-foreground">Agent code: {u.agent_code}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => approve.mutate({ id: u.id })} disabled={approve.isPending}>
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => reject.mutate({ id: u.id, reason: reason.trim() || undefined })}
                  disabled={reject.isPending}
                >
                  Reject
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Documents</Label>
              {docs && Object.keys(docs).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(docs).map(([key, val]) => (
                    <a
                      key={key}
                      href={val?.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {key.replace(/_/g, " ")}
                      {val?.name ? ` — ${val.name}` : ""}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No documents uploaded.</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`kyc-reason-${u.id}`}>Rejection reason (optional)</Label>
              <Input
                id={`kyc-reason-${u.id}`}
                value={reason}
                onChange={(e) => setReasons((r) => ({ ...r, [u.id]: e.target.value }))}
                placeholder="Reason for rejection"
              />
            </div>
          </div>
        );
      })}
      {(!data || data.length === 0) && (
        <div className="text-sm text-muted-foreground">No pending KYC submissions.</div>
      )}
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
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "campaigns" ? "campaigns" : "moderation";

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Admin Console"
        description="Moderate content, manage campaigns, roles, and monitor system health."
      />

      <OverviewMetrics />

      <div className="glass-card rounded-2xl p-6">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-4 flex-wrap md:flex-nowrap overflow-x-auto">
            <TabsTrigger value="moderation"><ShieldCheck className="w-4 h-4 mr-2" />Moderation</TabsTrigger>
            <TabsTrigger value="kyc"><ShieldCheck className="w-4 h-4 mr-2" />KYC Approvals</TabsTrigger>
            <TabsTrigger value="campaigns"><Zap className="w-4 h-4 mr-2" />Payments &amp; Campaigns</TabsTrigger>
            <TabsTrigger value="promotions"><Star className="w-4 h-4 mr-2" />Promotions</TabsTrigger>
            <TabsTrigger value="roles"><Users className="w-4 h-4 mr-2" />Roles</TabsTrigger>
            <TabsTrigger value="agents"><Users className="w-4 h-4 mr-2" />Agent Profiles</TabsTrigger>
            <TabsTrigger value="webhooks"><ActivitySquare className="w-4 h-4 mr-2" />Webhooks</TabsTrigger>
            <TabsTrigger value="analytics"><Wallet className="w-4 h-4 mr-2" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="moderation"><ModerationTab /></TabsContent>
          <TabsContent value="kyc"><KycApprovalsTab /></TabsContent>
          <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
          <TabsContent value="promotions"><PromotionRequestsTab /></TabsContent>
          <TabsContent value="roles"><RolesTab /></TabsContent>
          <TabsContent value="agents"><AgentProfilesTab /></TabsContent>
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
