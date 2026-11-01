"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";

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
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR.toString());
  const [dateRangeStart, setDateRangeStart] = useState(format(new Date(), "yyyy-MM-01"));
  const [dateRangeEnd, setDateRangeEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  // Track values for custom filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleCustomFilterChange = (filterId: string, val: string) => {
    setFilterValues((prev) => ({
      ...prev,
      [filterId]: val,
    }));
  };

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
          if (itemDayStr !== selectedDay) return false;
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
            if (dateRangeStart && itemDayStr < dateRangeStart) return false;
            if (dateRangeEnd && itemDayStr > dateRangeEnd) return false;
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
    selectedDay,
    selectedMonth,
    selectedYear,
    dateRangeStart,
    dateRangeEnd,
    customFilters,
    filterValues,
  ]);

  // Human-readable summary of filters
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (dateMode === "ALL") parts.push("All Time");
    else if (dateMode === "DAY") parts.push(`Day: ${selectedDay}`);
    else if (dateMode === "MONTH") parts.push(`Month: ${MONTHS[parseInt(selectedMonth, 10)]?.label} ${selectedYear}`);
    else if (dateMode === "YEAR") parts.push(`Year: ${selectedYear}`);
    else if (dateMode === "RANGE") parts.push(`${dateRangeStart} to ${dateRangeEnd}`);

    for (const filterDef of customFilters) {
      const val = filterValues[filterDef.id];
      if (val && val !== "ALL") {
        const opt = filterDef.options.find((o) => o.value === val);
        parts.push(`${filterDef.label}: ${opt?.label || val}`);
      }
    }
    return parts.join(", ");
  }, [dateMode, selectedDay, selectedMonth, selectedYear, dateRangeStart, dateRangeEnd, customFilters, filterValues]);

  const handleExecuteExport = () => {
    onExport(filteredData, filterSummary);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl bg-card border-border p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <FileSpreadsheet className="size-4.5" />
            <DialogTitle className="text-base font-extrabold text-foreground">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-snug">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-xs">
          {/* ── 1. Date Filter Section (if applicable) ── */}
          {dateExtractor && (
            <div className="space-y-2 rounded-xl bg-muted/20 p-3 border border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  <span>Timeframe / Date Filter</span>
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                  {dateMode}
                </Badge>
              </div>

              {/* Mode selector */}
              <div className="grid grid-cols-5 gap-1 pt-1">
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
                    className={`h-7 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${
                      dateMode === mode.value
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                        : "bg-background text-muted-foreground hover:bg-muted border-border/70 hover:text-foreground"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Inputs depending on Date Mode */}
              {dateMode === "DAY" && (
                <div className="pt-2">
                  <Label className="text-[10.5px] text-muted-foreground block mb-1">
                    Select Specific Date
                  </Label>
                  <Input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="h-8.5 text-xs bg-background"
                  />
                </div>
              )}

              {dateMode === "MONTH" && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <Label className="text-[10.5px] text-muted-foreground block mb-1">
                      Month
                    </Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="h-8.5 text-xs bg-background">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent className="z-[160] max-h-56">
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10.5px] text-muted-foreground block mb-1">
                      Year
                    </Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="h-8.5 text-xs bg-background">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="z-[160] max-h-56">
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
                <div className="pt-2">
                  <Label className="text-[10.5px] text-muted-foreground block mb-1">
                    Select Year
                  </Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-8.5 text-xs bg-background">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="z-[160] max-h-56">
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
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <Label className="text-[10.5px] text-muted-foreground block mb-1">
                      From Date
                    </Label>
                    <Input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="h-8.5 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-[10.5px] text-muted-foreground block mb-1">
                      To Date
                    </Label>
                    <Input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="h-8.5 text-xs bg-background"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 2. Table-Specific Filters ── */}
          {customFilters.length > 0 && (
            <div className="space-y-2.5">
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
                      <SelectTrigger className="h-8.5 text-xs bg-background">
                        <SelectValue placeholder={filter.placeholder || `All ${filter.label}`} />
                      </SelectTrigger>
                      <SelectContent className="z-[160] max-h-56">
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

        {/* ── Actions ── */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExecuteExport}
            disabled={filteredData.length === 0}
            className="h-8 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="size-3.5" />
            <span>Download CSV ({filteredData.length})</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
