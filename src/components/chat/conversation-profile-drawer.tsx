"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useCVO } from "@/lib/cvo-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  PawPrint,
  Calendar,
  Clock,
  Stethoscope,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Plus,
  AlertCircle,
  FileText,
  Activity,
  Heart,
  Building2,
  Copy,
  Check,
  CalendarDays,
  Sparkles,
  Info,
} from "lucide-react";
import { cn, getTwoLetterInitials } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { PetAvatar } from "@/components/dashboard/pet-avatar";

interface ConversationProfileDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeThread: any;
  isVeterinarian: boolean;
  activeDesk: "admin" | "vet";
  contactName: string;
  contactAvatarUrl?: string | null;
  contactSubtitle?: string;
  activeStatusLabel?: string;
  isCurrentActive?: boolean;
}

export function ConversationProfileDrawer({
  isOpen,
  onOpenChange,
  activeThread,
  isVeterinarian,
  activeDesk,
  contactName,
  contactAvatarUrl,
  contactSubtitle,
  activeStatusLabel = "Active now",
  isCurrentActive = false,
}: ConversationProfileDrawerProps) {
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const { consultations: cvoConsultations } = useCVO();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const ownerId = activeThread?.owner_id;
  const citizenFullName =
    activeThread?.users?.full_name ||
    (isVeterinarian ? contactName : null);
  const citizenEmail = activeThread?.users?.email;
  const citizenPhone = activeThread?.users?.phone || activeThread?.users?.phone_number;
  const citizenAddress = activeThread?.users?.address;

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. TanStack Query for full user record
  const { data: dbUser } = useQuery({
    queryKey: ["conversation-user-details", ownerId, citizenEmail],
    queryFn: async () => {
      try {
        if (!ownerId && !citizenEmail) return null;
        let query = supabase.from("users").select("*");
        if (ownerId) {
          query = query.eq("id", ownerId);
        } else if (citizenEmail) {
          query = query.eq("email", citizenEmail);
        }
        const { data, error } = await query.maybeSingle();
        if (error) return null;
        return data;
      } catch {
        return null;
      }
    },
    enabled: isOpen && (!!ownerId || !!citizenEmail),
    staleTime: 1000 * 30,
  });

  // 2. TanStack Query for all pets of this citizen
  const { data: userPets = [], isLoading: isLoadingPets } = useQuery({
    queryKey: ["conversation-user-pets", ownerId, citizenEmail, citizenFullName],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*")
          .order("created_at", { ascending: false });

        if (error || !data) return [];

        const filtered = data.filter((p: any) => {
          if (ownerId && p.owner_id === ownerId) return true;
          if (dbUser?.id && p.owner_id === dbUser.id) return true;
          return false;
        });

        return filtered;
      } catch {
        return [];
      }
    },
    enabled: isOpen && isVeterinarian,
    staleTime: 1000 * 20,
  });

  // 3. TanStack Query for clinical consultations
  const { data: userConsultations = [], isLoading: isLoadingConsultations } = useQuery({
    queryKey: ["conversation-consultations", ownerId, citizenFullName],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("consultations")
          .select("*, pets:pet_id(id, name, species, breed)")
          .order("date", { ascending: false });

        if (error || !data) {
          // Fallback to CVOContext consultations
          return cvoConsultations.filter((c: any) => {
            if (ownerId && c.ownerId === ownerId) return true;
            if (citizenFullName && c.ownerName?.toLowerCase() === citizenFullName.toLowerCase()) return true;
            return false;
          });
        }

        const normalizedName = citizenFullName ? citizenFullName.trim().toLowerCase() : "";

        const matched = data.filter((c: any) => {
          if (ownerId && c.owner_id === ownerId) return true;
          if (normalizedName && c.owner_name && c.owner_name.trim().toLowerCase() === normalizedName) return true;
          return false;
        });

        return matched;
      } catch {
        return [];
      }
    },
    enabled: isOpen && isVeterinarian,
    staleTime: 1000 * 20,
  });

  // 4. TanStack Query for appointments
  const { data: userAppointments = [] } = useQuery({
    queryKey: ["conversation-appointments", ownerId],
    queryFn: async () => {
      try {
        if (!ownerId && !dbUser?.id) return [];
        const targetId = ownerId || dbUser?.id;
        const { data, error } = await supabase
          .from("appointments")
          .select("*, pets:pet_id(id, name, species, breed)")
          .eq("owner_id", targetId)
          .order("date", { ascending: false });

        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
    enabled: isOpen && isVeterinarian && (!!ownerId || !!dbUser?.id),
    staleTime: 1000 * 30,
  });

  // Resolved citizen details
  const resolvedName = dbUser?.full_name || citizenFullName || contactName;
  const resolvedEmail = dbUser?.email || citizenEmail || "Not provided";
  const resolvedPhone = dbUser?.phone_number || citizenPhone || "Not provided";
  const resolvedAddress = dbUser?.address || citizenAddress || "Cagayan de Oro City";
  const resolvedAvatar = dbUser?.avatar_url || contactAvatarUrl;
  const resolvedMemberSince = dbUser?.created_at
    ? new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(dbUser.created_at)
      )
    : "Verified Resident";

  // Synthesize pets list (include activeThread's pet if not already in list)
  const displayPets = useMemo(() => {
    const list = [...userPets];
    if (activeThread?.pet_name && activeThread.pet_name !== "Registered Pet") {
      const alreadyIncluded = list.some(
        (p) => p.name?.toLowerCase() === activeThread.pet_name.toLowerCase()
      );
      if (!alreadyIncluded) {
        list.unshift({
          id: activeThread.pet_id || "active-inquiry-pet",
          name: activeThread.pet_name,
          species: activeThread.pet_species || "Dog",
          breed: activeThread.pet_breed || "Mixed",
          gender: "Not specified",
          birth_year: null,
          weight_category: "Standard",
          rabies_vaccinated: false,
          is_vaccinated: false,
          is_spayed_neutered: false,
          microchip_number: "Active Inquiry",
          isConsultationPet: true,
        });
      }
    }
    return list;
  }, [userPets, activeThread]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[560px] md:max-w-[620px] w-full p-0 flex flex-col h-full bg-background border-l border-border/60 shadow-2xl !z-[2000] overflow-hidden"
      >
        {/* Header Section */}
        <div className="relative border-b border-border/60 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent p-6 shrink-0">
          <SheetHeader className="p-0 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="size-16 rounded-2xl border-2 border-primary/30 shadow-md overflow-hidden bg-card">
                    {resolvedAvatar && (
                      <AvatarImage
                        src={resolvedAvatar}
                        alt={resolvedName}
                        className={
                          !isVeterinarian && activeDesk === "admin"
                            ? "object-contain p-2 bg-white"
                            : "object-cover"
                        }
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xl rounded-2xl">
                      {!isVeterinarian ? (
                        activeDesk === "admin" ? (
                          <Building2 className="size-7" />
                        ) : (
                          <Stethoscope className="size-7" />
                        )
                      ) : (
                        getTwoLetterInitials(resolvedName)
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute -bottom-1 -right-1 size-4 rounded-full ring-2 ring-background transition-colors",
                      isCurrentActive
                        ? "bg-emerald-500 shadow-xs"
                        : "bg-zinc-400 dark:bg-zinc-600"
                    )}
                    title={activeStatusLabel}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SheetTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                      {resolvedName}
                    </SheetTitle>
                    {isVeterinarian ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold"
                      >
                        <ShieldCheck className="size-3 mr-1 inline" />
                        Registered Citizen
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold"
                      >
                        <ShieldCheck className="size-3 mr-1 inline" />
                        Official CVO Desk
                      </Badge>
                    )}
                  </div>

                  <SheetDescription className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {contactSubtitle}
                  </SheetDescription>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] font-medium text-muted-foreground">
                    <span
                      className={cn(
                        "size-2 rounded-full shrink-0",
                        isCurrentActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                      )}
                    />
                    <span>{activeStatusLabel}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span>Joined {resolvedMemberSince}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <div
                onClick={() => handleCopy(resolvedEmail, "Email")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors text-xs text-muted-foreground group"
                title="Click to copy email"
              >
                <Mail className="size-3.5 text-primary shrink-0" />
                <span className="truncate flex-1 font-mono text-[11px] text-foreground">
                  {resolvedEmail}
                </span>
                {copiedKey === "Email" ? (
                  <Check className="size-3 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="size-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </div>

              <div
                onClick={() => handleCopy(resolvedPhone, "Phone")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors text-xs text-muted-foreground group"
                title="Click to copy phone"
              >
                <Phone className="size-3.5 text-primary shrink-0" />
                <span className="truncate flex-1 font-mono text-[11px] text-foreground">
                  {resolvedPhone}
                </span>
                {copiedKey === "Phone" ? (
                  <Check className="size-3 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="size-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content Body */}
        {isVeterinarian ? (
          <Tabs defaultValue="pets" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-3 pb-2 border-b border-border/40 bg-muted/20 shrink-0">
              <TabsList className="grid grid-cols-3 h-10 w-full p-1 bg-muted/60">
                <TabsTrigger value="pets" className="text-xs font-semibold gap-1.5 cursor-pointer">
                  <PawPrint className="size-3.5" />
                  <span>Pets</span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 min-w-4 rounded-full">
                    {displayPets.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Stethoscope className="size-3.5" />
                  <span>History</span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 min-w-4 rounded-full">
                    {userConsultations.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <User className="size-3.5" />
                  <span>Profile</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Pets */}
            <TabsContent
              value="pets"
              className="flex-1 overflow-y-auto p-6 space-y-4 m-0 focus-visible:outline-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">Registered Animals</h4>
                  <p className="text-xs text-muted-foreground">
                    Official pets on record with Cagayan de Oro City Veterinary Office
                  </p>
                </div>
                <Link href="/pet-registry">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 rounded-lg border-primary/30 hover:bg-primary/10 hover:text-primary cursor-pointer shadow-2xs"
                  >
                    <Plus className="size-3.5" /> Add Pet
                  </Button>
                </Link>
              </div>

              {isLoadingPets ? (
                <div className="space-y-3 py-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/50"
                    />
                  ))}
                </div>
              ) : displayPets.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20 space-y-3">
                  <PawPrint className="size-10 text-muted-foreground/40 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">No Registered Animals</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      This citizen does not have any pets registered in the CVO database yet.
                    </p>
                  </div>
                  <Link href="/pet-registry">
                    <Button size="sm" className="mt-2 text-xs gap-1.5 rounded-lg">
                      <Plus className="size-3.5" /> Register First Animal
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayPets.map((pet: any, idx: number) => {
                    const isVaccinated = Boolean(
                      pet.rabies_vaccinated || pet.is_vaccinated
                    );
                    const isSterilized = Boolean(
                      pet.is_spayed_neutered || pet.is_neutered
                    );
                    const microchip = pet.microchip_number || pet.id;
                    const petAge = pet.birth_year
                      ? `${Math.max(1, new Date().getFullYear() - pet.birth_year)} yrs`
                      : pet.age || "Young adult";

                    return (
                      <div
                        key={pet.id || idx}
                        className="p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all space-y-3 relative overflow-hidden group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <PetAvatar
                              photoUrl={pet.photo_url || pet.photoUrl}
                              species={pet.species}
                              name={pet.name}
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-sm text-foreground">
                                  {pet.name}
                                </h5>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-medium py-0 px-2 rounded-md bg-muted/40"
                                >
                                  {pet.species || "Dog"}
                                </Badge>
                                {pet.isConsultationPet && (
                                  <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[9px] py-0 px-1.5">
                                    Current Inquiry
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {pet.breed || "Mixed Breed"} • {pet.gender || "Male"} • {petAge}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold border",
                                isVaccinated
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                              )}
                            >
                              <ShieldCheck className="size-3 mr-1 inline" />
                              {isVaccinated ? "Rabies Vaccinated" : "Vaccine Due"}
                            </Badge>
                            {isSterilized && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 text-muted-foreground"
                              >
                                Spayed / Neutered
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Pet Attributes Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-border/40 text-[11px]">
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground">Tag / Microchip:</span>
                            <div
                              onClick={() => handleCopy(microchip, "Microchip")}
                              className="font-mono font-medium text-foreground flex items-center gap-1 cursor-pointer hover:text-primary transition-colors truncate"
                              title="Click to copy tag"
                            >
                              <span className="truncate">{microchip}</span>
                              <Copy className="size-2.5 shrink-0 opacity-60" />
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-muted-foreground">Weight Class:</span>
                            <p className="font-medium text-foreground truncate">
                              {pet.weight_category || "Medium (10–25 kg)"}
                            </p>
                          </div>

                          <div className="space-y-0.5 col-span-2 sm:col-span-1">
                            <span className="text-muted-foreground">Registered Date:</span>
                            <p className="font-medium text-foreground">
                              {pet.created_at
                                ? new Intl.DateTimeFormat("en-PH", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }).format(new Date(pet.created_at))
                                : "Active"}
                            </p>
                          </div>
                        </div>

                        {pet.notes && (
                          <div className="p-2.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground border border-border/40">
                            <span className="font-semibold text-foreground">Notes: </span>
                            {pet.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Tab 2: History (Clinical consultations & medical records) */}
            <TabsContent
              value="history"
              className="flex-1 overflow-y-auto p-6 space-y-4 m-0 focus-visible:outline-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">Clinical Encounters</h4>
                  <p className="text-xs text-muted-foreground">
                    Veterinary examinations, diagnoses, and medication history
                  </p>
                </div>
                <Link href="/consultations">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 rounded-lg border-primary/30 hover:bg-primary/10 hover:text-primary cursor-pointer shadow-2xs"
                  >
                    <Stethoscope className="size-3.5" /> All Consultations
                  </Button>
                </Link>
              </div>

              {isLoadingConsultations ? (
                <div className="space-y-3 py-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-32 rounded-2xl bg-muted/40 animate-pulse border border-border/50"
                    />
                  ))}
                </div>
              ) : userConsultations.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 bg-muted/20 space-y-3">
                  <Stethoscope className="size-10 text-muted-foreground/40 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-foreground">No Prior Consultations</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      No clinical consultation encounters have been logged for this citizen yet. Active telemedicine chat is on record.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userConsultations.map((c: any) => {
                    const statusColor =
                      c.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : c.status === "in-consultation" || c.status === "treatment"
                        ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";

                    return (
                      <div
                        key={c.id}
                        className="p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all space-y-3 relative"
                      >
                        {/* Encounter Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-primary">
                                {c.encounter_no || c.encounterNo || "ENC-RECORD"}
                              </span>
                              <Badge className={cn("text-[9px] py-0 px-2 font-semibold capitalize border", statusColor)}>
                                {c.status || "Completed"}
                              </Badge>
                            </div>
                            <h5 className="font-bold text-sm text-foreground">
                              Patient: {c.pets?.name || c.pet_name || c.petName} ({c.pets?.species || c.species} {(c.pets?.breed || c.breed) ? `• ${c.pets?.breed || c.breed}` : ""})
                            </h5>
                          </div>

                          <div className="text-right text-xs text-muted-foreground">
                            <div className="flex items-center gap-1 font-medium justify-end">
                              <Calendar className="size-3" />
                              <span>{c.date}</span>
                            </div>
                            {c.time && (
                              <div className="flex items-center gap-1 text-[11px] justify-end mt-0.5 text-muted-foreground/70">
                                <Clock className="size-2.5" />
                                <span>{c.time}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Complaint & Symptoms */}
                        <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
                          <div>
                            <span className="font-semibold text-foreground">Chief Complaint: </span>
                            <span className="text-muted-foreground">{c.chief_complaint || c.chiefComplaint}</span>
                          </div>

                          {/* Symptoms list */}
                          {c.symptoms && Array.isArray(c.symptoms) && c.symptoms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {c.symptoms.map((s: string, sIdx: number) => (
                                <Badge
                                  key={sIdx}
                                  variant="secondary"
                                  className="text-[9px] py-0 px-1.5 bg-background border border-border/50 text-foreground"
                                >
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Clinical Vitals */}
                        {(c.weight_kg || c.temperature_c || c.heart_rate_bpm) && (
                          <div className="grid grid-cols-3 gap-2 py-1 text-[11px] bg-card rounded-lg">
                            {c.weight_kg && (
                              <div className="px-2 py-1 rounded bg-muted/40 border border-border/30">
                                <span className="text-muted-foreground block text-[10px]">Weight:</span>
                                <span className="font-semibold text-foreground">{c.weight_kg} kg</span>
                              </div>
                            )}
                            {c.temperature_c && (
                              <div className="px-2 py-1 rounded bg-muted/40 border border-border/30">
                                <span className="text-muted-foreground block text-[10px]">Temperature:</span>
                                <span className="font-semibold text-foreground">{c.temperature_c} °C</span>
                              </div>
                            )}
                            {c.heart_rate_bpm && (
                              <div className="px-2 py-1 rounded bg-muted/40 border border-border/30">
                                <span className="text-muted-foreground block text-[10px]">Heart Rate:</span>
                                <span className="font-semibold text-foreground">{c.heart_rate_bpm} bpm</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Diagnosis & Treatment */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                            <span className="font-semibold text-emerald-800 dark:text-emerald-400 block text-[11px]">
                              Diagnosis:
                            </span>
                            <p className="text-foreground mt-0.5">{c.diagnosis || "Under Observation"}</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-teal-500/5 border border-teal-500/15">
                            <span className="font-semibold text-teal-800 dark:text-teal-400 block text-[11px]">
                              Treatment / Rx:
                            </span>
                            <p className="text-foreground mt-0.5">
                              {c.treatment || c.medication || "Supportive clinical care"}
                            </p>
                          </div>
                        </div>

                        {/* Attending Veterinarian Footnote */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="size-3 text-primary" />
                            <span>Attending Vet: <strong className="text-foreground">{c.vet_name || c.vetName || "Dr. Helen Ann P. Tacandong"}</strong></span>
                          </div>
                          {c.service_type && (
                            <Badge variant="outline" className="text-[9px] py-0">
                              {c.service_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Appointments & Procedure Ledger */}
              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Municipal Procedure Appointments</h4>
                    <p className="text-xs text-muted-foreground">
                      Booked clinic schedules (Vaccination & Spay/Neuter)
                    </p>
                  </div>
                  {userAppointments.some((a: any) => a.status === "missed" || (a.status === "confirmed" && a.date && new Date(a.date) < new Date(new Date().setHours(0, 0, 0, 0)))) && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold">
                      Has Missed Schedule
                    </Badge>
                  )}
                </div>

                {userAppointments.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border/60 bg-muted/10 text-center">
                    <p className="text-xs text-muted-foreground">No municipal clinic appointments recorded for this citizen.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userAppointments.map((apt: any) => {
                      const isPastUnattended =
                        (apt.status === "confirmed" || apt.status === "pending") &&
                        apt.date &&
                        new Date(apt.date) < new Date(new Date().setHours(0, 0, 0, 0));
                      const isMissed = apt.status === "missed" || isPastUnattended;

                      return (
                        <div
                          key={apt.id}
                          className={cn(
                            "p-3 rounded-xl border text-xs space-y-1.5 transition-all",
                            isMissed
                              ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5"
                              : "border-border/60 bg-card"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-foreground">
                              {apt.service_id === "spay-neuter" ? "Spay & Neuter" : "Rabies Vaccination"} • {apt.pets?.name || apt.pet_name}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-semibold capitalize",
                                isMissed && "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold",
                                !isMissed && apt.status === "confirmed" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                !isMissed && apt.status === "completed" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                apt.status === "cancelled" && "bg-muted text-muted-foreground border-border/50"
                              )}
                            >
                              {isMissed ? "Missed / No-Show" : apt.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Date: {apt.date} • {apt.time_slot || "Morning"}</span>
                            <span>{apt.location ? apt.location.replace("City Veterinary Office - ", "CVO ") : "CVO Clinic"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Citizen / Resident Info */}
            <TabsContent
              value="details"
              className="flex-1 overflow-y-auto p-6 space-y-4 m-0 focus-visible:outline-hidden"
            >
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <User className="size-4 text-primary" /> Citizen Account Identity
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground">Full Name:</span>
                      <span className="font-semibold text-foreground">{resolvedName}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground">Account Email:</span>
                      <span className="font-mono text-[11px] text-foreground">{resolvedEmail}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground">Mobile Contact:</span>
                      <span className="font-mono text-[11px] text-foreground">{resolvedPhone}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground">Residential Address:</span>
                      <span className="font-medium text-foreground text-right max-w-xs">{resolvedAddress}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                      <span className="text-muted-foreground">LGU Jurisdiction:</span>
                      <Badge variant="outline" className="text-[10px]">Cagayan de Oro City</Badge>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-muted-foreground">Citizen Record ID:</span>
                      <span
                        onClick={() => handleCopy(ownerId || dbUser?.id || "N/A", "Citizen ID")}
                        className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground"
                      >
                        <span>{(ownerId || dbUser?.id || "N/A").slice(0, 18)}...</span>
                        <Copy className="size-2.5" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Directory Navigation shortcuts */}
                <div className={cn("grid gap-2", !isVeterinarian ? "grid-cols-2" : "grid-cols-1")}>
                  {!isVeterinarian && (
                    <Link href="/owners" className="w-full">
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-9 rounded-xl">
                        <User className="size-3.5" /> View in Owners Directory
                      </Button>
                    </Link>
                  )}
                  <Link href="/pet-registry" className="w-full">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-9 rounded-xl">
                      <PawPrint className="size-3.5" /> View in Pet Registry
                    </Button>
                  </Link>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Citizen View: CVO Office / Doctor Profile */
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Building2 className="size-4" />
                <span>Cagayan de Oro City Veterinary Office (CVO)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The official veterinary health and regulatory agency of the City Government of Cagayan de Oro. Providing free rabies vaccinations, outpatient consultations, rabies surveillance, microchip pet passports, and community veterinary outreach.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-sm text-foreground">Clinic Information & Hours</h4>
              <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Central Veterinary Clinic & Office:</strong>
                    <span className="text-muted-foreground">City Hall Compound / Carmen Animal Clinic, Cagayan de Oro City, Northern Mindanao</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Operating Duty Hours:</strong>
                    <span className="text-muted-foreground">Monday to Friday: 8:00 AM – 5:00 PM (Emergency bite & rabies surveillance on-call)</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Hotline & Public Assistance:</strong>
                    <span className="text-muted-foreground font-mono">(088) 857-3000 • CDO CVO Direct Telemedicine Desk</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-sm text-foreground">Available Public Services</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl border border-border/50 bg-card">
                  <strong className="text-foreground block">Free Rabies Vaccination</strong>
                  <span className="text-muted-foreground text-[11px]">Annual anti-rabies inoculations for dogs & cats</span>
                </div>
                <div className="p-3 rounded-xl border border-border/50 bg-card">
                  <strong className="text-foreground block">Clinical Consultation</strong>
                  <span className="text-muted-foreground text-[11px]">Free outpatient health checkups & triage</span>
                </div>
                <div className="p-3 rounded-xl border border-border/50 bg-card">
                  <strong className="text-foreground block">Digital Pet Registry</strong>
                  <span className="text-muted-foreground text-[11px]">Official municipal pet passport & microchipping</span>
                </div>
                <div className="p-3 rounded-xl border border-border/50 bg-card">
                  <strong className="text-foreground block">Spay & Neuter Drives</strong>
                  <span className="text-muted-foreground text-[11px]">Community population control surgeries</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-muted-foreground">
            Official SyncVet Municipal Telemedicine Record
          </span>
          <Button
            size="sm"
            variant="default"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 px-4 rounded-xl cursor-pointer"
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
