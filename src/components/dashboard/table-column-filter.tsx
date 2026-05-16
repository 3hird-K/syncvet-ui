"use client";

import { Check, Settings2 } from "lucide-react";
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
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs flex-1 sm:flex-none">
          <Settings2 className="size-3" /> Filter
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
