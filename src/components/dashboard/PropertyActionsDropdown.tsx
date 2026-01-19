
// src/components/dashboard/PropertyActionsDropdown.tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Copy, Archive, Trash2 } from "lucide-react";

import { db } from "@/lib/firebaseClient";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export type ActionsRow = {
  id: string;
  title: string;
  // optional extras if you need them later
};

type Props = {
  row: ActionsRow;
  disabled?: boolean;
  onEdit?: (row: ActionsRow) => void;
  onDelete?: (row: ActionsRow) => Promise<void> | void;
  onDuplicate?: (row: ActionsRow) => Promise<void> | void;
  onArchive?: (row: ActionsRow) => Promise<void> | void;
  onAfterAction?: () => void; // e.g., refetch table
};

export default function PropertyActionsDropdown({
  row,
  disabled,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onAfterAction,
}: Props) {
  const doDuplicate = async () => {
    // Allow parent override first
    if (onDuplicate) return onDuplicate(row);

    // Default behavior: duplicate the Firestore doc
    const srcRef = doc(db, "properties", row.id);
    const snap = await getDoc(srcRef);
    if (!snap.exists()) {
      throw new Error("Source property not found");
    }

    const { id: _, created_at, updated_at, ...rest } = snap.data();

    // Generate a new ID and create the copy
    const newId = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

    const destRef = doc(db, "properties", newId);
    await setDoc(destRef, {
      ...rest,
      title: `${row.title} (copy)`,
      // Keep agent_id; set timestamps explicitly if you rely on them
      created_at: Date.now(),
      // Optionally reset counters/status:
      // views: 0, inquiries: 0, status: "draft",
    });

    onAfterAction?.();
  };

  const doArchive = async () => {
    if (onArchive) return onArchive(row);

    const ref = doc(db, "properties", row.id);
    await updateDoc(ref, { status: "archived" });

    onAfterAction?.();
  };

  const doDelete = async () => {
    if (onDelete) return onDelete(row);

    const ref = doc(db, "properties", row.id);
    await deleteDoc(ref);

    onAfterAction?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-300 hover:text-white"
          disabled={disabled}
          aria-label="More actions"
          title="More actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onEdit?.(row)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>

        <DropdownMenuItem onClick={doDuplicate}>
          <Copy className="mr-2 h-4 w-4" /> Duplicate
        </DropdownMenuItem>

        <DropdownMenuItem onClick={doArchive}>
          <Archive className="mr-2 h-4 w-4" /> Archive
        </DropdownMenuItem>

        <DropdownMenuItem
          className="text-red-600 focus:text-red-700"
          onClick={doDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
