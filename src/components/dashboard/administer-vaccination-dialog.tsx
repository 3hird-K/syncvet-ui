"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Syringe,
  Thermometer,
  Scale,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Tag,
  FileCheck2,
  X,
  RotateCw,
  Lock,
} from "lucide-react";
import { format, addYears, parseISO } from "date-fns";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useCVO } from "@/lib/cvo-context";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn, getTodayDateString } from "@/lib/utils";
import type { QueueEncounter } from "@/app/(dashboard)/consultations/page";

interface AdministerVaccinationDialogProps {
  consultation: QueueEncounter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (updated: QueueEncounter) => void;
}

interface RegisteredVet {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export const HELEN_VET: RegisteredVet = {
  id: "helen-tacandong",
  name: "Dr. Helen Ann P. Tacandong, DVM",
  role: "City Veterinarian",
  avatarUrl: "/dr-helen-tacandong.jpg",
};

const INJECTION_SITES = [
  "Right Shoulder Area",
  "Left Shoulder Area",
  "Back of Neck (Scruff)",
  "Right Flank / Thigh",
];

const ADMINISTRATION_ROUTES = [
  "Subcutaneous (Under the skin)",
  "Intramuscular (In the muscle)",
];

export function AdministerVaccinationDialog({
  consultation,
  open,
  onOpenChange,
  onCompleted,
}: AdministerVaccinationDialogProps) {
  const { inventory, deductInventoryStock, activeRoleView } = useCVO();
  const { user, isLoaded: isUserLoaded } = useUser();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // Fetch current user's database role and profile from Supabase
  const { data: dbCurrentUser } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const supabase = getPublicSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("id, role, avatar_url, full_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isUserLoaded && !!user?.id,
  });

  const rawEmail = (user?.primaryEmailAddress?.emailAddress || "").toLowerCase();
  const isAdminEmail = rawEmail === "dime.neil03@gmail.com";
  const meta = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const currentRole = normalizeSyncVetRole(
    dbCurrentUser?.role ||
    meta?.roleTitle ||
    (isAdminEmail ? "Administrator" : "Pet Owner")
  );
  const isAdmin = isAdminEmail || currentRole === "Administrator" || activeRoleView === "Administrator";
  const isVet = currentRole === "Veterinarian" || activeRoleView === "Veterinarian";

  const currentUserName =
    dbCurrentUser?.full_name?.trim() ||
    user?.fullName?.trim() ||
    user?.username ||
    "Attending Veterinarian";
  const currentUserAvatar = dbCurrentUser?.avatar_url || (isUserLoaded && user?.imageUrl ? user.imageUrl : undefined);

  // 24-Hour Clinical Finalization Rule: Check if record was completed >= 24 hours ago
  const isLockedPast24Hours = useMemo(() => {
    if (!consultation || consultation.status !== "completed") return false;
    let completionTime: number | null = null;
    try {
      const map = JSON.parse(localStorage.getItem("syncvet_completed_timestamps") || "{}");
      const rawId = consultation.id.replace("proc-", "");
      if (map[rawId]) completionTime = new Date(map[rawId]).getTime();
      else if (map[consultation.id]) completionTime = new Date(map[consultation.id]).getTime();
      else if (map[consultation.encounterNo]) completionTime = new Date(map[consultation.encounterNo]).getTime();
    } catch {}

    if (!completionTime && consultation.date) {
      try {
        const datePart = consultation.date.split("T")[0];
        const timePart = consultation.time || "09:00 AM";
        const parsed = new Date(`${datePart} ${timePart}`);
        if (!isNaN(parsed.getTime())) completionTime = parsed.getTime();
      } catch {}
    }

    if (!completionTime) return false;
    const diffHours = (Date.now() - completionTime) / (1000 * 60 * 60);
    return diffHours >= 24;
  }, [consultation]);

  // Query actual registered veterinarians and staff from database
  const { data: dbVets = [] } = useQuery<RegisteredVet[]>({
    queryKey: ["registered-administering-vets"],
    queryFn: async () => {
      try {
        const supabase = getPublicSupabaseClient();
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, role, avatar_url, email")
          .order("full_name", { ascending: true });

        if (!error && data) {
          return data
            .filter((u) => {
              const r = (u.role || "").toLowerCase();
              return r.includes("vet") || r.includes("admin");
            })
            .map((u) => ({
              id: u.id,
              name: u.full_name?.trim() || u.email?.trim() || "Attending Veterinarian",
              role: u.role || "Veterinarian",
              avatarUrl: u.avatar_url,
              email: u.email,
            }));
        }
        return [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  // Combine registered vets from DB with Ms. Helen as primary/default, plus current user
  const allAvailableVets = useMemo(() => {
    const list: RegisteredVet[] = [];

    // Ensure Ms. Helen is always at the top as the default City Veterinarian
    const dbHelen = dbVets.find((v) =>
      v.name.toLowerCase().includes("helen") || (v.email && v.email.toLowerCase().includes("helen"))
    );
    list.push({
      id: dbHelen?.id || HELEN_VET.id,
      name: dbHelen?.name || HELEN_VET.name,
      role: dbHelen?.role || HELEN_VET.role,
      avatarUrl: dbHelen?.avatarUrl || HELEN_VET.avatarUrl,
      email: dbHelen?.email || HELEN_VET.email,
    });

    // Add other registered vets from DB (excluding duplicate Helen and dummy names)
    for (const v of dbVets) {
      const lowerName = v.name.toLowerCase();
      if (
        !lowerName.includes("helen") &&
        !lowerName.includes("elena santos") &&
        !lowerName.includes("sarah chen") &&
        !(v.email && v.email.toLowerCase().includes("helen")) &&
        !list.some((item) => item.id === v.id || item.name.toLowerCase() === lowerName)
      ) {
        list.push(v);
      }
    }

    // Include logged-in user if vet or admin and not already in list
    if (currentUserName) {
      const alreadyInList = list.some(
        (v) => v.name.toLowerCase() === currentUserName.toLowerCase() || (user?.id && v.id === user.id)
      );
      if (!alreadyInList) {
        list.push({
          id: user?.id || "current-vet",
          name: currentUserName,
          role: isVet ? "Veterinarian" : "Administrator",
          avatarUrl: currentUserAvatar,
          email: user?.primaryEmailAddress?.emailAddress,
        });
      }
    }

    return list;
  }, [dbVets, currentUserName, isVet, currentUserAvatar, user]);

  // Live vaccine batches from FEFO inventory
  const activeVaccineBatches = useMemo(() => {
    return inventory.filter((i: any) => i.category === "Vaccines" && i.stock > 0);
  }, [inventory]);

  const isOutOfStock = activeVaccineBatches.length === 0;

  // Pre-vax health screening
  const [temperatureC, setTemperatureC] = useState("38.4");
  const [weightKg, setWeightKg] = useState("10.5");
  const [clinicallyCleared, setClinicallyCleared] = useState(true);

  // Vaccine administration details (auto-generated & linked)
  const [selectedVaccineBatch, setSelectedVaccineBatch] = useState(activeVaccineBatches[0]?.batchNumber || "");
  const [dosageMl] = useState("1.0");
  const [route, setRoute] = useState(ADMINISTRATION_ROUTES[0]);
  const [injectionSite, setInjectionSite] = useState(INJECTION_SITES[0]);
  const [batchNo, setBatchNo] = useState(activeVaccineBatches[0]?.batchNumber || "");
  const [expiryDate, setExpiryDate] = useState(activeVaccineBatches[0]?.expirationDate || "");
  const [tagNumber, setTagNumber] = useState("");
  const [attendingVet, setAttendingVet] = useState(HELEN_VET.name);

  // Next Booster Date: 1 Year later under RA 9482 (Aligned with CDO local time / consultation date)
  const baseAdminDate = consultation?.date ? consultation.date.split("T")[0] : getTodayDateString();
  const nextBoosterDate = format(addYears(parseISO(baseAdminDate), 1), "yyyy-MM-dd");
  const nextBoosterDisplay = format(addYears(parseISO(baseAdminDate), 1), "MMMM d, yyyy");

  // Keep batch and vaccine state aligned with active inventory
  useEffect(() => {
    if (activeVaccineBatches.length > 0) {
      if (!batchNo || !activeVaccineBatches.some((b: any) => b.batchNumber === batchNo)) {
        setSelectedVaccineBatch(activeVaccineBatches[0].batchNumber);
        setBatchNo(activeVaccineBatches[0].batchNumber);
        setExpiryDate(activeVaccineBatches[0].expirationDate);
      }
    } else {
      setSelectedVaccineBatch("");
      setBatchNo("");
      setExpiryDate("");
    }
  }, [activeVaccineBatches, batchNo]);

  // If Veterinarian: automatically locked to the logged-in user ("you").
  // If Admin: can choose who will be the administering vet (defaults to Ms. Helen).
  useEffect(() => {
    if (!isAdmin && isVet && currentUserName) {
      setAttendingVet(currentUserName);
    } else if (isAdmin) {
      if (
        consultation?.vetName &&
        consultation.vetName !== "Attending CVO Vet" &&
        !consultation.vetName.toLowerCase().includes("elena santos")
      ) {
        setAttendingVet(consultation.vetName);
      } else {
        setAttendingVet(HELEN_VET.name);
      }
    } else if (currentUserName) {
      setAttendingVet(currentUserName);
    }
  }, [isAdmin, isVet, currentUserName, consultation]);

  // Sync state whenever consultation changes
  useEffect(() => {
    if (consultation) {
      const randomTag = `CDO-${new Date().getFullYear()}-R${Math.floor(1000 + Math.random() * 9000)}`;
      setTagNumber(randomTag);
      if (consultation.vitals?.weightKg && consultation.vitals.weightKg > 0) {
        setWeightKg(String(consultation.vitals.weightKg));
      }
      if (consultation.vitals?.temperatureC && consultation.vitals.temperatureC > 0) {
        setTemperatureC(String(consultation.vitals.temperatureC));
      }
      if (!isAdmin && isVet && currentUserName) {
        setAttendingVet(currentUserName);
      } else if (
        consultation.vetName &&
        consultation.vetName !== "Attending CVO Vet" &&
        !consultation.vetName.toLowerCase().includes("elena santos")
      ) {
        setAttendingVet(consultation.vetName);
      } else if (isAdmin) {
        setAttendingVet(HELEN_VET.name);
      }
    }
  }, [consultation, isAdmin, isVet, currentUserName]);

  // Reset/enforce whenever dialog opens
  useEffect(() => {
    if (open) {
      if (!isAdmin && isVet && currentUserName) {
        setAttendingVet(currentUserName);
      } else if (isAdmin && (!attendingVet || attendingVet.toLowerCase().includes("elena santos"))) {
        setAttendingVet(HELEN_VET.name);
      }
    }
  }, [open, isAdmin, isVet, currentUserName, attendingVet]);

  const handleVaccineChange = (val: string) => {
    setSelectedVaccineBatch(val);
    const matched = activeVaccineBatches.find((v: any) => v.batchNumber === val || v.id === val);
    if (matched) {
      setBatchNo(matched.batchNumber);
      setExpiryDate(matched.expirationDate);
    }
  };

  const selectedVetObj = useMemo(() => {
    if (!isAdmin && isVet && currentUserName) {
      const match = allAvailableVets.find((v) => v.name.toLowerCase() === currentUserName.toLowerCase());
      if (match) return match;
      return {
        id: user?.id || "current-vet",
        name: currentUserName,
        role: "Veterinarian",
        avatarUrl: currentUserAvatar,
        email: user?.primaryEmailAddress?.emailAddress,
      };
    }
    return (
      allAvailableVets.find((v) => v.name.toLowerCase() === attendingVet.toLowerCase()) ||
      allAvailableVets.find((v) => v.name.toLowerCase() === currentUserName.toLowerCase()) ||
      allAvailableVets[0] ||
      null
    );
  }, [allAvailableVets, attendingVet, isAdmin, isVet, currentUserName, currentUserAvatar, user]);

  const tempNum = parseFloat(temperatureC);
  const isFebrile = !isNaN(tempNum) && tempNum > 39.5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultation) return;

    if (isLockedPast24Hours) {
      toast.error("Record Finalized", {
        description: "You cannot update this clinical immunization record after 24 hours of administration.",
      });
      return;
    }

    if (isOutOfStock) {
      toast.error("Vaccination Restricted: Out of Stock", {
        description: "Cold-chain inventory has 0 doses of vaccines. Please add stock in Vaccine Inventory first.",
      });
      return;
    }

    if (!batchNo.trim()) {
      toast.error("Cold-chain batch / lot number is required for official immunization traceability.");
      return;
    }

    if (!tagNumber.trim()) {
      toast.error("Municipal Rabies Tag Number is required under RA 9482.");
      return;
    }

    if (isFebrile) {
      toast.error("Patient is febrile (>39.5°C). Medical protocol dictates deferring vaccination until afebrile.");
      return;
    }

    setSubmitting(true);
    const supabase = getPublicSupabaseClient();
    const todayIso = consultation?.date ? consultation.date.split("T")[0] : getTodayDateString();
    const finalBoosterDate = format(addYears(parseISO(todayIso), 1), "yyyy-MM-dd");
    const finalBoosterDisplay = format(addYears(parseISO(todayIso), 1), "MMMM d, yyyy");
    const chosenBatchItem = activeVaccineBatches.find((v: any) => v.batchNumber === batchNo.trim());
    const chosenVaccine = chosenBatchItem?.name || "Rabies Inactivated Vaccine (1.0 mL SC)";
    const recordNo = `VAX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const rawAppointmentId = consultation.id.startsWith("proc-") ? consultation.id.replace("proc-", "") : consultation.id;
    const finalVetName = (!isAdmin && isVet && currentUserName)
      ? currentUserName
      : (attendingVet || selectedVetObj?.name || "Attending Veterinarian");

    try {
      // 1. Update Pet Record in Supabase to mark verified vaccination
      if (consultation.petId) {
        await supabase
          .from("pets")
          .update({
            is_vaccinated: true,
            rabies_vaccinated: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", consultation.petId);
      }

      // 2. Insert into vaccination_records table for permanent municipal registry
      try {
        await supabase.from("vaccination_records").insert({
          record_no: recordNo,
          pet_name: consultation.petName || "Pet",
          pet_id: consultation.petId || null,
          species: consultation.species || "Dog",
          breed: consultation.breed || "Aspin (Mixed)",
          owner_name: consultation.ownerName || "Pet Owner",
          owner_contact: consultation.ownerContact || null,
          barangay: consultation.ownerBarangay || "Carmen",
          vaccine_name: chosenVaccine,
          batch_number: batchNo.trim(),
          administered_date: todayIso,
          next_due_date: finalBoosterDate,
          veterinarian: finalVetName,
          status: "complete",
        });
      } catch (vaxErr) {
        console.warn("Vaccination record table insert notice:", vaxErr);
      }

      // Auto-deduct 1 dose from cold-chain inventory stock
      if (batchNo.trim()) {
        try {
          await deductInventoryStock(batchNo.trim(), 1);
        } catch (stockErr) {
          console.warn("Inventory deduction notice:", stockErr);
        }
      }

      // 3. Update appointments table to 'completed' with clinical dose notes
      const clinicalNotes = `Anti-Rabies Prophylaxis Completed. Injected: ${dosageMl} mL ${route} (Batch: ${batchNo.trim()}). Site: ${injectionSite}. CVO Tag #${tagNumber.trim()}. Next annual booster: ${finalBoosterDisplay}. Attending: ${finalVetName}.`;
      
      try {
        await supabase
          .from("appointments")
          .update({
            status: "completed",
            notes: clinicalNotes,
          })
          .eq("id", rawAppointmentId);
      } catch (aptErr) {
        console.warn("Appointments update notice:", aptErr);
      }

      // 4. Update service_transactions
      try {
        await supabase
          .from("service_transactions")
          .update({
            status: "completed",
            detail: `Administered ${dosageMl} mL ${chosenVaccine} (Lot #${batchNo.trim()}). Municipal Tag #${tagNumber.trim()}.`,
          })
          .or(`reference_id.eq.${rawAppointmentId},id.eq.${rawAppointmentId}`);
      } catch (txErr) {
        console.warn("Service transaction update notice:", txErr);
      }

      // 5. Update local storage appointments cache & completion timestamps
      try {
        const nowIso = new Date().toISOString();
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        const updatedLocal = local.map((l: any) =>
          l.id === rawAppointmentId
            ? { ...l, status: "completed", notes: clinicalNotes, completed_at: nowIso }
            : l
        );
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(updatedLocal));

        const compMap = JSON.parse(localStorage.getItem("syncvet_completed_timestamps") || "{}");
        compMap[rawAppointmentId] = nowIso;
        if (consultation.id) compMap[consultation.id] = nowIso;
        if (consultation.encounterNo) compMap[consultation.encounterNo] = nowIso;
        localStorage.setItem("syncvet_completed_timestamps", JSON.stringify(compMap));

        const assignedVets = JSON.parse(localStorage.getItem("syncvet_assigned_vets") || "{}");
        assignedVets[rawAppointmentId] = finalVetName;
        if (consultation.id) assignedVets[consultation.id] = finalVetName;
        if (consultation.encounterNo) assignedVets[consultation.encounterNo] = finalVetName;
        if (consultation.petId) assignedVets[consultation.petId] = finalVetName;
        localStorage.setItem("syncvet_assigned_vets", JSON.stringify(assignedVets));
      } catch {
        // ignore
      }

      // 6. Invalidate relevant queries for realtime sync
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-queue"] });
      queryClient.invalidateQueries({ queryKey: ["clinical-consultations"] });
      queryClient.invalidateQueries({ queryKey: ["consultations_records"] });
      queryClient.invalidateQueries({ queryKey: ["vaccination_records"] });
      queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
      queryClient.invalidateQueries({ queryKey: ["vaccine_inventory"] });

      toast.success("Anti-Rabies Vaccine Administered Successfully", {
        description: `Tag #${tagNumber.trim()} issued to ${consultation.petName}. Booster scheduled for ${nextBoosterDisplay}.`,
      });

      const updatedEncounter: QueueEncounter = {
        ...consultation,
        status: "completed",
        vetName: finalVetName,
        vetAvatarUrl: selectedVetObj?.avatarUrl || consultation.vetAvatarUrl,
        treatment: `Administered ${dosageMl} mL ${chosenVaccine}`,
        medication: `Lot #${batchNo.trim()}`,
        dosageInstructions: `Tag #${tagNumber.trim()}. Annual booster due on ${nextBoosterDisplay}.`,
        veterinarianNotes: clinicalNotes,
      };

      onCompleted?.(updatedEncounter);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Vaccination administration error:", err);
      toast.error("Failed to complete vaccination protocol. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!consultation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[95vw] sm:max-w-[760px] max-h-[92vh] overflow-y-auto p-5 sm:p-6 bg-background rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-0 pb-3 border-b border-border/60 !pr-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                <Syringe className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="truncate">Administer Anti-Rabies Vaccine</span>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold shrink-0">
                    RA 9482
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Record cold-chain batch, verify triage, and complete immunization.
                </DialogDescription>
              </div>
            </div>

            {/* Header Action Buttons (Eliminating bottom footer gap) */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="submit"
                form="administer-vaccine-form"
                size="sm"
                disabled={submitting || isLockedPast24Hours || isFebrile || isOutOfStock || !batchNo || !tagNumber || !clinicallyCleared}
                className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs gap-1.5 shrink-0 whitespace-nowrap"
              >
                {isLockedPast24Hours ? (
                  <>
                    <Lock className="size-3.5" />
                    <span>Locked (Past 24h)</span>
                  </>
                ) : isOutOfStock ? (
                  <>
                    <AlertTriangle className="size-3.5" />
                    <span>Out of Stock</span>
                  </>
                ) : submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Administer Vaccine</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="size-8 rounded-full border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 24-Hour Policy Lock Banner */}
        {isLockedPast24Hours && (
          <div className="p-3 my-2 rounded-xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 space-y-1">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
              <Lock className="size-4 shrink-0" />
              <span>Record Finalized — Cannot Update After 24 Hours</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              This clinical immunization record was completed over 24 hours ago. Pursuant to CVO regulatory audit standards, records cannot be modified after 24 hours.
            </p>
          </div>
        )}

        {/* Out of Stock Restriction Banner */}
        {isOutOfStock && (
          <div className="p-3 my-2 rounded-xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 space-y-1">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Vaccine Out of Stock — Clinical Administration Restricted</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              There are currently <strong>0 doses</strong> of anti-rabies vaccine in cold-chain inventory. Please log a batch in <strong className="text-foreground">Vaccine Inventory</strong>.
            </p>
          </div>
        )}

        <form id="administer-vaccine-form" onSubmit={handleSubmit} className="space-y-3.5 py-3 text-xs">
          {/* SECTION 1: Pre-Vaccination Clinical Triage */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Thermometer className="size-3.5 text-primary" /> 1. Pre-Vaccination Health Clearance
              </span>
              <span className="text-[10px] text-muted-foreground">Clinical screening</span>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-0">
              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                  Body Temperature (°C) *
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={temperatureC}
                    onChange={(e) => setTemperatureC(e.target.value)}
                    className={cn(
                      "h-8 text-xs font-mono font-semibold",
                      isFebrile ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300" : ""
                    )}
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground">°C</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  Normal: 37.5°C – 39.2°C {isFebrile && <span className="text-rose-600 font-bold ml-1">• Fever Detected!</span>}
                </p>
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                  Patient Weight (kg) *
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="h-8 text-xs font-mono font-semibold"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground">kg</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Measured body weight</p>
              </div>
            </div>

            {/* Single Health Clearance Check */}
            <div className="pt-2 border-t border-border/50">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clinicallyCleared}
                  onChange={(e) => setClinicallyCleared(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-input text-primary focus:ring-primary cursor-pointer shrink-0"
                />
                <div className="space-y-0.5 text-xs">
                  <span className="font-semibold text-foreground block">
                    Patient Clinically Cleared for Immunization
                  </span>
                  <span className="text-[11px] text-muted-foreground block leading-tight">
                    Patient is alert and active (BAR), afebrile, ≥3 months old, with no vomiting, diarrhea, or illness in the last 48 hours.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 2: Vaccine Cold-Chain Administration & Dosage (Autogenerated & Generic Terms) */}
          <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Syringe className="size-3.5 text-blue-600 dark:text-blue-400" /> 2. Vaccine Cold-Chain & Injection Dose
              </span>
              {isOutOfStock ? (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="size-3" /> Out of Stock (0 Doses)
                </span>
              ) : (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="size-3" /> Live Inventory Sync
                </span>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Vaccine Product & Inventory Batch *
              </Label>
              {isOutOfStock ? (
                <div className="h-8 px-3 rounded-md border border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between font-semibold">
                  <span>No cold-chain vaccine batches available</span>
                  <Badge variant="outline" className="text-[9px] bg-rose-500/15 text-rose-600 border-rose-500/30">
                    Restock Required
                  </Badge>
                </div>
              ) : (
                <Select value={selectedVaccineBatch} onValueChange={handleVaccineChange}>
                  <SelectTrigger className="h-8 text-xs bg-background w-full">
                    <SelectValue placeholder="Select vaccine batch" />
                  </SelectTrigger>
                  <SelectContent className="z-[90]">
                    {activeVaccineBatches.map((v: any) => (
                      <SelectItem key={v.batchNumber} value={v.batchNumber} className="text-xs cursor-pointer">
                        <span className="font-semibold">{v.name}</span>{" "}
                        <span className="font-mono text-muted-foreground text-[11px]">(Lot #{v.batchNumber} • {v.stock} doses)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Dose, Route & Batch Row (Autogenerated & Generic Terms) */}
            <div className="grid grid-cols-3 gap-2.5 min-w-0">
              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                  Dose Injected *
                </Label>
                <div className="h-8 px-2.5 rounded-md border border-border/70 bg-background/80 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-foreground">1.0 mL</span>
                  <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                    Auto
                  </span>
                </div>
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                  Administration Route *
                </Label>
                <Select value={route} onValueChange={setRoute}>
                  <SelectTrigger className="h-8 text-xs bg-background w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[90]">
                    {ADMINISTRATION_ROUTES.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                  Batch / Lot No. *
                </Label>
                <div className="h-8 px-2.5 rounded-md border border-border/70 bg-background/80 flex items-center justify-between text-xs min-w-0">
                  <span className="font-mono font-bold text-foreground truncate">{batchNo || "—"}</span>
                  <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded shrink-0 ml-1">
                    Auto
                  </span>
                </div>
              </div>
            </div>

            {/* Injection Site & Rabies Tag Row */}
            <div className="grid grid-cols-2 gap-2.5 min-w-0">
              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                  Injection Site (Generic)
                </Label>
                <Select value={injectionSite} onValueChange={setInjectionSite}>
                  <SelectTrigger className="h-8 text-xs bg-background w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[90]">
                    {INJECTION_SITES.map((site) => (
                      <SelectItem key={site} value={site} className="text-xs">
                        {site}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 truncate">
                    <Tag className="size-3 text-primary" /> CVO Rabies Tag # *
                  </Label>
                  <button
                    type="button"
                    onClick={() => setTagNumber(`CDO-${new Date().getFullYear()}-R${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <RotateCw className="size-2.5" /> New
                  </button>
                </div>
                <div className="h-8 px-2.5 rounded-md border border-border/70 bg-background/80 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-primary tracking-wider">{tagNumber}</span>
                  <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Auto-assigned
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Attending Officer & Next Annual Booster Schedule */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCheck2 className="size-3.5 text-primary" /> 3. Attending Officer & Annual Booster
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              {/* Administering Veterinarian Selector / Locked Display */}
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                    Administering Veterinarian *
                  </Label>
                  {!isAdmin && (
                    <Badge variant="outline" className="text-[9px] font-medium text-muted-foreground bg-muted/40 border-border/60 gap-1 px-1.5 py-0 h-4">
                      <Lock className="size-2.5 text-muted-foreground" />
                      Locked to You
                    </Badge>
                  )}
                </div>

                {!isAdmin ? (
                  <div
                    className="h-9 px-2.5 rounded-md border border-border/70 bg-muted/30 flex items-center justify-between text-xs"
                    title="As a Veterinarian, you are administering this vaccine and cannot select another attending officer."
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <Avatar className="size-5 shrink-0 border border-primary/20">
                        {selectedVetObj?.avatarUrl ? (
                          <AvatarImage src={selectedVetObj.avatarUrl} alt={selectedVetObj.name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                          {(selectedVetObj?.name || currentUserName || "VT").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground truncate">
                        {selectedVetObj?.name || currentUserName}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ({selectedVetObj?.role || "Veterinarian"})
                      </span>
                    </div>
                    <Lock className="size-3 text-muted-foreground/60 shrink-0 ml-1.5" />
                  </div>
                ) : (
                  <Select value={attendingVet} onValueChange={setAttendingVet}>
                    <SelectTrigger className="h-9 text-xs bg-background w-full">
                      <div className="flex items-center gap-2 truncate">
                        {selectedVetObj ? (
                          <>
                            <Avatar className="size-5 shrink-0 border border-primary/20">
                              {selectedVetObj.avatarUrl ? (
                                <AvatarImage src={selectedVetObj.avatarUrl} alt={selectedVetObj.name} />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                                {selectedVetObj.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground text-xs truncate">
                              {selectedVetObj.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              ({selectedVetObj.role})
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Select Veterinarian</span>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent className="z-[90]">
                      {allAvailableVets.map((v) => (
                        <SelectItem key={v.id} value={v.name} className="text-xs cursor-pointer py-1.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-5 shrink-0 border border-primary/20">
                              {v.avatarUrl ? <AvatarImage src={v.avatarUrl} alt={v.name} /> : null}
                              <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                                {v.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-foreground">{v.name}</span>
                              <span className="text-[10px] text-muted-foreground">({v.role})</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Next Annual Booster Due (Autogenerated 1 Year RA 9482) */}
              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block flex items-center gap-1">
                  <Calendar className="size-3 text-primary" /> Next Annual Booster Due
                </Label>
                <div className="h-9 px-2.5 rounded-md border border-border/60 bg-muted/20 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="truncate">{nextBoosterDisplay}</span>
                  <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0 ml-1">
                    1 Year Interval
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
