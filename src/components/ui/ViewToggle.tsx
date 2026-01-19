
// src/components/ui/ViewToggle.tsx
import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "cards" | "table";

type Props = {
  value?: ViewMode;
  onChange?: (mode: ViewMode) => void;
  storageKey?: string; // default: "hh_view_mode"
};

export default function ViewToggle({ value, onChange, storageKey = "hh_view_mode" }: Props) {
  const [internal, setInternal] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(storageKey);
    return (saved === "table" || saved === "cards") ? (saved as ViewMode) : "cards";
  });

  // Keep internal and external in sync
  useEffect(() => {
    if (!value) return;
    setInternal(value);
  }, [value]);

  const setMode = (mode: ViewMode) => {
    setInternal(mode);
    localStorage.setItem(storageKey, mode);
    onChange?.(mode);
  };

  const baseBtn =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition border";
  const active =
    "bg-orange-600 text-white border-orange-600 shadow";
  const inactive =
    "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700";

  return (
    <div role="tablist" aria-label="View mode" className="flex gap-2">
      <button
        role="tab"
        aria-selected={internal === "cards"}
        className={`${baseBtn} ${internal === "cards" ? active : inactive}`}
        onClick={() => setMode("cards")}
      >
        <LayoutGrid className="w-4 h-4" aria-hidden />
        Cards
      </button>
      <button
        role="tab"
        aria-selected={internal === "table"}
        className={`${baseBtn} ${internal === "table" ? active : inactive}`}
        onClick={() => setMode("table")}
      >
        <List className="w-4 h-4" aria-hidden />
        Table
      </button>
    </div>
  );
}