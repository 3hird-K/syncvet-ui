"use client";

import { useState, useMemo, useEffect } from "react";
import { format, addDays, startOfDay, isBefore } from "date-fns";
import {
  Plus,
  Loader2,
  CalendarPlus,
  MapPin,
  Clock,
  Stethoscope,
  Syringe,
  Scissors,
  CheckCircle2,
  Megaphone,
  ShieldCheck,
  Building2,
  Lock,
  X,
  Search,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCVO } from "@/lib/cvo-context";
import { cvoBarangays } from "@/data/cvo-store";
import { buildRealStaffList, type CVOVetProfile } from "@/data/cvo-vets";
import { cn } from "@/lib/utils";

const TIME_WINDOWS = [
  { value: "08:00 AM - 05:00 PM", label: "08:00 AM - 05:00 PM (Official Hours)" },
];

const COMMON_VENUES = [
  "Barangay Hall Covered Court",
  "Multi-Purpose Gymnasium",
  "Barangay Health Center Plaza",
  "Community Daycare Center Grounds",
  "Barangay Plaza Stage",
];

export function ScheduleDriveDialog() {
  const { addFieldOperation, activeRoleView } = useCVO();
  const { user, isLoaded: isUserLoaded } = useUser();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch users from database to detect official role
  const { data: dbUsers = [] } = useQuery({
    queryKey: ["users_directory_for_outreach"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("*");
      return data || [];
    },
    staleTime: 1000 * 60,
  });

  const dbCurrentUser = (dbUsers as any[])?.find((u: any) => u.id === user?.id);
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const isAdminEmail = userEmail.includes("dime.neil03") || userEmail.includes("admin");
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
  const currentUserAvatar = dbCurrentUser?.avatar_url || user?.imageUrl;

  // Barangay selection
  const [barangay, setBarangay] = useState<string>("Lapasan");
  const [barangaySearch, setBarangaySearch] = useState<string>("");
  const [barangayPopoverOpen, setBarangayPopoverOpen] = useState(false);
  const [venue, setVenue] = useState<string>("Barangay Hall Covered Court");
  const [customVenue, setCustomVenue] = useState<string>("");

  // Search filtered CDO Barangays
  const filteredBarangays = useMemo(() => {
    const q = barangaySearch.toLowerCase().trim();
    if (!q) return cvoBarangays;
    return cvoBarangays.filter((b) => b.toLowerCase().includes(q));
  }, [barangaySearch]);

  // Services offered: strictly Consultation, Vaccination, Spay/Neuter
  const [services, setServices] = useState<{
    consultation: boolean;
    vaccination: boolean;
    spayNeuter: boolean;
  }>({
    consultation: true,
    vaccination: true,
    spayNeuter: false,
  });

  // Earliest allowable scheduling date is strictly future dates (tomorrow onwards)
  const minFutureDate = useMemo(() => {
    return addDays(startOfDay(new Date()), 1);
  }, []);

  // Scheduling details
  const [date, setDate] = useState<Date | undefined>(() => addDays(startOfDay(new Date()), 1));
  const [timeWindow, setTimeWindow] = useState<string>("08:00 AM - 05:00 PM");
  const [targetPets, setTargetPets] = useState<number>(100);

  // Assigned Veterinarian selection
  const [selectedVetId, setSelectedVetId] = useState<string>("vet-helen-tacandong");
  const [notes, setNotes] = useState<string>("");

  // Build the list of all real vet and admin staff from Supabase
  const availableVets = useMemo(() => {
    return buildRealStaffList(dbUsers, currentUserName, currentUserAvatar);
  }, [dbUsers, currentUserName, currentUserAvatar]);

  // If logged in as a Veterinarian (and not Admin), enforce the rule: they can't choose who to assign!
  useEffect(() => {
    if (!isAdmin && isVet && currentUserName) {
      const matched = availableVets.find(
        (v) =>
          v.name.toLowerCase() === currentUserName.toLowerCase() ||
          v.name.toLowerCase().includes(currentUserName.toLowerCase()) ||
          currentUserName.toLowerCase().includes(v.name.toLowerCase())
      );
      if (matched) {
        setSelectedVetId(matched.id);
      }
    }
  }, [open, isAdmin, isVet, currentUserName, availableVets]);

  const selectedVet: CVOVetProfile = useMemo(() => {
    if (!isAdmin && isVet && currentUserName) {
      const matched = availableVets.find(
        (v) =>
          v.name.toLowerCase() === currentUserName.toLowerCase() ||
          v.name.toLowerCase().includes(currentUserName.toLowerCase()) ||
          currentUserName.toLowerCase().includes(v.name.toLowerCase())
      );
      if (matched) return matched;
      return {
        id: user?.id || "current-vet",
        name: currentUserName,
        title: "Attending Veterinarian",
        role: "Licensed Field Veterinarian",
        licenseNo: "PRC Licensed",
        email: userEmail || "cvo.veterinarian@cagayandeoro.gov.ph",
        phone: "(088) 857-3184",
        avatarUrl: currentUserAvatar || "",
        specialization: "Clinical Consultations, Vaccination & Surgery",
      };
    }
    return availableVets.find((v) => v.id === selectedVetId) || availableVets[0];
  }, [selectedVetId, availableVets, isAdmin, isVet, currentUserName, user?.id, userEmail, currentUserAvatar]);

  const toggleService = (key: keyof typeof services) => {
    setServices((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.consultation && !next.vaccination && !next.spayNeuter) {
        toast.error("Please select at least one outreach service (Consultation, Vaccination, or Spay/Neuter).");
        return prev;
      }
      return next;
    });
  };

  const selectedServiceTypes = useMemo(() => {
    const list: ("consultation" | "vaccination" | "spay-neuter")[] = [];
    if (services.consultation) list.push("consultation");
    if (services.vaccination) list.push("vaccination");
    if (services.spayNeuter) list.push("spay-neuter");
    return list;
  }, [services]);

  const operationTypeLabel = useMemo(() => {
    const labels: string[] = [];
    if (services.vaccination) labels.push("Vaccination");
    if (services.consultation) labels.push("Consultation");
    if (services.spayNeuter) labels.push("Spay/Neuter");
    return `Barangay Outreach (${labels.join(" • ")})`;
  }, [services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangay) {
      toast.error("Please select a target barangay");
      return;
    }

    if (selectedServiceTypes.length === 0) {
      toast.error("Please select at least one service");
      return;
    }

    const finalVenue = customVenue.trim() || venue;
    if (!finalVenue) {
      toast.error("Please specify an outreach venue");
      return;
    }

    if (!date || isBefore(startOfDay(date), minFutureDate)) {
      toast.error("Field operations must be scheduled for a future date (starting tomorrow onwards).");
      return;
    }

    setLoading(true);
    try {
      const scheduledDateStr = format(date, "yyyy-MM-dd");

      await addFieldOperation({
        barangay,
        venue: finalVenue,
        timeWindow,
        services: selectedServiceTypes,
        type: operationTypeLabel,
        lead: selectedVet.name,
        vetProfile: {
          name: selectedVet.name,
          role: selectedVet.role,
          avatarUrl: selectedVet.avatarUrl,
          licenseNo: selectedVet.licenseNo,
          contact: selectedVet.email,
          title: selectedVet.title,
        },
        date: scheduledDateStr,
        petsTarget: Number(targetPets) || 100,
        petsVaccinated: 0,
        status: "scheduled",
        notes: notes || undefined,
      });

      toast.success("Barangay Outreach Scheduled & Announced!", {
        description: `Official drive in Brgy. ${barangay} set for ${scheduledDateStr}. Public CVO announcement is now live.`,
      });

      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to schedule barangay outreach visit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 text-xs font-semibold cursor-pointer">
          <Plus className="size-3.5" /> Schedule Barangay Visit
        </Button>
      </DialogTrigger>

      {/* Responsive Dialog Window: sm:max-w-4xl lg:max-w-5xl */}
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl lg:max-w-5xl w-[96vw] max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xl"
      >
        {/* Top Header Bar with Confirm Button beside X icon */}
        <DialogHeader className="p-4 sm:p-5 pb-3.5 border-b border-border/60 bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <CalendarPlus className="size-4.5 sm:size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                  Schedule Barangay Outreach Visit
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  Plan and deploy a community outreach visit with automated announcement broadcasting.
                </DialogDescription>
              </div>
            </div>

            {/* Confirm button at the top beside the X icon */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="submit"
                form="schedule-drive-form"
                disabled={loading}
                size="sm"
                className="hidden sm:inline-flex h-8.5 px-3.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs gap-1.5 shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Deploying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Confirm & Broadcast</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="size-8 rounded-full border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body: Balanced 2-Column Grid on larger screens */}
        <form id="schedule-drive-form" onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
            {/* ── LEFT COLUMN ── */}
            <div className="space-y-4">
              {/* 1. Target Barangay & Venue */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Target Location & Outreach Venue</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5 min-w-0">
                    <Label htmlFor="barangay" className="text-[11px] font-semibold text-foreground">
                      Target Barangay (CDO) <span className="text-destructive">*</span>
                    </Label>
                    <Popover open={barangayPopoverOpen} onOpenChange={setBarangayPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="barangay"
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={barangayPopoverOpen}
                          className="w-full h-9.5 justify-between px-3 text-xs bg-background font-normal border-input hover:bg-muted/40 cursor-pointer text-left"
                        >
                          <span className="font-semibold text-foreground truncate">
                            {barangay ? `Barangay ${barangay}` : "Select barangay..."}
                          </span>
                          <ChevronsUpDown className="size-3.5 opacity-50 shrink-0 ml-1.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0 shadow-lg border border-border" align="start">
                        <div className="p-2 border-b border-border/80">
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-muted/30">
                            <Search className="size-3.5 text-muted-foreground shrink-0" />
                            <input
                              type="text"
                              value={barangaySearch}
                              onChange={(e) => setBarangaySearch(e.target.value)}
                              placeholder="Search CDO barangay..."
                              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                              autoFocus
                            />
                            {barangaySearch && (
                              <button
                                type="button"
                                onClick={() => setBarangaySearch("")}
                                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                                title="Clear search"
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
                          {filteredBarangays.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4 italic">
                              No barangay found matching &ldquo;{barangaySearch}&rdquo;
                            </p>
                          ) : (
                            filteredBarangays.map((b) => {
                              const isSelected = barangay.toLowerCase() === b.toLowerCase();
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => {
                                    setBarangay(b);
                                    setBarangayPopoverOpen(false);
                                    setBarangaySearch("");
                                  }}
                                  className={cn(
                                    "w-full text-left px-2.5 py-2 rounded-md hover:bg-muted text-xs flex items-center justify-between cursor-pointer transition-colors",
                                    isSelected && "bg-primary/10 text-primary font-bold"
                                  )}
                                >
                                  <span>Barangay {b}</span>
                                  {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                        <div className="p-1.5 border-t border-border/60 bg-muted/20 text-[10px] text-muted-foreground text-center">
                          {filteredBarangays.length} of {cvoBarangays.length} CDO barangays
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid gap-1.5 min-w-0">
                    <Label htmlFor="venue" className="text-[11px] font-semibold text-foreground">
                      Outreach Venue <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={venue}
                      onValueChange={(val) => {
                        setVenue(val);
                        if (val !== "Other") setCustomVenue("");
                      }}
                    >
                      <SelectTrigger id="venue" className="h-9.5 text-xs bg-background">
                        <SelectValue placeholder="Select venue" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_VENUES.map((v) => (
                          <SelectItem key={v} value={v} className="text-xs">
                            {v}
                          </SelectItem>
                        ))}
                        <SelectItem value="Other" className="text-xs">Custom Specific Venue...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {venue === "Other" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="customVenue" className="text-[11px] font-semibold text-foreground">
                      Specific Venue Details
                    </Label>
                    <Input
                      id="customVenue"
                      placeholder="e.g. Zone 4 Basketball Court beside Daycare Center"
                      value={customVenue}
                      onChange={(e) => setCustomVenue(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                )}
              </div>

              {/* 2. Schedule, Time & Capacity */}
              <div className="space-y-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Clock className="size-3.5 text-primary" />
                    <span>Schedule, Time Window & Capacity</span>
                  </div>
                  <span className="text-[10.5px] text-muted-foreground font-medium">Future dates only</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5 min-w-0">
                    <Label className="text-[11px] font-semibold text-foreground">
                      Scheduled Date <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                      date={date}
                      setDate={setDate}
                      fromDate={minFutureDate}
                      disabled={(d) => isBefore(startOfDay(d), minFutureDate)}
                      className="h-9.5 text-xs font-medium"
                    />
                  </div>

                  <div className="grid gap-1.5 min-w-0">
                    <Label htmlFor="timeWindow" className="text-[11px] font-semibold text-foreground">
                      Time Window
                    </Label>
                    <Select value={timeWindow} onValueChange={setTimeWindow}>
                      <SelectTrigger id="timeWindow" className="h-9.5 text-xs bg-background">
                        <SelectValue placeholder="Select hours" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_WINDOWS.map((tw) => (
                          <SelectItem key={tw.value} value={tw.value} className="text-xs">
                            {tw.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5 pt-0.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="target" className="text-[11px] font-semibold text-foreground">
                      Slots / Animals Capacity <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10.5px] text-muted-foreground font-medium">
                      Target: <strong className="text-foreground">{targetPets}</strong> animals
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      id="target"
                      type="number"
                      min={10}
                      max={500}
                      step={10}
                      value={targetPets}
                      onChange={(e) => setTargetPets(Number(e.target.value) || 0)}
                      className="h-9 text-xs w-24 shrink-0 font-bold"
                      required
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[50, 100, 150, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTargetPets(preset)}
                          className={cn(
                            "h-7 px-2.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer",
                            targetPets === preset
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {preset} pets
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Outreach Services Handled */}
              <div className="space-y-2.5 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Outreach Services Handled
                  </div>
                  <span className="text-[11px] text-muted-foreground">Select one or more</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Service 1: Consultation */}
                  <button
                    type="button"
                    onClick={() => toggleService("consultation")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                      services.consultation
                        ? "border-blue-500/50 bg-blue-500/10 text-foreground ring-1 ring-blue-500/20"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "size-7 rounded-lg flex items-center justify-center",
                        services.consultation ? "bg-blue-500/20 text-blue-500" : "bg-muted text-muted-foreground"
                      )}>
                        <Stethoscope className="size-3.5" />
                      </div>
                      <div className={cn(
                        "size-4 rounded-full flex items-center justify-center border",
                        services.consultation ? "border-blue-500 bg-blue-500 text-white" : "border-muted-foreground/40"
                      )}>
                        {services.consultation && <CheckCircle2 className="size-3.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Consultation</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        General exam, triage & deworming
                      </p>
                    </div>
                  </button>

                  {/* Service 2: Vaccination */}
                  <button
                    type="button"
                    onClick={() => toggleService("vaccination")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                      services.vaccination
                        ? "border-emerald-500/50 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/20"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "size-7 rounded-lg flex items-center justify-center",
                        services.vaccination ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
                      )}>
                        <Syringe className="size-3.5" />
                      </div>
                      <div className={cn(
                        "size-4 rounded-full flex items-center justify-center border",
                        services.vaccination ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40"
                      )}>
                        {services.vaccination && <CheckCircle2 className="size-3.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Vaccination</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Mass anti-rabies & immunization
                      </p>
                    </div>
                  </button>

                  {/* Service 3: Spay/Neuter */}
                  <button
                    type="button"
                    onClick={() => toggleService("spayNeuter")}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                      services.spayNeuter
                        ? "border-purple-500/50 bg-purple-500/10 text-foreground ring-1 ring-purple-500/20"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "size-7 rounded-lg flex items-center justify-center",
                        services.spayNeuter ? "bg-purple-500/20 text-purple-500" : "bg-muted text-muted-foreground"
                      )}>
                        <Scissors className="size-3.5" />
                      </div>
                      <div className={cn(
                        "size-4 rounded-full flex items-center justify-center border",
                        services.spayNeuter ? "border-purple-500 bg-purple-500 text-white" : "border-muted-foreground/40"
                      )}>
                        {services.spayNeuter && <CheckCircle2 className="size-3.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Spay / Neuter</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        Community surgical kapon drive
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-4">
              {/* 4. Assigned Attending Veterinarian */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-primary" />
                    <span>Assigned Attending Veterinarian</span>
                  </div>
                  {!isAdmin && isVet ? (
                    <Badge variant="outline" className="text-[9px] font-medium text-muted-foreground bg-muted/40 border-border/60 gap-1 px-1.5 py-0.5">
                      <Lock className="size-2.5 text-muted-foreground" />
                      Locked to You
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      Licensed Administering Lead
                    </Badge>
                  )}
                </div>

                {/* If user is a Veterinarian and not Admin, enforce rule: cannot choose who to assign! */}
                {!isAdmin && isVet ? (
                  <div
                    className="h-11 px-3 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between text-xs"
                    title="As a Veterinarian, you are automatically designated as the attending officer and cannot select another."
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0">
                      <Avatar className="size-7 rounded-lg border border-primary/20 shrink-0">
                        <AvatarImage
                          src={selectedVet.avatarUrl || "/dr-helen-tacandong.jpg"}
                          alt={selectedVet.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-lg text-[10px] font-bold bg-primary/10 text-primary">
                          {selectedVet.name.replace("Dr.", "").trim().slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <span className="font-semibold text-foreground">{selectedVet.name}</span>
                        <span className="text-[11px] text-muted-foreground ml-1.5">({selectedVet.role})</span>
                      </div>
                    </div>
                    <Lock className="size-3.5 text-muted-foreground shrink-0" />
                  </div>
                ) : (
                  <Select value={selectedVetId} onValueChange={setSelectedVetId}>
                    <SelectTrigger className="h-11 text-xs bg-background">
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <Avatar className="size-7 rounded-lg border border-primary/20 shrink-0">
                          <AvatarImage
                            src={selectedVet.avatarUrl || "/dr-helen-tacandong.jpg"}
                            alt={selectedVet.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="rounded-lg text-[10px] font-bold bg-primary/10 text-primary">
                            {selectedVet.name.replace("Dr.", "").trim().slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-foreground truncate">{selectedVet.name}</span>
                          <span className="text-muted-foreground text-[11px] truncate">— {selectedVet.title}</span>
                        </div>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {availableVets.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs py-2 cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-6 rounded-md border border-border shrink-0">
                              <AvatarImage
                                src={v.avatarUrl || "/dr-helen-tacandong.jpg"}
                                alt={v.name}
                                className="object-cover"
                              />
                              <AvatarFallback className="text-[9px] font-bold bg-muted text-foreground">
                                {v.name.replace("Dr.", "").trim().slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-foreground">{v.name}</span>
                              <span className="text-[10px] text-muted-foreground">{v.title}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Profile Card of the assigned vet (Compact & Responsive) */}
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
                  <Avatar className="size-11 rounded-xl border border-primary/30 shrink-0 shadow-xs">
                    <AvatarImage
                      src={selectedVet.avatarUrl || "/dr-helen-tacandong.jpg"}
                      alt={selectedVet.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-xl font-bold text-xs bg-primary/10 text-primary">
                      {selectedVet.name
                        .replace("Dr.", "")
                        .trim()
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {selectedVet.name}
                      </h4>
                      <Badge variant="outline" className="text-[9px] font-mono py-0 h-4 bg-background border-primary/30 text-primary">
                        PRC #{selectedVet.licenseNo}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-primary font-medium truncate">
                      {selectedVet.role} • {selectedVet.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {selectedVet.specialization}
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Automatic Announcement Integration Notice */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
                <div className="size-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Megaphone className="size-3.5" />
                </div>
                <div className="text-xs space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span>Announcement Broadcast</span>
                    <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/15">
                      Auto-Deletes on Done
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Automatically publishes an official CVO announcement for <strong className="text-foreground">Barangay {barangay}</strong> residents with full outreach details. Auto-archived once concluded.
                  </p>
                </div>
              </div>

              {/* 6. Operational Notes */}
              <div className="grid gap-1.5">
                <Label htmlFor="notes" className="text-[11px] font-semibold text-foreground">
                  Deployment Notes & Field Checklist <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cold-chain rabies vaccine ice boxes checked; barangay health workers notified; rabies tags batch #2026-B ready."
                  className="text-xs placeholder:text-[11px] leading-relaxed min-h-[70px] resize-none"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Mobile Action Bar */}
        <div className="p-3.5 sm:hidden border-t border-border/60 bg-muted/30 sticky bottom-0 z-20 backdrop-blur-md flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1 h-9 text-xs rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="schedule-drive-form"
            disabled={loading}
            className="flex-1 h-9 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deploying...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                <span>Confirm & Broadcast</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
