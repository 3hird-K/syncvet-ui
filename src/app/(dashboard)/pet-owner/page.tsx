"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid, isBefore, startOfDay } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { useCVO } from "@/lib/cvo-context";
import { type CVOConsultation, isConsultationLockedByVet } from "@/data/cvo-store";
import { getPetVaccinationStatus } from "@/lib/vaccination-rules";
import {
  PawPrint,
  Cat,
  Dog,
  Lock,
  Heart,
  Stethoscope,
  Syringe,
  Calendar,
  CalendarClock,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  User,
  Plus,
  ArrowRight,
  Printer,
  MessageSquare,
  MessageSquareText,
  Send,
  Building2,
  Sparkles,
  QrCode,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Pill,
  Scale,
  Palette,
  Activity,
  Pencil,
  Trash2,
  MoreVertical,
  Scissors,
  Download,
  Loader2,
  Megaphone,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { useCitizenChat } from "@/lib/chat-context";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessengerIcon } from "@/components/icons/messenger-icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PetOwnerConsultationDialog } from "@/components/dashboard/pet-owner-consultation-dialog";
import { OfficialConsultationSheetDialog } from "@/components/dashboard/official-consultation-sheet-dialog";
import { RegisterPetDialog } from "@/components/dashboard/register-pet-dialog";
import { EditPetDialog } from "@/components/dashboard/edit-pet-dialog";
import { DeletePetDialog } from "@/components/dashboard/delete-pet-dialog";
import { EditProfileDialog } from "@/components/dashboard/edit-profile-dialog";
import { DeleteConsultationDialog } from "@/components/dashboard/delete-consultation-dialog";
import { ScheduleProcedureDialog } from "@/components/dashboard/schedule-procedure-dialog";
import { ProcedureAppointmentSlipDialog } from "@/components/dashboard/procedure-appointment-slip-dialog";
import { getSlotConfiguration, PROCEDURE_SERVICES } from "@/lib/cvo-slots";
import { CVOAnnouncementsCard } from "@/components/dashboard/cvo-announcements-card";
import { CVOClinicInfoCard } from "@/components/dashboard/cvo-clinic-info-card";
import { CVOSocialFeed } from "@/components/dashboard/cvo-social-feed";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  sender: "owner" | "vet";
  senderName: string;
  text: string;
  timestamp: string;
  badge?: string;
}

export default function PetOwnerPortalPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { consultations, activeRoleView, setActiveRoleView } = useCVO();
  const { openChatWithPet, unreadCount } = useCitizenChat();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const [activeTab, setActiveTab] = useState("feed");
  const [showPetCards, setShowPetCards] = useState(false);

  // Sync activeTab with Facebook Top Bar and URL params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) setActiveTab(tabParam);
    }

    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };

    window.addEventListener("syncvet-tab-change", handleTabChange);
    return () => window.removeEventListener("syncvet-tab-change", handleTabChange);
  }, []);
  const [selectedConsultation, setSelectedConsultation] = useState<CVOConsultation | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [selectedPetForPassport, setSelectedPetForPassport] = useState<any>(null);
  const [selectedPetForInfo, setSelectedPetForInfo] = useState<any>(null);
  const [petInfoOpen, setPetInfoOpen] = useState(false);
  const [qrPassportUrl, setQrPassportUrl] = useState<string>("");
  const [downloadingPassport, setDownloadingPassport] = useState(false);

  // CRUD states for Edit & Delete
  const [petToEdit, setPetToEdit] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // CRUD state for deleting Consultation / EMR
  const [consultationToDelete, setConsultationToDelete] = useState<CVOConsultation | null>(null);
  const [deleteConsultationOpen, setDeleteConsultationOpen] = useState(false);

  // Procedure appointments & slot states
  const [selectedAppointmentForSlip, setSelectedAppointmentForSlip] = useState<any>(null);
  const [appointmentSlipOpen, setAppointmentSlipOpen] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "upcoming" | "missed" | "completed">("all");
  const [slotConfig, setSlotConfig] = useState(() => getSlotConfiguration());

  useEffect(() => {
    const handleConfigUpdate = () => {
      setSlotConfig(getSlotConfiguration());
    };
    window.addEventListener("cvo-slot-config-updated", handleConfigUpdate);
    return () => window.removeEventListener("cvo-slot-config-updated", handleConfigUpdate);
  }, []);

  const petsScrollRef = useRef<HTMLDivElement>(null);
  const scrollPets = (direction: "left" | "right") => {
    if (petsScrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      petsScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Live Philippine standard time
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Intl.DateTimeFormat("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Asia/Manila",
        }).format(new Date())
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current user database profile
  const { data: dbUser, isLoading: isDbLoading } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isLoaded && !!user?.id,
  });

  const userEmail = (user?.primaryEmailAddress?.emailAddress || dbUser?.email || "").toLowerCase();
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";
  const userRole = normalizeSyncVetRole(
    dbUser?.role ||
    (user?.publicMetadata?.role as string) ||
    (user?.unsafeMetadata?.roleTitle as string) ||
    (isAdminEmail ? "Administrator" : undefined)
  );
  const isStaff =
    isAdminEmail ||
    userRole === "Administrator" ||
    userRole === "Veterinarian";

  // If this is an Administrator or staff account, redirect them to the Administrator Dashboard
  useEffect(() => {
    if (isLoaded && !isDbLoading && isStaff) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isDbLoading, isStaff, router]);

  useEffect(() => {
    if (!isStaff && activeRoleView !== "Pet Owner") {
      setActiveRoleView("Pet Owner");
    }
  }, [isStaff, activeRoleView, setActiveRoleView]);

  // Fetch pets owned by this user from Supabase (matching by owner_id or linked user profile)
  const { data: dbPets = [] } = useQuery({
    queryKey: ["owner-pets", user?.id, user?.primaryEmailAddress?.emailAddress],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*, users(id, full_name, email, address)")
          .order("created_at", { ascending: false });

        if (error || !data) return [];

        const userEmail = (user?.primaryEmailAddress?.emailAddress || dbUser?.email || "").toLowerCase();
        const userFullName = (user?.fullName || dbUser?.full_name || "").toLowerCase();
        const userId = user?.id;

        return data.filter((p: any) => {
          if (userId && (p.owner_id === userId || p.users?.id === userId)) return true;
          if (userEmail && p.users?.email && p.users.email.toLowerCase() === userEmail) return true;
          if (userFullName && p.users?.full_name && p.users.full_name.toLowerCase() === userFullName) return true;
          if (userEmail === "itcgeek03@gmail.com" || userFullName.includes("urgentrouse")) {
            return (
              p.owner_id === "user_3Jh5rWy35KtlFbJMi1wroOXOYot" ||
              p.users?.full_name?.toLowerCase().includes("urgentrouse") ||
              p.users?.email?.toLowerCase() === "itcgeek03@gmail.com"
            );
          }
          return false;
        });
      } catch {
        return [];
      }
    },
    enabled: isLoaded,
  });
  const queryClient = useQueryClient();

  // Supabase Realtime subscription for live appointments and procedure updates
  useEffect(() => {
    const channel = supabase
      .channel("realtime-pet-owner-appointments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
          queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
          queryClient.invalidateQueries({ queryKey: ["user-transactions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // Automatically migrate any previous local appointments to Supabase in real-time
  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    const migrateLocalAppointments = async () => {
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        if (!Array.isArray(local) || local.length === 0) return;

        const ownerId = dbUser?.id || user.id;

        for (const appt of local) {
          if (!appt?.id) continue;
          // Check if already present in Supabase appointments
          const { data: existing } = await supabase
            .from("appointments")
            .select("id")
            .eq("id", appt.id)
            .maybeSingle();

          if (!existing) {
            // Validate pet_id against pets table
            let validPetId: string | null = null;
            if (appt.pet_id) {
              const { data: pet } = await supabase
                .from("pets")
                .select("id")
                .eq("id", appt.pet_id)
                .maybeSingle();
              if (pet?.id) validPetId = pet.id;
            }

            await supabase.from("appointments").insert({
              id: appt.id,
              owner_id: ownerId,
              pet_id: validPetId,
              pet_name: appt.pet_name || "Pet",
              service_id: appt.service_id || "vaccination",
              date: appt.date || format(new Date(), "yyyy-MM-dd"),
              time_slot: appt.time_slot || "morning",
              status: appt.status || "confirmed",
              location: appt.location || "City Veterinary Office - Carmen Central Clinic",
              notes: appt.notes || null,
            });
          }
        }
        queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
      } catch (err) {
        console.warn("Appointments migration notice:", err);
      }
    };

    migrateLocalAppointments();
  }, [isLoaded, user?.id, dbUser?.id, supabase, queryClient]);

  // Fetch procedure appointments scheduled by this owner (cascade filtered to currently registered pets)
  const { data: ownerAppointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ["user-appointments", user?.id, dbUser?.id, dbPets],
    queryFn: async () => {
      const ownerId = dbUser?.id || user?.id;
      if (!ownerId) return [];

      const list: any[] = [];
      const seenIds = new Set<string>();

      // 1. Try appointments table
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("*")
          .or(`owner_id.eq.${ownerId},owner_id.eq.${user?.id}`)
          .order("date", { ascending: false });

        if (!error && data) {
          data.forEach((item) => {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              list.push(item);
            }
          });
        }
      } catch (e) {
        // ignore
      }

      // 2. Also read service_transactions for bookings
      try {
        const { data: txData } = await supabase
          .from("service_transactions")
          .select("*")
          .or(`owner_id.eq.${ownerId},owner_id.eq.${user?.id}`)
          .in("transaction_type", ["Vaccination Booking", "Spay & Neuter Booking"])
          .order("date", { ascending: false });

        if (txData) {
          txData.forEach((tx: any) => {
            const refId = tx.reference_id || tx.id;
            if (!seenIds.has(refId)) {
              seenIds.add(refId);
              const serviceType =
                tx.transaction_type === "Vaccination Booking" ? "vaccination" : "spay-neuter";
              const petNameMatch = tx.title ? tx.title.replace(/^[^f]+for\s+/i, "") : "Pet";
              list.push({
                id: refId,
                owner_id: tx.owner_id,
                pet_name: petNameMatch,
                service_id: serviceType,
                date: tx.date ? tx.date.split("T")[0] : format(new Date(), "yyyy-MM-dd"),
                status: tx.status || "confirmed",
                location: "City Veterinary Office - Carmen Central Clinic",
                notes: tx.detail || "",
                created_at: tx.created_at,
              });
            }
          });
        }
      } catch (e) {
        // ignore
      }

      // 3. Check localStorage cache
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        local.forEach((item: any) => {
          if (!seenIds.has(item.id) && (item.owner_id === ownerId || item.owner_id === user?.id)) {
            seenIds.add(item.id);
            list.push(item);
          }
        });
      } catch (e) {
        // ignore
      }

      const todayStart = startOfDay(new Date());

      const validList = list.map((item: any) => {
        let effectiveStatus = item.status || "confirmed";
        try {
          if (item.date) {
            const parsed = parseISO(item.date);
            if (
              isValid(parsed) &&
              isBefore(startOfDay(parsed), todayStart) &&
              effectiveStatus !== "completed" &&
              effectiveStatus !== "cancelled"
            ) {
              effectiveStatus = "missed";
            }
          }
        } catch {}

        return {
          ...item,
          status: effectiveStatus,
          rawStatus: item.status,
        };
      });

      // Asynchronously persist any unattended past appointments as 'missed'
      const unpersistedMissed = validList.filter(
        (v) => v.status === "missed" && v.rawStatus !== "missed"
      );
      if (unpersistedMissed.length > 0) {
        (async () => {
          for (const m of unpersistedMissed) {
            try {
              await supabase.from("appointments").update({ status: "missed" }).eq("id", m.id);
            } catch {}
            try {
              await supabase
                .from("service_transactions")
                .update({ status: "missed" })
                .or(`reference_id.eq.${m.id},id.eq.${m.id}`);
            } catch {}
          }
        })();
      }

      // Sort from recent to old (newest date first)
      validList.sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));

      return validList;
    },
    enabled: isLoaded && (!!user?.id || !!dbUser?.id),
  });

  const upcomingAppointmentsCount = useMemo(
    () => ownerAppointments.filter((a: any) => a.status === "confirmed").length,
    [ownerAppointments]
  );
  const missedAppointmentsCount = useMemo(
    () => ownerAppointments.filter((a: any) => a.status === "missed").length,
    [ownerAppointments]
  );
  const completedAppointmentsCount = useMemo(
    () => ownerAppointments.filter((a: any) => a.status === "completed").length,
    [ownerAppointments]
  );

  const displayedAppointments = useMemo(() => {
    let list = ownerAppointments;
    if (appointmentFilter === "upcoming") {
      list = ownerAppointments.filter((a: any) => a.status === "confirmed");
    } else if (appointmentFilter === "missed") {
      list = ownerAppointments.filter((a: any) => a.status === "missed");
    } else if (appointmentFilter === "completed") {
      list = ownerAppointments.filter((a: any) => a.status === "completed");
    }
    // Sort from recent to old (newest date first)
    return [...list].sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));
  }, [ownerAppointments, appointmentFilter]);

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      await supabase
        .from("service_transactions")
        .update({ status: "cancelled" })
        .or(`reference_id.eq.${appointmentId},id.eq.${appointmentId}`);

      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        const updated = local.map((l: any) => (l.id === appointmentId ? { ...l, status: "cancelled" } : l));
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(updated));
      } catch (e) {
        // ignore
      }

      queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
      toast.success("Appointment cancelled. Your slot has been released back to the clinic schedule.");
    } catch (err: any) {
      toast.error("Failed to cancel appointment: " + (err?.message || "Error"));
    }
  };

  // Supabase Realtime channel subscription for pets to update TanStack Query live on deletion/changes
  useEffect(() => {
    const channel = supabase
      .channel("owner-pets-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pets" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              queryClient.setQueriesData({ queryKey: ["owner-pets"] }, (old: any) => {
                if (!Array.isArray(old)) return old;
                return old.filter((p: any) => p.id !== deletedId);
              });
            }
          }
          queryClient.invalidateQueries({ queryKey: ["owner-pets"] });
          queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
          queryClient.invalidateQueries({ queryKey: ["live_pets_count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // Owner details dynamically resolved from logged-in citizen
  const ownerName =
    dbUser?.full_name ||
    user?.fullName ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "") ||
    "Kyle Urgentrouse";
  const ownerEmail =
    dbUser?.email ||
    user?.primaryEmailAddress?.emailAddress ||
    "itcgeek03@gmail.com";
  const ownerContact =
    dbUser?.phone_number ||
    (user?.unsafeMetadata?.phoneNumber as string) ||
    (user?.unsafeMetadata?.mobileNumber as string) ||
    "09918552236";
  const ownerBarangay =
    dbUser?.address ||
    (user?.unsafeMetadata?.barangay as string) ||
    "Cagayan de Oro City";
  const ownerAddress =
    dbUser?.address ||
    "Cagayan de Oro City, Misamis Oriental";
  const ownerAvatar = dbUser?.avatar_url || user?.imageUrl;

  // Registered pets strictly from the user's account
  const pets = useMemo(() => {
    return dbPets.map((p: any) => ({
      id: p.id,
      name: p.name,
      species: (p.species?.toLowerCase() === "cat" ? "Cat" : "Dog") as "Dog" | "Cat",
      breed: p.breed || (p.species?.toLowerCase() === "cat" ? "Persian" : "Aspin (Mixed)"),
      gender: (p.gender === "female" || p.gender === "Female" ? "Female" : "Male") as "Male" | "Female",
      age: p.birth_year ? `${Math.max(1, new Date().getFullYear() - p.birth_year)} yrs` : "1 yr",
      weightKg: p.weight_category === "large" ? 22 : p.weight_category === "small" ? 4.5 : 12.4,
      color: p.species?.toLowerCase() === "cat" ? "White & Gray" : "Brown & White",
      rabiesVaccinated: Boolean(p.rabies_vaccinated || p.is_vaccinated),
      isVaccinated: Boolean(p.rabies_vaccinated || p.is_vaccinated),
      is_vaccinated: Boolean(p.rabies_vaccinated || p.is_vaccinated),
      rabies_vaccinated: Boolean(p.rabies_vaccinated || p.is_vaccinated),
      is_spayed_neutered: Boolean(p.is_spayed_neutered || p.is_neutered),
      isSpayedNeutered: Boolean(p.is_spayed_neutered || p.is_neutered),
      sterilized: Boolean(p.is_spayed_neutered || p.is_neutered),
      lastVaccinationDate: p.last_vaccination_date || ((p.is_vaccinated || p.rabies_vaccinated) ? "2026-05-10" : undefined),
      nextVaccinationDate: p.next_vaccination_date || ((p.is_vaccinated || p.rabies_vaccinated) ? "2027-05-10" : undefined),
      microchip: p.microchip_number || p.id,
      bodyConditionScore: 5,
    }));
  }, [dbPets]);

  // Consultations for this owner: must belong to a currently registered pet of this owner
  const ownerConsultations = useMemo(() => {
    if (pets.length === 0) return [];
    return consultations.filter((c) =>
      pets.some(
        (p) =>
          (c.petId && p.id.toLowerCase() === c.petId.toLowerCase()) ||
          (c.petName && p.name.toLowerCase() === c.petName.toLowerCase())
      )
    );
  }, [consultations, pets]);

  // Primary pet for dynamic greetings and initial selections
  const primaryPetName = pets.length > 0 ? pets[0].name : "your pet";

  // Open comprehensive pet info modal
  const handleOpenPetInfo = async (pet: any) => {
    setSelectedPetForInfo(pet);
    setSelectedPetForPassport(pet);
    setPetInfoOpen(true);
    try {
      const publicVerifyUrl = `${window.location.origin}/verify/pet/${pet.id}?name=${encodeURIComponent(pet.name || "")}&species=${encodeURIComponent(pet.species || "")}&breed=${encodeURIComponent(pet.breed || "")}&tag=${encodeURIComponent(pet.microchip || pet.id || "")}&owner=${encodeURIComponent(ownerName || "")}&bgy=${encodeURIComponent(ownerBarangay || "")}&vax=${pet.rabiesVaccinated ? "1" : "0"}&lastVax=${encodeURIComponent(pet.lastVaccinationDate || "")}&nextVax=${encodeURIComponent(pet.nextVaccinationDate || "")}`;
      const url = await QRCode.toDataURL(publicVerifyUrl, { width: 360, margin: 1 });
      setQrPassportUrl(url);
    } catch {
      // ignore
    }
  };

  // Open digital passport modal
  const handleOpenPassport = async (pet: any) => {
    setSelectedPetForPassport(pet);
    try {
      const publicVerifyUrl = `${window.location.origin}/verify/pet/${pet.id}?name=${encodeURIComponent(pet.name || "")}&species=${encodeURIComponent(pet.species || "")}&breed=${encodeURIComponent(pet.breed || "")}&tag=${encodeURIComponent(pet.microchip || pet.id || "")}&owner=${encodeURIComponent(ownerName || "")}&bgy=${encodeURIComponent(ownerBarangay || "")}&vax=${pet.rabiesVaccinated ? "1" : "0"}&lastVax=${encodeURIComponent(pet.lastVaccinationDate || "")}&nextVax=${encodeURIComponent(pet.nextVaccinationDate || "")}`;
      const url = await QRCode.toDataURL(publicVerifyUrl, { width: 360, margin: 1 });
      setQrPassportUrl(url);
      setPassportOpen(true);
    } catch {
      setPassportOpen(true);
    }
  };

  // Download Pet Passport Card (High-res PNG with CVO Header, QR code, and Pet Details)
  const handleDownloadPassport = async () => {
    if (!selectedPetForPassport) return;
    setDownloadingPassport(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // Draw rounded card background
      ctx.fillStyle = "#ffffff";
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(0, 0, 640, 800, 24);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, 640, 800);
      }

      // Outer border
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(2, 2, 636, 796, 22);
        ctx.stroke();
      } else {
        ctx.strokeRect(2, 2, 636, 796);
      }

      // Emerald Header Banner
      ctx.fillStyle = "#059669";
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(0, 0, 640, 115, [24, 24, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, 640, 115);
      }

      // Gold Accent line under header
      ctx.fillStyle = "#10b981";
      ctx.fillRect(0, 115, 640, 4);

      // Header Texts
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("CITY OF CAGAYAN DE ORO • CITY VETERINARY OFFICE", 320, 38);

      ctx.font = "900 22px sans-serif";
      ctx.fillText("OFFICIAL DIGITAL PET PASSPORT", 320, 72);

      ctx.font = "600 11px sans-serif";
      ctx.fillStyle = "#d1fae5";
      ctx.fillText("MUNICIPAL COMPANION ANIMAL IDENTIFICATION", 320, 95);

      // QR Code container
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(170, 145, 300, 300, 16);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(170, 145, 300, 300);
        ctx.strokeRect(170, 145, 300, 300);
      }

      // Draw QR Code
      if (qrPassportUrl) {
        const qrImg = new Image();
        qrImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = reject;
          qrImg.src = qrPassportUrl;
        });
        ctx.drawImage(qrImg, 190, 165, 260, 260);
      }

      // Pet Name
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(selectedPetForPassport.name || "Companion Animal", 320, 490);

      // Species & Breed
      ctx.fillStyle = "#475569";
      ctx.font = "600 14px sans-serif";
      const speciesBreed = `${selectedPetForPassport.species || "Pet"} • ${selectedPetForPassport.breed || "Mixed"}`;
      ctx.fillText(speciesBreed, 320, 520);

      // Tag ID Pill
      ctx.fillStyle = "#ecfdf5";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.5;
      const tagText = `TAG ID: ${selectedPetForPassport.microchip || selectedPetForPassport.id || "N/A"}`;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(140, 545, 360, 38, 19);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(140, 545, 360, 38);
        ctx.strokeRect(140, 545, 360, 38);
      }

      ctx.fillStyle = "#047857";
      ctx.font = "bold 13px monospace";
      ctx.fillText(tagText, 320, 569);

      // Guardian & Jurisdiction
      ctx.fillStyle = "#334155";
      ctx.font = "500 12px sans-serif";
      ctx.fillText(`Registered Guardian: ${ownerName || "Cagayan de Oro Citizen"}`, 320, 622);
      ctx.fillText(`Barangay Jurisdiction: ${ownerBarangay || "Cagayan de Oro City"}`, 320, 644);

      // Divider
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, 675);
      ctx.lineTo(580, 675);
      ctx.stroke();

      // Explanatory note
      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 11px sans-serif";
      ctx.fillText("Present this QR passport during mobile vaccination drives,", 320, 705);
      ctx.fillText("spay/neuter outreach, or CVO clinic visits for instant medical retrieval.", 320, 725);

      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#059669";
      ctx.fillText("SYNCVET • CAGAYAN DE ORO CITY VETERINARY OFFICE", 320, 762);

      // Trigger download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const petSlug = (selectedPetForPassport.name || "pet").toLowerCase().replace(/[^a-z0-9]/g, "-");
      a.download = `cvo-pet-passport-${petSlug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Pet Passport Card Downloaded", {
        description: `Saved official passport card for ${selectedPetForPassport.name}`,
      });
    } catch (err) {
      console.error("Error creating passport card:", err);
      handleDownloadQrOnly();
    } finally {
      setDownloadingPassport(false);
    }
  };

  // Download raw QR code image only
  const handleDownloadQrOnly = () => {
    if (!qrPassportUrl || !selectedPetForPassport) return;
    const a = document.createElement("a");
    a.href = qrPassportUrl;
    const petSlug = (selectedPetForPassport.name || "pet").toLowerCase().replace(/[^a-z0-9]/g, "-");
    a.download = `cvo-qr-${petSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success("QR Code Downloaded", {
      description: `Saved QR code for ${selectedPetForPassport.name}`,
    });
  };

  // Proactive booster reminder: pets due within 14 days or overdue
  const boosterAlertPets = useMemo(() => {
    return pets
      .map((p) => ({ pet: p, status: getPetVaccinationStatus(p) }))
      .filter((item) => item.status.isDueSoon || item.status.isOverdue);
  }, [pets]);

  // Warm time-of-day greeting
  const greetingTimeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Health summary metrics
  const dogsCount = useMemo(() => pets.filter((p) => p.species === "Dog").length, [pets]);
  const catsCount = useMemo(() => pets.filter((p) => p.species === "Cat").length, [pets]);

  const immunePetsCount = useMemo(() => {
    return pets.filter((p) => {
      const s = getPetVaccinationStatus(p);
      return s.isVaccinated && !s.isOverdue;
    }).length;
  }, [pets]);

  const activeAppointmentsCount = useMemo(() => {
    return ownerAppointments.filter((a: any) => a.status !== "cancelled" && a.status !== "completed").length;
  }, [ownerAppointments]);

  const activeConsultationsCount = useMemo(() => {
    return ownerConsultations.filter(
      (c: any) => c.status === "waiting" || c.status === "in-consultation" || c.status === "treatment"
    ).length;
  }, [ownerConsultations]);

  const totalActiveVisits = activeAppointmentsCount + activeConsultationsCount;

  if (!isLoaded || isDbLoading) {
    return <DashboardSkeleton variant="pet-owner" />;
  }

  if (isStaff) {
    return <DashboardSkeleton variant="admin" />;
  }

  return (
    <div className="flex-1 bg-background min-h-screen text-foreground py-3 sm:py-4 px-2.5 sm:px-4 pb-20 sm:pb-8">
      {/* ── Main Dashboard Layout: Left Main Column + Right Sidebar (Announcements & Clinic Info) ── */}
      <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* ── LEFT COLUMN (Main Content) ── */}
        <div className="md:col-span-7 lg:col-span-8 space-y-4 min-w-0">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("syncvet-tab-change", { detail: val }));
                const url = new URL(window.location.href);
                url.searchParams.set("tab", val);
                window.history.pushState({}, "", url.toString());
              }
            }}
            className="w-full"
          >
            {/* ════ TAB 0: CVO Central Social Media Feed ════ */}
            <TabsContent value="feed" className="space-y-4 m-0">


      {/* ── Annual Rabies Vaccination Reminder Alert ── */}
      {boosterAlertPets.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-xs space-y-2 animate-in fade-in-0 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Syringe className="size-4.5 sm:size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-xs sm:text-sm text-foreground">
                    Annual Vaccination Booster Due
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 font-bold">
                    {boosterAlertPets.length} Pet{boosterAlertPets.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground pt-0.5 leading-relaxed">
                  {boosterAlertPets
                    .map(({ pet, status }) => `${pet.name}: ${status.reason}`)
                    .join(" • ")}
                </p>
              </div>
            </div>

            <ScheduleProcedureDialog
              pets={pets}
              initialPet={boosterAlertPets[0].pet}
              initialService="vaccination"
              ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
              trigger={
                <Button
                  size="sm"
                  className="h-8.5 sm:h-9 px-3.5 sm:px-4 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shrink-0 cursor-pointer shadow-xs w-full sm:w-auto"
                >
                  <Calendar className="size-3.5" />
                  <span>Schedule Booster</span>
                </Button>
              }
            />
          </div>
        </div>
      )}

      {/* ── 2. Pet Registry & Digital Passports Carousel ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <PawPrint className="size-3.5 text-primary" />
              <span>Registered Pets & Passports</span>
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold rounded-full">
              {pets.length}
            </Badge>
          </div>
        </div>

        {/* Pet Digital Passports Strip */}
        <div className="relative group/stories">
          <div
            ref={petsScrollRef}
            className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory"
          >
            {/* 1. Register Pet Card */}
            <RegisterPetDialog
              trigger={
                <div
                  className="w-[114px] sm:w-[136px] md:w-[150px] h-44 sm:h-48 md:h-52 rounded-2xl bg-card border-2 border-dashed border-primary/30 hover:border-primary overflow-hidden relative flex flex-col items-center justify-center p-2.5 sm:p-3 text-center shrink-0 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-200 select-none group/story bg-gradient-to-b from-primary/10 via-primary/5 to-card snap-start"
                  title="Register a new pet into CVO database"
                >
                  <div className="size-10 sm:size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 mb-2 sm:mb-3 group-hover/story:scale-110 transition-transform">
                    <Plus className="size-5 sm:size-6 stroke-[3]" />
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold text-foreground group-hover/story:text-primary transition-colors leading-tight">
                    Register Pet
                  </p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground leading-tight mt-0.5 sm:mt-1">
                    Digital Passport
                  </p>
                  <span className="mt-2 text-[8.5px] sm:text-[10px] font-bold text-primary bg-primary/10 px-2 sm:px-2.5 py-0.5 rounded-full border border-primary/20">
                    + Add Pet
                  </span>
                </div>
              }
            />

            {/* 2..N: Each Pet's Digital Passport Card */}
            {pets.map((pet, idx) => {
              const vaxStatus = getPetVaccinationStatus(pet);
              const isCat = pet.species === "Cat";
              const cdoPassportId = pet.microchip && !pet.microchip.startsWith("pet-")
                ? pet.microchip
                : `CDO-${isCat ? "FEL" : "CAN"}-${pet.id.replace(/\D/g, "").slice(-4) || pet.id.slice(0, 4).toUpperCase()}`;

              // Curated companion card gradients
              const gradientBg = isCat
                ? "bg-gradient-to-b from-purple-800 via-indigo-950 to-slate-950"
                : idx % 2 === 0
                ? "bg-gradient-to-b from-emerald-800 via-teal-950 to-slate-950"
                : "bg-gradient-to-b from-teal-800 via-slate-900 to-slate-950";

              return (
                <div
                  key={pet.id}
                  onClick={() => handleOpenPetInfo(pet)}
                  className={cn(
                    "w-[114px] sm:w-[136px] md:w-[150px] h-44 sm:h-48 md:h-52 rounded-2xl overflow-hidden relative shrink-0 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-border/60 select-none group/story flex flex-col justify-between p-2.5 sm:p-3 snap-start",
                    gradientBg
                  )}
                  title={`${pet.name} (${pet.species}) — Click to view Pet Details & Passport`}
                >
                  {/* Subtle decorative ambient glow */}
                  <div className="absolute -bottom-6 -right-6 size-24 sm:size-28 bg-white/[0.05] rounded-full blur-xl pointer-events-none" />
                  <div className="absolute top-0 right-0 w-20 sm:w-24 h-20 sm:h-24 bg-white/[0.06] rounded-full blur-2xl pointer-events-none" />

                  {/* Top Row: Pet Initial Monogram & Vaccination Status Badge */}
                  <div className="flex items-center justify-between relative z-10 w-full">
                    <div className="size-6 sm:size-7 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-[10px] sm:text-xs font-extrabold text-white shadow-xs">
                      {pet.name.charAt(0).toUpperCase()}
                    </div>

                    <span
                      className={cn(
                        "text-[8.5px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md",
                        vaxStatus.isOverdue
                          ? "bg-rose-600/90 text-white"
                          : vaxStatus.isDueSoon
                          ? "bg-amber-500 text-black font-bold"
                          : vaxStatus.isVaccinated
                          ? "bg-emerald-500/90 text-white"
                          : "bg-amber-600/90 text-white"
                      )}
                    >
                      {vaxStatus.isOverdue
                        ? "Overdue"
                        : vaxStatus.isDueSoon
                        ? "Due Soon"
                        : vaxStatus.isVaccinated
                        ? "Protected"
                        : "Unvaccinated"}
                    </span>
                  </div>

                  {/* Center: Frosted Glass Digital Passport Species Crest */}
                  <div className="relative z-10 flex flex-col items-center justify-center my-auto transition-transform group-hover/story:scale-108">
                    <div className="size-11 sm:size-13 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md flex flex-col items-center justify-center">
                      {isCat ? (
                        <Cat className="size-5 sm:size-6 text-white mb-0.5" />
                      ) : (
                        <Dog className="size-5 sm:size-6 text-white mb-0.5" />
                      )}
                      <span className="text-[7.5px] sm:text-[8px] font-mono font-bold tracking-wider text-emerald-200 uppercase">
                        {isCat ? "FELINE" : "CANINE"}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Pet Name, Breed, and CDO Passport Tag */}
                  <div className="relative z-10 space-y-0.5">
                    <p className="text-xs sm:text-sm font-extrabold text-white leading-tight drop-shadow-xs truncate">
                      {pet.name}
                    </p>
                    <p className="text-[9px] sm:text-xs text-white/80 truncate leading-tight font-medium">
                      {pet.breed || pet.species} • {pet.gender === "Female" ? "♀" : "♂"}
                    </p>
                    <div className="pt-0.5 sm:pt-1 flex items-center gap-1 text-[8px] sm:text-[9px] font-mono text-emerald-200 bg-black/40 px-1.5 py-0.5 rounded-md w-fit max-w-full">
                      <QrCode className="size-2 sm:size-2.5 text-emerald-300 shrink-0" />
                      <span className="truncate">#{cdoPassportId.startsWith("pet-") ? cdoPassportId.slice(0, 8) : cdoPassportId}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Right Scroll Arrow Button (hidden on mobile touch screens, active on tablet/desktop) */}
          {pets.length > 2 && (
            <button
              type="button"
              onClick={() => scrollPets("right")}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-card/90 hover:bg-card border border-border shadow-md items-center justify-center text-foreground hover:scale-105 transition-all cursor-pointer backdrop-blur-sm"
              title="View next pets"
            >
              <ChevronRight className="size-4 sm:size-5" />
            </button>
          )}
        </div>

        {/* ── 3. Quick Citizen Healthcare Services ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <PetOwnerConsultationDialog
            pets={pets}
            ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
            trigger={
              <button
                type="button"
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-emerald-500/[0.04] p-3 sm:p-4 text-left shadow-2xs hover:shadow-xs hover:border-emerald-500/50 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 sm:size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/15 transition-all">
                    <Stethoscope className="size-4.5 sm:size-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Request Clinical Care
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded-full">
                        Free
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                      Health check-up, symptom review & vet advice
                    </p>
                  </div>
                </div>

                <div className="size-7 sm:size-8 rounded-full bg-muted/50 group-hover:bg-emerald-500/15 group-hover:text-emerald-600 text-muted-foreground flex items-center justify-center shrink-0 transition-colors">
                  <ArrowRight className="size-3.5 sm:size-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            }
          />

          <ScheduleProcedureDialog
            pets={pets}
            ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
            trigger={
              <button
                type="button"
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-blue-500/[0.04] p-3 sm:p-4 text-left shadow-2xs hover:shadow-xs hover:border-blue-500/50 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 sm:size-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-500/15 transition-all">
                    <Calendar className="size-4.5 sm:size-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Schedule Procedure
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/15 px-1.5 py-0.2 rounded-full">
                        Quotas
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                      Book Anti-Rabies vaccine or Kapon slot
                    </p>
                  </div>
                </div>

                <div className="size-7 sm:size-8 rounded-full bg-muted/50 group-hover:bg-blue-500/15 group-hover:text-blue-600 text-muted-foreground flex items-center justify-center shrink-0 transition-colors">
                  <ArrowRight className="size-3.5 sm:size-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            }
          />
        </div>

        {/* ── Mobile Upcoming Care Quick Banner (< md only) ── */}
        {(() => {
          const activeAppointments = ownerAppointments.filter((a: any) => a.status !== "cancelled");
          const nextApt = activeAppointments[0];
          const waitingConsultation = ownerConsultations.find((c: any) => c.status === "waiting");
          if (!nextApt && !waitingConsultation) return null;

          return (
            <div className="md:hidden p-3 rounded-2xl border border-primary/20 bg-primary/[0.04] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <CalendarClock className="size-3" />
                  Upcoming Care Schedule
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {activeAppointments.length} Active
                </span>
              </div>
              {nextApt && (
                <div className="flex items-center justify-between gap-2 bg-card p-2.5 rounded-xl border border-border/80 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{nextApt.pet_name || nextApt.petName} • {nextApt.service_type || nextApt.serviceType}</p>
                    <p className="text-[11px] text-muted-foreground">{nextApt.appointment_date || nextApt.date} ({nextApt.appointment_time || "Morning"})</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedAppointmentForSlip(nextApt);
                      setAppointmentSlipOpen(true);
                    }}
                    className="h-7 px-2 text-[10px] font-semibold gap-1 rounded-lg shrink-0"
                  >
                    <Printer className="size-2.5 text-primary" />
                    <span>Slip</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

        {/* Friendly Empty state if 0 pets registered */}
        {pets.length === 0 && (
          <Card className="p-8 text-center border-dashed border-2 border-border/80 bg-muted/10 space-y-3 rounded-2xl">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              <PawPrint className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">No Registered Companion Animals Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Register your pets with the City Veterinary Office to generate official QR passports and access free clinical care.
              </p>
            </div>
            <RegisterPetDialog
              trigger={
                <Button size="sm" className="gap-1.5 text-xs font-semibold cursor-pointer rounded-xl">
                  <Plus className="size-3.5" /> Register Your Pet Now
                </Button>
              }
            />
          </Card>
        )}

        {/* CVO Central Social Media Feed */}
        <CVOSocialFeed
          currentUserId={user?.id}
          currentUserName={user?.fullName || dbUser?.full_name || "City Veterinary Staff"}
          currentUserRole={userRole}
          isStaff={isStaff}
          onSchedulePetClick={() => {
            setActiveTab("procedures");
          }}
          onOpenChatWithNotice={() => {
            if (pets.length > 0) {
              openChatWithPet(pets[0]);
            } else {
              router.push("/messages");
            }
          }}
        />
      </TabsContent>

      {/* ════ TAB 1: Consultations & Official CVO Forms ════ */}
      <TabsContent value="consultations" className="space-y-4 m-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Clinical Consultations & Field Treatments
                </h3>
                <p className="text-xs text-muted-foreground">
                  View diagnosed medical encounters and access the official signed Cagayan de Oro consultation paper
                </p>
              </div>

              <PetOwnerConsultationDialog
                pets={pets}
                initialPet={pets[0]}
                ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                trigger={
                  <Button
                    size="sm"
                    className="h-8 px-3 gap-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>New Consultation Request</span>
                  </Button>
                }
              />
            </div>

            {/* List of Consultations or Default Empty View */}
            {ownerConsultations.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center border-dashed border-2 border-border/80 bg-muted/10 space-y-3 rounded-2xl">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
                  <Stethoscope className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">No Consultations or Encounters Found</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    You have not submitted any consultation requests yet. Request clinical care or an encounter for your pet with the City Veterinary Office.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {ownerConsultations.map((c) => {
                  const isCompleted = c.status === "completed";
                  const isWaiting = c.status === "waiting";

                  return (
                    <Card
                      key={c.id}
                      className="border-border hover:border-primary/40 transition-all shadow-xs"
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-extrabold text-foreground bg-muted px-2 py-0.5 rounded border border-border/80">
                                Encounter #{c.encounterNo}
                              </span>
                              <Badge
                                className={`text-[10px] font-bold ${
                                  isCompleted
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : isWaiting
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                }`}
                              >
                                {c.status.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="size-3" />
                                {c.date} • {c.time}
                              </span>
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <h4 className="font-bold text-sm text-foreground">
                                  {c.petName} ({c.species} - {c.breed || "Aspin"})
                                </h4>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs font-semibold text-primary">
                                  {c.serviceType}
                                </span>
                              </div>

                              <p className="text-xs text-muted-foreground leading-relaxed">
                                <strong className="text-foreground">Chief Complaint / Reason:</strong> {c.chiefComplaint}
                              </p>

                              {c.diagnosis && (
                                <div className="text-xs text-foreground bg-slate-50 dark:bg-muted/30 p-2.5 rounded-lg border border-border/60 space-y-1">
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                      Official Diagnosis: {c.diagnosis}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-serif italic">
                                      Attending Vet: {c.vetName}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    <strong>Treatment & Rx:</strong> {c.treatment}
                                    {c.medication && ` • ${c.medication}`}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions: View CVO Paper, Edit, Delete, Print */}
                          <div className="flex flex-wrap sm:flex-nowrap xl:flex-col items-stretch sm:items-center xl:items-end gap-2 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-border/40">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedConsultation(c);
                                setSheetOpen(true);
                              }}
                              className="h-9 gap-1.5 text-xs font-bold border-black/30 bg-card hover:bg-muted cursor-pointer shadow-xs w-full sm:w-auto"
                            >
                              <FileText className="size-3.5 text-primary" />
                              <span>View Official CVO Paper</span>
                            </Button>

                            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between xl:justify-end">
                              {!isConsultationLockedByVet(c) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setConsultationToDelete(c);
                                    setDeleteConsultationOpen(true);
                                  }}
                                  className="h-8 px-2.5 gap-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer"
                                  title="Cancel or delete unreviewed consultation request"
                                >
                                  <Trash2 className="size-3.5 text-destructive" />
                                  <span>Delete</span>
                                </Button>
                              ) : (
                                <div
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold select-none"
                                  title="Official medical consultation record reviewed and recorded by attending veterinarian. Cannot be deleted."
                                >
                                  <Lock className="size-3 shrink-0" />
                                  <span>Official Record</span>
                                </div>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedConsultation(c);
                                  setSheetOpen(true);
                                  setTimeout(() => window.print(), 300);
                                }}
                                className="h-8 px-2 gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Print Record"
                              >
                                <Printer className="size-3" />
                                <span className="sr-only sm:not-sr-only">Print</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ════ TAB 2: Spay & Neuter & Vaccination Appointments ════ */}
          <TabsContent value="procedures" className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Appointments & Procedures
                </h3>
                <p className="text-xs text-muted-foreground">
                  Scheduled clinic appointments (Monday to Friday)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Select
                  value={appointmentFilter}
                  onValueChange={(val: "all" | "upcoming" | "missed" | "completed") =>
                    setAppointmentFilter(val)
                  }
                >
                  <SelectTrigger className="h-8 w-38 text-xs bg-muted/20 border-border/70 rounded-lg cursor-pointer">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="text-xs rounded-lg">
                    <SelectItem value="all" className="text-xs py-1.5 cursor-pointer">
                      All
                    </SelectItem>
                    <SelectItem value="upcoming" className="text-xs py-1.5 cursor-pointer">
                      Upcoming
                    </SelectItem>
                    <SelectItem value="missed" className="text-xs py-1.5 cursor-pointer">
                      Missed / No-Show
                    </SelectItem>
                    <SelectItem value="completed" className="text-xs py-1.5 cursor-pointer">
                      Completed
                    </SelectItem>
                  </SelectContent>
                </Select>

                <ScheduleProcedureDialog
                  initialService="vaccination"
                  pets={pets}
                  ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                  trigger={
                    <Button
                      size="sm"
                      className="h-8 px-3 gap-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Book Appointment</span>
                    </Button>
                  }
                />
              </div>
            </div>

            {/* Unattended Appointment Callout Banner */}
            {missedAppointmentsCount > 0 && (
              <div className="p-3.5 sm:p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in-0">
                <div className="flex items-start gap-2.5">
                  <div className="size-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <CalendarClock className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                      {missedAppointmentsCount === 1
                        ? "Unattended Schedule Notice: 1 appointment was missed"
                        : `Unattended Schedule Notice: ${missedAppointmentsCount} appointments were missed`}
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Appointments not attended on their scheduled date are flagged. Please reschedule your pet&apos;s procedure to secure a fresh municipal veterinary clinic slot.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <Button
                    size="sm"
                    variant={appointmentFilter === "missed" ? "default" : "outline"}
                    onClick={() => setAppointmentFilter("missed")}
                    className="h-8 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white border-transparent cursor-pointer"
                  >
                    View Missed
                  </Button>
                </div>
              </div>
            )}

            {/* List of Appointments or Empty View */}
            {loadingAppointments ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs">Loading municipal appointments...</span>
              </div>
            ) : ownerAppointments.length === 0 ? (
              <Card className="p-8 sm:p-12 text-center border-dashed border-2 border-border/80 bg-muted/10 space-y-3 rounded-2xl">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
                  <Calendar className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">No Procedure Appointments Scheduled</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    You have not booked any Spay & Neuter or Vaccination slots yet. Reserve your pet&apos;s appointment early to guarantee your daily quota slot.
                  </p>
                </div>
              </Card>
            ) : displayedAppointments.length === 0 ? (
              <Card className="p-6 text-center border-dashed border border-border/70 bg-muted/10 space-y-2 rounded-xl">
                <p className="text-xs font-semibold text-foreground">No appointments under &quot;{appointmentFilter}&quot;</p>
                <p className="text-[11px] text-muted-foreground">Select another filter above or book a new appointment.</p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {displayedAppointments.map((apt: any) => {
                  const isSpayNeuter = apt.service_id === "spay-neuter";
                  const aptPet = pets.find((p) => p.id === apt.pet_id || p.name === apt.pet_name);
                  const isMissed = apt.status === "missed";

                  return (
                    <Card
                      key={apt.id}
                      className={cn(
                        "border transition-all duration-200 rounded-xl shadow-2xs hover:shadow-xs overflow-hidden",
                        apt.status === "cancelled"
                          ? "opacity-60 bg-muted/20 border-border/50"
                          : isMissed
                          ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/5 hover:border-amber-500/60"
                          : isSpayNeuter
                          ? "border-indigo-500/20 bg-card hover:border-indigo-500/40"
                          : "border-emerald-500/20 bg-card hover:border-emerald-500/40"
                      )}
                    >
                      <CardContent className="p-3.5 sm:p-4 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                          {/* Left: Icon & Details */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "size-10 rounded-xl flex items-center justify-center shrink-0 border",
                                isMissed
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : isSpayNeuter
                                  ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              )}
                            >
                              {isSpayNeuter ? (
                                <Scissors className="size-4.5" />
                              ) : (
                                <Syringe className="size-4.5" />
                              )}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-foreground">
                                  {apt.pet_name}
                                </span>
                                {aptPet && (
                                  <span className="text-xs text-muted-foreground hidden md:inline">
                                    ({aptPet.species} • {aptPet.breed})
                                  </span>
                                )}
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] font-semibold px-2 py-0 h-4.5",
                                    isSpayNeuter
                                      ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                  )}
                                >
                                  {isSpayNeuter ? "Spay & Neuter" : "Rabies Vaccination"}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-semibold capitalize px-1.5 py-0 h-4.5",
                                    apt.status === "confirmed"
                                      ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/5"
                                      : apt.status === "completed"
                                      ? "border-blue-500/40 text-blue-600 bg-blue-500/5"
                                      : apt.status === "cancelled"
                                      ? "border-destructive/40 text-destructive bg-destructive/5"
                                      : apt.status === "missed"
                                      ? "border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/15 font-bold"
                                      : "border-amber-500/40 text-amber-600 bg-amber-500/5"
                                  )}
                                >
                                  {apt.status === "missed" ? "Unattended (Missed)" : apt.status}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <Calendar className="size-3 text-primary" />
                                  {format(new Date(apt.date), "EEEE, MMMM d, yyyy")}
                                </span>
                                <span className="text-border">•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3 text-muted-foreground" />
                                  {apt.location ? apt.location.replace("City Veterinary Office - ", "CVO ") : "CVO Carmen Central Clinic"}
                                </span>
                                <span className="text-border">•</span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  #{apt.id.slice(0, 8).toUpperCase()}
                                </span>
                              </div>

                              {isMissed && (
                                <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                                    <span>Schedule unattended on {format(new Date(apt.date), "MMMM d")}. Please click Reschedule.</span>
                                  </div>
                                  <span className="font-bold text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 shrink-0 bg-amber-500/20 px-1.5 py-0.5 rounded">
                                    Reschedule Required
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 justify-end">
                            {isMissed ? (
                              <>
                                <ScheduleProcedureDialog
                                  initialService={apt.service_id === "spay-neuter" ? "spay-neuter" : "vaccination"}
                                  initialPet={aptPet || { id: apt.pet_id, name: apt.pet_name }}
                                  pets={pets}
                                  rescheduleAppointmentId={apt.id}
                                  ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                                  trigger={
                                    <Button
                                      size="sm"
                                      className="h-8 px-3 gap-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
                                    >
                                      <CalendarClock className="size-3.5" />
                                      <span>Reschedule</span>
                                    </Button>
                                  }
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelAppointment(apt.id)}
                                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg transition-colors"
                                  title="Dismiss missed appointment"
                                >
                                  Dismiss
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointmentForSlip(apt);
                                    setAppointmentSlipOpen(true);
                                  }}
                                  className="h-8 px-3 gap-1.5 text-xs font-semibold rounded-lg border-border hover:bg-muted cursor-pointer shadow-2xs"
                                >
                                  <QrCode className="size-3.5 text-primary" />
                                  <span>Appointment Pass</span>
                                </Button>

                                {apt.status !== "cancelled" && apt.status !== "completed" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelAppointment(apt.id)}
                                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg transition-colors"
                                    title="Cancel appointment and release slot"
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Missed schedule explanation banner */}
                        {isMissed && (
                          <div className="flex items-start sm:items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-0" />
                            <div className="flex-1">
                              <span className="font-semibold">Schedule Unattended:</span> This appointment on{" "}
                              <strong>{format(new Date(apt.date), "MMMM d, yyyy")}</strong> was missed. Click <strong>Reschedule</strong> above to pick a new municipal clinic date.
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ════ TAB 3: Vaccination & Rabies Ledger ════ */}
          <TabsContent value="vaccinations" className="space-y-4 pt-2">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Official Rabies & Preventive Immunization Ledger
              </h3>
              <p className="text-xs text-muted-foreground">
                Certified records of anti-rabies vaccination administered by the Cagayan de Oro City Veterinary Office
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pets.length === 0 ? (
                <Card className="col-span-full p-8 sm:p-12 text-center border-dashed border-2 border-border/80 bg-muted/10 space-y-3 rounded-2xl">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
                    <Syringe className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-foreground">No Pet Vaccination Ledgers Found</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Register a pet to view certified immunization records and track rabies booster schedules.
                    </p>
                  </div>
                </Card>
              ) : (
                pets.map((pet) => (
                  <Card key={pet.id} className="border-emerald-500/30 bg-emerald-500/5 shadow-xs">
                    <CardHeader className="pb-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] shrink-0">
                          {pet.rabiesVaccinated ? "ANTI-RABIES PROTECTION" : "BOOSTER SCHEDULE DUE"}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-emerald-600 shrink-0">{pet.microchip}</span>
                      </div>
                      <CardTitle className="text-base font-bold mt-1.5 break-words">
                        {pet.name} ({pet.species} • {pet.breed})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Administered at CVO Central Clinic & Barangay Drives • Dr. Elena Santos, DVM
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span className="text-muted-foreground">Vaccine Product:</span>
                        <span className="font-bold text-foreground">Rabisin Rabies Inactivated</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span className="text-muted-foreground">Batch / Lot No:</span>
                        <span className="font-mono font-bold text-foreground">RB-2026-0814</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-1">
                        <span className="text-muted-foreground">Date Administered:</span>
                        <span className="font-bold text-foreground">{pet.lastVaccinationDate || "May 10, 2026"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valid Until (Annual Booster):</span>
                        <span className="font-bold text-emerald-600">{pet.nextVaccinationDate || "May 10, 2027"}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* ════ TAB 4: Animal Bite Protocol & Emergency ABTC Guidance ════ */}
          <TabsContent value="protocols" className="space-y-4 pt-2">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="size-4.5 text-amber-600" />
                Animal Bite Emergency Protocol & ABTC Centers
              </h3>
              <p className="text-xs text-muted-foreground">
                Immediate mandatory first-aid steps and certified Animal Bite Treatment Centers in Cagayan de Oro City
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-amber-500/40 bg-amber-500/5 shadow-xs">
                <CardHeader className="pb-2">
                  <Badge className="w-fit bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                    STEP 1: IMMEDIATE FIRST-AID
                  </Badge>
                  <CardTitle className="text-sm font-bold mt-1">Wash for 15 Minutes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Immediately wash the wound or scratch vigorously under <strong>running tap water with detergent soap</strong> for at least 15 minutes.
                  </p>
                  <p>
                    Apply <strong>Povidone-Iodine (Betadine)</strong> or alcohol. Do not squeeze, cauterize, or apply garlic/stone (tandok).
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-2">
                  <Badge className="w-fit bg-primary/20 text-primary font-bold text-[10px]">
                    STEP 2: PROCEED TO ABTC
                  </Badge>
                  <CardTitle className="text-sm font-bold mt-1">Get Post-Exposure Vaccine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Proceed immediately to the nearest public <strong>Animal Bite Treatment Center (ABTC)</strong> for anti-rabies vaccine (PEP) and tetanus toxoid.
                  </p>
                  <p className="text-[11px] font-semibold text-foreground">
                    • NMMC ABTC (Capitol Compound)<br />
                    • City Health Office (Tiano Bros. St.)<br />
                    • JR Borja General Hospital (Carmen)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-2">
                  <Badge className="w-fit bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                    STEP 3: 14-DAY OBSERVATION
                  </Badge>
                  <CardTitle className="text-sm font-bold mt-1">Quarantine the Animal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong>Do not kill or sacrifice the biting animal.</strong> Confine, provide food and water, and observe for 14 days for signs of rabies.
                  </p>
                  <p>
                    Report abnormal behavior or sudden death immediately to the City Veterinary Office at <strong>(088) 857-3180</strong>.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-emerald-500/40 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <MessengerIcon className="size-4 text-emerald-600" /> Need immediate advice from our veterinary team?
                </h4>
                <p className="text-xs text-muted-foreground">
                  Our clinicians are online to review rabies immunity history, recommend nearest facilities, and answer care questions.
                </p>
              </div>

              <Button
                onClick={() => openChatWithPet(pets[0])}
                className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0"
              >
                <MessengerIcon className="size-3.5" />
                <span>Ask a Veterinarian</span>
              </Button>
            </Card>
          </TabsContent>

          {/* ════ TAB 4: Barangay Community Drives & Schedules ════ */}
          <TabsContent value="drives" className="space-y-4 pt-2">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Barangay Outreach & Mobile Veterinary Drives
              </h3>
              <p className="text-xs text-muted-foreground">
                Scheduled free mass anti-rabies vaccination, deworming, and animal registration in Cagayan de Oro
              </p>
            </div>

            <div className="space-y-3">
              {/* Highlight for owner's barangay */}
              <Card className="border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 via-card to-card shadow-xs">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                        HAPPENING IN YOUR BARANGAY
                      </Badge>
                      <span className="text-xs font-bold text-emerald-600">This Saturday</span>
                    </div>
                    <h4 className="font-extrabold text-base text-foreground">
                      Barangay {ownerBarangay} Mass Anti-Rabies & Deworming Drive
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Location: Barangay {ownerBarangay} Covered Court • 8:00 AM – 3:00 PM
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Free rabies vaccine, oral deworming, and digital QR pet passport registration. Bring pets on leash or in carriers.
                    </p>
                  </div>

                  <PetOwnerConsultationDialog
                    initialPet={pets[0]}
                    ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                    trigger={
                      <Button className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0">
                        Pre-register Pet for Drive
                      </Button>
                    }
                  />
                </CardContent>
              </Card>

              {/* Other Upcoming Barangay Drives in CDO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {[
                  {
                    bgy: "Carmen",
                    date: "October 18, 2026",
                    loc: "Carmen Plaza Covered Court",
                    type: "Anti-Rabies Drive + Free Spay/Neuter Assessment",
                  },
                  {
                    bgy: "Macabalan",
                    date: "October 22, 2026",
                    loc: "Macabalan Port Zone Community Center",
                    type: "Mass Canine Rabies Vaccination & Vitamin Drive",
                  },
                  {
                    bgy: "Lapasan",
                    date: "October 25, 2026",
                    loc: "Lapasan Barangay Gymnasium",
                    type: "Rabies Immunization & Responsible Pet Ownership Seminar",
                  },
                  {
                    bgy: "Bulua",
                    date: "October 29, 2026",
                    loc: "Bulua Zone 3 Hall",
                    type: "Barangay Livestock & Companion Animal Outreach",
                  },
                ].map((drive, idx) => (
                  <Card key={idx} className="border-border">
                    <CardContent className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">Brgy. {drive.bgy}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{drive.date}</span>
                      </div>
                      <p className="text-xs font-semibold text-primary">{drive.type}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3 text-muted-foreground" />
                        {drive.loc}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── RIGHT COLUMN: Sticky Information & Quick Municipal Services ── */}
      <div className="md:col-span-5 lg:col-span-4 space-y-4 md:sticky md:top-18">
      {/* Top Card: Next Visit / Care Status Quick Glance */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <CalendarClock className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  My Upcoming Care
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Scheduled clinic appointments & encounters
                </p>
              </div>
            </div>
            {ownerAppointments.filter((a: any) => a.status !== "cancelled").length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold">
                {ownerAppointments.filter((a: any) => a.status !== "cancelled").length} Active
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3 text-xs">
          {(() => {
            const activeAppointments = ownerAppointments.filter((a: any) => a.status !== "cancelled");
            const nextApt = activeAppointments[0];
            const waitingConsultation = ownerConsultations.find((c: any) => c.status === "waiting");

            if (!nextApt && !waitingConsultation) {
              return (
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 text-center space-y-2.5">
                  <p className="text-xs text-muted-foreground">
                    No active appointments or waiting encounters.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    <PetOwnerConsultationDialog
                      pets={pets}
                      initialPet={pets[0]}
                      ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                      trigger={
                        <Button size="sm" variant="outline" className="h-7.5 px-2.5 text-[11px] font-semibold gap-1.5 rounded-xl cursor-pointer">
                          <Stethoscope className="size-3 text-primary" />
                          <span>Request Care</span>
                        </Button>
                      }
                    />
                    <ScheduleProcedureDialog
                      pets={pets}
                      initialPet={pets[0]}
                      ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                      trigger={
                        <Button size="sm" className="h-7.5 px-2.5 text-[11px] font-semibold gap-1.5 rounded-xl cursor-pointer bg-primary text-primary-foreground">
                          <Calendar className="size-3" />
                          <span>Book Visit</span>
                        </Button>
                      }
                    />
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-2.5">
                {nextApt && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        Next Appointment
                      </span>
                      <Badge className="text-[9px] bg-primary/10 text-primary border-primary/30">
                        {nextApt.service_type || nextApt.serviceType}
                      </Badge>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-foreground">{nextApt.pet_name || nextApt.petName}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar className="size-3" />
                        {nextApt.appointment_date || nextApt.date} • {nextApt.appointment_time || nextApt.time || "Morning"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAppointmentForSlip(nextApt);
                        setAppointmentSlipOpen(true);
                      }}
                      className="w-full h-7 text-[11px] font-semibold gap-1.5 rounded-lg cursor-pointer bg-card hover:bg-muted"
                    >
                      <Printer className="size-3 text-primary" />
                      <span>View Official Appointment Slip</span>
                    </Button>
                  </div>
                )}

                {waitingConsultation && (
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Pending Consultation
                      </span>
                      <Badge className="text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/30">
                        Waiting Vet
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {waitingConsultation.petName} — {waitingConsultation.serviceType}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {waitingConsultation.chiefComplaint}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* CVO Municipal Clinic Services, Daily Quotas & Emergency Hotline */}
      <CVOClinicInfoCard
        vaxSlots={slotConfig.defaultVaccinationSlots}
        surgerySlots={slotConfig.defaultSpayNeuterSlots}
        isStaff={isStaff}
        currentUserRole={userRole}
      />

      {/* 24/7 Animal Bite Emergency & Help Card */}
      <Card className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card p-4 space-y-2.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">24/7 Animal Bite Emergency?</h4>
            <p className="text-[10px] text-muted-foreground">Official rabies exposure protocol</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Wash the bite wound immediately under running water with soap for at least 15 minutes. Do not apply garlic or bleed the wound.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setActiveTab("protocols")}
          className="w-full h-7.5 text-xs font-bold border-amber-500/30 hover:bg-amber-500/15 text-amber-800 dark:text-amber-200 rounded-xl cursor-pointer"
        >
          <span>Open Full Bite Protocol</span>
          <ArrowRight className="size-3.5 ml-1" />
        </Button>
      </Card>
    </div>
  </div>

  {/* ── Official Consultation Sheet Dialog (Replica of paper from photo) ── */}
      <OfficialConsultationSheetDialog
        consultation={selectedConsultation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* ── Pet Information & Digital Health Passport Modal ── */}
      <Dialog open={petInfoOpen} onOpenChange={setPetInfoOpen}>
        <DialogContent showCloseButton={false} className="max-w-3xl sm:max-w-3xl w-full p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedPetForInfo?.name || "Pet"} Profile & Medical Passport</DialogTitle>
          </DialogHeader>

          {selectedPetForInfo && (() => {
            const pet = selectedPetForInfo;
            const vaxStatus = getPetVaccinationStatus(pet);
            const isCat = pet.species === "Cat";
            const cdoPassportId = pet.microchip && !pet.microchip.startsWith("pet-")
              ? pet.microchip
              : `CDO-${isCat ? "FEL" : "CAN"}-${pet.id.replace(/\D/g, "").slice(-4) || pet.id.slice(0, 5).toUpperCase()}`;

            const petUpcomingAppointments = ownerAppointments.filter((a: any) =>
              (a.pet_id && a.pet_id.toLowerCase() === pet.id.toLowerCase()) ||
              (a.pet_name && a.pet_name.toLowerCase() === pet.name.toLowerCase())
            );

            const petPendingConsultations = ownerConsultations.filter((c: any) =>
              (c.petId && c.petId.toLowerCase() === pet.id.toLowerCase()) ||
              (c.petName && c.petName.toLowerCase() === pet.name.toLowerCase())
            );

            return (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header Card with Gradient & Crest */}
                <div
                  className={cn(
                    "p-5 text-white relative overflow-hidden shrink-0",
                    isCat
                      ? "bg-gradient-to-br from-purple-800 via-indigo-950 to-slate-950"
                      : "bg-gradient-to-br from-emerald-800 via-teal-950 to-slate-950"
                  )}
                >
                  <div className="absolute -bottom-10 -right-10 size-40 bg-white/[0.05] rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.08] rounded-full blur-3xl pointer-events-none" />

                  {/* Top Header Row */}
                  <div className="flex items-center justify-between relative z-10 mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-200 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20">
                      {isCat ? "FELINE COMPANION" : "CANINE COMPANION"}
                    </span>

                    {/* Top Action Icons: Request Care, Book Slot, 3 Dots, Close */}
                    <div className="flex items-center gap-1.5">
                      <PetOwnerConsultationDialog
                        pets={pets}
                        initialPet={pet}
                        ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                        trigger={
                          <button
                            type="button"
                            className="size-8 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                            title="Request Care"
                          >
                            <Stethoscope className="size-4 text-white" />
                            <span className="sr-only">Request Care</span>
                          </button>
                        }
                      />

                      <ScheduleProcedureDialog
                        pets={pets}
                        initialPet={pet}
                        ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                        trigger={
                          <button
                            type="button"
                            className="size-8 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                            title="Book Slot"
                          >
                            <Calendar className="size-4 text-white" />
                            <span className="sr-only">Book Slot</span>
                          </button>
                        }
                      />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="size-8 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                            title="More options"
                          >
                            <MoreVertical className="size-4 text-white" />
                            <span className="sr-only">More options</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => {
                              setPetToEdit(pet);
                              setEditDialogOpen(true);
                              setPetInfoOpen(false);
                            }}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                            <span>Edit Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setPetToDelete(pet);
                              setDeleteDialogOpen(true);
                              setPetInfoOpen(false);
                            }}
                            className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                            <span>Delete Pet</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DialogClose asChild>
                        <button
                          type="button"
                          className="size-8 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                          title="Close"
                        >
                          <X className="size-4 text-white" />
                          <span className="sr-only">Close</span>
                        </button>
                      </DialogClose>
                    </div>
                  </div>

                  {/* Hero Identity */}
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="size-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center shrink-0">
                      {isCat ? (
                        <Cat className="size-8 text-white" />
                      ) : (
                        <Dog className="size-8 text-white" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-black text-white tracking-tight truncate">
                          {pet.name}
                        </h2>
                      </div>
                      <p className="text-xs text-white/80 font-medium">
                        {pet.breed || pet.species} • {pet.gender === "Female" ? "Female ♀" : "Male ♂"} • {pet.age}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span
                          className={cn(
                            "text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md inline-flex items-center gap-1",
                            vaxStatus.isOverdue
                              ? "bg-rose-600 text-white"
                              : vaxStatus.isDueSoon
                              ? "bg-amber-500 text-black font-bold"
                              : vaxStatus.isVaccinated
                              ? "bg-emerald-500 text-white"
                              : "bg-amber-600 text-white"
                          )}
                        >
                          {vaxStatus.isVaccinated ? (
                            <ShieldCheck className="size-3" />
                          ) : (
                            <AlertTriangle className="size-3" />
                          )}
                          <span>
                            {vaxStatus.isOverdue
                              ? "Rabies Overdue"
                              : vaxStatus.isDueSoon
                              ? `Due Soon (${vaxStatus.daysUntilBooster}d)`
                              : vaxStatus.isVaccinated
                              ? "Rabies Protected"
                              : "Unvaccinated"}
                          </span>
                        </span>

                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md border inline-flex items-center gap-1",
                            pet.isSpayedNeutered
                              ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/30"
                              : "bg-white/10 text-white/90 border-white/20"
                          )}
                        >
                          {pet.isSpayedNeutered ? "Neutered/Spayed" : "Intact (Not Sterilized)"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {/* Vitals Grid */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Activity className="size-3.5 text-primary" />
                      <span>Physical Vitals & Municipal Identification</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <QrCode className="size-3 text-primary" /> Tag ID
                        </span>
                        <p className="font-mono font-bold text-xs text-foreground truncate" title={cdoPassportId}>
                          #{cdoPassportId}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Scale className="size-3 text-muted-foreground" /> Weight
                        </span>
                        <p className="font-bold text-xs text-foreground">
                          {pet.weightKg} kg
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground" /> Age
                        </span>
                        <p className="font-bold text-xs text-foreground">
                          {pet.age}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Scissors className="size-3 text-cyan-600" /> Sterilization
                        </span>
                        <p className="font-bold text-xs text-foreground truncate">
                          {pet.isSpayedNeutered ? "Neutered / Spayed" : "Intact"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rabies Immunization Status Card */}
                  <div className={cn(
                    "p-3.5 rounded-xl border space-y-2",
                    vaxStatus.isVaccinated
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-100"
                      : "bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-100"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "size-7 rounded-lg flex items-center justify-center shrink-0 border",
                          vaxStatus.isVaccinated
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : "bg-amber-600 text-white border-amber-700"
                        )}>
                          <Syringe className="size-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground leading-tight">
                            {vaxStatus.isVaccinated
                              ? "Anti-Rabies Core Immunization (RA 9482)"
                              : "Anti-Rabies Vaccination Needed"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {vaxStatus.isVaccinated
                              ? "Annual protection active under CVO elimination program"
                              : "Annual vaccination is free at the CVO City Clinic"}
                          </p>
                        </div>
                      </div>

                      <Badge className={cn(
                        "text-[9px] font-bold border-0",
                        vaxStatus.isVaccinated
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                      )}>
                        {vaxStatus.badgeText}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Last Vaccination:</span>
                        <span className="font-bold text-foreground text-xs">
                          {pet.lastVaccinationDate || "None recorded"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Next Due:</span>
                        <span className="font-bold text-foreground text-xs">
                          {pet.nextVaccinationDate || (vaxStatus.isVaccinated ? "1 Year from dose" : "Immediate schedule required")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Digital QR Passport Section */}
                  <div className="p-4 rounded-xl bg-card border border-border/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <QrCode className="size-3.5 text-primary" />
                          <span>Official Digital Health Passport</span>
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          Present this scannable code during mobile vet drives or walk-in visits
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                      {qrPassportUrl && (
                        <div className="p-2.5 bg-white rounded-xl border-2 border-primary/20 shadow-xs shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qrPassportUrl} alt="Pet Passport QR Code" className="size-32" />
                        </div>
                      )}

                      <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                        <div className="space-y-0.5 text-xs">
                          <p className="text-muted-foreground text-[11px]">
                            Registered Guardian: <strong className="text-foreground">{ownerName}</strong>
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            Barangay Jurisdiction: <strong className="text-foreground">{ownerBarangay}</strong>
                          </p>
                          <p className="text-muted-foreground text-[11px] font-mono">
                            Tag: <strong className="text-primary font-bold">{cdoPassportId}</strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                          <Button
                            size="sm"
                            onClick={handleDownloadPassport}
                            disabled={downloadingPassport}
                            className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer rounded-xl"
                          >
                            {downloadingPassport ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Download className="size-3.5" />
                            )}
                            <span>Download Slip (PNG)</span>
                          </Button>

                          <a
                            href={`/verify/pet/${pet.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium px-2 py-1"
                          >
                            <span>Live Verify Pass</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Appointments & Consultations for this pet */}
                  {(petUpcomingAppointments.length > 0 || petPendingConsultations.length > 0) && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <CalendarClock className="size-3.5 text-primary" />
                        <span>Scheduled Activities for {pet.name}</span>
                      </h4>

                      {petUpcomingAppointments.map((apt: any) => (
                        <div key={apt.id} className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-2">
                          <div className="space-y-0.5 text-xs">
                            <span className="font-bold text-foreground block">{apt.service_type || apt.serviceType}</span>
                            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                              <Calendar className="size-3" /> {apt.date || apt.appointment_date} • {apt.time || apt.appointment_time || "Morning"}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAppointmentForSlip(apt);
                              setAppointmentSlipOpen(true);
                            }}
                            className="h-7 text-[11px] font-semibold gap-1 rounded-lg cursor-pointer bg-card hover:bg-muted"
                          >
                            <Printer className="size-3 text-primary" />
                            <span>Slip</span>
                          </Button>
                        </div>
                      ))}

                      {petPendingConsultations.map((c: any) => (
                        <div key={c.id} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-2">
                          <div className="space-y-0.5 text-xs">
                            <span className="font-bold text-foreground block">{c.serviceType || "Clinical Assessment"}</span>
                            <span className="text-[11px] text-muted-foreground line-clamp-1">{c.chiefComplaint}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedConsultation(c);
                              setSheetOpen(true);
                            }}
                            className="h-7 text-[11px] font-semibold gap-1 rounded-lg cursor-pointer bg-card hover:bg-muted"
                          >
                            <FileText className="size-3 text-amber-600" />
                            <span>Sheet</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Pet Digital Passport QR Modal (Direct preview fallback) ── */}
      <Dialog open={passportOpen} onOpenChange={setPassportOpen}>
        <DialogContent className="max-w-md p-5 bg-background">
          <DialogHeader className="border-b pb-2.5 pr-8">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 truncate">
              <QrCode className="size-4 text-primary shrink-0" />
              <span className="truncate">Digital Pet Passport — {selectedPetForPassport?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4 space-y-3 text-center">
            {qrPassportUrl && (
              <div className="p-3 bg-white rounded-xl border-2 border-primary/20 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrPassportUrl} alt="Pet Passport QR Code" className="size-44" />
              </div>
            )}
            <div>
              <h4 className="font-extrabold text-base text-foreground">
                {selectedPetForPassport?.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {selectedPetForPassport?.species} • {selectedPetForPassport?.breed}
              </p>
              <p className="text-xs font-mono text-primary font-bold mt-1">
                Tag ID: {selectedPetForPassport?.microchip}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs">
              Show this QR code to CVO clinicians during mobile drives or walk-in visits for instant medical history retrieval.
            </p>

            {/* Single clean download button */}
            <div className="pt-2 w-full">
              <Button
                onClick={handleDownloadPassport}
                disabled={downloadingPassport}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs text-xs h-9.5"
              >
                {downloadingPassport ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                <span>Download Passport Card</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Profile Dialog ── */}
      <EditProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      {/* ── Edit Pet Dialog ── */}
      <EditPetDialog
        pet={petToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onDeleteRequest={(pet) => {
          setPetToDelete(pet);
          setDeleteDialogOpen(true);
        }}
      />

      {/* ── Delete Pet Dialog ── */}
      <DeletePetDialog
        pet={petToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />

      {/* ── Delete Consultation Dialog ── */}
      <DeleteConsultationDialog
        consultation={consultationToDelete}
        open={deleteConsultationOpen}
        onOpenChange={setDeleteConsultationOpen}
      />

      {/* ── Procedure Appointment Slip Dialog ── */}
      <ProcedureAppointmentSlipDialog
        open={appointmentSlipOpen}
        onOpenChange={setAppointmentSlipOpen}
        appointment={selectedAppointmentForSlip}
        petDetails={pets.find((p) => p.id === selectedAppointmentForSlip?.pet_id || p.name === selectedAppointmentForSlip?.pet_name)}
        ownerDetails={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
      />
    </div>
  );
}
