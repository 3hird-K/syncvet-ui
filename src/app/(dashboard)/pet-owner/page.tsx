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
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const [activeTab, setActiveTab] = useState("consultations");
  const [selectedConsultation, setSelectedConsultation] = useState<CVOConsultation | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [selectedPetForPassport, setSelectedPetForPassport] = useState<any>(null);
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
          .order("date", { ascending: true });

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
          .order("date", { ascending: true });

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

      // 4. Cascade check: Only keep appointments for pets that currently exist in the user's registered pets.
      // If the pet was deleted (or user has no registered pets), cascade remove orphaned appointments.
      const validRegisteredPetNames = new Set(dbPets.map((p: any) => p.name?.trim().toLowerCase()));
      const validRegisteredPetIds = new Set(dbPets.map((p: any) => p.id));

      const validList: any[] = [];
      const orphanedList: any[] = [];

      const todayStart = startOfDay(new Date());

      list.forEach((item: any) => {
        const matchesId = item.pet_id && validRegisteredPetIds.has(item.pet_id);
        const matchesName = item.pet_name && validRegisteredPetNames.has(item.pet_name.trim().toLowerCase());

        if (dbPets.length > 0 && (matchesId || matchesName)) {
          let effectiveStatus = item.status || "confirmed";
          try {
            const parsed = parseISO(item.date);
            if (
              isValid(parsed) &&
              isBefore(startOfDay(parsed), todayStart) &&
              effectiveStatus !== "completed" &&
              effectiveStatus !== "cancelled"
            ) {
              effectiveStatus = "missed";
            }
          } catch {}

          validList.push({
            ...item,
            status: effectiveStatus,
            rawStatus: item.status,
          });
        } else {
          orphanedList.push(item);
        }
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

      // Asynchronously purge orphaned appointments and transactions from DB and localStorage
      if (orphanedList.length > 0) {
        (async () => {
          for (const o of orphanedList) {
            try {
              await supabase.from("appointments").delete().eq("id", o.id);
            } catch {}
            try {
              await supabase
                .from("service_transactions")
                .delete()
                .or(`reference_id.eq.${o.id},id.eq.${o.id}`);
            } catch {}
          }
          try {
            const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
            const remaining = local.filter((l: any) => !orphanedList.some((o: any) => o.id === l.id));
            localStorage.setItem("syncvet_local_appointments", JSON.stringify(remaining));
          } catch {}
        })();
      }

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
    if (appointmentFilter === "upcoming") {
      return ownerAppointments.filter((a: any) => a.status === "confirmed");
    }
    if (appointmentFilter === "missed") {
      return ownerAppointments.filter((a: any) => a.status === "missed");
    }
    if (appointmentFilter === "completed") {
      return ownerAppointments.filter((a: any) => a.status === "completed");
    }
    return ownerAppointments;
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
      lastVaccinationDate: p.last_vaccination_date || (p.is_vaccinated ? "2026-05-10" : undefined),
      nextVaccinationDate: p.next_vaccination_date || (p.is_vaccinated ? "2027-05-10" : undefined),
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
    <div className="flex-1 p-4 sm:p-6 md:p-8 bg-background min-h-screen text-foreground">
      {/* ── Main Dashboard Layout: Left Main Column + Right Sidebar (Announcements & Clinic Info) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* ── LEFT COLUMN (Main Content: Profile Banner, Registered Pets, Services & History Tabs) ── */}
        <div className="xl:col-span-8 space-y-6 min-w-0">
          {/* ── 1. Warm Citizen Greeting & Municipal Command Desk ── */}
          <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-primary/5 to-card p-5 sm:p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Avatar + Warm Greeting */}
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="size-14 sm:size-16 rounded-2xl border-2 border-primary/30 shadow-xs">
                    <AvatarImage src={ownerAvatar || undefined} alt={ownerName} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary to-emerald-700 text-white font-extrabold text-base sm:text-lg">
                      {ownerName
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "PO"}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                      <Clock className="size-3" />
                      PST: {time || "08:00 AM"}
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                    {greetingTimeOfDay}, <span className="text-primary">{ownerName}</span>!
                  </h1>
                  <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                    Welcome to your official Cagayan de Oro City Veterinary Office (CVO) pet health portal.
                    {pets.length > 0 ? (
                      <> You have <strong>{pets.length} companion animal{pets.length > 1 ? "s" : ""}</strong> registered with live municipal passports and digital health cards.</>
                    ) : (
                      <> Register your companion animals to access free municipal care, vaccination, and surgical quotas.</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Minimalist CVO Helpline & Clinic Info Strip */}
            <div className="mt-4 pt-3.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="size-3.5 text-primary shrink-0" />
                <span>CVO Clinic: CVO Complex, J.V. Seriña St., Carmen, CDO</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-emerald-600 shrink-0" />
                <span>Walk-in: Mon – Fri, 8:00 AM – 5:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-primary shrink-0" />
                <span className="font-mono font-medium">(088) 857-3180 • 100% Free for CDO</span>
              </div>
            </div>
          </div>


      {/* ── Annual Rabies Vaccination Reminder Alert ── */}
      {boosterAlertPets.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-xs space-y-2 animate-in fade-in-0 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Syringe className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-foreground">
                    Annual Vaccination Booster Due
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 font-bold">
                    {boosterAlertPets.length} Pet{boosterAlertPets.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground pt-0.5 leading-relaxed">
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
                  className="h-9 px-4 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shrink-0 cursor-pointer shadow-xs"
                >
                  <Calendar className="size-3.5" />
                  <span>Schedule Booster</span>
                </Button>
              }
            />
          </div>
        </div>
      )}

      {/* ── 2. My Registered Pets (4 Columns, Single-Row Scrollable Carousel) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
              <PawPrint className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  Registered Pets
                </h2>
                <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4.5 font-bold rounded-full">
                  {pets.length}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Digital QR passports, municipal IDs, and verified anti-rabies immunity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Scroll buttons for desktop */}
            {pets.length > 3 && (
              <div className="h-8 flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-xl border border-border/70 box-border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => scrollPets("left")}
                  className="h-6.5 w-6.5 rounded-lg hover:bg-background cursor-pointer"
                  title="Scroll left"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => scrollPets("right")}
                  className="h-6.5 w-6.5 rounded-lg hover:bg-background cursor-pointer"
                  title="Scroll right"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
            <RegisterPetDialog
              trigger={
                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold rounded-xl cursor-pointer">
                  <Plus className="size-3" />
                  <span>Register Pet</span>
                </Button>
              }
            />
          </div>
        </div>

        {/* Single-Row Scrollable Carousel / Responsive Grid */}
        {pets.length === 0 ? (
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
        ) : (
          <div
            ref={petsScrollRef}
            className={cn(
              "pb-1 pt-1 no-scrollbar",
              pets.length <= 3
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5"
                : "flex gap-3.5 overflow-x-auto scroll-smooth snap-x snap-mandatory"
            )}
          >
            {pets.map((pet) => {
              const vaxStatus = getPetVaccinationStatus(pet);
              const isCat = pet.species === "Cat";
              const cdoPassportId = pet.microchip && !pet.microchip.startsWith("pet-")
                ? pet.microchip
                : `CDO-${isCat ? "FEL" : "CAN"}-${pet.id.replace(/\D/g, "").slice(-4) || pet.id.slice(0, 5).toUpperCase()}`;

              return (
                <Card
                  key={pet.id}
                  className={cn(
                    "transition-all duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between rounded-2xl bg-card border border-border/80 hover:border-primary/40 overflow-hidden group",
                    pets.length > 3 && "w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)] min-w-[250px] shrink-0 snap-start"
                  )}
                >
                  <div className="p-4 space-y-3">
                    {/* Pet Header */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Refined Animal Avatar */}
                        <div
                          className={cn(
                            "size-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border transition-transform group-hover:scale-105",
                            isCat
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                          )}
                        >
                          <PawPrint className={cn("size-5", isCat ? "text-purple-600 dark:text-purple-400" : "text-emerald-600 dark:text-emerald-400")} />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-sm text-foreground truncate">{pet.name}</h3>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 font-medium",
                                isCat
                                  ? "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              )}
                            >
                              {isCat ? "Cat" : "Dog"} • {pet.gender === "Female" ? "♀" : "♂"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {pet.breed} • {pet.age}
                          </p>
                        </div>
                      </div>

                      {/* Clean Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
                            title={`Options for ${pet.name}`}
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => {
                              setPetToEdit(pet);
                              setEditDialogOpen(true);
                            }}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <Pencil className="size-3.5 text-muted-foreground" />
                            <span>Edit Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenPassport(pet)}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <QrCode className="size-3.5 text-muted-foreground" />
                            <span>Digital Passport</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openChatWithPet(pet)}
                            className="cursor-pointer gap-2 text-xs"
                          >
                            <MessengerIcon className="size-3.5 text-emerald-600" />
                            <span>Ask City Vet</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setPetToDelete(pet);
                              setDeleteDialogOpen(true);
                            }}
                            className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                            <span>Delete Pet</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Passport Chip & Tag */}
                    <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                        <QrCode className="size-3 text-primary" /> CDO Passport
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenPassport(pet)}
                        className="text-[11px] font-mono font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                        title="View digital passport QR"
                      >
                        <span>#{cdoPassportId}</span>
                        <ExternalLink className="size-2.5 opacity-60" />
                      </button>
                    </div>

                    {/* Clean 2-Metric Vitals */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                          <Scale className="size-3 text-muted-foreground" /> Weight
                        </span>
                        <span className="font-bold text-foreground text-xs">{pet.weightKg} kg</span>
                      </div>
                      <div className="border-l border-border/40 pl-2.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                          <Syringe className="size-3 text-emerald-600" /> Next Booster
                        </span>
                        {vaxStatus.isOverdue ? (
                          <span className="font-bold text-destructive text-[11px] truncate flex items-center gap-1">
                            <AlertTriangle className="size-3 shrink-0" /> Overdue
                          </span>
                        ) : vaxStatus.isDueSoon ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px] truncate flex items-center gap-1 animate-pulse">
                            <Clock className="size-3 shrink-0" /> Due in {vaxStatus.daysUntilBooster}d
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] truncate flex items-center gap-1" title={vaxStatus.reason}>
                            <ShieldCheck className="size-3 shrink-0" /> Protected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Actions: Clinical Care & Book Visit buttons */}
                  <div className="p-3 bg-muted/10 border-t border-border/40 grid grid-cols-2 gap-2">
                    <PetOwnerConsultationDialog
                      pets={pets}
                      initialPet={pet}
                      ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                      trigger={
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs font-semibold gap-1.5 border-border/80 hover:border-primary/50 text-foreground hover:bg-primary/5 hover:text-primary cursor-pointer rounded-xl transition-all"
                          title={`Request clinical assessment for ${pet.name}`}
                        >
                          <Stethoscope className="size-3.5 text-primary" />
                          <span>Care</span>
                        </Button>
                      }
                    />
                    <ScheduleProcedureDialog
                      pets={pets}
                      initialPet={pet}
                      ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                      trigger={
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground cursor-pointer rounded-xl shadow-2xs hover:bg-primary/90 transition-all"
                          title={`Schedule procedure for ${pet.name}`}
                        >
                          <Calendar className="size-3.5" />
                          <span>Schedule</span>
                        </Button>
                      }
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. Main Services & Veterinary Communication Tabs ── */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 h-auto p-1 bg-muted/50 border border-border/70 rounded-xl gap-1">
            <TabsTrigger value="consultations" className="text-xs font-bold gap-1.5 cursor-pointer py-2">
              <Stethoscope className="size-3.5" />
              <span>Consultations</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary">
                {ownerConsultations.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="procedures" className="text-xs font-bold gap-1.5 cursor-pointer py-2">
              <Calendar className="size-3.5" />
              <span>Appointments</span>
              {ownerAppointments.filter((a: any) => a.status !== "cancelled").length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 font-bold">
                  {ownerAppointments.filter((a: any) => a.status !== "cancelled").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="vaccinations" className="text-xs font-bold gap-1.5 cursor-pointer py-2">
              <Syringe className="size-3.5" />
              <span>Vaccination Ledger</span>
            </TabsTrigger>
            <TabsTrigger value="drives" className="text-xs font-bold gap-1.5 cursor-pointer py-2">
              <MapPin className="size-3.5" />
              <span>Barangay Drives</span>
            </TabsTrigger>
            <TabsTrigger value="protocols" className="text-xs font-bold gap-1.5 cursor-pointer py-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="size-3.5" />
              <span>Bite Protocol</span>
            </TabsTrigger>
          </TabsList>

          {/* ════ TAB 1: Consultations & Official CVO Forms ════ */}
          <TabsContent value="consultations" className="space-y-4 pt-2">
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

              <div className="flex items-center gap-2 shrink-0">
                <ScheduleProcedureDialog
                  initialService="vaccination"
                  pets={pets}
                  ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                  trigger={
                    <Button
                      size="sm"
                      className="h-8 px-3 gap-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
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
                    View Missed ({missedAppointmentsCount})
                  </Button>
                </div>
              </div>
            )}

            {/* Filter Pills */}
            {ownerAppointments.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <Button
                  type="button"
                  variant={appointmentFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAppointmentFilter("all")}
                  className={cn(
                    "h-7 text-xs rounded-lg cursor-pointer",
                    appointmentFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  All ({ownerAppointments.length})
                </Button>
                <Button
                  type="button"
                  variant={appointmentFilter === "upcoming" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAppointmentFilter("upcoming")}
                  className={cn(
                    "h-7 text-xs rounded-lg cursor-pointer",
                    appointmentFilter === "upcoming" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  Upcoming ({upcomingAppointmentsCount})
                </Button>
                <Button
                  type="button"
                  variant={appointmentFilter === "missed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAppointmentFilter("missed")}
                  className={cn(
                    "h-7 text-xs rounded-lg cursor-pointer",
                    appointmentFilter === "missed"
                      ? "bg-amber-600 text-white dark:bg-amber-600 hover:bg-amber-700"
                      : missedAppointmentsCount > 0
                      ? "border-amber-500/50 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
                      : "text-muted-foreground"
                  )}
                >
                  Missed / No-Show ({missedAppointmentsCount})
                </Button>
                <Button
                  type="button"
                  variant={appointmentFilter === "completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAppointmentFilter("completed")}
                  className={cn(
                    "h-7 text-xs rounded-lg cursor-pointer",
                    appointmentFilter === "completed" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  Completed ({completedAppointmentsCount})
                </Button>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Official Rabies & Preventive Immunization Ledger
                </h3>
                <p className="text-xs text-muted-foreground">
                  Certified records of anti-rabies vaccination administered by the Cagayan de Oro City Veterinary Office
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <RegisterPetDialog
                  trigger={
                    <Button
                      size="sm"
                      className="h-8 px-3 gap-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Register Pet</span>
                    </Button>
                  }
                />
              </div>
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
    </div>

    {/* ── RIGHT COLUMN (2 Stacked Cards on Desktop, 2 Columns on Tablet, 1 Column on Mobile) ── */}
    <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-5 xl:sticky xl:top-4">
      {/* Top Card: Official CVO Announcements & Public Bulletins */}
      <CVOAnnouncementsCard
        currentUserId={user?.id}
        currentUserName={user?.fullName || dbUser?.full_name || "City Veterinary Staff"}
        currentUserRole={userRole}
        isStaff={isStaff}
      />

      {/* Bottom Card: CVO Municipal Clinic Services, Daily Quotas & Emergency Hotline */}
      <CVOClinicInfoCard
        vaxSlots={slotConfig.defaultVaccinationSlots}
        surgerySlots={slotConfig.defaultSpayNeuterSlots}
        isStaff={isStaff}
        currentUserRole={userRole}
      />
    </div>
  </div>

  {/* ── Official Consultation Sheet Dialog (Replica of paper from photo) ── */}
      <OfficialConsultationSheetDialog
        consultation={selectedConsultation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* ── Pet Digital Passport QR Modal ── */}
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
