"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO, isValid, startOfDay } from "date-fns";
import {
  Settings2,
  Syringe,
  Scissors,
  Save,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
  ShieldCheck,
  Sparkles,
  Loader2,
  X,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  getSlotConfiguration,
  saveSlotConfigurationToDb,
  useSlotConfiguration,
  type SlotConfiguration,
} from "@/lib/cvo-slots";
import { cn } from "@/lib/utils";

interface SlotCapacityManagerDialogProps {
  trigger?: React.ReactNode;
  onConfigChange?: () => void;
  isStaff?: boolean;
  userRole?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SlotCapacityManagerDialog({
  trigger,
  onConfigChange,
  isStaff: propIsStaff,
  userRole: propUserRole,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SlotCapacityManagerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const { slotConfig, updateConfig } = useSlotConfiguration();
  const [vaccinationSlots, setVaccinationSlots] = useState<number>(10);
  const [spayNeuterSlots, setSpayNeuterSlots] = useState<number>(5);
  const [dateOverrides, setDateOverrides] = useState<
    Array<{ date: string; vaccination: number; spayNeuter: number }>
  >([]);

  // Override date state using shadcn DatePicker (Date object)
  const [overrideDate, setOverrideDate] = useState<Date | undefined>(undefined);
  const [newOverrideVac, setNewOverrideVac] = useState<number>(15);
  const [newOverrideSn, setNewOverrideSn] = useState<number>(8);
  const [isSaving, setIsSaving] = useState(false);

  const { user, isLoaded } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";

  // Check user role from Supabase if not provided via props
  const { data: dbUser } = useQuery({
    queryKey: ["slot-manager-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const supabase = getPublicSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isLoaded && !!user?.id && propIsStaff === undefined,
  });

  const resolvedRole = normalizeSyncVetRole(
    propUserRole ||
    dbUser?.role ||
    (user?.publicMetadata?.role as string) ||
    (user?.unsafeMetadata?.roleTitle as string) ||
    (isAdminEmail ? "Administrator" : undefined)
  );

  const canEdit =
    propIsStaff ??
    (isAdminEmail ||
      resolvedRole === "Administrator" ||
      resolvedRole === "Veterinarian");

  // Sync state whenever dialog opens or slotConfig updates
  useEffect(() => {
    if (open) {
      setVaccinationSlots(slotConfig.defaultVaccinationSlots);
      setSpayNeuterSlots(slotConfig.defaultSpayNeuterSlots);

      const overridesList = Object.entries(slotConfig.dateOverrides || {}).map(([date, val]) => ({
        date,
        vaccination: val.vaccination ?? slotConfig.defaultVaccinationSlots,
        spayNeuter: val.spayNeuter ?? slotConfig.defaultSpayNeuterSlots,
      }));
      setDateOverrides(overridesList);
    }
  }, [open, slotConfig]);

  const handleSave = async () => {
    if (!canEdit) {
      toast.error("Permission Denied", {
        description: "Only administrators and veterinarians can modify daily appointment quotas.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const overridesObj: SlotConfiguration["dateOverrides"] = {};
      dateOverrides.forEach((item) => {
        if (item.date) {
          overridesObj[item.date] = {
            vaccination: Number(item.vaccination),
            spayNeuter: Number(item.spayNeuter),
          };
        }
      });

      const newConfig: SlotConfiguration = {
        defaultVaccinationSlots: Math.max(1, Number(vaccinationSlots)),
        defaultSpayNeuterSlots: Math.max(1, Number(spayNeuterSlots)),
        dateOverrides: overridesObj,
      };

      await updateConfig(newConfig);
      toast.success("Municipal procedure slot limits updated successfully!", {
        description: "Live quotas are now synchronized in real-time across pet owners' booking portals.",
      });
      onConfigChange?.();
      setOpen(false);
    } catch (err: any) {
      toast.error("Failed to save slot limits: " + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOverride = () => {
    if (!canEdit) return;

    if (!overrideDate) {
      toast.error("Please pick a calendar date for the custom quota override");
      return;
    }

    const dateStr = format(overrideDate, "yyyy-MM-dd");

    if (dateOverrides.some((o) => o.date === dateStr)) {
      toast.error("An override already exists for " + format(overrideDate, "MMMM d, yyyy"));
      return;
    }

    setDateOverrides((prev) => [
      ...prev,
      {
        date: dateStr,
        vaccination: Math.max(1, Number(newOverrideVac)),
        spayNeuter: Math.max(1, Number(newOverrideSn)),
      },
    ]);
    setOverrideDate(undefined);
    toast.success("Date override added for " + format(overrideDate, "MMMM d, yyyy"));
  };

  const handleRemoveOverride = (dateToRemove: string) => {
    if (!canEdit) return;
    setDateOverrides((prev) => prev.filter((o) => o.date !== dateToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold rounded-xl border-border/80 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer shadow-2xs"
          >
            <Settings2 className="size-3.5 text-primary" />
            <span>{canEdit ? "Set Daily Quotas" : "View Daily Quotas"}</span>
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-5 sm:p-6 bg-background rounded-3xl border border-border/80 shadow-2xl space-y-4">
        {/* Header with aesthetic icon & badge */}
        <DialogHeader className="space-y-1 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-primary/15 to-indigo-500/20 text-primary flex items-center justify-center shrink-0 border border-primary/25 shadow-xs">
              <Settings2 className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                Veterinary Procedure Quota Configuration
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {canEdit
                  ? "Configure daily citizen appointment slots for pet owners (Monday – Friday)"
                  : "Daily municipal procedure quotas established by the City Veterinary Office"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Role Status Banner */}
          {canEdit ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground">Authorized as {resolvedRole}</span>
                  <p className="text-[10.5px] text-muted-foreground">Live real-time sync with citizen booking portal</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full shrink-0">
                Editing Enabled
              </Badge>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
              <Lock className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">View-Only Quotas</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Daily appointment limits are regulated by the City Veterinary Office. Only administrators and veterinarians can modify procedure quotas.
                </p>
              </div>
            </div>
          )}

          {/* Standard Daily Limits */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                Standard Daily Quotas (Monday – Friday)
              </h4>
              <span className="text-[10px] text-muted-foreground font-mono">Live Default</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vaccination Quota */}
              <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] via-card to-card space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
                      <Syringe className="size-3.5" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-foreground truncate">Vaccination</span>
                  </div>
                  <Badge variant="outline" className="text-[9.5px] font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 shrink-0">
                    Daily
                  </Badge>
                </div>

                {canEdit ? (
                  <div className="flex items-center justify-between gap-2 bg-background/80 p-1.5 px-2 rounded-xl border border-border/80">
                    <span className="text-xs font-semibold text-muted-foreground pl-1">Slots:</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setVaccinationSlots((v) => Math.max(1, v - 1))}
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        title="Decrease quota"
                      >
                        <Minus className="size-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={vaccinationSlots}
                        onChange={(e) => setVaccinationSlots(Math.max(1, Number(e.target.value)))}
                        className="h-7 text-center font-black text-sm w-14 p-0 border-0 shadow-none bg-transparent focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setVaccinationSlots((v) => Math.min(100, v + 1))}
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        title="Increase quota"
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-1">
                    <span className="text-2xl font-black text-foreground">{vaccinationSlots}</span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-medium">slots per day</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Default: 10 daily citizen appointments.
                </p>
              </div>

              {/* Spay & Neuter Quota */}
              <div className="p-3.5 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.06] via-card to-card space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/25">
                      <Scissors className="size-3.5" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-foreground truncate">Spay & Neuter</span>
                  </div>
                  <Badge variant="outline" className="text-[9.5px] font-bold border-indigo-500/40 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 shrink-0">
                    Surgical
                  </Badge>
                </div>

                {canEdit ? (
                  <div className="flex items-center justify-between gap-2 bg-background/80 p-1.5 px-2 rounded-xl border border-border/80">
                    <span className="text-xs font-semibold text-muted-foreground pl-1">Slots:</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setSpayNeuterSlots((s) => Math.max(1, s - 1))}
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        title="Decrease quota"
                      >
                        <Minus className="size-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={spayNeuterSlots}
                        onChange={(e) => setSpayNeuterSlots(Math.max(1, Number(e.target.value)))}
                        className="h-7 text-center font-black text-sm w-14 p-0 border-0 shadow-none bg-transparent focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setSpayNeuterSlots((s) => Math.min(50, s + 1))}
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        title="Increase quota"
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-1">
                    <span className="text-2xl font-black text-foreground">{spayNeuterSlots}</span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-medium">slots per day</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Default: 5 daily sterilization surgeries.
                </p>
              </div>
            </div>
          </div>

          {/* Date-specific Overrides with Shadcn Calendar */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Date-Specific Quota Overrides
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  For special vaccine drives, outreach days, or modified clinic hours
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                {dateOverrides.length} Override{dateOverrides.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {/* Form to add override using shadcn DatePicker (Staff Only) */}
            {canEdit && (
              <div className="p-3.5 rounded-2xl border border-border/70 bg-muted/20 space-y-3">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5 text-primary" />
                  Add Custom Date Capacity:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  {/* Shadcn Popover Calendar */}
                  <div className="sm:col-span-5">
                    <DatePicker
                      date={overrideDate}
                      setDate={setOverrideDate}
                      placeholder="Pick override date..."
                      className="h-8.5 text-xs rounded-xl bg-background border-input/80"
                      fromDate={startOfDay(new Date())}
                    />
                  </div>

                  {/* Vac slots */}
                  <div className="sm:col-span-3 flex items-center gap-1 bg-background px-2 h-8.5 rounded-xl border border-input/80">
                    <Syringe className="size-3 text-emerald-600 shrink-0" />
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="Vac"
                      value={newOverrideVac}
                      onChange={(e) => setNewOverrideVac(Math.max(1, Number(e.target.value)))}
                      className="h-7 text-xs font-bold border-0 shadow-none bg-transparent p-0 w-full focus-visible:ring-0"
                      title="Vaccination slots"
                    />
                    <span className="text-[10px] text-muted-foreground shrink-0">vax</span>
                  </div>

                  {/* S&N slots */}
                  <div className="sm:col-span-3 flex items-center gap-1 bg-background px-2 h-8.5 rounded-xl border border-input/80">
                    <Scissors className="size-3 text-indigo-600 shrink-0" />
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      placeholder="S&N"
                      value={newOverrideSn}
                      onChange={(e) => setNewOverrideSn(Math.max(1, Number(e.target.value)))}
                      className="h-7 text-xs font-bold border-0 shadow-none bg-transparent p-0 w-full focus-visible:ring-0"
                      title="Spay & Neuter slots"
                    />
                    <span className="text-[10px] text-muted-foreground shrink-0">kapon</span>
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddOverride}
                      className="h-8.5 w-full sm:w-auto px-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer flex items-center justify-center"
                      title="Add Date Override"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* List of active overrides */}
            {dateOverrides.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {dateOverrides.map((ovr) => {
                  let formattedDate = ovr.date;
                  try {
                    const parsed = parseISO(ovr.date);
                    if (isValid(parsed)) {
                      formattedDate = format(parsed, "EEEE, MMMM d, yyyy");
                    }
                  } catch {}

                  return (
                    <div
                      key={ovr.date}
                      className="p-2.5 px-3 rounded-xl border border-border/70 bg-card text-xs flex items-center justify-between gap-2 shadow-2xs hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <CalendarIcon className="size-3.5" />
                        </div>
                        <span className="font-bold text-foreground text-xs truncate">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[9.5px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-bold px-1.5 py-0">
                          Vac: {ovr.vaccination}
                        </Badge>
                        <Badge variant="outline" className="text-[9.5px] border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 font-bold px-1.5 py-0">
                          S&N: {ovr.spayNeuter}
                        </Badge>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveOverride(ovr.date)}
                            className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
                            title="Remove date override"
                          >
                            <Trash2 className="size-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic p-2 bg-muted/20 rounded-xl border border-border/50 text-center">
                Standard Monday–Friday quotas apply to all clinic dates. No custom drive overrides currently active.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            {canEdit ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold rounded-xl h-9 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="text-xs font-bold rounded-xl h-9 px-4 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving Quotas...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      <span>Save Quotas</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold rounded-xl h-9 px-4 cursor-pointer"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
