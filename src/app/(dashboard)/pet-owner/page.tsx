"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid, isBefore, startOfDay } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { useCVO } from "@/lib/cvo-context";
import { type CVOConsultation, type CVOFieldOperation, isConsultationLockedByVet } from "@/data/cvo-store";
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
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
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
  ArrowLeft,
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
  Camera,
  ImageIcon,
  Check,
  Save,
  Search,
  Truck,
  CalendarDays,
  History,
} from "lucide-react";
import { useCitizenChat } from "@/lib/chat-context";
import QRCode from "qrcode";
import { cn, isConsultationOverdue, formatClinicScheduleSlot, getFieldOpGracePeriod } from "@/lib/utils";
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
import { EditPetOwnerConsultationDialog } from "@/components/dashboard/edit-pet-owner-consultation-dialog";
import { EditAppointmentDialog } from "@/components/dashboard/edit-appointment-dialog";
import { OfficialConsultationSheetDialog } from "@/components/dashboard/official-consultation-sheet-dialog";
import { RegisterPetDialog, DOG_BREEDS, CAT_BREEDS } from "@/components/dashboard/register-pet-dialog";
import { EditPetDialog } from "@/components/dashboard/edit-pet-dialog";
import { DeletePetDialog } from "@/components/dashboard/delete-pet-dialog";
import { PetAvatarPickerDialog } from "@/components/dashboard/pet-avatar-picker-dialog";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { PET_CAT_AVATARS, PET_DOG_AVATARS, getPetAvatarUrl } from "@/lib/pet-avatars";
import { EditProfileDialog } from "@/components/dashboard/edit-profile-dialog";
import { DeleteConsultationDialog } from "@/components/dashboard/delete-consultation-dialog";
import { ScheduleProcedureDialog } from "@/components/dashboard/schedule-procedure-dialog";
import { ProcedureAppointmentSlipDialog } from "@/components/dashboard/procedure-appointment-slip-dialog";
import { getSlotConfiguration, PROCEDURE_SERVICES, useSlotConfiguration } from "@/lib/cvo-slots";
import { CVOAnnouncementsCard } from "@/components/dashboard/cvo-announcements-card";
import { CVOClinicInfoCard } from "@/components/dashboard/cvo-clinic-info-card";
import { CVOSocialFeed } from "@/components/dashboard/cvo-social-feed";
import { PetOwnerQueueTracker } from "@/components/dashboard/pet-owner-queue-tracker";
import { syncConsultationsToQueue, getDailyQueue } from "@/lib/cvo-queue";
import { PetQueueCheckInDialog } from "@/components/dashboard/pet-queue-checkin-dialog";
import { parsePetWeightKg } from "@/lib/pet-weight";
import { PetOwnerOutreachCheckInDialog } from "@/components/dashboard/pet-owner-outreach-checkin-dialog";
import { ScanQueueQrDialog } from "@/components/dashboard/scan-queue-qr-dialog";
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
  const { consultations, fieldOperations = [], activeRoleView, setActiveRoleView } = useCVO();
  const { openChatWithPet, unreadCount } = useCitizenChat();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const { slotConfig } = useSlotConfiguration();

  const [activeTab, setActiveTab] = useState("feed");
  const [showPetCards, setShowPetCards] = useState(false);
  const [drivesViewMode, setDrivesViewMode] = useState<"upcoming" | "history">("upcoming");
  const [drivesSearchQuery, setDrivesSearchQuery] = useState("");

  // Sync activeTab with Facebook Top Bar and URL params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && tabParam !== "vaccinations") {
        setActiveTab(tabParam);
      } else if (tabParam === "vaccinations") {
        setActiveTab("feed");
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "feed");
        window.history.replaceState({}, "", url.toString());
      }
    }

    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
        setTimeout(() => {
          const mainEl = document.getElementById("app-main-scroll") || document.querySelector("main");
          if (mainEl) {
            try {
              mainEl.scrollTo({ top: 0, behavior: "smooth" });
            } catch {
              mainEl.scrollTop = 0;
            }
          }
          try {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } catch {
            window.scrollTo(0, 0);
          }
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }, 50);
      }
    };

    window.addEventListener("syncvet-tab-change", handleTabChange);
    return () => window.removeEventListener("syncvet-tab-change", handleTabChange);
  }, []);

  // Always scroll to top of content container when activeTab changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const resetScroll = () => {
        const mainEl = document.getElementById("app-main-scroll") || document.querySelector("main");
        if (mainEl) {
          try {
            mainEl.scrollTo({ top: 0, behavior: "smooth" });
          } catch {
            mainEl.scrollTop = 0;
          }
        }
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {
          window.scrollTo(0, 0);
        }
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      };

      resetScroll();
      requestAnimationFrame(resetScroll);
      setTimeout(resetScroll, 50);
      setTimeout(resetScroll, 150);
      setTimeout(resetScroll, 300);
    }
  }, [activeTab]);

  const handleOpenBiteProtocol = () => {
    setActiveTab("protocols");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "protocols");
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("syncvet-tab-change", { detail: "protocols" }));
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        const el = document.getElementById("bite-protocol-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 60);
    }
  };

  const [selectedConsultation, setSelectedConsultation] = useState<CVOConsultation | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<any | null>(null);
  const [editAppointmentOpen, setEditAppointmentOpen] = useState(false);
  const [consultationToEdit, setConsultationToEdit] = useState<CVOConsultation | null>(null);
  const [editConsultationOpen, setEditConsultationOpen] = useState(false);
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
  const [avatarPickerPet, setAvatarPickerPet] = useState<any>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [showAvatarPickerPanel, setShowAvatarPickerPanel] = useState(false);
  const [showEditPetPanel, setShowEditPetPanel] = useState(false);
  const [savingPetAvatar, setSavingPetAvatar] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<"overview" | "consultation" | "procedure" | "passport">("overview");

  // Field outreach QR scan state
  const [outreachCheckInOpen, setOutreachCheckInOpen] = useState(false);
  const [outreachCheckInScannedData, setOutreachCheckInScannedData] = useState<string | null>(null);

  useEffect(() => {
    const handleOutreachScanned = (e: any) => {
      if (e.detail) {
        setOutreachCheckInScannedData(e.detail);
        setOutreachCheckInOpen(true);
      }
    };
    window.addEventListener("syncvet-outreach-scanned", handleOutreachScanned);
    return () => {
      window.removeEventListener("syncvet-outreach-scanned", handleOutreachScanned);
    };
  }, []);

  // Station QR Queue Check-in state
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedTxForCheckIn, setSelectedTxForCheckIn] = useState<any>(null);
  const [todayQueueState, setTodayQueueState] = useState(() => getDailyQueue());

  useEffect(() => {
    const handleQueueChange = () => {
      setTodayQueueState(getDailyQueue());
    };
    window.addEventListener("syncvet-queue-updated", handleQueueChange);
    window.addEventListener("syncvet-appointment-updated", handleQueueChange);
    window.addEventListener("syncvet-consultation-updated", handleQueueChange);
    window.addEventListener("storage", handleQueueChange);
    return () => {
      window.removeEventListener("syncvet-queue-updated", handleQueueChange);
      window.removeEventListener("syncvet-appointment-updated", handleQueueChange);
      window.removeEventListener("syncvet-consultation-updated", handleQueueChange);
      window.removeEventListener("storage", handleQueueChange);
    };
  }, []);

  // Inline edit states for pet modal
  const [editPetName, setEditPetName] = useState("");
  const [editPetBreed, setEditPetBreed] = useState("");
  const [editPetWeight, setEditPetWeight] = useState("");
  const [savingPetUpdates, setSavingPetUpdates] = useState(false);

  // Save pet profile updates directly from the card
  const handleSavePetUpdates = async () => {
    if (!selectedPetForInfo) return;
    if (!editPetName.trim()) {
      toast.error("Pet name cannot be empty");
      return;
    }

    setSavingPetUpdates(true);
    try {
      const parsedWeight = parseFloat(editPetWeight);
      const updatePayload: Record<string, any> = {
        name: editPetName.trim(),
        breed: editPetBreed.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (!isNaN(parsedWeight) && parsedWeight > 0) {
        updatePayload.weight_category = `${parsedWeight} kg`;
      }

      const { error } = await supabase
        .from("pets")
        .update(updatePayload)
        .eq("id", selectedPetForInfo.id);

      if (error) throw error;

      const newWeightKg = !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : selectedPetForInfo.weightKg;

      setSelectedPetForInfo((prev: any) =>
        prev
          ? {
              ...prev,
              name: editPetName.trim(),
              breed: editPetBreed.trim(),
              weightKg: newWeightKg,
              weight_category: !isNaN(parsedWeight) && parsedWeight > 0 ? `${parsedWeight} kg` : prev.weight_category,
            }
          : prev
      );
      setSelectedPetForPassport((prev: any) =>
        prev
          ? {
              ...prev,
              name: editPetName.trim(),
              breed: editPetBreed.trim(),
              weightKg: newWeightKg,
              weight_category: !isNaN(parsedWeight) && parsedWeight > 0 ? `${parsedWeight} kg` : prev.weight_category,
            }
          : prev
      );

      await queryClient.invalidateQueries({ queryKey: ["owner-pets"] });
      queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
      queryClient.invalidateQueries({ queryKey: ["supabase-owners-pets"] });
      queryClient.invalidateQueries({ queryKey: ["chat-user-pets"] });

      toast.success("Pet Profile Saved", {
        description: `Changes for ${editPetName.trim()} have been saved successfully.`,
      });
      setShowEditPetPanel(false);
    } catch (err: any) {
      console.error("Pet update error:", err);
      toast.error("Failed to save changes", { description: err.message });
    } finally {
      setSavingPetUpdates(false);
    }
  };

  // Direct avatar selection from expanded passport side panel
  const handleDirectAvatarSelect = async (petId: string, url: string, label: string) => {
    setSavingPetAvatar(true);
    try {
      const { error } = await supabase
        .from("pets")
        .update({ photo_url: url, updated_at: new Date().toISOString() })
        .eq("id", petId);
      if (error) throw error;

      setSelectedPetForInfo((prev: any) => (prev ? { ...prev, photo_url: url } : prev));
      setSelectedPetForPassport((prev: any) => (prev ? { ...prev, photo_url: url } : prev));

      queryClient.invalidateQueries({ queryKey: ["owner-pets"] });
      queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
      queryClient.invalidateQueries({ queryKey: ["supabase-owners-pets"] });
      queryClient.invalidateQueries({ queryKey: ["chat-user-pets"] });

      toast.success("Profile photo updated!", {
        description: `${selectedPetForInfo?.name || "Pet"}'s avatar set to ${label}.`,
      });
    } catch (err: any) {
      toast.error("Failed to update avatar", { description: err.message });
    } finally {
      setSavingPetAvatar(false);
    }
  };

  // CRUD state for deleting Consultation / EMR
  const [consultationToDelete, setConsultationToDelete] = useState<CVOConsultation | null>(null);
  const [deleteConsultationOpen, setDeleteConsultationOpen] = useState(false);

  // Procedure appointments & slot states
  const [selectedAppointmentForSlip, setSelectedAppointmentForSlip] = useState<any>(null);
  const [appointmentSlipOpen, setAppointmentSlipOpen] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "upcoming" | "missed" | "completed">("all");

  // Medical history filters (vaccinations, consultations, spay/neuter)
  const [medicalHistoryFilter, setMedicalHistoryFilter] = useState<"all" | "vaccination" | "consultation" | "spay-neuter">("all");
  const [medicalHistoryPetFilter, setMedicalHistoryPetFilter] = useState<string>("all");
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());
  const toggleExpandHistory = (id: string) => {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [expandedTransactionIds, setExpandedTransactionIds] = useState<Set<string>>(new Set());
  const toggleExpandTransaction = (id: string) => {
    setExpandedTransactionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [isConsultationValid, setIsConsultationValid] = useState(false);
  const [isProcedureValid, setIsProcedureValid] = useState(false);



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
    const channelName = `realtime-pet-owner-appointments-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
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
          // Only ever migrate entries explicitly marked as pending sync.
          // Everything else is a redundant cache of Supabase data; migrating them
          // would resurrect entries that an admin/vet has deleted.
          if (appt.local_pending_sync !== true) continue;
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
              time_slot: appt.time_slot || "08:00 AM - 05:00 PM",
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

      const validOwnerIds = Array.from(
        new Set([ownerId, user?.id, dbUser?.id].filter((id): id is string => Boolean(id) && id !== "undefined"))
      );
      if (validOwnerIds.length === 0) return [];

      const list: any[] = [];
      const seenIds = new Set<string>();

      // 1. Try appointments table
      let appointmentsFetched = false;
      try {
        let apptQuery = supabase
          .from("appointments")
          .select("*, pets:pet_id(id, name, species, breed, photo_url), users:owner_id(id, full_name, email, phone_number)");

        if (validOwnerIds.length === 1) {
          apptQuery = apptQuery.eq("owner_id", validOwnerIds[0]);
        } else {
          apptQuery = apptQuery.in("owner_id", validOwnerIds);
        }

        const { data, error } = await apptQuery.order("date", { ascending: false });

        if (!error && data) {
          appointmentsFetched = true;
          data.forEach((item: any) => {
            if (item.status === "cancelled") return;
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              const petData = Array.isArray(item.pets) ? item.pets[0] : item.pets;
              const resolvedPetName = petData?.name || item.pet_name || "Pet";
              list.push({
                ...item,
                pet_name: resolvedPetName,
                pets: petData,
              });
            }
          });
        }
      } catch (e) {
        // ignore
      }

      // 2. Also read service_transactions for bookings
      let transactionsFetched = false;
      try {
        let txQuery = supabase
          .from("service_transactions")
          .select("*, pets:pet_id(id, name, species, breed, photo_url)")
          .in("transaction_type", ["Vaccination Booking", "Spay & Neuter Booking"]);

        if (validOwnerIds.length === 1) {
          txQuery = txQuery.eq("owner_id", validOwnerIds[0]);
        } else {
          txQuery = txQuery.in("owner_id", validOwnerIds);
        }

        const { data: txData } = await txQuery.order("date", { ascending: false });

        if (txData) {
          transactionsFetched = true;
          txData.forEach((tx: any) => {
            if (tx.status === "cancelled") return;
            const refId = tx.reference_id || tx.id;
            if (!seenIds.has(refId)) {
              seenIds.add(refId);
              const serviceType =
                tx.transaction_type === "Vaccination Booking" ? "vaccination" : "spay-neuter";
              const petData = Array.isArray(tx.pets) ? tx.pets[0] : tx.pets;
              const petNameMatch = petData?.name || (tx.title ? tx.title.replace(/^[^f]+for\s+/i, "") : "Pet");
              list.push({
                id: refId,
                owner_id: tx.owner_id,
                pet_id: tx.pet_id || petData?.id || null,
                pets: petData,
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

      // 3. localStorage cache — used only as an offline fallback.
      //    When Supabase was reachable, entries that no longer exist there were
      //    deleted by the admin/vet, so prune them instead of resurrecting them.
      try {
        const supabaseReachable = appointmentsFetched || transactionsFetched;
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        if (local.length > 0 && supabaseReachable) {
          const pruned = local.filter(
            (item: any) => seenIds.has(item.id) || seenIds.has(item.reference_id)
          );
          if (pruned.length !== local.length) {
            localStorage.setItem("syncvet_local_appointments", JSON.stringify(pruned));
          }
        } else if (local.length > 0) {
          local.forEach((item: any) => {
            if (item.status === "cancelled") return;
            if (!seenIds.has(item.id) && validOwnerIds.includes(item.owner_id)) {
              seenIds.add(item.id);
              list.push(item);
            }
          });
        }
      } catch (e) {
        // ignore
      }

      // Cascade filter strictly to this owner's currently registered pets
      // If the owner has no registered pets, no pet appointment applies to their dashboard.
      const registeredPetIds = new Set(
        dbPets.map((p: any) => (p.id ? String(p.id).toLowerCase() : "")).filter(Boolean)
      );
      const registeredPetNames = new Set(
        dbPets.map((p: any) => (p.name ? String(p.name).toLowerCase().trim() : "")).filter(Boolean)
      );

      const ownerFilteredList = list.filter((item: any) => {
        if (dbPets.length === 0) return false;

        const pId = item.pet_id ? String(item.pet_id).toLowerCase() : "";
        const pSubId = item.pets?.id ? String(item.pets.id).toLowerCase() : "";
        const pName = (item.pet_name || item.pets?.name || "").toLowerCase().trim();

        const matchesId = (pId && registeredPetIds.has(pId)) || (pSubId && registeredPetIds.has(pSubId));
        const matchesName = pName && registeredPetNames.has(pName);

        return matchesId || matchesName;
      });

      const todayStart = startOfDay(new Date());

      const validList = ownerFilteredList.map((item: any) => {
        let effectiveStatus = item.status || "confirmed";
        try {
          if (item.date && isConsultationOverdue(item.date, effectiveStatus)) {
            effectiveStatus = "missed";
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

  const todayAppointments = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return ownerAppointments.filter((apt: any) => {
      const isToday = apt.date === todayStr || (apt.date && apt.date.startsWith(todayStr));
      return isToday && apt.status !== "cancelled";
    });
  }, [ownerAppointments]);

  const deleteAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, rawAppointment }: { appointmentId: string; rawAppointment?: any }) => {
      // 1. Delete and mark cancelled in Supabase
      try {
        await supabase
          .from("appointments")
          .delete()
          .eq("id", appointmentId);
      } catch {}

      try {
        await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", appointmentId);
      } catch {}

      try {
        await supabase
          .from("service_transactions")
          .delete()
          .or(`reference_id.eq.${appointmentId},id.eq.${appointmentId}`);
      } catch {}

      // 2. Remove from localStorage syncvet_local_appointments
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        const filtered = local.filter(
          (l: any) => l.id !== appointmentId && l.reference_id !== appointmentId
        );
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(filtered));
      } catch (e) {}

      // 3. Remove ticket from clinic queue in localStorage
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const queueKey = `syncvet_clinic_queue_${today}`;
        const queueData = JSON.parse(localStorage.getItem(queueKey) || "{}");
        if (Array.isArray(queueData.activeTickets)) {
          const ticketNo = rawAppointment?.queue_ticket;
          queueData.activeTickets = queueData.activeTickets.filter(
            (t: any) =>
              t.appointmentId !== appointmentId &&
              t.id !== appointmentId &&
              (!ticketNo || t.ticketNumber !== ticketNo)
          );
          localStorage.setItem(queueKey, JSON.stringify(queueData));
        }
      } catch {}

      return appointmentId;
    },
    onMutate: async ({ appointmentId, rawAppointment }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ["user-appointments"] });

      // Snapshot previous
      const previousAppointments = queryClient.getQueriesData({ queryKey: ["user-appointments"] });

      // Optimistically filter out appointment immediately from TanStack cache
      queryClient.setQueriesData({ queryKey: ["user-appointments"] }, (old: any) => {
        if (!Array.isArray(old)) return [];
        return old.filter((a: any) => a.id !== appointmentId && a.reference_id !== appointmentId);
      });

      // Optimistically update todayQueueState
      setTodayQueueState((prev: any) => {
        if (!prev || !Array.isArray(prev.activeTickets)) return prev;
        const ticketNo = rawAppointment?.queue_ticket;
        return {
          ...prev,
          activeTickets: prev.activeTickets.filter(
            (t: any) =>
              t.appointmentId !== appointmentId &&
              t.id !== appointmentId &&
              (!ticketNo || t.ticketNumber !== ticketNo)
          ),
        };
      });

      // Proactively clean local storage right in onMutate
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        const filtered = local.filter(
          (l: any) => l.id !== appointmentId && l.reference_id !== appointmentId
        );
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(filtered));
      } catch {}

      // Dispatch real-time events
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("syncvet-appointment-updated"));
        window.dispatchEvent(new Event("syncvet-queue-updated"));
      }

      return { previousAppointments };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousAppointments) {
        context.previousAppointments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error("Failed to delete appointment: " + (err?.message || "Error"));
    },
    onSuccess: () => {
      toast.success("Appointment deleted successfully.");
      setTodayQueueState(getDailyQueue());
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
      queryClient.invalidateQueries({ queryKey: ["user-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cvo-today-appointments-quota"] });
    },
  });

  const handleCancelAppointment = (appointmentId: string, rawAppointment?: any) => {
    deleteAppointmentMutation.mutate({ appointmentId, rawAppointment });
  };

  // Supabase Realtime channel subscription for pets to update TanStack Query live on deletion/changes
  useEffect(() => {
    if (!user?.id) return;
    const channelName = `owner-pets-${user.id}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pets",
          filter: `owner_id=eq.${user.id}`,
        },
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
  }, [user?.id, supabase, queryClient]);

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

  const formatOpDate = (dateStr?: string) => {
    if (!dateStr) return "Scheduled Date";
    try {
      const d = parseISO(dateStr);
      return isValid(d) ? format(d, "MMMM d, yyyy") : dateStr;
    } catch {
      return dateStr;
    }
  };

  // Active/Scheduled Field Operations administered by CVO
  const activeOrScheduledDrives = useMemo(() => {
    return fieldOperations.filter(
      (op) => op.status === "in-progress" || op.status === "scheduled"
    );
  }, [fieldOperations]);

  // Concluded Field Operations (History)
  const completedOutreachHistory = useMemo(() => {
    return fieldOperations.filter((op) => op.status === "completed");
  }, [fieldOperations]);

  // Find if there is an active/scheduled drive in the logged-in owner's barangay
  const myBarangayDrive = useMemo(() => {
    if (!ownerBarangay) return null;
    const cleanOwnerBgy = ownerBarangay.toLowerCase().replace(/^barangay\s+/i, "").replace(/^brgy\.?\s+/i, "").trim();
    return activeOrScheduledDrives.find((op) => {
      const cleanOpBgy = (op.barangay || "").toLowerCase().replace(/^barangay\s+/i, "").replace(/^brgy\.?\s+/i, "").trim();
      return cleanOpBgy.includes(cleanOwnerBgy) || cleanOwnerBgy.includes(cleanOpBgy);
    });
  }, [activeOrScheduledDrives, ownerBarangay]);

  // Filtered upcoming drives by search query
  const filteredUpcomingDrives = useMemo(() => {
    if (!drivesSearchQuery.trim()) return activeOrScheduledDrives;
    const q = drivesSearchQuery.toLowerCase();
    return activeOrScheduledDrives.filter(
      (op) =>
        (op.barangay || "").toLowerCase().includes(q) ||
        (op.venue && op.venue.toLowerCase().includes(q)) ||
        (op.type && op.type.toLowerCase().includes(q)) ||
        (op.opId && op.opId.toLowerCase().includes(q)) ||
        (op.lead && op.lead.toLowerCase().includes(q))
    );
  }, [activeOrScheduledDrives, drivesSearchQuery]);

  // Filtered completed drives by search query
  const filteredCompletedDrives = useMemo(() => {
    if (!drivesSearchQuery.trim()) return completedOutreachHistory;
    const q = drivesSearchQuery.toLowerCase();
    return completedOutreachHistory.filter(
      (op) =>
        (op.barangay || "").toLowerCase().includes(q) ||
        (op.venue && op.venue.toLowerCase().includes(q)) ||
        (op.type && op.type.toLowerCase().includes(q)) ||
        (op.opId && op.opId.toLowerCase().includes(q)) ||
        (op.lead && op.lead.toLowerCase().includes(q))
    );
  }, [completedOutreachHistory, drivesSearchQuery]);

  // Registered pets strictly from the user's account
  const pets = useMemo(() => {
    return dbPets.map((p: any) => ({
      id: p.id,
      name: p.name,
      species: (p.species?.toLowerCase() === "cat" ? "Cat" : "Dog") as "Dog" | "Cat",
      breed: p.breed || (p.species?.toLowerCase() === "cat" ? "Persian" : "Aspin (Mixed)"),
      gender: (p.gender === "female" || p.gender === "Female" ? "Female" : "Male") as "Male" | "Female",
      age: p.birth_year ? `${Math.max(1, new Date().getFullYear() - p.birth_year)} yrs` : "1 yr",
      weightKg: parsePetWeightKg(p.weight_category, p.species),
      weight_category: p.weight_category,
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
      photo_url: p.photo_url || (p.species?.toLowerCase() === "cat" ? "/assets/cat-profiles/image-removebg-preview (2).png" : "/assets/dog-profiles/image-removebg-preview (5).png"),
      bodyConditionScore: 5,
    }));
  }, [dbPets]);

  // Pet Registry Carousel Horizontal Scrolling & Edge Navigation
  const petsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkPetScroll = useCallback(() => {
    const el = petsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  useEffect(() => {
    const el = petsScrollRef.current;
    if (!el) return;

    checkPetScroll();

    el.addEventListener("scroll", checkPetScroll, { passive: true });
    window.addEventListener("resize", checkPetScroll);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        checkPetScroll();
      });
      ro.observe(el);
    }

    const timer = setTimeout(checkPetScroll, 150);

    return () => {
      el.removeEventListener("scroll", checkPetScroll);
      window.removeEventListener("resize", checkPetScroll);
      if (ro) ro.disconnect();
      clearTimeout(timer);
    };
  }, [pets, checkPetScroll]);

  const scrollPets = (direction: "left" | "right") => {
    if (petsScrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      petsScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkPetScroll, 350);
    }
  };

  // Keep selectedPetForInfo and selectedPetForPassport in sync with latest pets data
  useEffect(() => {
    if (!selectedPetForInfo?.id) return;
    const freshPet = pets.find((p) => p.id === selectedPetForInfo.id);
    if (freshPet) {
      setSelectedPetForInfo((prev: any) => ({ ...prev, ...freshPet }));
      setSelectedPetForPassport((prev: any) => ({ ...prev, ...freshPet }));
    }
  }, [pets, selectedPetForInfo?.id]);

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

  // Today's active consultations for this pet owner
  const todayConsultations = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return ownerConsultations.filter((c: any) => {
      const isToday = c.date === todayStr || (c.date && c.date.startsWith(todayStr));
      const isActive = c.status === "waiting" || c.status === "in-consultation" || c.status === "treatment";
      return isToday && isActive;
    });
  }, [ownerConsultations]);

  // Fetch vaccination records for owner's pets from vaccination_records table
  const { data: ownerVaccinationRecords = [], isLoading: loadingVaccinations } = useQuery({
    queryKey: ["owner-vaccination-records", user?.id, dbUser?.id, pets.map((p) => p.id).join(",")],
    queryFn: async () => {
      const ownerId = dbUser?.id || user?.id;
      if (!ownerId && pets.length === 0) return [];
      try {
        const petIds = pets.map((p) => p.id).filter(Boolean);
        const { data, error } = await supabase
          .from("vaccination_records")
          .select("*, pets:pet_id(id, name, species, breed, photo_url), users:owner_id(id, full_name, phone_number, address)")
          .order("administered_date", { ascending: false });

        if (error || !data) return [];

        return data.filter((r: any) => {
          if (ownerId && (r.owner_id === ownerId || r.users?.id === ownerId)) return true;
          if (petIds.length > 0 && petIds.includes(r.pet_id)) return true;
          if (pets.some((p) => p.name && r.pet_name && p.name.toLowerCase() === r.pet_name.toLowerCase())) return true;
          return false;
        });
      } catch {
        return [];
      }
    },
    enabled: isLoaded && (!!user?.id || !!dbUser?.id || pets.length > 0),
  });

  // Unified medical history: Vaccinations, Consultations, and Spay/Neuter
  const allMedicalHistory = useMemo(() => {
    const list: Array<{
      id: string;
      type: "vaccination" | "consultation" | "spay-neuter";
      encounterNo: string;
      petName: string;
      petId?: string;
      species: string;
      breed: string;
      date: string;
      time: string;
      status: string;
      serviceType: string;
      chiefComplaint: string;
      diagnosis?: string;
      treatment?: string;
      medication?: string;
      vetName: string;
      photoUrl?: string;
      rawConsultation?: CVOConsultation;
      rawAppointment?: any;
      rawData?: any;
      isVerifiedProfile?: boolean;
    }> = [];

    const seenKeys = new Set<string>();

    // 1. Clinical Consultations
    ownerConsultations.forEach((c) => {
      const key = `consultation-${c.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const cPet = pets.find(
          (p) =>
            (c.petId && p.id === c.petId) ||
            (c.petName && p.name.toLowerCase() === c.petName.toLowerCase())
        );
        list.push({
          id: c.id,
          type: "consultation",
          encounterNo: c.encounterNo,
          petName: c.petName,
          petId: c.petId || cPet?.id,
          species: cPet?.species || c.species,
          breed: cPet?.breed || c.breed || "Aspin (Mixed)",
          date: c.date,
          time: c.time,
          status: c.status,
          serviceType: c.serviceType || "Clinical Consultation / Field Treatment",
          chiefComplaint: c.chiefComplaint,
          diagnosis: c.diagnosis,
          treatment: c.treatment,
          medication: c.medication,
          vetName: c.vetName,
          photoUrl: cPet?.photo_url,
          rawConsultation: c,
        });
      }
    });

    // 2. Official Vaccination Records from database
    ownerVaccinationRecords.forEach((v: any) => {
      const key = `vaccination-${v.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const vPet = pets.find(
          (p) =>
            (v.pet_id && p.id === v.pet_id) ||
            (v.pet_name && p.name.toLowerCase() === v.pet_name.toLowerCase())
        );
        const rawDate = v.administered_date || v.date_administered || v.created_at || format(new Date(), "yyyy-MM-dd");
        const dateStr = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
        list.push({
          id: v.record_no || v.id,
          type: "vaccination",
          encounterNo: v.record_no || `VAX-${(v.id || "").slice(0, 8).toUpperCase()}`,
          petName: v.pets?.name || vPet?.name || v.pet_name || "Pet",
          petId: v.pet_id || vPet?.id,
          species: v.pets?.species || vPet?.species || v.species || "Canine",
          breed: v.pets?.breed || vPet?.breed || v.breed || "Aspin (Mixed)",
          date: dateStr,
          time: v.time_administered || "Clinic Hours",
          status: v.status || "completed",
          serviceType: v.vaccine_name || "Anti-Rabies Inactivated Vaccine",
          chiefComplaint: v.notes || "Annual Rabies Immunization",
          diagnosis: "Official Municipal Rabies Immunization Completed",
          treatment: `Administered ${v.vaccine_name || "Anti-Rabies Vaccine"}${v.batch_number ? ` • Batch #${v.batch_number}` : ""}${v.next_due_date ? ` • Next Due: ${v.next_due_date}` : ""}`,
          vetName: v.veterinarian || v.attending_vet || "Attending CVO Veterinarian",
          photoUrl: vPet?.photo_url || v.pets?.photo_url,
          rawData: v,
        });
      }
    });

    // 3. Spay & Neuter and completed vaccination appointments from ownerAppointments
    ownerAppointments.forEach((apt: any) => {
      const isSpayNeuter = apt.service_id === "spay-neuter";
      const isVax = apt.service_id === "vaccination";

      if (isSpayNeuter) {
        const key = `spay-neuter-${apt.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const aptPet = pets.find(
            (p) =>
              (apt.pet_id && p.id === apt.pet_id) ||
              (apt.pet_name && p.name.toLowerCase() === apt.pet_name.toLowerCase())
          ) || apt.pets;
          const displayPetName = aptPet?.name || apt.pets?.name || apt.pet_name || "Pet";
          const rawDate = apt.date ? (apt.date.includes("T") ? apt.date.split("T")[0] : apt.date) : format(new Date(), "yyyy-MM-dd");
          list.push({
            id: apt.id,
            type: "spay-neuter",
            encounterNo: apt.id.startsWith("CVO") ? apt.id : `KAPON-${apt.id.slice(0, 8).toUpperCase()}`,
            petName: displayPetName,
            petId: apt.pet_id || aptPet?.id,
            species: aptPet?.species || apt.pets?.species || "Canine",
            breed: aptPet?.breed || apt.pets?.breed || "Mixed",
            date: rawDate,
            time: formatClinicScheduleSlot(apt.time_slot),
            status: apt.status,
            serviceType: "Spay & Neuter (Kapon) Surgical Procedure",
            chiefComplaint: apt.notes || "Surgical sterilization quota transaction",
            diagnosis: apt.status === "completed" ? "Successfully Sterilized (Spayed / Neutered)" : "Scheduled for Kapon / Surgical Sterilization",
            treatment: apt.status === "completed" ? "Surgical sterilization complete with Rabies shot & post-op care" : "Scheduled at CVO Carmen Central Clinic",
            vetName: "CVO Operating Surgeon & Clinical Team",
            photoUrl: aptPet?.photo_url || apt.pets?.photo_url,
            rawAppointment: apt,
          });
        }
      } else if (isVax && apt.status === "completed") {
        const key = `vax-apt-${apt.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const aptPet = pets.find(
            (p) =>
              (apt.pet_id && p.id === apt.pet_id) ||
              (apt.pet_name && p.name.toLowerCase() === apt.pet_name.toLowerCase())
          ) || apt.pets;
          const displayPetName = aptPet?.name || apt.pets?.name || apt.pet_name || "Pet";
          const rawDate = apt.date ? (apt.date.includes("T") ? apt.date.split("T")[0] : apt.date) : format(new Date(), "yyyy-MM-dd");
          list.push({
            id: apt.id,
            type: "vaccination",
            encounterNo: `VAX-${apt.id.slice(0, 8).toUpperCase()}`,
            petName: displayPetName,
            petId: apt.pet_id || aptPet?.id,
            species: aptPet?.species || apt.pets?.species || "Canine",
            breed: aptPet?.breed || apt.pets?.breed || "Mixed",
            date: rawDate,
            time: formatClinicScheduleSlot(apt.time_slot),
            status: "completed",
            serviceType: "Anti-Rabies Inactivated Vaccine",
            chiefComplaint: apt.notes || "Completed Vaccination Appointment",
            diagnosis: "Vaccinated - Rabies Protection Active",
            treatment: "Official CVO Clinic Administration with Certificate",
            vetName: "Attending CVO Clinic Veterinarian",
            photoUrl: aptPet?.photo_url || apt.pets?.photo_url,
            rawAppointment: apt,
          });
        }
      }
    });

    // 4. Fallback verified profile records for registered pets without explicit entry
    pets.forEach((pet) => {
      if (pet.is_spayed_neutered || pet.isSpayedNeutered) {
        const hasSpayRecord = list.some((item) => item.type === "spay-neuter" && (item.petId === pet.id || item.petName.toLowerCase() === pet.name.toLowerCase()));
        if (!hasSpayRecord) {
          list.push({
            id: `verified-kapon-${pet.id}`,
            type: "spay-neuter",
            encounterNo: `KAPON-REG-${pet.id.slice(0, 6).toUpperCase()}`,
            petName: pet.name,
            petId: pet.id,
            species: pet.species,
            breed: pet.breed,
            date: format(new Date(), "yyyy-MM-dd"),
            time: "Permanent",
            status: "completed",
            serviceType: "Spay & Neuter (Kapon) - Verified Record",
            chiefComplaint: "Registered as Spayed / Neutered in SyncVet CVO Database",
            diagnosis: "Sterilized Companion Pet (No Repro Capacity)",
            treatment: "Verified permanent sterilization recorded in official municipal registry",
            vetName: "CVO Licensed Veterinarian",
            photoUrl: pet.photo_url,
            isVerifiedProfile: true,
          });
        }
      }

      if (pet.rabiesVaccinated || pet.isVaccinated) {
        const hasVaxRecord = list.some((item) => item.type === "vaccination" && (item.petId === pet.id || item.petName.toLowerCase() === pet.name.toLowerCase()));
        if (!hasVaxRecord) {
          list.push({
            id: `verified-vax-${pet.id}`,
            type: "vaccination",
            encounterNo: `VAX-REG-${pet.id.slice(0, 6).toUpperCase()}`,
            petName: pet.name,
            petId: pet.id,
            species: pet.species,
            breed: pet.breed,
            date: pet.lastVaccinationDate || "2026-05-10",
            time: "Annual",
            status: "completed",
            serviceType: "Anti-Rabies Inactivated Vaccine (Verified)",
            chiefComplaint: "Registered with active Rabies Immunization on Pet Passport",
            diagnosis: "Protected against Rabies",
            treatment: pet.nextVaccinationDate ? `Annual Booster Due on ${pet.nextVaccinationDate}` : "Rabies Immunization Active",
            vetName: "City Veterinary Office",
            photoUrl: pet.photo_url,
            isVerifiedProfile: true,
          });
        }
      }
    });

    // Sort newest date first
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [ownerConsultations, ownerVaccinationRecords, ownerAppointments, pets]);

  // Filtered medical history list based on category and pet selection
  const filteredMedicalHistory = useMemo(() => {
    return allMedicalHistory.filter((item) => {
      if (medicalHistoryFilter !== "all" && item.type !== medicalHistoryFilter) {
        return false;
      }
      if (medicalHistoryPetFilter !== "all") {
        const matchesPetId = item.petId && item.petId === medicalHistoryPetFilter;
        const matchesPetName = item.petName && item.petName.toLowerCase() === medicalHistoryPetFilter.toLowerCase();
        if (!matchesPetId && !matchesPetName) return false;
      }
      return true;
    });
  }, [allMedicalHistory, medicalHistoryFilter, medicalHistoryPetFilter]);

  // Category counts for quick filter buttons
  const medicalHistoryCounts = useMemo(() => {
    return {
      all: allMedicalHistory.length,
      vaccination: allMedicalHistory.filter((i) => i.type === "vaccination").length,
      consultation: allMedicalHistory.filter((i) => i.type === "consultation").length,
      spayNeuter: allMedicalHistory.filter((i) => i.type === "spay-neuter").length,
    };
  }, [allMedicalHistory]);

  // Unified Scheduled Transactions for Our Pets: All scheduled appointments + in-queue clinic consultations (Present & Future Only)
  const allScheduledTransactions = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const list: Array<{
      id: string;
      kind: "appointment" | "consultation-queue";
      serviceId: string;
      serviceLabel: string;
      petName: string;
      petId?: string;
      species?: string;
      breed?: string;
      photoUrl?: string;
      date: string;
      timeSlot: string;
      location: string;
      status: string;
      notes?: string;
      isMissed: boolean;
      isUnofficial: boolean;
      queueTicket?: string;
      rawAppointment?: any;
      rawConsultation?: any;
    }> = [];

    // 1. Appointments (Vaccinations, Spay/Neuter, etc.) - Strictly today's and upcoming schedules
    ownerAppointments.forEach((apt: any) => {
      if (apt.status === "cancelled") return;

      const aptDate = (apt.date || "").split("T")[0];
      // Strictly today or future dates only
      if (!aptDate || aptDate < todayStr) return;

      const isMissed = apt.status === "missed";

      const aptPet = pets.find(
        (p) =>
          (apt.pet_id && p.id === apt.pet_id) ||
          (apt.pet_name && p.name.toLowerCase() === apt.pet_name.toLowerCase())
      ) || apt.pets;
      const displayPetName = aptPet?.name || apt.pets?.name || apt.pet_name || "Pet";
      const isSpayNeuter = apt.service_id === "spay-neuter";

      const matchedTicket = todayQueueState.activeTickets.find(
        (t: any) => t.appointmentId === apt.id || (apt.queue_ticket && t.ticketNumber === apt.queue_ticket)
      );
      const isCheckedIn = !!matchedTicket || apt.status === "checked-in" || apt.status === "in-consultation" || !!apt.checked_in_at;
      const isCompleted = apt.status === "completed";
      const isCancelled = apt.status === "cancelled";
      const isUnofficial = !isCheckedIn && !isCompleted && !isCancelled && !isMissed;

      list.push({
        id: apt.id,
        kind: "appointment",
        serviceId: apt.service_id || "vaccination",
        serviceLabel: isSpayNeuter ? "Spay & Neuter Booking" : "Rabies Vaccination Booking",
        petName: displayPetName,
        petId: apt.pet_id || aptPet?.id,
        species: aptPet?.species || apt.pets?.species,
        breed: aptPet?.breed || apt.pets?.breed,
        photoUrl: aptPet?.photo_url || apt.pets?.photo_url,
        date: apt.date || todayStr,
        timeSlot: formatClinicScheduleSlot(apt.time_slot),
        location: apt.location || "City Veterinary Office - Carmen Central Clinic",
        status: isMissed ? "missed" : isUnofficial ? "unofficial" : isCheckedIn ? "checked-in" : (apt.status || "confirmed"),
        notes: apt.notes || "",
        isMissed,
        isUnofficial,
        queueTicket: matchedTicket?.ticketNumber || apt.queue_ticket,
        rawAppointment: apt,
      });
    });

    // 2. Waiting, scheduled (unofficial), or active consultation entries - Strictly today's and upcoming schedules
    ownerConsultations.forEach((c) => {
      if ((c.status as string) === "cancelled") return;

      const consultDate = (c.date || "").split("T")[0];
      // Strictly today or future dates only
      if (!consultDate || consultDate < todayStr) return;

      const isOverdue = isConsultationOverdue(c.date, c.status);

      const matchedTicket = todayQueueState.activeTickets.find(
        (t: any) =>
          t.appointmentId === (c.encounterNo || c.id) ||
          t.encounterNo === (c.encounterNo || c.id) ||
          (t.serviceId === "consultation" &&
            t.petName?.toLowerCase().trim() === (c.petName || "").toLowerCase().trim() &&
            t.ownerName?.toLowerCase().trim() === (c.ownerName || "").toLowerCase().trim())
      );
      const isCheckedIn = !!matchedTicket || c.status === "waiting" || c.status === "in-consultation" || c.status === "treatment";
      const isCompleted = c.status === "completed";
      const isUnofficial = !isCheckedIn && !isCompleted && !isOverdue;

      const cPet = pets.find(
        (p) =>
          (c.petId && p.id === c.petId) ||
          (c.petName && p.name.toLowerCase() === c.petName.toLowerCase())
      );
      list.push({
        id: c.id,
        kind: "consultation-queue",
        serviceId: "consultation",
        serviceLabel: isUnofficial
          ? "Clinical Consultation"
          : isCheckedIn
          ? "Clinical Consultation Queue"
          : "Clinical Consultation",
        petName: c.petName,
        petId: c.petId || cPet?.id,
        species: cPet?.species || c.species,
        breed: cPet?.breed || c.breed,
        photoUrl: cPet?.photo_url,
        date: c.date || todayStr,
        timeSlot: c.time || formatClinicScheduleSlot(null),
        location: "City Veterinary Office - Carmen Central Clinic",
        status: isOverdue ? "overdue" : isUnofficial ? "unofficial" : isCompleted ? "completed" : c.status,
        notes: c.chiefComplaint,
        isMissed: isOverdue,
        isUnofficial,
        queueTicket: matchedTicket?.ticketNumber,
        rawConsultation: c,
      });
    });

    // Sort: present today schedules first, followed by future upcoming dates
    return list.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      const dateDiff = dateA.localeCompare(dateB);
      if (dateDiff !== 0) return dateDiff;
      if (a.queueTicket && !b.queueTicket) return -1;
      if (!a.queueTicket && b.queueTicket) return 1;
      return 0;
    });
  }, [ownerAppointments, ownerConsultations, pets, todayQueueState]);

  const displayedScheduledTransactions = useMemo(() => {
    let list = allScheduledTransactions;
    if (appointmentFilter === "upcoming") {
      list = allScheduledTransactions.filter(
        (a) =>
          a.isUnofficial ||
          a.status === "unofficial" ||
          a.status === "confirmed" ||
          a.status === "waiting" ||
          a.status === "checked-in" ||
          a.status === "in-consultation"
      );
    } else if (appointmentFilter === "missed") {
      list = allScheduledTransactions.filter((a) => a.isMissed || a.status === "missed" || a.status === "overdue");
    } else if (appointmentFilter === "completed") {
      list = allScheduledTransactions.filter((a) => a.status === "completed");
    }
    return list;
  }, [allScheduledTransactions, appointmentFilter]);

  // Primary pet for dynamic greetings and initial selections
  const primaryPetName = pets.length > 0 ? pets[0].name : "your pet";

  // Verification URL generator for digital passport
  const getPassportVerifyUrl = (pet: any) => {
    if (!pet || typeof window === "undefined") return "";
    return `${window.location.origin}/verify/pet/${pet.id}?name=${encodeURIComponent(pet.name || "")}&species=${encodeURIComponent(pet.species || "")}&breed=${encodeURIComponent(pet.breed || "")}&tag=${encodeURIComponent(pet.microchip || pet.id || "")}&owner=${encodeURIComponent(ownerName || "")}&contact=${encodeURIComponent(ownerContact || "")}&bgy=${encodeURIComponent(ownerBarangay || "")}&vax=${pet.rabiesVaccinated ? "1" : "0"}&lastVax=${encodeURIComponent(pet.lastVaccinationDate || "")}&nextVax=${encodeURIComponent(pet.nextVaccinationDate || "")}&photo=${encodeURIComponent(pet.photo_url || "")}`;
  };

  // Open comprehensive pet info modal
  const handleOpenPetInfo = async (pet: any) => {
    setSelectedPetForInfo(pet);
    setSelectedPetForPassport(pet);
    setEditPetName(pet.name || "");
    setEditPetBreed(pet.breed || "");
    setEditPetWeight(pet.weightKg ? String(pet.weightKg) : "");
    setShowAvatarPickerPanel(false);
    setShowEditPetPanel(false);
    setActiveProfileTab("overview");
    setPetInfoOpen(true);
    try {
      const publicVerifyUrl = getPassportVerifyUrl(pet);
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
      const publicVerifyUrl = getPassportVerifyUrl(pet);
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
      ctx.fillText(`Registered Guardian: ${ownerName || "Cagayan de Oro Citizen"}${ownerContact ? ` • ${ownerContact}` : ""}`, 320, 622);
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
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return ownerAppointments.filter((a: any) => {
      if (a.status === "cancelled" || a.status === "completed" || a.status === "missed") return false;
      const aptDate = (a.date || a.appointment_date || "").split("T")[0];
      if (aptDate && aptDate < todayStr) return false;
      return true;
    }).length;
  }, [ownerAppointments]);

  const activeConsultationsCount = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return ownerConsultations.filter(
      (c: any) => {
        if (c.status !== "waiting" && c.status !== "in-consultation" && c.status !== "treatment") return false;
        const consultDate = (c.date || "").split("T")[0];
        if (consultDate && consultDate < todayStr) return false;
        return !isConsultationOverdue(c.date, c.status);
      }
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
          {/* ── Real-Time Clinic Arrival Queue Tracker & Live Status (Visible Across All Tabs) ── */}
          <PetOwnerQueueTracker
            userId={dbUser?.id || user?.id || ""}
            userEmail={ownerEmail}
            userName={ownerName}
            userContact={ownerContact}
            userBarangay={ownerBarangay}
            todayAppointments={todayAppointments}
            todayConsultations={todayConsultations}
            allPetNames={pets.map((p) => p.name)}
          />

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

      {/* ── 2. Pet Registry ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <PawPrint className="size-3.5 text-primary" />
              <span>Pet Registry</span>
            </span>
            {pets.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold rounded-full">
                {pets.length}
              </Badge>
            )}
          </div>
        </div>

        {pets.length === 0 ? (
          /* Empty State: Premium, elegant full-width onboarding card */
          <RegisterPetDialog
            trigger={
              <div className="w-full rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.06] via-card to-card hover:border-emerald-500/40 hover:shadow-xs transition-all duration-200 p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer group shadow-2xs select-none relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-12 -right-12 size-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1 relative z-10">
                  <div className="size-11 sm:size-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 shadow-sm shadow-emerald-500/25">
                    <PawPrint className="size-5 sm:size-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Official CVO Pet Registry
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Register Your Companion Animals
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed max-w-xl">
                      Generate official digital QR passports, receive annual rabies vaccination reminders, and access municipal clinical care for your pets.
                    </p>
                    <div className="flex items-center gap-2.5 pt-0.5 flex-wrap text-[10.5px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <QrCode className="size-3 text-emerald-600 dark:text-emerald-400" /> Digital Passport
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" /> Rabies Records
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Stethoscope className="size-3 text-emerald-600 dark:text-emerald-400" /> Free Clinical Care
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 relative z-10 flex items-center justify-center pl-2">
                  <div className="size-12 sm:size-14 md:size-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs group-hover:shadow-md transition-all flex items-center justify-center">
                    <Plus className="size-6 sm:size-7 stroke-[2.5] group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              </div>
            }
          />
        ) : (
          /* Pet Registry Strip (When 1 or more pets are registered) */
          <div className="relative group/stories">
            <div
              ref={petsScrollRef}
              className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory"
            >
              {/* 1. Register Pet Card */}
              <RegisterPetDialog
                trigger={
                  <div
                    className="w-[124px] sm:w-[144px] md:w-[158px] h-48 sm:h-52 md:h-56 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-card/90 via-card/60 to-emerald-500/[0.04] dark:from-card/60 dark:to-emerald-950/20 hover:from-emerald-500/[0.08] hover:via-emerald-500/[0.05] hover:to-emerald-500/[0.12] border-2 border-dashed border-emerald-500/35 hover:border-emerald-500 dark:border-emerald-500/25 dark:hover:border-emerald-400 overflow-hidden relative flex flex-col items-center justify-center p-3 sm:p-4 text-center shrink-0 cursor-pointer shadow-2xs hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 select-none group/story snap-start"
                    title="Register a new pet into CVO database"
                  >
                    {/* Atmospheric Ambient Glow on Hover */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-32 rounded-full bg-emerald-500/15 blur-2xl opacity-40 group-hover/story:opacity-100 group-hover/story:scale-125 transition-all duration-500 pointer-events-none" />

                    {/* Interactive Plus Icon Box with 90deg Spin & Elevation on Hover */}
                    <div className="size-11 sm:size-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs mb-3 group-hover/story:bg-emerald-600 group-hover/story:text-white group-hover/story:border-emerald-600 group-hover/story:scale-110 group-hover/story:rotate-90 group-hover/story:shadow-lg group-hover/story:shadow-emerald-600/30 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-10">
                      <Plus className="size-5 sm:size-6 stroke-[2.5]" />
                    </div>

                    <p className="text-xs sm:text-sm font-extrabold text-foreground group-hover/story:text-emerald-600 dark:group-hover/story:text-emerald-400 transition-colors duration-300 leading-tight relative z-10">
                      Register Pet
                    </p>
                    <p className="text-[10px] text-muted-foreground group-hover/story:text-foreground/80 leading-tight mt-1 transition-colors duration-300 relative z-10">
                      Add Companion
                    </p>
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
              const resolvedPhotoUrl = getPetAvatarUrl(pet.photo_url, pet.species);

              // Curated companion card gradients with atmospheric depth
              const gradientBg = isCat
                ? "bg-gradient-to-b from-violet-600 via-indigo-950 to-slate-950"
                : idx % 2 === 0
                ? "bg-gradient-to-b from-teal-600 via-emerald-950 to-slate-950"
                : "bg-gradient-to-b from-cyan-700 via-slate-900 to-slate-950";

              return (
                <div
                  key={pet.id}
                  onClick={() => handleOpenPetInfo(pet)}
                  className={cn(
                    "w-[124px] sm:w-[144px] md:w-[158px] h-48 sm:h-52 md:h-56 rounded-2xl sm:rounded-3xl overflow-hidden relative shrink-0 cursor-pointer shadow-sm hover:shadow-xl hover:border-white/25 transition-all duration-300 border border-white/15 dark:border-white/10 select-none group/story flex flex-col justify-end p-2.5 sm:p-3 snap-start",
                    gradientBg
                  )}
                  title={`${pet.name} (${pet.species}) — Click to view Pet Details & Passport`}
                >
                  {/* Atmospheric Top Spotlight & Glowing Halo */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-28 rounded-full bg-radial from-white/15 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute -bottom-8 -right-8 size-28 bg-white/[0.04] rounded-full blur-xl pointer-events-none" />

                  {/* Middle / Bottom: Transparent Pet Cutout Anchored at bottom-0, occupying 90% of card height */}
                  <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-center pointer-events-none overflow-hidden z-10">
                    <img
                      src={resolvedPhotoUrl}
                      alt={pet.name}
                      className="h-[90%] w-auto max-w-none object-contain object-bottom origin-bottom filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] group-hover/story:scale-108 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                      loading="lazy"
                    />
                  </div>

                  {/* Dark Gradient Scrim to Guarantee Text Readability */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/55 to-transparent z-20 pointer-events-none" />

                  {/* Bottom: Pet Name & Breed */}
                  <div className="relative z-30 space-y-0.5 w-full">
                    <h3 className="text-sm sm:text-base font-black text-white leading-tight truncate tracking-tight drop-shadow-md">
                      {pet.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-white/80 font-medium truncate drop-shadow-xs">
                      {pet.breed || pet.species}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edge Navigation Buttons (Previous on left edge when scrolled; Next on right edge when more content exists) */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollPets("left")}
              className="absolute -left-2.5 sm:-left-3.5 top-1/2 -translate-y-1/2 z-30 size-8 sm:size-9 rounded-full bg-card/95 hover:bg-card border border-border/80 shadow-md flex items-center justify-center text-foreground hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
              title="View previous pets"
              aria-label="View previous pets"
            >
              <ChevronLeft className="size-4 sm:size-5" />
            </button>
          )}

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollPets("right")}
              className="absolute -right-2.5 sm:-right-3.5 top-1/2 -translate-y-1/2 z-30 size-8 sm:size-9 rounded-full bg-card/95 hover:bg-card border border-border/80 shadow-md flex items-center justify-center text-foreground hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
              title="View next pets"
              aria-label="View next pets"
            >
              <ChevronRight className="size-4 sm:size-5" />
            </button>
          )}
        </div>
      )}

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
          const todayStr = format(new Date(), "yyyy-MM-dd");
          const activeAppointments = ownerAppointments.filter(
            (a: any) =>
              a.status !== "cancelled" &&
              a.status !== "completed" &&
              a.status !== "missed" &&
              ((a.date || a.appointment_date || "").split("T")[0] >= todayStr) &&
              !isConsultationOverdue(a.appointment_date || a.date, a.status)
          );
          const nextApt = activeAppointments[0];
          const waitingConsultation = ownerConsultations.find(
            (c: any) =>
              c.status === "waiting" &&
              ((c.date || "").split("T")[0] >= todayStr) &&
              !isConsultationOverdue(c.date, c.status)
          );
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
                    <p className="font-bold text-foreground truncate">
                      {nextApt.pets?.name || (pets.find((p) => p.id === nextApt.pet_id)?.name) || nextApt.pet_name || nextApt.petName} • {nextApt.service_type || nextApt.serviceType}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{(nextApt.appointment_date || nextApt.date || "").split("T")[0]}</p>
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

      {/* ════ TAB 1: All Vaccinations, Consultations & Spay/Neuter History ════ */}
      <TabsContent value="consultations" className="space-y-4 m-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              All Vaccinations, Consultations & Spay/Neuter History
            </h3>
            <p className="text-xs text-muted-foreground">
              Complete medical encounters, administered vaccinations, and surgical history across all your pets
            </p>
          </div>
        </div>

        {/* Category Filter Dropdown (All History) */}
        <div className="flex items-center justify-between gap-2.5 pt-1">
          <Select
            value={medicalHistoryFilter}
            onValueChange={(val) => setMedicalHistoryFilter(val as any)}
          >
            <SelectTrigger className="h-8 text-xs w-44 bg-card border-border/80 rounded-xl font-semibold shadow-2xs cursor-pointer">
              <SelectValue placeholder="All History" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5 text-muted-foreground" />
                  <span>All History</span>
                </div>
              </SelectItem>
              <SelectItem value="vaccination">
                <div className="flex items-center gap-2">
                  <Syringe className="size-3.5 text-emerald-600" />
                  <span>Vaccinations</span>
                </div>
              </SelectItem>
              <SelectItem value="consultation">
                <div className="flex items-center gap-2">
                  <Stethoscope className="size-3.5 text-blue-600" />
                  <span>Consultations</span>
                </div>
              </SelectItem>
              <SelectItem value="spay-neuter">
                <div className="flex items-center gap-2">
                  <Scissors className="size-3.5 text-indigo-600" />
                  <span>Spay & Neuter</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List of Unified Medical History */}
        {filteredMedicalHistory.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center border-dashed border-2 border-border/80 bg-muted/10 space-y-3 rounded-2xl">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              {medicalHistoryFilter === "vaccination" ? (
                <Syringe className="size-6" />
              ) : medicalHistoryFilter === "spay-neuter" ? (
                <Scissors className="size-6" />
              ) : (
                <FileText className="size-6" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">
                No {medicalHistoryFilter === "all" ? "Medical Records" : medicalHistoryFilter === "vaccination" ? "Vaccination Records" : medicalHistoryFilter === "consultation" ? "Consultations" : "Spay & Neuter Records"} Found
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {medicalHistoryFilter === "all"
                  ? "You have not recorded any clinical consultations, vaccinations, or spay/neuter history for your pets yet."
                  : `No records match the current filter "${medicalHistoryFilter}". Try selecting "All History" or book a new appointment.`}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMedicalHistory.map((item) => {
              const isConsultation = item.type === "consultation";
              const isVaccination = item.type === "vaccination";
              const isSpayNeuter = item.type === "spay-neuter";
              const isCompleted = item.status === "completed";
              const isOverdue = isConsultation && isConsultationOverdue(item.date, item.status);
              const isWaiting = item.status === "waiting" && !isOverdue;

              const isExpanded = expandedHistoryIds.has(item.id);

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "border transition-all shadow-2xs rounded-2xl overflow-hidden hover:border-primary/40",
                    isVaccination
                      ? "hover:border-emerald-500/40"
                      : isSpayNeuter
                      ? "hover:border-indigo-500/40"
                      : "hover:border-blue-500/40"
                  )}
                >
                  <CardContent className="p-3.5 sm:p-4 space-y-0">
                    {/* ── Compact Minimal Summary Row ── */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <PetAvatar
                          photoUrl={item.photoUrl}
                          species={item.species}
                          name={item.petName}
                          size="sm"
                          className="size-10 sm:size-11 shrink-0 shadow-xs ring-1 ring-primary/20"
                        />

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-foreground truncate">
                              {item.petName}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              • {item.species} {item.breed ? `(${item.breed})` : ""}
                            </span>
                            <span className="font-mono text-[9px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                              #{item.encounterNo}
                            </span>

                            {/* Category Badge */}
                            {isVaccination ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 px-1.5 py-0"
                              >
                                <Syringe className="size-2.5 text-emerald-600" />
                                VACCINATION
                              </Badge>
                            ) : isSpayNeuter ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 gap-1 px-1.5 py-0"
                              >
                                <Scissors className="size-2.5 text-indigo-600" />
                                SPAY & NEUTER
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 px-1.5 py-0"
                              >
                                <Stethoscope className="size-2.5 text-blue-600" />
                                CONSULTATION
                              </Badge>
                            )}

                            {/* Status Badge */}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-bold pointer-events-none select-none shadow-none gap-1 px-1.5 py-0",
                                isCompleted
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : isOverdue
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  : isWaiting
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              )}
                            >
                              {isOverdue ? (
                                <>
                                  <AlertCircle className="size-2.5 text-rose-600 dark:text-rose-400" />
                                  OVERDUE
                                </>
                              ) : item.status === "in-consultation" ? (
                                <>
                                  <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  IN CONSULTATION
                                </>
                              ) : isWaiting ? (
                                <>
                                  <Clock className="size-2.5 text-amber-600" />
                                  WAITING
                                </>
                              ) : isCompleted ? (
                                <>
                                  <CheckCircle2 className="size-2.5 text-emerald-600" />
                                  COMPLETED
                                </>
                              ) : (
                                item.status.replace(/-/g, " ").toUpperCase()
                              )}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                            <span className={cn(
                              "font-semibold truncate max-w-[220px] sm:max-w-[340px]",
                              isVaccination
                                ? "text-emerald-700 dark:text-emerald-400"
                                : isSpayNeuter
                                ? "text-indigo-700 dark:text-indigo-400"
                                : "text-primary"
                            )}>
                              {item.serviceType}
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="text-[11px] text-muted-foreground font-mono shrink-0 flex items-center gap-1">
                              <Calendar className="size-3" />
                              {item.date} {item.time && `• ${item.time}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: View Details Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpandHistory(item.id)}
                          className="h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-xl border-border/80 hover:bg-muted shrink-0 cursor-pointer shadow-2xs"
                        >
                          <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                          <ChevronDown
                            className={cn(
                              "size-3.5 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </Button>
                      </div>
                    </div>

                    {/* ── Collapsible Full Details Section ── */}
                    {isExpanded && (
                      <div className="pt-3 mt-3 border-t border-border/50 space-y-3 text-xs animate-in fade-in-50 duration-200">
                        {item.chiefComplaint && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              {isVaccination ? "Record Details:" : isSpayNeuter ? "Surgical Notes:" : "Chief Complaint / Reason:"}
                            </span>
                            <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40 leading-relaxed">
                              {item.chiefComplaint}
                            </p>
                          </div>
                        )}

                        {(item.diagnosis || item.treatment) && (
                          <div className={cn(
                            "text-xs p-3 rounded-xl border space-y-1.5",
                            isVaccination
                              ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                              : isSpayNeuter
                              ? "bg-indigo-500/5 border-indigo-500/20 text-foreground"
                              : "bg-slate-50 dark:bg-muted/30 border-border/60 text-foreground"
                          )}>
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className={cn(
                                "font-bold",
                                isVaccination
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : isSpayNeuter
                                  ? "text-indigo-700 dark:text-indigo-400"
                                  : "text-blue-700 dark:text-blue-400"
                              )}>
                                {isVaccination ? "Immunization Status: " : isSpayNeuter ? "Procedure Status: " : "Official Diagnosis: "}
                                {item.diagnosis || "Recorded"}
                              </span>
                              {item.vetName && (
                                <span className="text-[10px] text-muted-foreground font-serif italic">
                                  Attending: {item.vetName}
                                </span>
                              )}
                            </div>
                            {item.treatment && (
                              <p className="text-[11px] text-muted-foreground">
                                <strong>{isVaccination ? "Administration & Batch:" : isSpayNeuter ? "Surgical Treatment:" : "Treatment & Rx:"}</strong> {item.treatment}
                                {item.medication && ` • ${item.medication}`}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action buttons inside full details */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                          <div className="flex items-center gap-2">
                            {item.rawConsultation ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedConsultation(item.rawConsultation!);
                                  setSheetOpen(true);
                                }}
                                className="h-8 gap-1.5 text-xs font-semibold border-border bg-card hover:bg-muted cursor-pointer shadow-xs rounded-xl"
                              >
                                <FileText className="size-3.5 text-primary" />
                                <span>View Official CVO Paper</span>
                              </Button>
                            ) : item.rawAppointment ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointmentForSlip(item.rawAppointment);
                                  setAppointmentSlipOpen(true);
                                }}
                                className="h-8 gap-1.5 text-xs font-semibold border-border bg-card hover:bg-muted cursor-pointer shadow-xs rounded-xl"
                              >
                                <QrCode className="size-3.5 text-primary" />
                                <span>Appointment Slip</span>
                              </Button>
                            ) : (
                              <div
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold select-none"
                                title="Official municipal registry record"
                              >
                                <ShieldCheck className="size-3.5 shrink-0" />
                                <span>Official CVO Record</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {item.rawConsultation && !isConsultationLockedByVet(item.rawConsultation) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setConsultationToDelete(item.rawConsultation!);
                                  setDeleteConsultationOpen(true);
                                }}
                                className="h-8 px-2.5 gap-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer rounded-xl"
                                title="Cancel or delete unreviewed consultation request"
                              >
                                <Trash2 className="size-3.5 text-destructive" />
                                <span>Delete</span>
                              </Button>
                            ) : null}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (item.rawConsultation) {
                                  setSelectedConsultation(item.rawConsultation);
                                  setSheetOpen(true);
                                  setTimeout(() => window.print(), 300);
                                } else if (item.rawAppointment) {
                                  setSelectedAppointmentForSlip(item.rawAppointment);
                                  setAppointmentSlipOpen(true);
                                  setTimeout(() => window.print(), 300);
                                } else {
                                  window.print();
                                }
                              }}
                              className="h-8 px-2.5 gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer rounded-xl"
                              title="Print Record"
                            >
                              <Printer className="size-3.5" />
                              <span className="sr-only sm:not-sr-only">Print</span>
                            </Button>
                          </div>
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

      {/* ════ TAB 2: Scheduled Transactions for Our Pets ════ */}
      <TabsContent value="procedures" className="space-y-4 m-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Scheduled Transactions for Our Pets
            </h3>
            <p className="text-xs text-muted-foreground">
              All scheduled transactions, upcoming procedures, and clinic appointments for your registered pets
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <PetOwnerConsultationDialog
              pets={pets}
              initialPet={pets[0]}
              ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
              trigger={
                <Button
                  size="icon"
                  className="size-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                  title="New Consultation"
                  aria-label="New Consultation"
                >
                  <Plus className="size-4" />
                </Button>
              }
            />
            <ScheduleProcedureDialog
              initialService="vaccination"
              pets={pets}
              ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
              trigger={
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8 rounded-xl border-border hover:bg-muted shadow-xs cursor-pointer"
                  title="Schedule Procedure"
                  aria-label="Schedule Procedure"
                >
                  <Calendar className="size-4 text-primary" />
                </Button>
              }
            />
          </div>
        </div>

        {/* List of Scheduled Transactions or Empty View */}
        {loadingAppointments ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs">Loading scheduled transactions...</span>
          </div>
        ) : displayedScheduledTransactions.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center border-dashed border-2 border-border/80 bg-muted/10 space-y-3 rounded-2xl">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Calendar className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">No Scheduled Transactions Found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                You do not have any active appointments or scheduled transactions for your pets today or upcoming. Book a procedure or request a consultation to get started.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayedScheduledTransactions.map((tx) => {
              const isSpayNeuter = tx.serviceId === "spay-neuter";
              const isConsultationQueue = tx.kind === "consultation-queue";
              const isVaccination = !isSpayNeuter && !isConsultationQueue;
              const isCompleted = tx.status === "completed";
              const isOverdue = tx.isMissed || tx.status === "missed" || tx.status === "overdue";
              const isWaiting = tx.status === "waiting";
              const isCheckedIn = tx.status === "checked-in";
              const isCancelled = tx.status === "cancelled";

              const isExpanded = expandedTransactionIds.has(tx.id);

              return (
                <Card
                  key={`${tx.kind}-${tx.id}`}
                  className={cn(
                    "border transition-all shadow-2xs rounded-2xl overflow-hidden hover:border-primary/40",
                    isVaccination
                      ? "hover:border-emerald-500/40"
                      : isSpayNeuter
                      ? "hover:border-indigo-500/40"
                      : "hover:border-blue-500/40"
                  )}
                >
                  <CardContent className="p-3.5 sm:p-4 space-y-0">
                    {/* ── Compact Minimal Summary Row (Matches Image 3) ── */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <PetAvatar
                          photoUrl={tx.photoUrl}
                          species={tx.species}
                          name={tx.petName}
                          size="sm"
                          className="size-10 sm:size-11 shrink-0 shadow-xs ring-1 ring-primary/20"
                        />

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-foreground truncate">
                              {tx.petName}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              • {tx.species} {tx.breed ? `(${tx.breed})` : ""}
                            </span>
                            <span className="font-mono text-[9px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                              #{tx.id.slice(0, 8).toUpperCase()}
                            </span>

                            {/* Category Badge */}
                            {isVaccination ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 px-1.5 py-0"
                              >
                                <Syringe className="size-2.5 text-emerald-600" />
                                VACCINATION
                              </Badge>
                            ) : isSpayNeuter ? (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 gap-1 px-1.5 py-0"
                              >
                                <Scissors className="size-2.5 text-indigo-600" />
                                SPAY & NEUTER
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 px-1.5 py-0"
                              >
                                <Stethoscope className="size-2.5 text-blue-600" />
                                CONSULTATION
                              </Badge>
                            )}

                            {/* Status Badge */}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-bold pointer-events-none select-none shadow-none gap-1 px-1.5 py-0",
                                tx.isUnofficial
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/35 font-extrabold"
                                  : isCompleted
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : isOverdue
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  : isCheckedIn || tx.queueTicket
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : isWaiting
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : isCancelled
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              )}
                            >
                              {tx.isUnofficial ? (
                                <>
                                  <QrCode className="size-2.5 text-amber-600 dark:text-amber-400" />
                                  UNOFFICIAL • SCAN QR TO QUEUE
                                </>
                              ) : isOverdue ? (
                                <>
                                  <AlertCircle className="size-2.5 text-rose-600 dark:text-rose-400" />
                                  OVERDUE
                                </>
                              ) : isCheckedIn || tx.queueTicket ? (
                                <>
                                  <CheckCircle2 className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                                  IN QUEUE {tx.queueTicket ? `• #${tx.queueTicket}` : ""}
                                </>
                              ) : isWaiting ? (
                                <>
                                  <Clock className="size-2.5 text-amber-600" />
                                  WAITING
                                </>
                              ) : isCompleted ? (
                                <>
                                  <CheckCircle2 className="size-2.5 text-emerald-600" />
                                  COMPLETED
                                </>
                              ) : isCancelled ? (
                                "CANCELLED"
                              ) : (
                                tx.status.replace(/-/g, " ").toUpperCase()
                              )}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                            <span
                              className={cn(
                                "font-semibold truncate max-w-[220px] sm:max-w-[340px]",
                                tx.isUnofficial
                                  ? "text-amber-700 dark:text-amber-400 font-medium"
                                  : isVaccination
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : isSpayNeuter
                                  ? "text-indigo-700 dark:text-indigo-400"
                                  : "text-primary"
                              )}
                            >
                              {tx.isUnofficial
                                ? `${tx.serviceLabel} • Needs Station QR Scan`
                                : tx.queueTicket
                                ? `${tx.serviceLabel} • Live Queue Ticket #${tx.queueTicket}`
                                : tx.serviceLabel}
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="text-[11px] text-muted-foreground font-mono shrink-0 flex items-center gap-1">
                              <Calendar className="size-3" />
                              {tx.date} {tx.timeSlot && `• ${formatClinicScheduleSlot(tx.timeSlot)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tx.isUnofficial && (
                          <Button
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTxForCheckIn(tx);
                              setCheckInDialogOpen(true);
                            }}
                            className="size-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer active:scale-95 transition-transform shrink-0"
                            title="Scan QR Code to Enter Queue"
                            aria-label="Scan QR Code to Enter Queue"
                          >
                            <QrCode className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpandTransaction(tx.id)}
                          className="h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-xl border-border/80 hover:bg-muted shrink-0 cursor-pointer shadow-2xs"
                        >
                          <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                          <ChevronDown
                            className={cn(
                              "size-3.5 text-muted-foreground transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </Button>
                      </div>
                    </div>

                    {/* ── Collapsible Full Details Section ── */}
                    {isExpanded && (
                      <div className="pt-3 mt-3 border-t border-border/50 space-y-3 text-xs animate-in fade-in-50 duration-200">
                        {/* Unofficial / QR Check-in Required Notice */}
                        {tx.isUnofficial && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200 animate-in fade-in-50">
                            <div className="size-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 mt-0.5">
                              <QrCode className="size-4" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                                Unofficial Reservation — QR Station Check-in Required
                              </p>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                This booking is reserved as unofficial. To enter Today&apos;s Clinic Queue and receive your live queue ticket (#Q-XXX), please scan the QR code displayed at the clinic Check-in QR Station upon arrival.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* In Queue Ticket Notice */}
                        {tx.queueTicket && (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-950 dark:text-emerald-200">
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                <CheckCircle2 className="size-4" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="font-bold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                                  Official Live Queue Ticket: #{tx.queueTicket}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Patient has checked in via station QR and is now in Today&apos;s Clinic Queue.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Overdue / Unattended alert if missed */}
                        {tx.isMissed && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
                            <div className="flex items-center gap-1.5 font-medium">
                              <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                              <span>Schedule unattended on {tx.date}. Please reschedule.</span>
                            </div>
                            <span className="font-bold text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 shrink-0 bg-amber-500/20 px-1.5 py-0.5 rounded">
                              Reschedule Required
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <MapPin className="size-3 text-primary" />
                              Clinic Location
                            </span>
                            <p className="text-xs text-foreground font-medium">
                              {tx.location ? tx.location.replace("City Veterinary Office - ", "CVO ") : "CVO Carmen Central Clinic"}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3 text-primary" />
                              Scheduled Time & Slot
                            </span>
                            <p className="text-xs text-foreground font-medium">
                              {tx.date} • {formatClinicScheduleSlot(tx.timeSlot)}
                            </p>
                          </div>
                        </div>

                        {tx.notes && (
                          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Notes / Details:
                            </span>
                            <p className="text-xs text-foreground leading-relaxed">
                              {tx.notes}
                            </p>
                          </div>
                        )}

                        {/* Action buttons with icons */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                          {tx.rawAppointment ? (
                            tx.isMissed ? (
                              <>
                                <ScheduleProcedureDialog
                                  initialService={tx.serviceId === "spay-neuter" ? "spay-neuter" : "vaccination"}
                                  initialPet={pets.find((p) => p.id === tx.petId) || (tx.petId ? { id: tx.petId, name: tx.petName } : undefined)}
                                  pets={pets}
                                  rescheduleAppointmentId={tx.id}
                                  ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                                  trigger={
                                    <Button
                                      size="sm"
                                      className="size-8 p-0 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs cursor-pointer"
                                      title="Reschedule Appointment"
                                    >
                                      <CalendarClock className="size-4" />
                                    </Button>
                                  }
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelAppointment(tx.id, tx.rawAppointment)}
                                  className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                  title="Dismiss missed appointment"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {(tx.isUnofficial || tx.status === "confirmed" || tx.status === "waiting") && !tx.queueTicket && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAppointmentToEdit(tx.rawAppointment);
                                      setEditAppointmentOpen(true);
                                    }}
                                    className="size-8 p-0 rounded-lg border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer shadow-2xs transition-colors"
                                    title="Edit appointment / Reschedule"
                                    aria-label="Edit appointment"
                                  >
                                    <Pencil className="size-4 text-primary" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointmentForSlip(tx.rawAppointment);
                                    setAppointmentSlipOpen(true);
                                  }}
                                  className="size-8 p-0 rounded-lg border-border/80 hover:bg-muted cursor-pointer shadow-2xs"
                                  title="Appointment Pass / QR"
                                >
                                  <QrCode className="size-4 text-primary" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointmentForSlip(tx.rawAppointment);
                                    setAppointmentSlipOpen(true);
                                  }}
                                  className="size-8 p-0 rounded-lg border-border/80 hover:bg-muted cursor-pointer shadow-2xs"
                                  title="Official Certificate / Record Slip"
                                >
                                  <FileText className="size-4 text-primary" />
                                </Button>

                                {tx.status !== "cancelled" && tx.status !== "completed" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelAppointment(tx.id, tx.rawAppointment)}
                                    className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                    title="Cancel or delete appointment"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                )}
                              </>
                            )
                          ) : (tx.rawConsultation || tx.kind === "consultation-queue") ? (
                            <>
                              {tx.isUnofficial && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const consultObj =
                                      tx.rawConsultation ||
                                      consultations.find((c) => c.id === tx.id || c.encounterNo === tx.id);
                                    if (consultObj) {
                                      setConsultationToEdit(consultObj);
                                      setEditConsultationOpen(true);
                                    }
                                  }}
                                  className="size-8 p-0 rounded-lg border-border/80 hover:bg-primary/10 hover:text-primary hover:border-primary/40 cursor-pointer shadow-2xs transition-colors"
                                  title="Edit consultation request"
                                  aria-label="Edit consultation request"
                                >
                                  <Pencil className="size-4 text-primary" />
                                </Button>
                              )}
                              {tx.rawConsultation && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedConsultation(tx.rawConsultation);
                                    setSheetOpen(true);
                                  }}
                                  className="size-8 p-0 rounded-lg border-border/80 hover:bg-muted cursor-pointer shadow-2xs"
                                  title="Queue Sheet"
                                >
                                  <FileText className="size-4 text-primary" />
                                </Button>
                              )}

                              {tx.status !== "cancelled" && tx.status !== "completed" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const consultObj =
                                      tx.rawConsultation ||
                                      consultations.find((c) => c.id === tx.id || c.encounterNo === tx.id);
                                    if (consultObj) {
                                      setConsultationToDelete(consultObj);
                                      setDeleteConsultationOpen(true);
                                    }
                                  }}
                                  className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                  title="Cancel or delete consultation request"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </>
                          ) : null}


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


          {/* ════ TAB 4: Animal Bite Protocol & Emergency ABTC Guidance ════ */}
          <TabsContent value="protocols" className="space-y-4 pt-2">
            <div id="bite-protocol-section" className="scroll-mt-20">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="size-4.5 text-amber-600" />
                  Animal Bite Emergency Protocol & ABTC Centers
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActiveTab("feed");
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.set("tab", "feed");
                      window.history.pushState({}, "", url.toString());
                      window.dispatchEvent(new CustomEvent("syncvet-tab-change", { detail: "feed" }));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="size-3.5 mr-1" />
                  <span>Back to Bulletins</span>
                </Button>
              </div>
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
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("syncvet:open-chat", { detail: { contactId: "vet" } })
                    );
                  }
                  if (pets.length > 0) {
                    openChatWithPet(pets[0]);
                  } else {
                    openChatWithPet();
                  }
                }}
                className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0 shadow-xs"
              >
                <MessengerIcon className="size-3.5" />
                <span>Ask a Veterinarian</span>
              </Button>
            </Card>
          </TabsContent>

          {/* ════ TAB 4: Barangay Community Drives & Schedules ════ */}
          <TabsContent value="drives" className="space-y-4 pt-2">
            <div id="drives-tab-top" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <MapPin className="size-5 text-teal-600 dark:text-teal-400" />
                  <span>Barangay Outreach & Mobile Veterinary Drives</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Official community field missions: free anti-rabies vaccination, deworming, spay/neuter assessments & pet registration across Cagayan de Oro
                </p>
              </div>

              {/* View Mode Toggle: Upcoming vs History */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 shrink-0 self-start sm:self-auto">
                <Button
                  type="button"
                  size="sm"
                  variant={drivesViewMode === "upcoming" ? "default" : "ghost"}
                  onClick={() => setDrivesViewMode("upcoming")}
                  className={cn(
                    "h-7 text-xs font-semibold gap-1.5 rounded-lg px-2.5 cursor-pointer",
                    drivesViewMode === "upcoming"
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CalendarDays className="size-3.5" />
                  <span>Upcoming & Live</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-background/30 text-current">
                    {activeOrScheduledDrives.length}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={drivesViewMode === "history" ? "default" : "ghost"}
                  onClick={() => setDrivesViewMode("history")}
                  className={cn(
                    "h-7 text-xs font-semibold gap-1.5 rounded-lg px-2.5 cursor-pointer",
                    drivesViewMode === "history"
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <History className="size-3.5" />
                  <span>Mission History</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-background/30 text-current">
                    {completedOutreachHistory.length}
                  </Badge>
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search drives by barangay, venue, veterinarian, or operation ID..."
                value={drivesSearchQuery}
                onChange={(e) => setDrivesSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-card border-border/80"
              />
              {drivesSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDrivesSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {drivesViewMode === "upcoming" ? (
              <div className="space-y-4">
                {/* 1. Highlight Card for Owner's Barangay */}
                {myBarangayDrive ? (
                  <Card className="border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 via-card to-card shadow-xs rounded-2xl overflow-hidden">
                    <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                            HAPPENING IN YOUR BARANGAY
                          </Badge>
                          {myBarangayDrive.status === "in-progress" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold animate-pulse">
                              ● LIVE IN FIELD NOW
                            </Badge>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {formatOpDate(myBarangayDrive.date)}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {myBarangayDrive.opId}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-base sm:text-lg text-foreground">
                          Brgy. {myBarangayDrive.barangay} — {myBarangayDrive.type}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-emerald-600" />
                            {myBarangayDrive.venue || "Barangay Covered Court"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3.5 text-emerald-600" />
                            {myBarangayDrive.timeWindow || "8:00 AM – 3:00 PM"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Stethoscope className="size-3.5 text-emerald-600" />
                            Attending: {myBarangayDrive.lead}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                          {myBarangayDrive.notes || "Free rabies vaccine, oral deworming, spay/neuter assessments, and digital QR pet passport registration. Bring pets safely on leashes or in secure carriers."}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                        {(() => {
                          const mbTodayStr = format(new Date(), "yyyy-MM-dd");
                          const mbCleanDate = myBarangayDrive.date.includes("T") ? myBarangayDrive.date.split("T")[0] : myBarangayDrive.date.trim();
                          const mbGrace = getFieldOpGracePeriod(myBarangayDrive.date, myBarangayDrive.status);
                          const mbIsExpired = mbGrace.isPastGracePeriod || myBarangayDrive.status === "completed" || myBarangayDrive.status === "cancelled";
                          const mbIsFuture = mbCleanDate > mbTodayStr && myBarangayDrive.status !== "in-progress";

                          if (mbIsExpired) {
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="h-8.5 text-xs font-semibold text-muted-foreground bg-muted/40 border-border/60 cursor-not-allowed gap-1.5 w-full md:w-auto"
                              >
                                <Lock className="size-3.5 text-muted-foreground" />
                                <span>Outreach Concluded</span>
                              </Button>
                            );
                          }

                          if (mbIsFuture) {
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  toast.info("Outreach Check-In Not Yet Active", {
                                    description: `Outreach in Barangay ${myBarangayDrive.barangay} is scheduled for ${formatOpDate(mbCleanDate)}. Attendance QR check-in opens on the event day.`,
                                  });
                                }}
                                className="h-8.5 text-xs font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer gap-1.5 w-full md:w-auto"
                              >
                                <Calendar className="size-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Scan Opens on {formatOpDate(mbCleanDate)}</span>
                              </Button>
                            );
                          }

                          return (
                            <ScanQueueQrDialog
                              trigger={
                                <Button className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer w-full md:w-auto shadow-xs gap-1.5">
                                  <QrCode className="size-3.5" />
                                  <span>Scan Attendance QR</span>
                                </Button>
                              }
                            />
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-primary" />
                        No mobile drive scheduled for Barangay {ownerBarangay || "your barangay"} this week
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        CVO visits barangays in rotational municipal schedules. You may join any active outreach below or walk in at Carmen Central Clinic.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveTab("procedures");
                        if (typeof window !== "undefined") {
                          const url = new URL(window.location.href);
                          url.searchParams.set("tab", "procedures");
                          window.history.pushState({}, "", url.toString());
                        }
                      }}
                      className="text-xs h-7.5 shrink-0 cursor-pointer"
                    >
                      Book Clinic Visit
                    </Button>
                  </div>
                )}

                {/* 2. List of All Active & Upcoming Field Drives */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Active & Upcoming Field Deployments ({filteredUpcomingDrives.length})
                    </h4>
                  </div>

                  {filteredUpcomingDrives.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-border/70 bg-card text-center space-y-1.5">
                      <Truck className="size-7 text-muted-foreground/40 mx-auto" />
                      <p className="text-xs font-semibold text-foreground">No matching field drives found</p>
                      <p className="text-[11px] text-muted-foreground">
                        {drivesSearchQuery ? `No outreach visits match "${drivesSearchQuery}"` : "New schedules are published weekly by CVO."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredUpcomingDrives.map((drive) => {
                        const isLive = drive.status === "in-progress";
                        const targetSlots = drive.petsTarget || 100;
                        const vaccinatedCount = drive.petsVaccinated || 0;
                        const progressPct = Math.min(100, Math.round((vaccinatedCount / targetSlots) * 100));

                        return (
                          <Card key={drive.id || drive.opId} className="border-border/80 hover:border-teal-500/40 transition-all rounded-2xl shadow-2xs overflow-hidden">
                            <CardContent className="p-3.5 sm:p-4 space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-sm text-foreground">
                                      Brgy. {drive.barangay}
                                    </span>
                                    {isLive ? (
                                      <Badge className="bg-emerald-600 text-white text-[9px] font-bold animate-pulse py-0 px-1.5">
                                        ● LIVE
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-teal-700 dark:text-teal-300 border-teal-500/30 bg-teal-500/10 text-[9px] font-bold py-0 px-1.5">
                                        Scheduled
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs font-semibold text-primary pt-0.5 line-clamp-1">
                                    {drive.type}
                                  </p>
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted shrink-0">
                                  {formatOpDate(drive.date)}
                                </span>
                              </div>

                              <div className="space-y-1 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                                <p className="flex items-center gap-1.5 truncate">
                                  <MapPin className="size-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{drive.venue || "Barangay Covered Court"}</span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <Clock className="size-3 text-muted-foreground shrink-0" />
                                  <span>{drive.timeWindow || "8:00 AM – 3:00 PM"}</span>
                                </p>
                                <p className="flex items-center gap-1.5 truncate">
                                  <Stethoscope className="size-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">Attending: {drive.lead}</span>
                                </p>
                              </div>

                              {/* Headcount / Progress Bar */}
                              <div className="space-y-1 pt-1 border-t border-border/40">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                                  <span>Target Capacity</span>
                                  <span className="font-semibold text-foreground font-mono">
                                    {vaccinatedCount} / {targetSlots} pets ({progressPct}%)
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-teal-600 dark:bg-teal-400 rounded-full transition-all"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>

                              {/* Footer Action */}
                              <div className="pt-1 flex items-center justify-between">
                                <span className="font-mono text-[9px] text-muted-foreground">
                                  {drive.opId}
                                </span>
                                {(() => {
                                  const driveTodayStr = format(new Date(), "yyyy-MM-dd");
                                  const cleanDriveDate = drive.date.includes("T") ? drive.date.split("T")[0] : drive.date.trim();
                                  const driveGrace = getFieldOpGracePeriod(drive.date, drive.status);
                                  const isDriveExpired = driveGrace.isPastGracePeriod || drive.status === "completed" || drive.status === "cancelled";
                                  const isDriveFuture = cleanDriveDate > driveTodayStr && drive.status !== "in-progress";

                                  if (isDriveExpired) {
                                    return (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled
                                        className="h-7 text-[11px] px-2.5 font-semibold text-muted-foreground bg-muted/40 border-border/60 cursor-not-allowed gap-1"
                                      >
                                        <Lock className="size-3 text-muted-foreground" />
                                        <span>Expired</span>
                                      </Button>
                                    );
                                  }

                                  if (isDriveFuture) {
                                    return (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          toast.info("Outreach Check-In Not Yet Active", {
                                            description: `Outreach in Barangay ${drive.barangay} is scheduled for ${formatOpDate(cleanDriveDate)}. Attendance QR check-in opens on the event day.`,
                                          });
                                        }}
                                        className="h-7 text-[11px] px-2.5 font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer gap-1"
                                      >
                                        <Calendar className="size-3 text-amber-600 dark:text-amber-400" />
                                        <span>Opens {formatOpDate(cleanDriveDate)}</span>
                                      </Button>
                                    );
                                  }

                                  return (
                                    <ScanQueueQrDialog
                                      trigger={
                                        <Button
                                          size="sm"
                                          className="h-7 text-[11px] px-2.5 font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                                        >
                                          <QrCode className="size-3" />
                                          <span>Scan QR</span>
                                        </Button>
                                      }
                                    />
                                  );
                                })()}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Mission History View */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Concluded Field Operations Ledger ({filteredCompletedDrives.length})
                  </h4>
                </div>

                {filteredCompletedDrives.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-border/70 bg-card text-center space-y-2">
                    <History className="size-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-xs font-semibold text-foreground">No completed outreach history recorded yet</p>
                    <p className="text-[11px] text-muted-foreground">
                      Concluded field missions and mass vaccination totals will appear here as veterinary teams complete operations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredCompletedDrives.map((op) => (
                      <Card key={op.id || op.opId} className="border-border/80 bg-card/70 rounded-2xl overflow-hidden shadow-2xs">
                        <CardContent className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                                {op.opId}
                              </span>
                              <Badge variant="outline" className="text-[9px] bg-muted/60 text-muted-foreground border-border font-semibold">
                                Completed
                              </Badge>
                              <span className="text-[11px] font-bold text-foreground">
                                Brgy. {op.barangay}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                • {formatOpDate(op.date)}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-foreground">
                              {op.type}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3 text-muted-foreground" />
                                {op.venue || "Barangay Covered Court"}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Stethoscope className="size-3 text-muted-foreground" />
                                {op.lead}
                              </span>
                            </p>
                            {op.notes && (
                              <p className="text-[10.5px] text-muted-foreground/90 italic pt-0.5">
                                "{op.notes}"
                              </p>
                            )}
                          </div>

                          <div className="text-left sm:text-right shrink-0 bg-muted/30 p-2 sm:p-2.5 rounded-xl border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-medium">Animals Served</p>
                            <p className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                              {op.petsVaccinated || op.petsTarget || 0} Pets
                            </p>
                            <p className="text-[9px] text-muted-foreground">Verified by CVO Field Unit</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            {(() => {
              const todayStr = format(new Date(), "yyyy-MM-dd");
              const activeCount = ownerAppointments.filter(
                (a: any) =>
                  a.status !== "cancelled" &&
                  a.status !== "completed" &&
                  a.status !== "missed" &&
                  ((a.date || a.appointment_date || "").split("T")[0] >= todayStr) &&
                  !isConsultationOverdue(a.appointment_date || a.date, a.status)
              ).length + (ownerConsultations.some((c: any) => (c.status === "waiting" || c.status === "scheduled") && ((c.date || "").split("T")[0] >= todayStr) && !isConsultationOverdue(c.date, c.status)) ? 1 : 0);

              if (activeCount === 0) return null;
              return (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold">
                  {activeCount} Active
                </Badge>
              );
            })()}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3 text-xs">
          {(() => {
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const activeAppointments = ownerAppointments.filter(
              (a: any) =>
                a.status !== "cancelled" &&
                a.status !== "completed" &&
                a.status !== "missed" &&
                ((a.date || a.appointment_date || "").split("T")[0] >= todayStr) &&
                !isConsultationOverdue(a.appointment_date || a.date, a.status)
            );
            const nextApt = activeAppointments[0];
            const waitingConsultation = ownerConsultations.find(
              (c: any) => (c.status === "waiting" || c.status === "scheduled") && ((c.date || "").split("T")[0] >= todayStr) && !isConsultationOverdue(c.date, c.status)
            );

            if (!nextApt && !waitingConsultation) {
              return (
                <div className="p-3.5 py-4 rounded-xl bg-muted/20 border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground">
                    No active appointments or waiting encounters.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-2.5">
                {nextApt && (() => {
                  const nextAptPet = pets.find((p) => p.id === nextApt.pet_id || (p.name && nextApt.pet_name && p.name.toLowerCase() === nextApt.pet_name.toLowerCase())) || nextApt.pets;
                  const nextAptPetName = nextAptPet?.name || nextApt.pets?.name || nextApt.pet_name || nextApt.petName || "Pet";
                  const isNextSpayNeuter = nextApt.service_id === "spay-neuter" || nextApt.service_type === "spay-neuter" || nextApt.serviceType === "spay-neuter";
                  const rawDate = nextApt.appointment_date || nextApt.date || "";
                  const aptDateStr = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
                  const todayStr = format(new Date(), "yyyy-MM-dd");
                  const isAptToday = !!aptDateStr && aptDateStr === todayStr;

                  let relativeLabel = "";
                  let formattedDate = aptDateStr;
                  if (aptDateStr) {
                    try {
                      const aptDateObj = parseISO(aptDateStr);
                      if (isValid(aptDateObj)) {
                        formattedDate = format(aptDateObj, "EEE, MMM d, yyyy");
                        const today = startOfDay(new Date());
                        const aptDay = startOfDay(aptDateObj);
                        const diffDays = Math.round((aptDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays === 0) relativeLabel = "Today";
                        else if (diffDays === 1) relativeLabel = "Tomorrow";
                        else if (diffDays > 1) relativeLabel = `In ${diffDays} days`;
                        else if (diffDays === -1) relativeLabel = "Yesterday";
                        else if (diffDays < -1) relativeLabel = `${Math.abs(diffDays)}d ago`;
                      }
                    } catch {}
                  }

                  return (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-primary/8 via-primary/[0.03] to-transparent border border-primary/25 space-y-2 shadow-2xs">
                      {/* Pet profile, appointment date, and relative badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <PetAvatar
                              photoUrl={nextAptPet?.photo_url}
                              species={nextAptPet?.species}
                              name={nextAptPetName}
                              size="sm"
                              className="size-9 shadow-xs ring-2 ring-primary/20 ring-offset-1 ring-offset-background"
                            />
                          </div>
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-xs sm:text-[13px] text-foreground truncate">
                                {nextAptPetName}
                              </h4>
                              {(nextApt.service_type || nextApt.serviceType) && (
                                <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 truncate">
                                  {nextApt.service_type || nextApt.serviceType}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                              <Calendar className="size-3 shrink-0 text-primary" />
                              <span>{formattedDate}</span>
                            </p>
                          </div>
                        </div>

                        {relativeLabel && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                              isAptToday
                                ? "bg-emerald-600 text-white border-transparent shadow-2xs"
                                : relativeLabel === "Tomorrow"
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-muted/60 text-muted-foreground border-border/60"
                            )}
                          >
                            {relativeLabel}
                          </Badge>
                        )}
                      </div>

                      {/* Action button */}
                      <div className="space-y-1.5">
                        {isAptToday && (() => {
                          const aptTicket = todayQueueState?.activeTickets?.find(
                            (t: any) =>
                              t.appointmentId === nextApt.id ||
                              (t.petName && nextAptPetName && t.petName.toLowerCase().trim() === nextAptPetName.toLowerCase().trim())
                          );

                          if (aptTicket) {
                            const isAptCalled = aptTicket.status === "in-consultation" || todayQueueState?.nowServingTicketNumber === aptTicket.ticketNumber;
                            return (
                              <div className={cn(
                                "p-2 rounded-lg border flex items-center justify-between text-xs",
                                isAptCalled ? "bg-primary/15 border-primary/40 text-primary font-bold animate-pulse" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                              )}>
                                <span className="font-mono font-bold text-[11px]">
                                  {isAptCalled ? `📢 CALLED NOW • ${aptTicket.ticketNumber}` : `Ticket ${aptTicket.ticketNumber} in Queue`}
                                </span>
                                <span className="text-[10px] font-semibold">{aptTicket.consultationRoom || "Desk 1"}</span>
                              </div>
                            );
                          }

                          return (
                            <ScanQueueQrDialog
                              trigger={
                                <Button
                                  size="sm"
                                  className="w-full h-7 text-[10.5px] font-semibold gap-1.5 rounded-lg cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all active:scale-[0.99]"
                                >
                                  <Camera className="size-3" />
                                  <span>Scan Station QR to Join Queue</span>
                                </Button>
                              }
                            />
                          );
                        })()}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAppointmentForSlip(nextApt);
                            setAppointmentSlipOpen(true);
                          }}
                          className="w-full h-7 text-[10.5px] font-semibold gap-1.5 rounded-lg cursor-pointer bg-card hover:bg-muted border-border/80 hover:border-primary/40 shadow-2xs transition-all active:scale-[0.99]"
                        >
                          <Printer className="size-3 text-primary" />
                          <span>View Appointment Slip</span>
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {waitingConsultation && (() => {
                  const waitingPet = pets.find((p) => (waitingConsultation.petId && p.id === waitingConsultation.petId) || (waitingConsultation.petName && p.name.toLowerCase() === waitingConsultation.petName.toLowerCase()));
                  const cDate = (waitingConsultation.date || "").split("T")[0];
                  const isConsultToday = cDate === todayStr;

                  const liveTicket = todayQueueState?.activeTickets?.find(
                    (t: any) =>
                      t.appointmentId === (waitingConsultation.encounterNo || waitingConsultation.id) ||
                      t.encounterNo === waitingConsultation.encounterNo ||
                      (t.petName && waitingConsultation.petName && t.petName.toLowerCase().trim() === waitingConsultation.petName.toLowerCase().trim())
                  );

                  const isCalled = liveTicket && (liveTicket.status === "in-consultation" || todayQueueState?.nowServingTicketNumber === liveTicket.ticketNumber);

                  return (
                    <div className={cn(
                      "p-3 rounded-xl border space-y-2",
                      isCalled
                        ? "bg-primary/15 border-primary/40 ring-1 ring-primary/30 animate-pulse"
                        : liveTicket
                        ? "bg-emerald-500/5 border-emerald-500/25"
                        : "bg-amber-500/5 border-amber-500/20"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {liveTicket ? "Active Clinic Queue" : "Consultation Schedule"}
                        </span>
                        <div className="flex items-center gap-1">
                          {liveTicket ? (
                            <Badge className={cn(
                              "text-[9px] font-mono font-bold gap-1",
                              isCalled ? "bg-primary text-primary-foreground" : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
                            )}>
                              {isCalled ? `📢 CALLED: ${liveTicket.ticketNumber}` : `Ticket ${liveTicket.ticketNumber}`}
                            </Badge>
                          ) : isConsultToday ? (
                            <Badge className="text-[9px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30 gap-1 font-bold">
                              <QrCode className="size-2.5" />
                              Ready • Scan QR
                            </Badge>
                          ) : (
                            <Badge className="text-[9px] bg-primary/10 text-primary border-primary/30 font-bold">
                              Scheduled ({cDate})
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setConsultationToDelete(waitingConsultation);
                              setDeleteConsultationOpen(true);
                            }}
                            className="size-5.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-md p-0"
                            title="Cancel or delete consultation request"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="shrink-0 mt-0.5">
                          <PetAvatar
                            photoUrl={waitingPet?.photo_url}
                            species={waitingPet?.species || waitingConsultation.species}
                            name={waitingConsultation.petName}
                            size="sm"
                            className="size-10 shadow-xs"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-bold text-foreground truncate">
                            {waitingConsultation.petName} — {waitingConsultation.serviceType}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {liveTicket?.status === "in-consultation"
                              ? `Please proceed to ${liveTicket.consultationRoom || "Desk 1"}`
                              : waitingConsultation.chiefComplaint || "Clinical Consultation"}
                          </p>
                        </div>
                      </div>

                      {/* If today and not yet checked in, provide direct scan button */}
                      {isConsultToday && !liveTicket && (
                        <ScanQueueQrDialog
                          trigger={
                            <Button
                              size="sm"
                              className="w-full h-7 text-[10.5px] font-semibold gap-1.5 rounded-lg cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs mt-1"
                            >
                              <Camera className="size-3" />
                              <span>Scan Reception QR to Enter Queue</span>
                            </Button>
                          }
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* CVO Municipal Clinic Services & Hours */}
      <CVOClinicInfoCard
        isStaff={isStaff}
        currentUserRole={userRole}
        showQuotas={false}
        hideEmergency={true}
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
          onClick={handleOpenBiteProtocol}
          className="w-full h-7.5 text-xs font-bold border-amber-500/30 hover:bg-amber-500/15 text-amber-800 dark:text-amber-200 rounded-xl cursor-pointer"
        >
          <span>Open Full Bite Protocol</span>
          <ArrowRight className="size-3.5 ml-1" />
        </Button>
      </Card>
    </div>
  </div>


      {/* ── Pet Information & Digital Health Passport Modal ── */}
      <Dialog
        open={petInfoOpen}
        onOpenChange={(open) => {
          setPetInfoOpen(open);
          if (!open) {
            setShowAvatarPickerPanel(false);
            setShowEditPetPanel(false);
            setActiveProfileTab("overview");
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "w-[calc(100vw-1.5rem)] sm:w-full p-0 bg-transparent border-0 shadow-none transition-all duration-300 ease-in-out h-[92vh] max-h-[92vh] flex flex-col overflow-x-hidden",
            showAvatarPickerPanel || showEditPetPanel
              ? "max-w-5xl sm:max-w-5xl"
              : activeProfileTab !== "overview"
              ? "max-w-4xl sm:max-w-4xl"
              : "max-w-3xl sm:max-w-3xl"
          )}
        >
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

            const petUpcomingAppointments = ownerAppointments.filter((a: any) => {
              const matches =
                (a.pet_id && a.pet_id.toLowerCase() === pet.id.toLowerCase()) ||
                (a.pet_name && a.pet_name.toLowerCase() === pet.name.toLowerCase());
              if (!matches) return false;
              return (
                a.status !== "cancelled" &&
                a.status !== "completed" &&
                a.status !== "missed" &&
                !isConsultationOverdue(a.appointment_date || a.date, a.status)
              );
            });

            const petActiveConsultations = ownerConsultations.filter((c: any) => {
              const matches = (c.petId && c.petId.toLowerCase() === pet.id.toLowerCase()) ||
                (c.petName && c.petName.toLowerCase() === pet.name.toLowerCase());
              if (!matches) return false;
              const isOverdue = isConsultationOverdue(c.date, c.status);
              return (c.status === "waiting" || c.status === "in-consultation" || c.status === "treatment") && !isOverdue;
            });

            const petHistoryConsultations = ownerConsultations.filter((c: any) => {
              const matches = (c.petId && c.petId.toLowerCase() === pet.id.toLowerCase()) ||
                (c.petName && c.petName.toLowerCase() === pet.name.toLowerCase());
              if (!matches) return false;
              const isOverdue = isConsultationOverdue(c.date, c.status);
              return c.status === "completed" || c.status === "cancelled" || isOverdue;
            });

            const availableSpeciesAvatars = isCat ? PET_CAT_AVATARS : PET_DOG_AVATARS;
            const baseBreeds: string[] = isCat ? [...CAT_BREEDS] : [...DOG_BREEDS];
            const breedOptions: string[] = editPetBreed && !baseBreeds.includes(editPetBreed)
              ? [editPetBreed, ...baseBreeds]
              : baseBreeds;

            const currentPetWeight = pet.weightKg != null ? Number(pet.weightKg) : null;
            const parsedEditWeight = parseFloat(editPetWeight);
            const weightChanged = editPetWeight.trim() !== "" && !isNaN(parsedEditWeight) && (currentPetWeight === null || Math.abs(parsedEditWeight - currentPetWeight) > 0.001);
            const hasUnsavedChanges = Boolean(
              editPetName.trim() !== (pet.name || "").trim() ||
              editPetBreed.trim() !== (pet.breed || "").trim() ||
              weightChanged
            );

            return (
              <div className="flex items-stretch gap-1.5 sm:gap-2 w-full h-full min-h-0 flex-1 overflow-hidden">
                {/* Left Side: Pet Info & Passport Card */}
                <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden min-w-0 rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl">
                {/* Header Card with Gradient & Crest (Persistent header for Overview, Passport, Consultation, Procedure) */}
                <div
                  className={cn(
                    "p-3.5 sm:p-5 text-white relative overflow-hidden shrink-0",
                    isCat
                      ? "bg-gradient-to-br from-purple-800 via-indigo-950 to-slate-950"
                      : "bg-gradient-to-br from-emerald-800 via-teal-950 to-slate-950"
                  )}
                >
                  <div className="absolute -bottom-10 -right-10 size-40 bg-white/[0.05] rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.08] rounded-full blur-3xl pointer-events-none" />

                  {/* Top Action Icons: Digital Passport, Request Care, Book Slot, Save, Delete, Close */}
                  <div className="flex items-center justify-end relative z-10 mb-2.5 sm:mb-3 gap-1 sm:gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={async () => {
                        if (activeProfileTab === "passport") {
                          setActiveProfileTab("overview");
                        } else {
                          setSelectedPetForPassport(pet);
                          if (!qrPassportUrl) {
                            try {
                              const publicVerifyUrl = getPassportVerifyUrl(pet);
                              const url = await QRCode.toDataURL(publicVerifyUrl, { width: 360, margin: 1 });
                              setQrPassportUrl(url);
                            } catch {}
                          }
                          setActiveProfileTab("passport");
                          setShowEditPetPanel(false);
                          setShowAvatarPickerPanel(false);
                        }
                      }}
                      className={cn(
                        "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                        activeProfileTab === "passport"
                          ? "bg-white/30 text-white border-white/60 ring-2 ring-white/40 shadow-md scale-105"
                          : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                      )}
                      title={activeProfileTab === "passport" ? "Close Digital Health Passport" : "Official Digital Health Passport"}
                    >
                      <QrCode className="size-4 text-white" />
                      <span className="sr-only">Official Digital Health Passport</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeProfileTab === "consultation") {
                          setActiveProfileTab("overview");
                        } else {
                          setActiveProfileTab("consultation");
                          setShowEditPetPanel(false);
                          setShowAvatarPickerPanel(false);
                        }
                      }}
                      className={cn(
                        "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                        activeProfileTab === "consultation"
                          ? "bg-white/30 text-white border-white/60 ring-2 ring-white/40 shadow-md scale-105"
                          : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                      )}
                      title={activeProfileTab === "consultation" ? "Close Clinical Care View" : "Request Care (Consultation)"}
                    >
                      <Stethoscope className="size-4 text-white" />
                      <span className="sr-only">Request Care</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeProfileTab === "procedure") {
                          setActiveProfileTab("overview");
                        } else {
                          setActiveProfileTab("procedure");
                          setShowEditPetPanel(false);
                          setShowAvatarPickerPanel(false);
                        }
                      }}
                      className={cn(
                        "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                        activeProfileTab === "procedure"
                          ? "bg-white/30 text-white border-white/60 ring-2 ring-white/40 shadow-md scale-105"
                          : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                      )}
                      title={activeProfileTab === "procedure" ? "Close Procedure Booking View" : "Book Slot (Vaccination & Kapon)"}
                    >
                      <Calendar className="size-4 text-white" />
                      <span className="sr-only">Book Slot</span>
                    </button>

                      {/* Save Profile Button */}
                      <button
                        type="button"
                        onClick={handleSavePetUpdates}
                        disabled={savingPetUpdates}
                        className={cn(
                          "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                          hasUnsavedChanges
                            ? "bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-300 ring-2 ring-emerald-400/50 shadow-md animate-pulse"
                            : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                        )}
                        title={hasUnsavedChanges ? "Save profile changes" : "Save Profile"}
                      >
                        {savingPetUpdates ? (
                          <Loader2 className="size-4 animate-spin text-white" />
                        ) : (
                          <Save className="size-4 text-white" />
                        )}
                        <span className="sr-only">Save Profile</span>
                      </button>

                      {/* Delete Pet Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPetToDelete(pet);
                          setDeleteDialogOpen(true);
                          setPetInfoOpen(false);
                        }}
                        className="size-8 rounded-full bg-white/10 hover:bg-rose-600/80 text-white hover:text-white border border-white/20 hover:border-rose-400 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        title="Delete Pet"
                      >
                        <Trash2 className="size-4 text-white" />
                        <span className="sr-only">Delete Pet</span>
                      </button>

                      <DialogClose asChild>
                        <button
                          type="button"
                          className="size-8 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ml-2.5 sm:ml-3"
                          title="Close"
                        >
                          <X className="size-4 text-white" />
                          <span className="sr-only">Close</span>
                        </button>
                      </DialogClose>
                    </div>

                    {/* Hero Identity */}
                    <div className="flex items-center gap-4 relative z-10">
                      <PetAvatar
                        photoUrl={pet.photo_url}
                        species={pet.species}
                        name={pet.name}
                        size="xl"
                      />

                      <div className="space-y-1.5 min-w-0 flex-1">
                        {/* Clean Pet Name with Clickable Edit and Photo Icon Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                            {pet.name}
                          </h2>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowEditPetPanel((prev) => {
                                  const nextState = !prev;
                                  if (nextState) {
                                    setEditPetName(pet.name || "");
                                    setEditPetBreed(pet.breed || "");
                                    setEditPetWeight(pet.weightKg != null ? String(pet.weightKg) : "");
                                  }
                                  return nextState;
                                });
                                setShowAvatarPickerPanel(false);
                              }}
                              className={cn(
                                "size-7 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95",
                                showEditPetPanel
                                  ? "bg-white text-slate-900 border-white shadow-md scale-105"
                                  : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                              )}
                              title={showEditPetPanel ? "Close edit panel" : "Edit Pet Information"}
                            >
                              <Pencil className="size-3.5" />
                              <span className="sr-only">Edit Pet</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowAvatarPickerPanel((prev) => !prev);
                                setShowEditPetPanel(false);
                              }}
                              className={cn(
                                "size-7 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95",
                                showAvatarPickerPanel
                                  ? "bg-white text-slate-900 border-white shadow-md scale-105"
                                  : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                              )}
                              title={showAvatarPickerPanel ? "Close photo panel" : "Change Profile Picture"}
                            >
                              <ImageIcon className="size-3.5" />
                              <span className="sr-only">Change Profile Picture</span>
                            </button>
                          </div>
                        </div>

                        {/* Basic Info Line */}
                        <p className="text-xs text-white/90 font-medium flex items-center gap-1.5 flex-wrap">
                          <span>{pet.breed || pet.species}</span>
                          <span className="text-white/40">•</span>
                          <span>{pet.gender === "Female" ? "Female ♀" : "Male ♂"}</span>
                          <span className="text-white/40">•</span>
                          <span>{pet.age}</span>
                          {pet.weightKg && (
                            <>
                              <span className="text-white/40">•</span>
                              <span className="font-semibold text-white">{pet.weightKg} kg</span>
                            </>
                          )}
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

                {/* Content Area */}
                <div className={cn(
                  "flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain",
                  activeProfileTab !== "overview" ? "p-3 sm:p-3.5 space-y-2" : "p-3 sm:p-4 space-y-3"
                )}>
                  {activeProfileTab === "overview" && (
                    <>
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

                      {/* Active Appointments & Consultations for this pet */}
                      {(petUpcomingAppointments.length > 0 || petActiveConsultations.length > 0) && (
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
                                  <Calendar className="size-3" /> {(apt.date || apt.appointment_date || "").split("T")[0]}
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

                          {petActiveConsultations.map((c: any) => (
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

                      {/* Clinical Encounters & Consultation History for this pet */}
                      {petHistoryConsultations.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Stethoscope className="size-3.5 text-primary" />
                              <span>Clinical Encounters & Consultation History</span>
                            </h4>
                            <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/80">
                              {petHistoryConsultations.length} {petHistoryConsultations.length === 1 ? "Record" : "Records"}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {petHistoryConsultations.map((c: any) => {
                              const isCompleted = c.status === "completed";
                              const isOverdue = isConsultationOverdue(c.date, c.status);

                              return (
                                <div
                                  key={c.id}
                                  className={cn(
                                    "p-3 rounded-xl border space-y-2 transition-all",
                                    isOverdue
                                      ? "bg-rose-500/5 border-rose-500/20"
                                      : isCompleted
                                      ? "bg-emerald-500/5 border-emerald-500/20"
                                      : "bg-muted/30 border-border/70"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-[10.5px] font-bold text-foreground bg-background px-1.5 py-0.5 rounded border border-border/70">
                                        #{c.encounterNo}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[9px] font-bold uppercase tracking-wider gap-1 select-none pointer-events-none",
                                          isOverdue
                                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                            : isCompleted
                                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                            : "bg-muted text-muted-foreground border-border/60"
                                        )}
                                      >
                                        {isOverdue ? (
                                          <>
                                            <AlertCircle className="size-2.5 text-rose-600 dark:text-rose-400" />
                                            Overdue
                                          </>
                                        ) : isCompleted ? (
                                          <>
                                            <CheckCircle2 className="size-2.5 text-emerald-600" />
                                            Completed
                                          </>
                                        ) : (
                                          c.status.toUpperCase()
                                        )}
                                      </Badge>
                                    </div>

                                    <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                      <Calendar className="size-3" />
                                      {c.date} • {c.time || "Intake"}
                                    </span>
                                  </div>

                                  <div className="space-y-1 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-bold text-foreground text-xs">
                                        {c.serviceType || "Clinical Assessment"}
                                      </p>
                                      {c.vetName && (
                                        <span className="text-[10px] text-muted-foreground italic font-serif">
                                          Attending Vet: {c.vetName}
                                        </span>
                                      )}
                                    </div>

                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                      <strong className="text-foreground">Reason:</strong> {c.chiefComplaint || "General checkup"}
                                    </p>

                                    {c.diagnosis && c.diagnosis !== "Pending Clinical Examination" && (
                                      <div className="text-[11px] text-foreground bg-background/80 p-2 rounded-lg border border-border/60 space-y-0.5 mt-1">
                                        <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                                          Official Diagnosis: {c.diagnosis}
                                        </p>
                                        {c.treatment && (
                                          <p className="text-muted-foreground text-[10.5px]">
                                            Treatment: {c.treatment}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedConsultation(c);
                                        setSheetOpen(true);
                                      }}
                                      className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-lg cursor-pointer bg-background hover:bg-muted"
                                    >
                                      <FileText className="size-3 text-primary" />
                                      <span>Official CVO Paper</span>
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Consultation Scheduling View */}
                  {activeProfileTab === "consultation" && (
                    <div className="space-y-3 animate-in fade-in-0 duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-border/70 gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Stethoscope className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                              Request Clinical Care for {pet.name}
                            </h4>
                            <p className="text-[11px] text-muted-foreground truncate">
                              Free consultation, health check-up & symptom diagnosis
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 justify-end w-full sm:w-auto">
                          <Button
                            type="submit"
                            form="pet-owner-consultation-form"
                            disabled={!isConsultationValid}
                            size="sm"
                            className="h-8 text-xs font-bold rounded-lg px-3 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none justify-center"
                          >
                            <ClipboardCheck className="size-3.5" />
                            <span>Submit Request</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveProfileTab("overview")}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                          >
                            Back to Overview
                          </Button>
                        </div>
                      </div>

                      <PetOwnerConsultationDialog
                        embedded
                        pets={pets}
                        initialPet={pet}
                        hidePetSelector
                        ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                        onValidationChange={setIsConsultationValid}
                        onSuccess={() => {
                          setActiveProfileTab("overview");
                          queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
                        }}
                        onCancel={() => setActiveProfileTab("overview")}
                      />
                    </div>
                  )}

                  {/* Procedure Scheduling View */}
                  {activeProfileTab === "procedure" && (
                    <div className="space-y-3 animate-in fade-in-0 duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-border/70 gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Calendar className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                              Book Procedure Slot for {pet.name}
                            </h4>
                            <p className="text-[11px] text-muted-foreground truncate">
                              Live municipal capacity limits for Vaccination & Kapon (Monday – Friday)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 justify-end w-full sm:w-auto">
                          <Button
                            type="submit"
                            form="schedule-procedure-form"
                            disabled={!isProcedureValid}
                            size="sm"
                            className="h-8 text-xs font-bold rounded-lg px-3 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none justify-center"
                          >
                            <Calendar className="size-3.5" />
                            <span>Book Procedure</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveProfileTab("overview")}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                          >
                            Back to Overview
                          </Button>
                        </div>
                      </div>

                      <ScheduleProcedureDialog
                        embedded
                        pets={pets}
                        initialPet={pet}
                        hidePetSelector
                        ownerProfile={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
                        onValidationChange={setIsProcedureValid}
                        onSuccess={() => {
                          setActiveProfileTab("overview");
                          queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
                          queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
                        }}
                        onCancel={() => setActiveProfileTab("overview")}
                      />
                    </div>
                  )}

                  {/* Digital Pet Passport QR View */}
                  {activeProfileTab === "passport" && (
                    <div className="space-y-3 animate-in fade-in-0 duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-border/70 gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <QrCode className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                              Digital Pet Passport for {pet.name}
                            </h4>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Official Cagayan de Oro LGU Companion Animal Identification
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 justify-end w-full sm:w-auto">
                          {/* Download QR Only Icon Button */}
                          <button
                            type="button"
                            onClick={handleDownloadQrOnly}
                            className="size-8 rounded-lg border border-border/70 bg-background hover:bg-muted text-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs active:scale-95"
                            title="Download QR Code (PNG)"
                          >
                            <Download className="size-3.5" />
                            <span className="sr-only">Download QR Code</span>
                          </button>

                          {/* Verify Record Link Icon Button */}
                          <a
                            href={getPassportVerifyUrl(pet)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="size-8 rounded-lg border border-border/70 bg-background hover:bg-muted text-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs active:scale-95"
                            title="Verify Medical Record"
                          >
                            <ExternalLink className="size-3.5" />
                            <span className="sr-only">Verify Record</span>
                          </a>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveProfileTab("overview")}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                          >
                            Back to Overview
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border border-border/70 bg-card/60 shadow-2xs space-y-3 text-center">
                        {qrPassportUrl && (
                          <div className="p-3 bg-white rounded-2xl border-2 border-primary/20 shadow-sm transition-transform hover:scale-102">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrPassportUrl} alt="Pet Passport QR Code" className="size-44 sm:size-48" />
                          </div>
                        )}

                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30 bg-primary/5 px-2.5 py-0.5">
                            Tag ID: #{cdoPassportId}
                          </Badge>
                          <p className="text-xs text-muted-foreground font-medium pt-0.5">
                            {pet.name} • {pet.species} • {pet.breed || "Standard"}
                          </p>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-sm">
                          Present this official QR passport during mobile vaccination drives, spay/neuter outreach, or CVO clinic visits for instant medical history retrieval.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Expanded Pet Avatar Selector Panel (Strictly matching species, 4 Columns) */}
              {showAvatarPickerPanel && (
                <div className="w-[340px] sm:w-[390px] md:w-[430px] rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl flex flex-col h-full min-h-0 shrink-0 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-right-8 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                  {/* Panel Header */}
                  <div className="p-3.5 px-4 border-b border-border/70 flex items-center justify-between bg-muted/40 shrink-0">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Camera className="size-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground truncate">
                          Choose Photo
                        </h3>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {isCat ? "Feline Profiles Only" : "Canine Profiles Only"} • {pet.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAvatarPickerPanel(false)}
                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors"
                      title="Close photo selector"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Avatars Grid (4 Columns, Smooth Scrolling) */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 max-h-[calc(92vh-75px)]">
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 flex items-center justify-between text-xs">
                      <span className="text-[10.5px] font-medium text-muted-foreground">
                        {isCat ? "Cats only choose cat profiles" : "Dogs only choose dog profiles"}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                        {availableSpeciesAvatars.length} Avatars
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {availableSpeciesAvatars.map((avatar) => {
                        const isSelected = pet.photo_url === avatar.url;
                        return (
                          <button
                            key={avatar.id}
                            type="button"
                            disabled={savingPetAvatar}
                            onClick={() => handleDirectAvatarSelect(pet.id, avatar.url, avatar.label)}
                            className={cn(
                              "relative group flex flex-col items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer text-left focus:outline-none",
                              isSelected
                                ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-xs scale-[1.02]"
                                : "border-border/60 bg-muted/20 hover:bg-accent/40 hover:border-border hover:scale-[1.03]"
                            )}
                            title={`Select ${avatar.label}`}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1 z-10 size-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <Check className="size-2.5 stroke-[3]" />
                              </div>
                            )}
                            <div className="size-12 sm:size-13 flex items-center justify-center p-0.5">
                              <PetAvatar
                                photoUrl={avatar.url}
                                species={pet.species}
                                name={avatar.label}
                                size="sm"
                              />
                            </div>
                            <span
                              className={cn(
                                "mt-1 text-[8.5px] sm:text-[9px] font-medium text-center truncate w-full px-0.5 leading-tight",
                                isSelected ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
                              )}
                            >
                              {avatar.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Right Side: Edit Pet Information Panel */}
              {showEditPetPanel && (
                <div className="w-[320px] sm:w-[360px] md:w-[390px] rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl flex flex-col h-full min-h-0 shrink-0 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-right-8 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                  {/* Panel Header */}
                  <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/40 shrink-0">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                          <Pencil className="size-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground truncate">
                          Edit Pet Details
                        </h3>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Update basic info for {pet.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEditPetPanel(false)}
                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors"
                      title="Close edit panel"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Form Inputs Area (Compact text inputs) */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                    {/* Pet Name Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                        Pet Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={editPetName}
                        onChange={(e) => setEditPetName(e.target.value)}
                        placeholder="e.g. Bella"
                        className="h-7.5 text-xs px-2.5 rounded-lg"
                      />
                    </div>

                    {/* Breed Dropdown from verified list */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                        <span>Breed</span>
                        <span className="text-[9.5px] text-muted-foreground font-mono">
                          {isCat ? "Feline Breeds" : "Canine Breeds"}
                        </span>
                      </label>
                      <Select value={editPetBreed} onValueChange={setEditPetBreed}>
                        <SelectTrigger className="w-full h-7.5 text-xs px-2.5 rounded-lg">
                          <SelectValue placeholder="Select breed" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {breedOptions.map((b) => (
                            <SelectItem key={b} value={b} className="text-xs">
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Weight Input */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                        <span>Weight</span>
                        <span className="text-[9.5px] text-muted-foreground">in Kilograms (kg)</span>
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="150"
                          value={editPetWeight}
                          onChange={(e) => setEditPetWeight(e.target.value)}
                          placeholder="e.g. 12.4"
                          className="h-7.5 text-xs px-2.5 pr-8 rounded-lg"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground pointer-events-none">
                          kg
                        </span>
                      </div>
                    </div>

                    {/* Non-editable metadata notice */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-foreground">
                        <Lock className="size-3 text-muted-foreground" />
                        <span>Municipal Registration Locks</span>
                      </div>
                      <p className="text-[9.5px] text-muted-foreground leading-relaxed">
                        Species and gender are permanent municipal identification parameters and cannot be altered after registration.
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-2 py-0.5 rounded-md bg-background border text-foreground/80">
                          Species: <strong>{pet.species}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-2 py-0.5 rounded-md bg-background border text-foreground/80">
                          Gender: <strong>{pet.gender === "Female" ? "Female ♀" : "Male ♂"}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Panel Footer Actions */}
                  <div className="p-4 border-t border-border/70 bg-muted/30 flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditPetName(pet.name || "");
                        setEditPetBreed(pet.breed || "");
                        setEditPetWeight(pet.weightKg ? String(pet.weightKg) : "");
                        setShowEditPetPanel(false);
                      }}
                      className="flex-1 text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePetUpdates}
                      disabled={savingPetUpdates || !hasUnsavedChanges}
                      className="flex-1 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      {savingPetUpdates ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                      <span>Save Changes</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>

      {/* ── Pet Digital Passport QR Modal (Direct preview fallback) ── */}
      <Dialog open={passportOpen} onOpenChange={setPassportOpen}>
        <DialogContent showCloseButton={false} className="max-w-md p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
          {/* Header Bar with Title, Download Icon, Visit QR Icon, and Close Icon */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 truncate text-foreground">
              <QrCode className="size-4 text-primary shrink-0" />
              <span className="truncate">Digital Pet Passport — {selectedPetForPassport?.name}</span>
            </DialogTitle>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Download Passport Icon Button */}
              <button
                type="button"
                onClick={handleDownloadPassport}
                disabled={downloadingPassport}
                className="size-8 rounded-full border border-border/70 bg-background hover:bg-muted text-foreground hover:text-emerald-600 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                title="Download Passport Slip (PNG)"
              >
                {downloadingPassport ? (
                  <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Download className="size-3.5 text-emerald-600" />
                )}
                <span className="sr-only">Download Passport</span>
              </button>

              {/* Visit Live QR Verification Link Icon Button */}
              <a
                href={selectedPetForPassport ? getPassportVerifyUrl(selectedPetForPassport) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-full border border-border/70 bg-background hover:bg-muted text-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Visit Live QR Verification Link"
              >
                <ExternalLink className="size-3.5 text-primary" />
                <span className="sr-only">Visit Live QR</span>
              </a>

              {/* Close Icon Button */}
              <DialogClose asChild>
                <button
                  type="button"
                  className="size-8 rounded-full border border-border/70 bg-background hover:bg-muted text-foreground hover:text-destructive transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title="Close"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </button>
              </DialogClose>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
            {qrPassportUrl && (
              <div className="p-3 bg-white rounded-2xl border-2 border-primary/20 shadow-sm transition-transform hover:scale-102">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrPassportUrl} alt="Pet Passport QR Code" className="size-48" />
              </div>
            )}
            <div className="space-y-1">
              <h4 className="font-extrabold text-base text-foreground">
                {selectedPetForPassport?.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {selectedPetForPassport?.species} • {selectedPetForPassport?.breed || "Standard"}
              </p>
              <p className="text-xs font-mono text-primary font-bold mt-1">
                Tag ID: #{selectedPetForPassport?.microchip && !selectedPetForPassport.microchip.startsWith("pet-")
                  ? selectedPetForPassport.microchip
                  : `CDO-${selectedPetForPassport?.species === "Cat" ? "FEL" : "CAN"}-${selectedPetForPassport?.id?.replace(/\D/g, "").slice(-4) || selectedPetForPassport?.id?.slice(0, 5).toUpperCase()}`}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs">
              Show this QR code to CVO clinicians during mobile drives or walk-in visits for instant medical history retrieval.
            </p>
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
        onDeleted={() => {
          setTodayQueueState(getDailyQueue());
          queryClient.invalidateQueries({ queryKey: ["cvo_consultations"] });
          queryClient.invalidateQueries({ queryKey: ["user-consultations"] });
        }}
      />

      {/* ── Edit Appointment Dialog (Scheduled Transactions CRUD) ── */}
      <EditAppointmentDialog
        appointment={appointmentToEdit}
        open={editAppointmentOpen}
        onOpenChange={setEditAppointmentOpen}
        onUpdated={() => {
          setTodayQueueState(getDailyQueue());
          queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
          queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
          queryClient.invalidateQueries({ queryKey: ["user-transactions"] });
        }}
      />

      {/* ── Edit Consultation Dialog (Scheduled Transactions CRUD) ── */}
      <EditPetOwnerConsultationDialog
        consultation={consultationToEdit}
        open={editConsultationOpen}
        onOpenChange={setEditConsultationOpen}
        onUpdated={() => {
          setTodayQueueState(getDailyQueue());
          queryClient.invalidateQueries({ queryKey: ["cvo_consultations"] });
          queryClient.invalidateQueries({ queryKey: ["user-consultations"] });
        }}
      />

      {/* ── Procedure Appointment Slip Dialog ── */}
      <ProcedureAppointmentSlipDialog
        open={appointmentSlipOpen}
        onOpenChange={setAppointmentSlipOpen}
        appointment={selectedAppointmentForSlip}
        petDetails={selectedAppointmentForSlip?.pets || pets.find((p) => (selectedAppointmentForSlip?.pet_id && p.id === selectedAppointmentForSlip.pet_id) || (selectedAppointmentForSlip?.pet_name && p.name.toLowerCase() === selectedAppointmentForSlip.pet_name.toLowerCase()))}
        ownerDetails={{ name: ownerName, contact: ownerContact, barangay: ownerBarangay }}
      />

      {/* ── Pet Avatar Picker Dialog ── */}
      <PetAvatarPickerDialog
        open={avatarPickerOpen}
        onOpenChange={setAvatarPickerOpen}
        petId={avatarPickerPet?.id}
        petName={avatarPickerPet?.name}
        species={avatarPickerPet?.species}
        breed={avatarPickerPet?.breed}
        currentPhotoUrl={avatarPickerPet?.photo_url}
        onSelectAvatar={(url) => {
          if (selectedPetForInfo && selectedPetForInfo.id === avatarPickerPet?.id) {
            setSelectedPetForInfo((prev: any) => ({ ...prev, photo_url: url }));
          }
        }}
      />

      {/* ── Official Consultation Sheet Dialog (Nested Topmost Modal) ── */}
      <OfficialConsultationSheetDialog
        consultation={selectedConsultation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* ── Field Outreach QR Attendance Check-In Dialog ── */}
      <PetOwnerOutreachCheckInDialog
        open={outreachCheckInOpen}
        onOpenChange={setOutreachCheckInOpen}
        scannedData={outreachCheckInScannedData}
        pets={pets}
        ownerName={user?.fullName || "Pet Owner"}
      />

      {/* ── Pet Queue Station QR Check-In Dialog ── */}
      {selectedTxForCheckIn && (
        <PetQueueCheckInDialog
          open={checkInDialogOpen}
          onOpenChange={setCheckInDialogOpen}
          transaction={selectedTxForCheckIn}
          ownerProfile={{
            name: ownerName,
            contact: ownerContact,
            barangay: ownerBarangay,
          }}
          onCheckedIn={() => {
            setTodayQueueState(getDailyQueue());
            queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
            queryClient.invalidateQueries({ queryKey: ["cvo_consultations"] });
          }}
        />
      )}
    </div>
  );
}
