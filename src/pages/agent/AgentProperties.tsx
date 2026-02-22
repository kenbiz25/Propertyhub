
// src/pages/agent/AgentProperties.tsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Filter, Search, LayoutGrid, Table } from "lucide-react";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PropertyTable from "@/components/dashboard/PropertyTable";
import PropertyCard from "@/components/dashboard/PropertyCard";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useMyProperties, useDeleteProperty, useSetPropertyStatus } from "@/features/properties/hooks";

// ---- Helpers & constants ----
const fmtPrice = (price?: number | null) =>
  price == null ? "KES —" : `KES ${Number(price).toLocaleString("en-KE")}`;

type StatusKey = "published" | "draft" | "archived";
type TypeKey = "rent" | "sale" | "lease";

const STATUS_OPTIONS: StatusKey[] = ["published", "draft", "archived"];
const TYPE_OPTIONS: TypeKey[] = ["rent", "sale", "lease"];

// Normalize DB → lowercase status/type keys for filtering
const toStatusKey = (s?: string | null): StatusKey =>
  (String(s ?? "").toLowerCase() as StatusKey) || "draft";

const toTypeKey = (t?: string | null): TypeKey => {
  const v = String(t ?? "").toLowerCase();
  if (v === "rent" || v === "sale" || v === "lease") return v;
  return "rent";
};

// ---- Component ----
interface AgentPropertiesProps {
  /** Base route for links (default '/agent'). Use '/dashboard' to align with your dashboard paths */
  basePath?: "/agent" | "/dashboard";
}

export default function AgentProperties({ basePath = "/agent" }: AgentPropertiesProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [view, setView] = useState<"table" | "card">("table");

  // ✅ Fetch agent's properties from Firestore
  const { data: rowsDb, isLoading, isError } = useMyProperties({ pageSize: 50 });
  const rows = rowsDb?.data ?? [];
  const deleteMutation = useDeleteProperty();
  const statusMutation = useSetPropertyStatus();

  // ✅ Map DB rows → UI-friendly model
  const mapped = useMemo(
    () =>
      (rows ?? []).map((p: any) => {
        const statusKey = toStatusKey(p.status);
        const typeKey = toTypeKey(p.listing_type);

        return {
          id: p.id,
          title: p.title ?? "Untitled",
          location:
            p.location ??
            [p.neighborhood, p.city, p.country].filter(Boolean).join(", "),
          price: fmtPrice(p.price),
          statusLabel:
            statusKey === "published"
              ? "Published"
              : statusKey === "draft"
              ? "Draft"
              : "Archived",
          statusKey, // for filters/table mapping
          views: Number(p.views ?? 0),
          inquiries: Number(p.inquiries ?? 0),
          // prefer thumbnail, then single image, then first of array
          image: p.thumbnail_url ?? p.image ?? p.image_urls?.[0] ?? "",
          typeKey,
          is_promoted: !!p.is_promoted,
          verified: !!p.verified,
        };
      }),
    [rows]
  );

  // ✅ Summaries (nice chips under header)
  const summary = useMemo(() => {
    const total = mapped.length;
    const byStatus = {
      published: mapped.filter((m) => m.statusKey === "published").length,
      draft: mapped.filter((m) => m.statusKey === "draft").length,
      archived: mapped.filter((m) => m.statusKey === "archived").length,
    };
    return { total, ...byStatus };
  }, [mapped]);

  // ✅ Apply filters
  const filtered = useMemo(() => {
    return mapped.filter((property) => {
      const matchesSearch =
        property.title.toLowerCase().includes(search.toLowerCase()) ||
        (property.location ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || property.statusKey === statusFilter;

      const matchesType =
        typeFilter === "all" || property.typeKey === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [mapped, search, statusFilter, typeFilter]);

  const handleDelete = (id: string, title?: string) => {
    const ok = confirm(`Delete "${title ?? "this property"}"? This cannot be undone.`);
    if (!ok) return;
    deleteMutation.mutate(id);
  };

  const handlePublish = (id: string) =>
    statusMutation.mutate({ id, status: "published" });

  const handlePause = (id: string) =>
    statusMutation.mutate({ id, status: "draft" });

  // ---- UI ----
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="glass-card rounded-xl p-8 animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4" />
          <div className="h-4 bg-muted rounded w-2/3 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-red-500">
        Failed to load properties. Please try again.
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        title="My Properties"
        description="Manage and track all your property listings."
      />

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary">
          Total: {summary.total}
        </div>
        <div className="px-3 py-1 text-sm rounded-full bg-green-500/10 text-green-600">
          Published: {summary.published}
        </div>
        <div className="px-3 py-1 text-sm rounded-full bg-yellow-500/10 text-yellow-600">
          Draft: {summary.draft}
        </div>
        <div className="px-3 py-1 text-sm rounded-full bg-gray-500/10 text-gray-600">
          Archived: {summary.archived}
        </div>
      </div>

      {/* Filters + actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button asChild className="shrink-0">
            <Link to={`${basePath}/list-property`}>
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Link>
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt === "published"
                    ? "Published"
                    : opt === "draft"
                    ? "Draft"
                    : "Archived"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt === "rent" ? "For Rent" : opt === "sale" ? "For Sale" : "For Lease"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex gap-1 rounded-lg border border-muted overflow-hidden">
            <Button
              variant={view === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("table")}
              className={view === "table" ? "" : "bg-transparent"}
              aria-label="Table view"
            >
              <Table className="w-4 h-4 mr-2" />
              Table
            </Button>
            <Button
              variant={view === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("card")}
              className={view === "card" ? "" : "bg-transparent"}
              aria-label="Card view"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Cards
            </Button>
          </div>

          <Link to={`${basePath}/properties/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      {filtered.length > 0 ? (
        view === "table" ? (
          <PropertyTable
            properties={filtered.map((p) => ({
              id: p.id,
              title: p.title,
              location: p.location,
              price: p.price,
              type: p.typeKey,
              status: p.statusKey,
              views: p.views,
              inquiries: p.inquiries,
              image: p.image,
            }))}
            getBoostHref={(row) => `${basePath}/boost/${row.id}`}
            onEdit={(row) =>
              (window.location.href = `${basePath}/properties/${row.id}/edit`)
            }
            onDelete={(row) => handleDelete(row.id, row.title)}
            onPublish={(row) => handlePublish(row.id)}
            onPause={(row) => handlePause(row.id)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <PropertyCard
                key={p.id}
                property={{
                  id: p.id,
                  title: p.title,
                  location: p.location,
                  price: p.price,
                  status: p.statusLabel,
                  statusKey: p.statusKey,
                  views: p.views,
                  inquiries: p.inquiries,
                  image: p.image,
                }}
                boostHref={`${basePath}/boost/${p.id}`}
                onEdit={() =>
                  (window.location.href = `${basePath}/properties/${p.id}/edit`)
                }
                onDelete={() => handleDelete(p.id, p.title)}
                onPublish={() => handlePublish(p.id)}
                onPause={() => handlePause(p.id)}
                onView={() => (window.location.href = `/listing/${p.id}`)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No properties found matching your criteria.
          </p>
          <Link to={`${basePath}/properties/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Property
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}