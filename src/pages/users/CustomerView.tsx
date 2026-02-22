
// src/pages/users/CustomerView.tsx

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebaseClient";
import { useNavigate } from "react-router-dom";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import PropertyCard from "@/components/dashboard/PropertyCard";
import PropertyTable from "@/components/dashboard/PropertyTable";

import {
  Building2,
  Eye,
  MessageSquare,
  Star,
  PlusCircle,
  List,
  Search,
} from "lucide-react";

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

// ---------- Helpers ----------
const fmtPrice = (price?: number | null) =>
  price == null ? "KES —" : `KES ${Number(price).toLocaleString("en-KE")}`;

const mapStatus = (status: string) =>
  status === "published"
    ? "Published"
    : status === "draft"
    ? "Draft"
    : "Archived";

export default function CustomerView() {
  const navigate = useNavigate();

  // ------------------- FIRESTORE QUERY -------------------
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-view", auth.currentUser?.uid],
    enabled: !!auth.currentUser,
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not signed in");

      // ========== A) Fetch My Properties (if user is agent) ==========
      const myPropsQ = query(
        collection(db, "properties"),
        where("agent_id", "==", user.uid),
        orderBy("created_at", "desc")
      );

      const myPropsSnap = await getDocs(myPropsQ);
      const myProps = myPropsSnap.docs.map((d) => {
        const p = d.data() as any;
        return {
          id: d.id,
          title: p.title,
          location:
            p.address ||
            [p.neighborhood, p.city].filter(Boolean).join(", ") ||
            "—",
          price: fmtPrice(p.price),
          status: mapStatus(p.status || "draft"),
          views: Number(p.views ?? 0),
          inquiries: Number(p.inquiries ?? 0),
          image: p.thumbnail_url ?? p.image ?? (p.images?.[0] ?? ""),
          type: p.type ?? "rent",
        };
      });

      // ========== B) Fetch Liked Properties (❤️ favorites) ==========
      const favSnap = await getDocs(
        collection(db, "user_favorites", user.uid, "properties")
      );

      const likedIds = favSnap.docs.map((d) => d.id);

      const likedProps = await Promise.all(
        likedIds.map(async (pid) => {
          const psnap = await getDoc(doc(db, "properties", pid));
          if (!psnap.exists()) return null;
          const p = psnap.data() as any;

          return {
            id: pid,
            title: p.title,
            location:
              p.address ||
              [p.neighborhood, p.city].filter(Boolean).join(", ") ||
              "—",
            price: fmtPrice(p.price),
            status: mapStatus(p.status || "published"),
            views: Number(p.views ?? 0),
            inquiries: Number(p.inquiries ?? 0),
            image: p.thumbnail_url ?? p.image ?? (p.images?.[0] ?? ""),
            type: p.type ?? "rent",
          };
        })
      );

      // ========== C) Saved Searches (if using) ==========
      const ssSnap = await getDocs(
        query(collection(db, "saved_searches"), where("userId", "==", user.uid))
      );

      return {
        myProps,
        liked: likedProps.filter(Boolean) as any[],
        savedSearchesCount: ssSnap.size ?? 0,
      };
    },
  });

  const myProps = data?.myProps ?? [];
  const liked = data?.liked ?? [];
  const savedSearchesCount = data?.savedSearchesCount ?? 0;

  // Aggregates
  const totalViews = useMemo(
    () => [...myProps, ...liked].reduce((s, p) => s + (p.views || 0), 0),
    [myProps, liked]
  );

  const totalInquiries = useMemo(
    () => [...myProps, ...liked].reduce((s, p) => s + (p.inquiries || 0), 0),
    [myProps, liked]
  );

  // ---------- UI STATES ----------
  if (isLoading)
    return <div className="p-6 text-muted-foreground">Loading dashboard…</div>;

  if (error)
    return (
      <div className="p-6 text-destructive">
        Failed to load your view: {String(error)}
      </div>
    );

  // ---------- RETURN UI ----------
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Customer Dashboard"
        description="Quick actions, your saved homes, and your activity."
      />

      {/* Quick Links */}
      <section aria-label="Quick actions">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/listings")}
            className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary glow-orange">
                <List className="size-5" />
              </span>
              <div className="text-left">
                <div className="font-semibold">Browse</div>
                <div className="text-xs text-muted-foreground">
                  View all properties
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Explore</span>
          </button>

          <button
            onClick={() => navigate("/favorites")}
            className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary glow-orange">
                <Star className="size-5" />
              </span>
              <div className="text-left">
                <div className="font-semibold">Saved Homes</div>
                <div className="text-xs text-muted-foreground">
                  {liked.length} saved
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">View</span>
          </button>

          <button
            onClick={() => navigate("/saved-searches")}
            className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary glow-orange">
                <Search className="size-5" />
              </span>
              <div className="text-left">
                <div className="font-semibold">Saved Searches</div>
                <div className="text-xs text-muted-foreground">
                  {savedSearchesCount} saved
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Manage</span>
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <StatsCard
          title="Saved Properties"
          value={liked.length}
          change="Favorited"
          changeType="neutral"
          icon={Star}
        />
        <StatsCard
          title="Total Views"
          value={totalViews.toLocaleString("en-KE")}
          change="Across listings"
          changeType="neutral"
          icon={Eye}
        />
        <StatsCard
          title="Total Inquiries"
          value={totalInquiries}
          change="From your activity"
          changeType="neutral"
          icon={MessageSquare}
        />
        <StatsCard
          title="Saved Searches"
          value={savedSearchesCount}
          change="Search activity"
          changeType="neutral"
          icon={Search}
        />
      </div>

      {/* ⭐ Liked Properties */}
      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold">Liked Properties</h2>
        {liked.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-muted-foreground">
            You haven’t liked any properties yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {liked.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                onView={() => navigate(`/listing/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
