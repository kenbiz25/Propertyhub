
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { COUNTRIES } from "@/lib/constants/countries";

export default function PropertyFiltersBar({ filters, onChange }:{filters:any; onChange:(f:any)=>void}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
      <Input placeholder="Search…" value={filters.q ?? ""} onChange={e => onChange({ ...filters, q: e.target.value })} />
      <Select value={filters.country ?? ""} onValueChange={(v)=>onChange({ ...filters, country: v })}>
        <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
        <SelectContent>{COUNTRIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={filters.listing_type ?? ""} onValueChange={(v)=>onChange({ ...filters, listing_type: v as any })}>
        <SelectTrigger><SelectValue placeholder="Rent/Sale" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="rent">Rent</SelectItem>
          <SelectItem value="sale">Sale</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.property_type ?? ""} onValueChange={(v)=>onChange({ ...filters, property_type: v })}>
        <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          {["Apartment","House","Villa","Studio","Bedsitter","Commercial","Land"].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Max Price</label>
        <Slider defaultValue={[filters.max_price ?? 200000]} min={10000} max={5000000}
          onValueChange={([v])=>onChange({ ...filters, max_price: v })}/>
      </div>
      {/* add more selects for bedrooms, bathrooms, furnishing, amenities... */}
    </div>
  );
}
