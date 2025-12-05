import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Filter, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

export interface FilterState {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  priceMin: string;
  priceMax: string;
  tagIds: string[];
}

interface Tag {
  id: string;
  name_bn: string;
  color: string;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  tags: Tag[];
  onClear: () => void;
}

const AdvancedFilters = ({ filters, onFiltersChange, tags, onClear }: AdvancedFiltersProps) => {
  const [open, setOpen] = useState(false);

  const hasActiveFilters = 
    filters.dateFrom || 
    filters.dateTo || 
    filters.priceMin || 
    filters.priceMax || 
    filters.tagIds.length > 0;

  const activeFilterCount = [
    filters.dateFrom || filters.dateTo,
    filters.priceMin || filters.priceMax,
    filters.tagIds.length > 0,
  ].filter(Boolean).length;

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleTag = (tagId: string) => {
    const newTagIds = filters.tagIds.includes(tagId)
      ? filters.tagIds.filter(id => id !== tagId)
      : [...filters.tagIds, tagId];
    updateFilter("tagIds", newTagIds);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative h-10 md:h-12">
          <Filter className="h-4 w-4 mr-2" />
          ফিল্টার
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold">অ্যাডভান্সড ফিল্টার</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <X className="h-4 w-4 mr-1" />
                মুছুন
              </Button>
            )}
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">তারিখের সীমা</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy") : "শুরু"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => updateFilter("dateFrom", date)}
                    locale={bn}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? format(filters.dateTo, "dd/MM/yy") : "শেষ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => updateFilter("dateTo", date)}
                    locale={bn}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">মূল্যের সীমা (৳)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="সর্বনিম্ন"
                value={filters.priceMin}
                onChange={(e) => updateFilter("priceMin", e.target.value)}
                className="h-9"
              />
              <Input
                type="number"
                placeholder="সর্বোচ্চ"
                value={filters.priceMax}
                onChange={(e) => updateFilter("priceMax", e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">ট্যাগ</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={filters.tagIds.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    style={{
                      backgroundColor: filters.tagIds.includes(tag.id) ? tag.color : "transparent",
                      borderColor: tag.color,
                      color: filters.tagIds.includes(tag.id) ? "white" : tag.color,
                    }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name_bn}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full" onClick={() => setOpen(false)}>
            প্রয়োগ করুন
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdvancedFilters;
