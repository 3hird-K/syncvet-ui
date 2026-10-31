"use client";

import * as React from "react";
import { format, isBefore, startOfDay, getDay, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  type ProcedureServiceType,
  calculateSlotStatus,
  getSlotConfiguration,
  type DaySlotStatus,
} from "@/lib/cvo-slots";

interface ProcedureDatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  service: ProcedureServiceType;
  bookedAppointments?: Array<{ date: string; service_id: string; status: string }>;
  conflictDate?: string;
  conflictServiceTitle?: string;
  conflictPetName?: string;
  className?: string;
  placeholder?: string;
}

export function ProcedureDatePicker({
  date,
  setDate,
  service,
  bookedAppointments = [],
  conflictDate,
  conflictServiceTitle,
  conflictPetName,
  className,
  placeholder = "Select an available appointment date",
}: ProcedureDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const config = React.useMemo(() => getSlotConfiguration(), []);

  const conflictDateFormatted = React.useMemo(() => {
    if (!conflictDate) return "";
    try {
      const parsed = parseISO(conflictDate);
      if (isValid(parsed)) return format(parsed, "EEEE, MMMM do");
      return conflictDate;
    } catch {
      return conflictDate;
    }
  }, [conflictDate]);

  // Calculate status for currently selected date
  const selectedDateStatus: DaySlotStatus | null = React.useMemo(() => {
    if (!date) return null;
    return calculateSlotStatus({
      date,
      service,
      bookedAppointments,
      config,
    });
  }, [date, service, bookedAppointments, config]);

  // Disability check for calendar days
  const isDayDisabled = React.useCallback(
    (checkDate: Date) => {
      const today = startOfDay(new Date());
      const day = startOfDay(checkDate);
      const dayOfWeek = getDay(checkDate);

      // Disable past dates
      if (isBefore(day, today)) return true;

      // Disable weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek === 0 || dayOfWeek === 6) return true;

      // Disable same-day booking outside 8:00 AM – 5:00 PM operating hours
      if (day.getTime() === today.getTime()) {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour < 8 || currentHour >= 17) {
          return true;
        }
      }

      // Disable same-day conflict with another procedure for the same pet
      if (conflictDate) {
        const checkDateStr = format(checkDate, "yyyy-MM-dd");
        if (checkDateStr === conflictDate) {
          return true;
        }
      }

      // Disable fully booked dates
      const status = calculateSlotStatus({
        date: checkDate,
        service,
        bookedAppointments,
        config,
      });

      return !status.isAvailable;
    },
    [service, bookedAppointments, config, conflictDate]
  );

  return (
    <div className="space-y-2">
      <Popover modal={true} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-8.5 sm:h-9 px-3 rounded-lg border-input/80 bg-background hover:bg-muted/50 cursor-pointer shadow-2xs text-xs",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 size-3.5 text-primary shrink-0" />
            <div className="flex-1 truncate">
              {date ? (
                <span className="font-semibold text-xs text-foreground">
                  {format(date, "EEEE, MMMM do, yyyy")}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{placeholder}</span>
              )}
            </div>

            {selectedDateStatus && (
              <Badge
                variant="outline"
                className={cn(
                  "ml-2 text-[9px] font-semibold px-1.5 py-0 h-4 shrink-0",
                  !selectedDateStatus.isAvailable
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : selectedDateStatus.remainingSlots > 3
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : selectedDateStatus.remainingSlots > 0
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-destructive/10 text-destructive border-destructive/30"
                )}
              >
                {!selectedDateStatus.isAvailable
                  ? selectedDateStatus.statusLabel
                  : `${selectedDateStatus.remainingSlots} slots left`}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-0 z-[80] shadow-xl border-border rounded-2xl overflow-hidden"
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
          <div className="p-3 bg-muted/30 border-b border-border/60 flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 text-primary" />
              Mon – Fri Operating Schedule (8 AM – 5 PM)
            </span>
            <Badge variant="outline" className="text-[10px] font-semibold bg-background">
              {service === "vaccination" ? "10 Daily Slots" : "5 Daily Slots"}
            </Badge>
          </div>

          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(newDate);
                setOpen(false);
              }
            }}
            autoFocus
            captionLayout="dropdown"
            startMonth={new Date()}
            endMonth={new Date(new Date().getFullYear() + 1, 11)}
            disabled={isDayDisabled}
            className="p-3"
          />

          <div className="p-3 bg-muted/20 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 inline-block" />
              Available (8 AM–5 PM)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted-foreground/30 inline-block" />
              Disabled (Weekend / Closed / Full)
            </span>
          </div>

          {(() => {
            const now = new Date();
            const h = now.getHours();
            if (h >= 17 || h < 8) {
              return (
                <div className="p-2.5 bg-amber-500/10 border-t border-amber-500/25 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
                  <span>
                    Same-day booking is open <strong>8:00 AM – 5:00 PM</strong>. Today is closed ({h >= 17 ? "clinic hours ended at 5:00 PM" : "opens at 8:00 AM"}). Please select tomorrow or a future weekday.
                  </span>
                </div>
              );
            }
            return null;
          })()}

          {conflictDate && (
            <div className="p-2.5 bg-amber-500/10 border-t border-amber-500/25 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertCircle className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>{conflictDateFormatted}</strong> is blocked by veterinary rule ({conflictPetName || "This pet"} already has a {conflictServiceTitle || "procedure"} scheduled).
              </span>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Real-time slot status indicator card */}
      {date && selectedDateStatus && (
        <div
          className={cn(
            "p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in-0 duration-200",
            !selectedDateStatus.isAvailable
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : selectedDateStatus.remainingSlots > 2
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
              : selectedDateStatus.remainingSlots > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          )}
        >
          <div className="flex items-center gap-2">
            {!selectedDateStatus.isAvailable ? (
              <AlertCircle className="size-4 text-destructive shrink-0" />
            ) : selectedDateStatus.remainingSlots > 2 ? (
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="size-4 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {!selectedDateStatus.isAvailable
                  ? selectedDateStatus.statusLabel
                  : `${selectedDateStatus.remainingSlots} of ${selectedDateStatus.totalCapacity} Slots Available`}
              </p>
              <p className="text-[11px] opacity-80">
                {!selectedDateStatus.isAvailable
                  ? selectedDateStatus.isClosedToday
                    ? "Same-day booking is open from 8:00 AM to 5:00 PM (Monday – Friday). Operating hours have ended for today. Please pick tomorrow or a future weekday."
                    : "This date is not available for booking. Please select another weekday."
                  : selectedDateStatus.remainingSlots > 2
                  ? "Standard booking quota is open for this date."
                  : selectedDateStatus.remainingSlots > 0
                  ? "Limited slots remaining. Book early to secure appointment."
                  : "This date is completely booked. Please select another weekday."}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono font-bold text-sm">
              {selectedDateStatus.bookedCount} Booked
            </span>
            <span className="block text-[10px] opacity-75">
              {selectedDateStatus.totalCapacity} Max
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
