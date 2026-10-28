"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Column {
  id: string;
  label: string;
  required?: boolean;
}

interface TableColumnFilterProps {
  columns: Column[];
  visibleColumns: string[];
  onToggleColumn: (columnId: string) => void;
}

export function TableColumnFilter({
  columns,
  visibleColumns,
  onToggleColumn,
}: TableColumnFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer bg-muted/20 hover:bg-muted/40"
          title="Filter / Toggle Columns"
          aria-label="Filter columns"
        >
          <SlidersHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px] border-border/50 bg-popover">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Toggle Columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            className="text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            checked={visibleColumns.includes(column.id)}
            onCheckedChange={() => onToggleColumn(column.id)}
            disabled={column.required}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
