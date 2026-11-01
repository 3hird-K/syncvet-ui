"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Download,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface CustomFilterDef<T> {
  id: string;
  label: string;
  placeholder?: string;
  options: { label: string; value: string }[];
  predicate: (item: T, selectedValue: string) => boolean;
}

export interface ExportTableDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  data: T[];
  dateExtractor?: (item: T) => Date | string | null | undefined;
  customFilters?: CustomFilterDef<T>[];
  onExport: (filteredData: T[], filterSummary: string) => void;
  defaultDateMode?: "ALL" | "DAY" | "MONTH" | "YEAR" | "RANGE";
}

const MONTHS = [
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => (CURRENT_YEAR - i).toString());

export function ExportTableDialog<T>({
  open,
  onOpenChange,
  title,
  description = "Filter and customize what records to export to CSV.",
  data,
  dateExtractor,
  customFilters = [],
  onExport,
  defaultDateMode = "ALL",
}: ExportTableDialogProps<T>) {
  const [dateMode, setDateMode] = useState<"ALL" | "DAY" | "MONTH" | "YEAR" | "RANGE">(defaultDateMode);
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR.toString());
  const [dateRangeStartDate, setDateRangeStartDate] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dateRangeEndDate, setDateRangeEndDate] = useState<Date>(() => new Date());

  // Track values for custom filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleCustomFilterChange = (filterId: string, val: string) => {
    setFilterValues((prev) => ({
      ...prev,
      [filterId]: val,
    }));
  };

  const selectedDayStr = useMemo(() => format(selectedDayDate, "yyyy-MM-dd"), [selectedDayDate]);
  const dateRangeStartStr = useMemo(() => format(dateRangeStartDate, "yyyy-MM-dd"), [dateRangeStartDate]);
  const dateRangeEndStr = useMemo(() => format(dateRangeEndDate, "yyyy-MM-dd"), [dateRangeEndDate]);

  // Compute filtered dataset live
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Date Filtering (if dateExtractor provided and mode is not ALL)
      if (dateExtractor && dateMode !== "ALL") {
        const rawDate = dateExtractor(item);
        if (!rawDate) return false;
        const itemDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
        if (isNaN(itemDate.getTime())) return false;

        if (dateMode === "DAY") {
          const itemDayStr = format(itemDate, "yyyy-MM-dd");
          if (itemDayStr !== selectedDayStr) return false;
        } else if (dateMode === "MONTH") {
          const m = parseInt(selectedMonth, 10);
          const y = parseInt(selectedYear, 10);
          if (itemDate.getMonth() !== m || itemDate.getFullYear() !== y) return false;
        } else if (dateMode === "YEAR") {
          const y = parseInt(selectedYear, 10);
          if (itemDate.getFullYear() !== y) return false;
        } else if (dateMode === "RANGE") {
          try {
            const itemDayStr = format(itemDate, "yyyy-MM-dd");
            if (dateRangeStartStr && itemDayStr < dateRangeStartStr) return false;
            if (dateRangeEndStr && itemDayStr > dateRangeEndStr) return false;
          } catch {
            return false;
          }
        }
      }

      // 2. Custom Filter predicates
      for (const filterDef of customFilters) {
        const chosenVal = filterValues[filterDef.id];
        if (chosenVal && chosenVal !== "ALL") {
          if (!filterDef.predicate(item, chosenVal)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    data,
    dateExtractor,
    dateMode,
    selectedDayStr,
    selectedMonth,
    selectedYear,
    dateRangeStartStr,
    dateRangeEndStr,
    customFilters,
    filterValues,
  ]);

  // Human-readable summary of filters
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (dateMode === "ALL") parts.push("All Time");
    else if (dateMode === "DAY") parts.push(`Day: ${format(selectedDayDate, "MMMM d, yyyy")}`);
    else if (dateMode === "MONTH") parts.push(`Month: ${MONTHS[parseInt(selectedMonth, 10)]?.label} ${selectedYear}`);
    else if (dateMode === "YEAR") parts.push(`Year: ${selectedYear}`);
    else if (dateMode === "RANGE") parts.push(`${format(dateRangeStartDate, "MMM d, yyyy")} to ${format(dateRangeEndDate, "MMM d, yyyy")}`);

    for (const filterDef of customFilters) {
      const val = filterValues[filterDef.id];
      if (val && val !== "ALL") {
        const opt = filterDef.options.find((o) => o.value === val);
        parts.push(`${filterDef.label}: ${opt?.label || val}`);
      }
    }
    return parts.join(", ");
  }, [
    dateMode,
    selectedDayDate,
    selectedMonth,
    selectedYear,
    dateRangeStartDate,
    dateRangeEndDate,
    customFilters,
    filterValues,
  ]);

  const handleExecuteExport = () => {
    onExport(filteredData, filterSummary);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[95vw] sm:max-w-[540px] md:max-w-[560px] rounded-2xl bg-card border-border p-5 sm:p-6 shadow-2xl overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <DialogHeader className="space-y-0 pb-3 border-b border-border/60 !pr-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-primary font-bold min-w-0">
              <FileSpreadsheet className="size-5 shrink-0" />
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                {title}
              </DialogTitle>
            </div>

            {/* Header Action Buttons: Download icon and X close icon */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleExecuteExport}
                disabled={filteredData.length === 0}
                className={cn(
                  "size-8 rounded-full border border-border/60 transition-all shadow-xs cursor-pointer",
                  filteredData.length === 0
                    ? "opacity-40 cursor-not-allowed"
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95"
                )}
                title={filteredData.length === 0 ? "No records to export" : `Export CSV (${filteredData.length} records)`}
                aria-label="Export CSV"
              >
                <Download className="size-4" />
              </Button>

              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all hover:scale-105 active:scale-95"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          <DialogDescription className="text-xs text-muted-foreground leading-snug pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-3 text-xs">
          {/* ── 1. Date Filter Section (Clean, without container box) ── */}
          {dateExtractor && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5 text-primary" />
                  <span>Timeframe / Date Filter</span>
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 font-semibold">
                  {dateMode}
                </Badge>
              </div>

              {/* Mode selector */}
              <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                {[
                  { value: "ALL", label: "All" },
                  { value: "DAY", label: "Day" },
                  { value: "MONTH", label: "Month" },
                  { value: "YEAR", label: "Year" },
                  { value: "RANGE", label: "Range" },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setDateMode(mode.value as any)}
                    className={`h-8 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                      dateMode === mode.value
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                        : "bg-background text-muted-foreground hover:bg-muted border-border/70 hover:text-foreground"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Inputs with shadcn Calendar */}
              {dateMode === "DAY" && (
                <div className="pt-1.5 space-y-1">
                  <Label className="text-[11px] text-muted-foreground block font-medium">
                    Select Specific Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-medium h-9 text-xs bg-background hover:bg-muted/50 border-border/70 cursor-pointer"
                      >
                        <CalendarIcon className="mr-2 size-3.5 text-primary shrink-0" />
                        <span>{format(selectedDayDate, "EEEE, MMMM d, yyyy")}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[170]" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDayDate}
                        onSelect={(date) => date && setSelectedDayDate(date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {dateMode === "MONTH" && (
                <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground block font-medium">
                      Month
                    </Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent className="z-[170] max-h-56">
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground block font-medium">
                      Year
                    </Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="z-[170] max-h-56">
                        {YEARS.map((y) => (
                          <SelectItem key={y} value={y} className="text-xs">
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {dateMode === "YEAR" && (
                <div className="pt-1.5 space-y-1">
                  <Label className="text-[11px] text-muted-foreground block font-medium">
                    Select Year
                  </Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-9 text-xs bg-background">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="z-[170] max-h-56">
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y} className="text-xs">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {dateMode === "RANGE" && (
                <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground block font-medium">
                      From Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-medium h-9 text-xs bg-background hover:bg-muted/50 border-border/70 cursor-pointer"
                        >
                          <CalendarIcon className="mr-2 size-3.5 text-primary shrink-0" />
                          <span className="truncate">{format(dateRangeStartDate, "MMM d, yyyy")}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[170]" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRangeStartDate}
                          onSelect={(date) => date && setDateRangeStartDate(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground block font-medium">
                      To Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-medium h-9 text-xs bg-background hover:bg-muted/50 border-border/70 cursor-pointer"
                        >
                          <CalendarIcon className="mr-2 size-3.5 text-primary shrink-0" />
                          <span className="truncate">{format(dateRangeEndDate, "MMM d, yyyy")}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[170]" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRangeEndDate}
                          onSelect={(date) => date && setDateRangeEndDate(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 2. Table-Specific Filters ── */}
          {customFilters.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {customFilters.map((filter) => {
                const currentVal = filterValues[filter.id] || "ALL";
                return (
                  <div key={filter.id} className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>{filter.label}</span>
                    </Label>
                    <Select
                      value={currentVal}
                      onValueChange={(val) => handleCustomFilterChange(filter.id, val)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder={filter.placeholder || `All ${filter.label}`} />
                      </SelectTrigger>
                      <SelectContent className="z-[170] max-h-56">
                        <SelectItem value="ALL" className="text-xs font-semibold">
                          All {filter.label}
                        </SelectItem>
                        {filter.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 3. Live Matching Records Preview ── */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
              filteredData.length > 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {filteredData.length > 0 ? (
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="size-4 text-amber-600 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate">
                  {filteredData.length} records ready to export
                </p>
                <p className="text-[10.5px] opacity-80 leading-tight truncate mt-0.5">
                  Out of {data.length} total database entries
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`text-[10px] font-mono shrink-0 ${
                filteredData.length > 0
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
              }`}
            >
              {Math.round((filteredData.length / (data.length || 1)) * 100)}%
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
