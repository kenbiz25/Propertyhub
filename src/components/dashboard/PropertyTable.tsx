
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDeleteProperty } from "@/features/properties/hooks";
import PropertyActionsDropdown, {
  ActionsRow,
} from "@/components/dashboard/PropertyActionsDropdown";

export type Row = {
  id: string;
  title: string;
  location: string;
  price: number | string;
  type: "rent" | "sale";
  status: "published" | "draft" | "archived";
  views: number;
  inquiries: number;
  image?: string;
};

type Props = {
  properties: Row[];
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => Promise<void> | void;
  onDuplicate?: (row: Row) => Promise<void> | void;
  onArchive?: (row: Row) => Promise<void> | void;
  onAfterAction?: () => void; // e.g., refresh list
};

export default function PropertyTable({
  properties,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onAfterAction,
}: Props) {
  const navigate = useNavigate();
  const delMutation = useDeleteProperty();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const badge = (status: Row["status"]) => {
    switch (status) {
      case "published":
        return "bg-green-600 text-white";
      case "draft":
        return "bg-gray-600 text-white";
      case "archived":
        return "bg-orange-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const typePill = (type: Row["type"]) =>
    type === "rent"
      ? "bg-blue-600/20 text-blue-300 border border-blue-600/40"
      : "bg-purple-600/20 text-purple-300 border border-purple-600/40";

  const handleEdit = (row: Row) => {
    if (onEdit) return onEdit(row);
    navigate(`/dashboard/properties/${row.id}/edit`);
  };

  const handleDelete = async (row: Row) => {
    const ok = confirm(`Delete "${row.title}"? This cannot be undone.`);
    if (!ok) return;

    try {
      setDeletingId(row.id);
      if (onDelete) {
        await onDelete(row);
      } else {
        await delMutation.mutateAsync(row.id); // Supabase delete + React Query invalidate
      }
      toast.success(`Deleted "${row.title}"`);
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err?.message ?? "Failed to delete property");
    } finally {
      setDeletingId(null);
      onAfterAction?.();
    }
  };

  const handleDuplicate = async (row: Row) => {
    try {
      if (onDuplicate) {
        await onDuplicate(row);
      } else {
        // fallback handled inside PropertyActionsDropdown if not provided here
      }
      toast.success(`Duplicated "${row.title}"`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to duplicate property");
    } finally {
      onAfterAction?.();
    }
  };

  const handleArchive = async (row: Row) => {
    try {
      if (onArchive) {
        await onArchive(row);
      } else {
        // fallback handled inside PropertyActionsDropdown if not provided here
      }
      toast.success(`Archived "${row.title}"`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to archive property");
    } finally {
      onAfterAction?.();
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-900 text-gray-300">
          <tr>
            <th className="px-4 py-3 text-left">Property</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Price (KES)</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Views</th>
            <th className="px-4 py-3 text-left">Inquiries</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-950 text-gray-200">
          {properties.map((p) => {
            const isDeleting = deletingId === p.id;
            const actionsRow: ActionsRow = { id: p.id, title: p.title };

            return (
              <tr key={p.id} className="hover:bg-gray-900">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-800" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-white">{p.title}</div>
                      <div className="text-xs text-gray-400">{p.location}</div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${typePill(p.type)}`}>
                    {p.type === "rent" ? "For Rent" : "For Sale"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {typeof p.price === "number"
                    ? `Ksh ${p.price.toLocaleString()}`
                    : p.price}
                </td>

                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${badge(p.status)}`}>
                    {p.status === "published"
                      ? "Published"
                      : p.status === "draft"
                      ? "Draft"
                      : "Archived"}
                  </span>
                </td>

                <td className="px-4 py-3">{p.views.toLocaleString()}</td>
                <td className="px-4 py-3">{p.inquiries}</td>

                <td className="px-4 py-3">
                  {/* Unified 3-dots actions to match cards */}
                  <div className="flex items-center gap-2">
                    {/* Keep inline buttons if you like; otherwise rely solely on the dropdown */}
                    <PropertyActionsDropdown
                      row={actionsRow}
                      disabled={isDeleting}
                      onEdit={(r) => handleEdit(p)}
                      onDelete={(r) => handleDelete(p)}
                      onDuplicate={(r) => handleDuplicate(p)}
                      onArchive={(r) => handleArchive(p)}
                      onAfterAction={onAfterAction}
                    />
                  </div>
                </td>
              </tr>
            );
          })}

          {properties.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-gray-400" colSpan={7}>
                No properties to show.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
