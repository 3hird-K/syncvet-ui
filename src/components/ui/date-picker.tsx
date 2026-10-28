"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: React.ComponentProps<typeof Calendar>["disabled"];
  fromDate?: Date;
  toDate?: Date;
  startMonth?: Date;
  endMonth?: Date;
}

export function DatePicker({
  date,
  setDate,
  className,
  placeholder = "Pick a date",
  disabled,
  fromDate,
  toDate,
  startMonth,
  endMonth,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal min-w-0 px-3",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{date ? format(date, "MMM d, yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 z-[80]"
        align="start"
        onFocusOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (
            target?.closest?.("[data-slot='popover-content']") ||
            target?.closest?.("[data-slot='calendar']") ||
            target?.closest?.("button") ||
            target?.closest?.("select")
          ) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (
            target?.closest?.("[data-slot='popover-content']") ||
            target?.closest?.("[data-slot='calendar']")
          ) {
            e.preventDefault();
          }
        }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            setDate(newDate);
            if (newDate) {
              setOpen(false);
            }
          }}
          autoFocus
          captionLayout="dropdown"
          startMonth={startMonth || fromDate || new Date(2020, 0)}
          endMonth={endMonth || toDate || new Date(2035, 11)}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
