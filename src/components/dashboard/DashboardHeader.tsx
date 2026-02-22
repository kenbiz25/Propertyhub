
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type DashboardHeaderProps = {
  title: string;
  description?: string;
};

export default function DashboardHeader({ title, description }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="mt-4 md:mt-0 flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search properties..."
            className="pl-10 bg-background/60 border-border"
          />
        </div>
      </div>
    </header>
  );
}
