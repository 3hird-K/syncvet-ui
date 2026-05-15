"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

interface TablePaginationProps {
  /** Current page (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** How many rows per page */
  pageSize: number;
  /** Total number of filtered rows */
  totalItems: number;
  /** Label for total items, e.g. "users", "records" */
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TablePagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  itemLabel = "records",
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const safePage = Math.min(page, totalPages);

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="sr-only">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 cursor-pointer rounded-full border border-border bg-muted/50 px-2.5 pr-7 text-[10px] font-semibold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} rows
              </option>
            ))}
          </select>
        </label>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {totalItems} total {itemLabel}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Page {safePage} / {totalPages}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
