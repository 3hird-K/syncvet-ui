"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Settings2,
  Syringe,
  Scissors,
  Save,
  RotateCcw,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
  ShieldCheck,
  ShieldAlert,
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getSlotConfiguration,
  saveSlotConfiguration,
  type SlotConfiguration,
} from "@/lib/cvo-slots";

interface SlotCapacityManagerDialogProps {
  trigger?: React.ReactNode;
  onConfigChange?: () => void;
  isStaff?: boolean;
  userRole?: string;
}

export function SlotCapacityManagerDialog({
  trigger,
  onConfigChange,
  isStaff: propIsStaff,
  userRole: propUserRole,
}: SlotCapacityManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [vaccinationSlots, setVaccinationSlots] = useState<number>(10);
  const [spayNeuterSlots, setSpayNeuterSlots] = useState<number>(5);
  const [dateOverrides, setDateOverrides] = useState<
    Array<{ date: string; vaccination: number; spayNeuter: number }>
  >([]);
  const [newOverrideDate, setNewOverrideDate] = useState<string>("");
  const [newOverrideVac, setNewOverrideVac] = useState<number>(15);
  const [newOverrideSn, setNewOverrideSn] = useState<number>(8);

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
      resolvedRole === "Veterinarian" ||
      resolvedRole === "Vaccinator");

  useEffect(() => {
    if (open) {
      const config = getSlotConfiguration();
      setVaccinationSlots(config.defaultVaccinationSlots);
      setSpayNeuterSlots(config.defaultSpayNeuterSlots);

      const overridesList = Object.entries(config.dateOverrides).map(([date, val]) => ({
        date,
        vaccination: val.vaccination ?? config.defaultVaccinationSlots,
        spayNeuter: val.spayNeuter ?? config.defaultSpayNeuterSlots,
      }));
      setDateOverrides(overridesList);
    }
  }, [open]);

  const handleSave = () => {
    if (!canEdit) {
      toast.error("Permission Denied", {
        description: "Only administrators, veterinarians, and vaccinators can modify daily appointment quotas.",
      });
      return;
    }

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

    saveSlotConfiguration(newConfig);
    toast.success("Municipal procedure slot limits updated successfully!");
    onConfigChange?.();
    setOpen(false);
  };

  const handleAddOverride = () => {
    if (!canEdit) return;

    if (!newOverrideDate) {
      toast.error("Please pick a date for the quota adjustment");
      return;
    }

    if (dateOverrides.some((o) => o.date === newOverrideDate)) {
      toast.error("An override already exists for this date");
      return;
    }

    setDateOverrides((prev) => [
      ...prev,
      {
        date: newOverrideDate,
        vaccination: Number(newOverrideVac),
        spayNeuter: Number(newOverrideSn),
      },
    ]);
    setNewOverrideDate("");
  };

  const handleRemoveOverride = (dateToRemove: string) => {
    if (!canEdit) return;
    setDateOverrides((prev) => prev.filter((o) => o.date !== dateToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold rounded-xl cursor-pointer"
          >
            <Settings2 className="size-3.5 text-primary" />
            <span>{canEdit ? "Set Daily Quotas" : "View Daily Quotas"}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto p-5 sm:p-6 bg-background rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Settings2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Veterinary Procedure Quota Configuration
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {canEdit
                  ? "Configure daily appointment slots for pet owners (Monday – Friday)"
                  : "Daily municipal procedure quotas established by the City Veterinary Office"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Role Status Banner */}
          {canEdit ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>Authorized as <strong>{resolvedRole}</strong></span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                Editing Enabled
              </Badge>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-200">
              <Lock className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">View-Only Quotas</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Daily appointment limits are regulated by the City Veterinary Office. Only administrators, veterinarians, and vaccinators can modify procedure quotas.
                </p>
              </div>
            </div>
          )}

          {/* Default Daily Limits */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Standard Daily Quotas (Monday – Friday)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vaccination Quota */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Syringe className="size-4 text-emerald-600" />
                    <span className="font-bold text-xs">Vaccination</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600">
                    Daily
                  </Badge>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={vaccinationSlots}
                      onChange={(e) => setVaccinationSlots(Number(e.target.value))}
                      className="h-9 text-xs font-bold"
                    />
                    <span className="text-xs text-muted-foreground">slots</span>
                  </div>
                ) : (
                  <div className="py-1">
                    <span className="text-2xl font-black text-foreground">{vaccinationSlots}</span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-medium">slots per day</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Default: 10 daily citizen appointments.
                </p>
              </div>

              {/* Spay & Neuter Quota */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors className="size-4 text-indigo-600" />
                    <span className="font-bold text-xs">Spay & Neuter</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-indigo-600">
                    Surgical
                  </Badge>
                </div>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={spayNeuterSlots}
                      onChange={(e) => setSpayNeuterSlots(Number(e.target.value))}
                      className="h-9 text-xs font-bold"
                    />
                    <span className="text-xs text-muted-foreground">slots</span>
                  </div>
                ) : (
                  <div className="py-1">
                    <span className="text-2xl font-black text-foreground">{spayNeuterSlots}</span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-medium">slots per day</span>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Default: 5 daily sterilization surgeries.
                </p>
              </div>
            </div>
          </div>

          {/* Date-specific Overrides */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Date-Specific Quota Overrides
              </h4>
              <span className="text-[10px] text-muted-foreground">
                For special drives or limited days
              </span>
            </div>

            {/* Form to add override (Staff Only) */}
            {canEdit && (
              <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2.5">
                <span className="text-[11px] font-semibold text-foreground">Add Custom Date Capacity:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    type="date"
                    value={newOverrideDate}
                    onChange={(e) => setNewOverrideDate(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  <Input
                    type="number"
                    placeholder="Vac slots"
                    value={newOverrideVac}
                    onChange={(e) => setNewOverrideVac(Number(e.target.value))}
                    className="h-8 text-xs bg-background"
                    title="Vaccination slots"
                  />
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      placeholder="S&N slots"
                      value={newOverrideSn}
                      onChange={(e) => setNewOverrideSn(Number(e.target.value))}
                      className="h-8 text-xs bg-background"
                      title="Spay & Neuter slots"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddOverride}
                      className="h-8 text-xs px-2.5 shrink-0 bg-primary cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* List of active overrides */}
            {dateOverrides.length > 0 ? (
              <div className="space-y-1.5">
                {dateOverrides.map((ovr) => (
                  <div
                    key={ovr.date}
                    className="p-2.5 rounded-lg border border-border/60 bg-card text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="size-3.5 text-primary" />
                      <span className="font-bold">{ovr.date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                        Vac: {ovr.vaccination}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-600">
                        S&N: {ovr.spayNeuter}
                      </Badge>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOverride(ovr.date)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : !canEdit ? (
              <p className="text-[11px] text-muted-foreground italic">No special holiday or drive capacity overrides currently active.</p>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            {canEdit ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  className="text-xs font-bold rounded-xl gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                >
                  <Save className="size-3.5" />
                  <span>Save Quotas</span>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold rounded-xl px-4 cursor-pointer"
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
