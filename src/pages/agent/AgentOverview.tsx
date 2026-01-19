
// src/pages/agent/AgentOverview.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Eye,
  MessageSquare,
  Star,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import PropertyCard from "@/components/dashboard/PropertyCard";
import PropertyTable from "@/components/dashboard/PropertyTable";
import ViewToggle, { ViewMode } from "@/components/ui/ViewToggle";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useMyProperties, useDeleteProperty } from "@/features/properties/hooks";

// Helper to format price
const fmtPrice = (price?: number | null) =>
  price == null ? "KES —" : `KES ${Number(price).toLocaleString("en-KE")}`;

const mapStatus = (status: string) =>
  status === "published" ? "Published" : status === "draft" ? "Draft" : "Archived";

export default function AgentOverview() {
  const storageKey = "hh_view_mode";
  const navigate = useNavigate();

  const [view, setView] = useState<ViewMode>("cards");

  // ✅ Load saved view mode
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved === "cards" || saved === "table") setView(saved as ViewMode);
  }, []);

  // ✅ Fetch agent's properties from Firestore
  const { data: recentDb = [], isLoading, isError } = useMyProperties({ pageSize: 3 });
  const deleteMutation = useDeleteProperty();

  // ✅ Map DB rows → UI-friendly model
  const items = useMemo(
    () =>
      (recentDb ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        location:
          p.location ?? [p.neighborhood, p.city, p.country].filter(Boolean).join(", "),
        price: fmtPrice(p.price),
        status: mapStatus(p.status),
        views: Number(p.views ?? 0),
        inquiries: Number(p.inquiries ?? 0),
        image: p.thumbnail_url ?? p.image ?? p.image_urls?.[0] ?? "",
        type: (p.listing_type as "rent" | "sale") ?? "rent",
      })),
    [recentDb]
  );

  // ✅ Totals for stats
  const totalProps = items.length;
  const totalViews = items.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalInquiries = items.reduce((sum, p) => sum + (p.inquiries || 0), 0);

  const handleEdit = (id: string) => navigate(`/agent/properties/${id}/edit`);
  const handleDelete = async (id: string) => deleteMutation.mutate(id);

  // ✅ Loading & Error states
  if (isLoading) return <div className="p-6 text-gray-400">Loading dashboard data...</div>;
  if (isError) return <div className="p-6 text-red-500">Failed to load properties.</div>;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Agent Dashboard"
        description="Welcome back! Here's what's happening with your properties."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Properties"
          value={totalProps}
          change="+1 this month"
          changeType="positive"
          icon={Building2}
        />
        <StatsCard
          title="Total Views"
          value={totalViews.toLocaleString("en-KE")}
          change="+12.5% from last month"
          changeType="positive"
          icon={Eye}
        />
        <StatsCard
          title="Total Inquiries"
          value={totalInquiries}
          change="+3 this week"
          changeType="positive"
          icon={MessageSquare}
        />
        <StatsCard
          title="Avg. Rating"
          value="4.8"
          change="Based on 42 reviews"
          changeType="neutral"
          icon={Star}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Properties */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-white">Recent Properties</h2>
            <div className="flex items-center gap-3">
              <ViewToggle storageKey={storageKey} value={view} onChange={setView} />
              <Link to="/agent/properties">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="p-4 text-gray-400">No recent properties found.</div>
          ) : view === "cards" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  onEdit={() => handleEdit(p.id)}
                  onView={() => navigate(`/listing/${p.id}`)}
                  onDelete={() => handleDelete(p.id)}
                  disabled={deleteMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <PropertyTable
              properties={items.map((p) => ({
                id: p.id,
                title: p.title,
                location: p.location,
                price: p.price,
                type: p.type,
                status:
                  p.status === "Published"
                    ? "published"
                    : p.status === "Draft"
                    ? "draft"
                    : "archived",
                views: p.views,
                inquiries: p.inquiries,
                image: p.image,
              }))}
              onEdit={(row) => handleEdit(row.id)}
              onDelete={(row) => handleDelete(row.id)}
            />
          )}
        </div>

        {/* Sidebar: Recent Activity + Quick Actions */}
        <div>
          <h2 className="font-display text-xl font-bold mb-4 text-white">Recent Activity</h2>
          <div className="bg-gray-900 rounded-xl shadow-lg p-4 space-y-4">
            {[
              { id: 1, type: "inquiry", message: "New inquiry on Modern 3BR Apartment", time: "2 hours ago" },
              { id: 2, type: "view", message: "Your Luxury Villa reached 2,000 views", time: "5 hours ago" },
              { id: 3, type: "review", message: "New 5-star review on Beach House", time: "1 day ago" },
              { id: 4, type: "inquiry", message: "New inquiry on Studio Apartment", time: "2 days ago" },
            ].map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
              >
                <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {activity.type === "inquiry" && <MessageSquare className="w-4 h-4 text-white" />}
                  {activity.type === "view" && <TrendingUp className="w-4 h-4 text-white" />}
                  {activity.type === "review" && <Star className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{activity.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="font-display text-xl font-bold mt-8 mb-4 text-white">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/agent/properties/new" className="block">
              <Button className="w-full justify-start" variant="outline">
                <Building2 className="w-4 h-4 mr-2" />
                Add New Property
              </Button>
            </Link>
            <Link to="/agent/messages" className="block">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                View Messages
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
