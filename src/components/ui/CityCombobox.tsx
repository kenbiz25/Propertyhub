import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CityCombobox({
  value,
  onChange,
  options,
  placeholder = "Search or type city/town…",
  disabled = false,
  className,
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const trimmed = inputValue.trim();

  // Options that match the current search input
  const filtered = trimmed
    ? options.filter((c) => c.toLowerCase().includes(trimmed.toLowerCase()))
    : options;

  // Show "Use '[typed]'" only when the typed text doesn't exactly match any option
  const showCustomOption =
    trimmed.length > 0 &&
    !options.some((c) => c.toLowerCase() === trimmed.toLowerCase());

  function select(city: string) {
    onChange(city === value ? "" : city);
    setInputValue("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setInputValue(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search or enter custom…"
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed && showCustomOption) {
                select(trimmed);
              }
            }}
          />
          <CommandList>
            {showCustomOption && (
              <CommandGroup heading="Custom entry">
                <CommandItem value={trimmed} onSelect={() => select(trimmed)}>
                  <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                  Use &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading={trimmed ? "Suggestions" : "All towns"}>
              {filtered.length === 0 && !showCustomOption && (
                <p className="py-2 px-3 text-sm text-muted-foreground">No match. Type to add custom.</p>
              )}
              {filtered.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => select(city)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === city ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
