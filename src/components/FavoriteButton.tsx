
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  onToggle: () => void;
  className?: string;
};
export function FavoriteButton({ active, onToggle, className }: Props) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-background/80 hover:bg-background",
        className
      )}
    >
      <Heart className={`w-5 h-5 ${active ? "fill-current" : ""}`} />
    </button>
  );
}
