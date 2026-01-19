
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PropertyActionsDropdown, {
  ActionsRow,
} from "@/components/dashboard/PropertyActionsDropdown";
import { Pencil } from "lucide-react";

type PropertyCardProps = {
  property: {
    id: string;
    title: string;
    location: string;
    price: string;        // e.g. "KES 120,000"
    status: string;       // "Published" | "Draft" | "Archived" or similar
    views: number;
    inquiries: number;
    image: string;        // thumbnail URL
  };
  onEdit?: (propertyId: string) => void;
  onDelete?: (propertyId: string) => Promise<void> | void;
  onDuplicate?: (propertyId: string) => Promise<void> | void;
  onArchive?: (propertyId: string) => Promise<void> | void;
  onView?: (propertyId: string) => void;
  onAfterAction?: () => void; // e.g., refresh list
};

export default function PropertyCard({
  property,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onView,
  onAfterAction,
}: PropertyCardProps) {
  const statusClass =
    property.status === "Published"
      ? "bg-green-600 text-white"
      : property.status === "Draft"
      ? "bg-gray-600 text-white"
      : "bg-orange-600 text-white"; // Archived → orange per your theme

  const actionsRow: ActionsRow = { id: property.id, title: property.title };

  return (
    <Card className="relative bg-gray-900 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition border border-gray-800">
      {/* Header: title/location + 3-dots actions */}
      <CardHeader className="p-4 pb-2 flex items-start justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm">{property.title}</h3>
          <p className="text-gray-400 text-xs">{property.location}</p>
        </div>

        {/* Shared dropdown so actions match the table */}
        <PropertyActionsDropdown
          row={actionsRow}
          onEdit={() => onEdit?.(property.id)}
          onDuplicate={() => onDuplicate?.(property.id)}
          onArchive={() => onArchive?.(property.id)}
          onDelete={() => onDelete?.(property.id)}
          onAfterAction={onAfterAction}
        />
      </CardHeader>

      {/* Thumbnail + metrics */}
      <CardContent className="px-4 pb-0">
        <div className="aspect-video rounded-md bg-gray-800 overflow-hidden">
          {property.image ? (
            <img
              src={property.image}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              No photo
            </div>
          )}
        </div>

        <div className="mt-3">
          <p className="text-orange-500 font-bold">{property.price}</p>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
            <span>{property.views.toLocaleString()} views</span>
            <span>{property.inquiries} inquiries</span>
          </div>
        </div>
      </CardContent>

      {/* Status chip + inline Edit/View buttons */}
      <CardFooter className="px-4 py-3 flex items-center justify-between">
        <span className={`px-2 py-1 rounded text-xs ${statusClass}`}>
          {property.status}
        </span>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onEdit?.(property.id)}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="default"
            size="sm"
            className="text-xs"
            onClick={() => onView?.(property.id)}
          >
            View
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
