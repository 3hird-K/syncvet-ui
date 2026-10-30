"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  FileText,
  User,
  MapPin,
  Calendar,
  Pill,
  ClipboardCheck,
  PawPrint,
  Syringe,
  Scissors,
  AlertTriangle,
  CalendarCheck,
  Lock,
  ArrowDown,
  ArrowUp,
  Loader2,
} from "lucide-react";
import { format, parseISO, isValid, isBefore, startOfDay } from "date-fns";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
import { NewConsultationDialog } from "@/components/dashboard/new-consultation-dialog";
import { OfficialConsultationSheetDialog } from "@/components/dashboard/official-consultation-sheet-dialog";
import { ClinicalExaminationDialog } from "@/components/dashboard/clinical-examination-dialog";
import { AdministerVaccinationDialog } from "@/components/dashboard/administer-vaccination-dialog";
import { CompleteSurgeryDialog } from "@/components/dashboard/complete-surgery-dialog";
import { useCVO } from "@/lib/cvo-context";
import { type CVOConsultation } from "@/data/cvo-store";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, isTodayDate } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";

export type QueueCategory = "consultation" | "vaccination" | "spay-neuter";

export interface QueueEncounter extends CVOConsultation {
  category: QueueCategory;
  isOverdue: boolean;
  ownerAvatarUrl?: string;
  vetAvatarUrl?: string;
}

function ConsultationsContent() {
  const { consultations: allConsultations, updateConsultationStatus, activeRoleView, inventory } = useCVO();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const targetEncounterNo = searchParams?.get("encounterNo");
  const targetAction = searchParams?.get("action");
  const targetCategory = searchParams?.get("category");
  const targetPet = searchParams?.get("pet");
  const targetTicket = searchParams?.get("ticket");

  const autoOpenedRef = useRef<string | null>(null);

  const availableVaccineStock = useMemo(() => {
    return (inventory || []).filter((i: any) => i.category === "Vaccines" && i.stock > 0).reduce((sum: number, i: any) => sum + i.stock, 0);
  }, [inventory]);
  const isVaccineOutOfStock = availableVaccineStock <= 0;
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [todayOnly, setTodayOnly] = useState<boolean>(false);
  const [selectedConsultation, setSelectedConsultation] = useState<QueueEncounter | null>(null);
  const [officialFormOpen, setOfficialFormOpen] = useState(false);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [vaxDialogOpen, setVaxDialogOpen] = useState(false);
  const [surgeryDialogOpen, setSurgeryDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const columns = [
    { id: "transaction", label: "Transaction ID & Type", required: true },
    { id: "owner", label: "Owner / Area" },
    { id: "animal", label: "Animal" },
    { id: "service", label: "Service & Diagnosis" },
    { id: "vet", label: "Attending Vet" },
    { id: "status", label: "Status" },
    { id: "date", label: "Schedule Date" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((c) => c.id));
  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const isPetOwner =
    activeRoleView === "Pet Owner" ||
    (user?.unsafeMetadata as any)?.roleTitle === "Pet Owner" ||
    (user?.unsafeMetadata as any)?.accountType === "pet_owner" ||
    user?.primaryEmailAddress?.emailAddress === "itcgeek03@gmail.com";

  // Check if an encounter schedule has passed without completion
  const isItemOverdue = (dateStr?: string, status?: string) => {
    if (!dateStr) return false;
    if (status === "completed" || status === "cancelled") return false;
    try {
      const parsed = parseISO(dateStr);
      if (!isValid(parsed)) return false;
      const todayStart = startOfDay(new Date());
      return isBefore(startOfDay(parsed), todayStart);
    } catch {
      return false;
    }
  };

  // 24-Hour Clinical Finalization Rule:
  // Completed procedures and immunization records can only be updated within 24 hours of administration/completion.
  const get24HourUpdateStatus = (encounter?: QueueEncounter | null) => {
    if (!encounter || encounter.status !== "completed") {
      return { isLockedPast24Hours: false, hoursRemaining: 24, hoursElapsed: 0 };
    }

    let completionTime: number | null = null;

    if (typeof window !== "undefined") {
      try {
        const map = JSON.parse(localStorage.getItem("syncvet_completed_timestamps") || "{}");
        const rawId = encounter.id.replace("proc-", "");
        if (map[rawId]) completionTime = new Date(map[rawId]).getTime();
        else if (map[encounter.id]) completionTime = new Date(map[encounter.id]).getTime();
        else if (map[encounter.encounterNo]) completionTime = new Date(map[encounter.encounterNo]).getTime();
      } catch {}
    }

    if (!completionTime && encounter.date) {
      try {
        const datePart = encounter.date.split("T")[0];
        const timePart = encounter.time || "09:00 AM";
        const parsed = new Date(`${datePart} ${timePart}`);
        if (!isNaN(parsed.getTime())) completionTime = parsed.getTime();
      } catch {}
    }

    if (!completionTime) {
      return { isLockedPast24Hours: false, hoursRemaining: 24, hoursElapsed: 0 };
    }

    const now = Date.now();
    const diffMs = now - completionTime;
    const hoursElapsed = Math.max(0, diffMs / (1000 * 60 * 60));
    const hoursRemaining = Math.max(0, Math.ceil(24 - hoursElapsed));
    const isLockedPast24Hours = hoursElapsed >= 24;

    return { isLockedPast24Hours, hoursRemaining, hoursElapsed };
  };

  // Fetch procedure appointments (Vaccination and Spay & Neuter)
  const { data: dbAppointments = [] } = useQuery({
    queryKey: ["procedure-appointments-queue"],
    queryFn: async () => {
      const supabase = getPublicSupabaseClient();
      const list: any[] = [];
      const seen = new Set<string>();

      // 1. appointments table
      try {
        const { data } = await supabase
          .from("appointments")
          .select("*")
          .order("date", { ascending: false });

        if (data) {
          data.forEach((d) => {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              list.push(d);
            }
          });
        }
      } catch {
        // ignore
      }

      // 2. service_transactions
      try {
        const { data: txData } = await supabase
          .from("service_transactions")
          .select("*")
          .in("transaction_type", ["Vaccination Booking", "Spay & Neuter Booking"])
          .order("date", { ascending: false });

        if (txData) {
          txData.forEach((tx: any) => {
            const refId = tx.reference_id || tx.id;
            if (!seen.has(refId)) {
              seen.add(refId);
              list.push({
                id: refId,
                owner_id: tx.owner_id,
                pet_name: tx.title ? tx.title.replace(/^[^f]+for\s+/i, "") : "Pet",
                service_id: tx.transaction_type === "Vaccination Booking" ? "vaccination" : "spay-neuter",
                date: tx.date ? tx.date.split("T")[0] : "",
                status: tx.status || "confirmed",
                notes: tx.detail || "",
                created_at: tx.created_at,
              });
            }
          });
        }
      } catch {
        // ignore
      }

      // 3. localStorage cache
      try {
        if (typeof window !== "undefined") {
          const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
          local.forEach((l: any) => {
            if (!seen.has(l.id)) {
              seen.add(l.id);
              list.push(l);
            }
          });
        }
      } catch {
        // ignore
      }

      return list;
    },
    refetchInterval: 30000,
  });

  const queryClient = useQueryClient();

  // Supabase Realtime subscription for live appointments and procedure queue
  useEffect(() => {
    const supabase = getPublicSupabaseClient();
    const channel = supabase
      .channel("realtime-consultations-appointments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["procedure-appointments-queue"] });
          queryClient.invalidateQueries({ queryKey: ["consultations-list"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch pets and users for metadata enrichment
  const { data: dbPets = [] } = useQuery({
    queryKey: ["queue-pets"],
    queryFn: async () => {
      try {
        const supabase = getPublicSupabaseClient();
        const { data } = await supabase.from("pets").select("id, name, species, breed, owner_id");
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  const { data: dbUsers = [] } = useQuery({
    queryKey: ["queue-users"],
    queryFn: async () => {
      try {
        const supabase = getPublicSupabaseClient();
        const { data } = await supabase.from("users").select("id, full_name, phone_number, address, email, avatar_url, role");
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  // Query completed vaccination records to accurately link administering vet
  const { data: dbVaccinations = [] } = useQuery({
    queryKey: ["vaccination_records"],
    queryFn: async () => {
      try {
        const supabase = getPublicSupabaseClient();
        const { data } = await supabase
          .from("vaccination_records")
          .select("id, pet_id, pet_name, veterinarian, administered_date, created_at")
          .order("created_at", { ascending: false });
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  // Check if attending vet is recognized (Dr. Helen, or a registered Vet/Admin account)
  const isRecognizedAttendingVet = useCallback(
    (name?: string) => {
      if (!name || !name.trim()) return false;
      const lower = name.toLowerCase().trim();
      if (
        lower.includes("attending cvo") ||
        lower.includes("queue assignment") ||
        lower.includes("cvo duty") ||
        lower.includes("unassigned") ||
        lower.includes("pending") ||
        lower.includes("elena santos")
      ) {
        return false;
      }
      // 1. Dr. Helen Ann P. Tacandong
      if (lower.includes("helen")) return true;

      // 2. Current user if vet or admin
      const currentFullName = user?.fullName?.toLowerCase().trim();
      if (currentFullName && (lower === currentFullName || lower.includes(currentFullName))) {
        return true;
      }

      // 3. Registered Vet or Admin in DB
      return dbUsers.some((u: any) => {
        const uRole = (u.role || "").toLowerCase();
        if (!uRole.includes("vet") && !uRole.includes("admin")) return false;
        const uName = (u.full_name || "").toLowerCase().trim();
        return uName && (uName === lower || lower.includes(uName) || uName.includes(lower));
      });
    },
    [user?.fullName, dbUsers]
  );

  // Consolidate consultations into QueueEncounter[]
  const consultationItems = useMemo<QueueEncounter[]>(() => {
    return allConsultations.map((c) => {
      const matchedUser = dbUsers.find(
        (u: any) =>
          (u.full_name && c.ownerName && u.full_name.trim().toLowerCase() === c.ownerName.trim().toLowerCase()) ||
          u.id === c.ownerContact
      );

      const validVetName = isRecognizedAttendingVet(c.vetName) ? c.vetName : "";

      const matchedVet = dbUsers.find((u: any) => {
        if (!validVetName) return false;
        const uName = (u.full_name || "").toLowerCase().trim();
        const vName = validVetName.toLowerCase().trim();
        return uName === vName || vName.includes(uName) || uName.includes(vName);
      });

      return {
        ...c,
        vetName: validVetName,
        category: "consultation" as const,
        isOverdue: isItemOverdue(c.date, c.status),
        ownerAvatarUrl: matchedUser?.avatar_url,
        vetAvatarUrl: matchedVet?.avatar_url,
      };
    });
  }, [allConsultations, dbUsers, isRecognizedAttendingVet]);

  // Consolidate procedure appointments into QueueEncounter[]
  const appointmentItems = useMemo<QueueEncounter[]>(() => {
    // Read cached assigned vets from localStorage
    let assignedVetsMap: Record<string, string> = {};
    if (typeof window !== "undefined") {
      try {
        assignedVetsMap = JSON.parse(localStorage.getItem("syncvet_assigned_vets") || "{}");
      } catch {}
    }

    return dbAppointments
      .filter((apt: any) => apt.status !== "cancelled")
      .map((apt: any) => {
        const matchedPet = dbPets.find(
          (p: any) =>
            p.id === apt.pet_id ||
            (p.name && apt.pet_name && p.name.trim().toLowerCase() === apt.pet_name.trim().toLowerCase())
        );
        const ownerId = apt.owner_id || matchedPet?.owner_id;
        const matchedUser = dbUsers.find(
          (u: any) =>
            u.id === ownerId ||
            (apt.owner_name && u.full_name && u.full_name.trim().toLowerCase() === apt.owner_name.trim().toLowerCase())
        );

        const isVax =
          apt.service_id === "vaccination" ||
          apt.service_id?.includes("vax") ||
          (apt.notes && apt.notes.toLowerCase().includes("vax"));
        const category: QueueCategory = isVax ? "vaccination" : "spay-neuter";
        const statusMap = apt.status === "completed" ? "completed" : "waiting";

        const petName = apt.pet_name || matchedPet?.name || "Pet";
        const species = (matchedPet?.species as any) || "Dog";
        const breed = matchedPet?.breed || (species === "Cat" ? "Puspin" : "Aspin");
        const ownerName = matchedUser?.full_name || apt.owner_name || "Pet Owner";
        const ownerContact = matchedUser?.phone_number || apt.owner_contact || "N/A";
        const ownerBarangay = matchedUser?.address || apt.owner_barangay || "Carmen";

        const timeStr = apt.time_slot === "afternoon" ? "01:30 PM" : (apt.time || "09:00 AM");
        const encounterNo = apt.appointment_no || `PROC-${String(apt.id).slice(-5).toUpperCase()}`;

        // Determine real attending/administering veterinarian
        const rawId = String(apt.id).replace("proc-", "");
        let resolvedVet = apt.veterinarian || apt.assigned_vet || "";

        // 1. Check local assigned vets map from vaccine/surgery administration
        if (!resolvedVet && assignedVetsMap) {
          resolvedVet =
            assignedVetsMap[rawId] ||
            assignedVetsMap[apt.id] ||
            assignedVetsMap[encounterNo] ||
            (matchedPet?.id ? assignedVetsMap[matchedPet.id] : "") ||
            "";
        }

        // 2. Extract from clinical appointment notes
        if (!resolvedVet && apt.notes) {
          const match = apt.notes.match(
            /(?:Attending|Operating Surgeon|Veterinarian|Administered by):\s*([^.\n\r]+)/i
          );
          if (match && match[1]) {
            resolvedVet = match[1].trim();
          }
        }

        // 3. For vaccination appointments, check completed vaccination_records table
        if (!resolvedVet && isVax && dbVaccinations.length > 0) {
          const vax = dbVaccinations.find(
            (v: any) =>
              (apt.pet_id && v.pet_id === apt.pet_id) ||
              (matchedPet?.id && v.pet_id === matchedPet.id) ||
              (v.pet_name && petName && v.pet_name.trim().toLowerCase() === petName.trim().toLowerCase())
          );
          if (vax?.veterinarian) {
            resolvedVet = vax.veterinarian;
          }
        }

        // 4. Validate attending veterinarian: Only keep if recognized vet (Helen, vet, or admin account)
        if (resolvedVet && !isRecognizedAttendingVet(resolvedVet)) {
          resolvedVet = "";
        }

        // Match vet user to fetch their profile picture/avatar
        const matchedVetUser = dbUsers.find((u: any) => {
          if (!resolvedVet) return false;
          const uName = (u.full_name || "").toLowerCase().trim();
          const vName = resolvedVet.toLowerCase().trim();
          return uName === vName || vName.includes(uName) || uName.includes(vName);
        });

        return {
          id: `proc-${apt.id}`,
          encounterNo,
          petId: apt.pet_id || matchedPet?.id || "",
          petName,
          species,
          breed,
          ownerName,
          ownerContact,
          ownerBarangay,
          ownerAvatarUrl: matchedUser?.avatar_url,
          vetName: resolvedVet,
          vetAvatarUrl: matchedVetUser?.avatar_url,
          date: apt.date || "",
          time: timeStr,
          chiefComplaint:
            category === "vaccination"
              ? "Scheduled Anti-Rabies Vaccination"
              : "Scheduled Spay/Neuter (Kapon)",
          symptoms: [],
          vitals: { weightKg: 0, temperatureC: 0 },
          diagnosis:
            category === "vaccination"
              ? "Anti-Rabies Prophylaxis Protocol"
              : "Elective Gonadectomy / Kapon",
          treatment:
            category === "vaccination"
              ? "Rabies Inactivated Vaccine (1.0 mL SC)"
              : "Pre-anesthetic evaluation & Kapon procedure",
          medication:
            category === "vaccination"
              ? "Rabies Vaccine (Annual Booster)"
              : "Post-op analgesia & antiseptic spray",
          dosageInstructions:
            category === "vaccination"
              ? "Annual municipal booster schedule recommended"
              : "Keep surgical area clean and dry for 7-10 days",
          status: statusMap,
          category,
          isOverdue: isItemOverdue(apt.date, apt.status),
          serviceType: "Field Treatment/Consultation" as const,
          createdAt: apt.created_at || apt.createdAt,
          veterinarianNotes:
            apt.notes ||
            (category === "vaccination"
              ? "Municipal Rabies Eradication Program"
              : "CVO Pet Population Management Campaign"),
        };
      });
  }, [dbAppointments, dbPets, dbUsers, dbVaccinations]);

  // Unified list of all queue items strictly sorted from newest to oldest
  const allUnifiedQueue = useMemo(() => {
    const parseTimeMinutes = (timeStr?: string) => {
      if (!timeStr) return 0;
      const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?/);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridiem = (match[3] || "").toUpperCase();
      if (meridiem === "PM" && h < 12) h += 12;
      if (meridiem === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };

    const getCreatedMs = (item: QueueEncounter) => {
      if (item.createdAt) {
        const t = new Date(item.createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };

    return [...consultationItems, ...appointmentItems].sort((a, b) => {
      // 1. Primary: Compare Schedule Date (newest date first if desc)
      const dateDiff = (b.date || "").localeCompare(a.date || "");
      if (dateDiff !== 0) {
        return sortDirection === "desc" ? dateDiff : -dateDiff;
      }

      // 2. Secondary: If scheduled on the same date, compare creation/booking timestamp (newest created first)
      const createdDiff = getCreatedMs(b) - getCreatedMs(a);
      if (createdDiff !== 0) {
        return sortDirection === "desc" ? createdDiff : -createdDiff;
      }

      // 3. Tertiary: Fallback to scheduled time of day descending
      const timeDiff = parseTimeMinutes(b.time) - parseTimeMinutes(a.time);
      if (timeDiff !== 0) {
        return sortDirection === "desc" ? timeDiff : -timeDiff;
      }

      // 4. Quaternary: Encounter / Transaction number descending
      const idDiff = (b.encounterNo || b.id || "").localeCompare(a.encounterNo || a.id || "");
      return sortDirection === "desc" ? idDiff : -idDiff;
    });
  }, [consultationItems, appointmentItems, sortDirection]);

  // Pet Owner role filtering
  const userFilteredQueue = useMemo(() => {
    if (!isPetOwner) return allUnifiedQueue;
    const userFullName = (user?.fullName || "").toLowerCase();
    const userEmail = (user?.primaryEmailAddress?.emailAddress || "").toLowerCase();

    return allUnifiedQueue.filter((c) => {
      const owner = c.ownerName.toLowerCase();
      if (userFullName && owner.includes(userFullName)) return true;
      if (userEmail === "itcgeek03@gmail.com" && (owner.includes("urgentrouse") || owner.includes("kyle"))) return true;
      if (userEmail === "itcgeek03@gmail.com" && ["kay", "hello", "jazy", "lex", "branny", "tirsodog"].includes(c.petName.toLowerCase())) return true;
      return false;
    });
  }, [allUnifiedQueue, isPetOwner, user]);

  // Auto-open requested encounter from URL parameters (e.g. redirected from Today's Clinic Queue)
  useEffect(() => {
    if (!targetEncounterNo && !targetPet && !targetTicket) return;
    if (allUnifiedQueue.length === 0) return;

    const targetKey = `${targetEncounterNo || ""}-${targetPet || ""}-${targetTicket || ""}-${targetAction || ""}`;
    if (autoOpenedRef.current === targetKey) return;

    const encLower = targetEncounterNo?.toLowerCase().trim();
    const petLower = targetPet?.toLowerCase().trim();
    const ticketLower = targetTicket?.toLowerCase().trim();

    let found = allUnifiedQueue.find((item) => {
      const itemEnc = (item.encounterNo || "").toLowerCase().trim();
      const itemId = (item.id || "").toLowerCase().trim();
      const itemPet = (item.petName || "").toLowerCase().trim();

      if (encLower && (itemEnc === encLower || itemId === encLower || itemId.includes(encLower) || encLower.includes(itemId))) {
        return true;
      }
      if (ticketLower && (itemEnc === ticketLower || itemId === ticketLower)) {
        return true;
      }
      if (petLower && itemPet === petLower) {
        return true;
      }
      return false;
    });

    if (!found && (targetPet || targetEncounterNo)) {
      // Fallback synthetic QueueEncounter so dialog opens immediately
      const cat = (targetCategory as QueueCategory) || "consultation";
      found = {
        id: `enc-${Date.now()}`,
        encounterNo: targetEncounterNo || `ENC-${Date.now().toString().slice(-5)}`,
        petId: "",
        petName: targetPet || "Patient",
        species: "Dog",
        breed: "Aspin",
        ownerName: "Pet Owner",
        ownerContact: "N/A",
        ownerBarangay: "Carmen",
        vetName: "Dr. Helen Ann P. Tacandong, DVM",
        date: format(new Date(), "yyyy-MM-dd"),
        time: format(new Date(), "hh:mm a"),
        chiefComplaint: "Clinical checkup / procedure",
        symptoms: [],
        vitals: { weightKg: 0, temperatureC: 0 },
        diagnosis:
          cat === "vaccination"
            ? "Anti-Rabies Prophylaxis Protocol"
            : cat === "spay-neuter"
            ? "Elective Gonadectomy / Kapon"
            : "Clinical Consultation",
        treatment: "",
        medication: "",
        dosageInstructions: "",
        status: "waiting",
        serviceType: "Field Treatment/Consultation",
        category: cat,
        isOverdue: false,
      };
    }

    if (found) {
      autoOpenedRef.current = targetKey;
      setSelectedConsultation(found);

      if (targetCategory && ["consultation", "vaccination", "spay-neuter"].includes(targetCategory)) {
        setCategoryFilter(targetCategory);
      }

      const cat = found.category || (targetCategory as QueueCategory) || "consultation";
      if (cat === "consultation") {
        setExamDialogOpen(true);
        toast.info(`Opening Clinical Examination form for ${found.petName} (${found.encounterNo})`);
      } else if (cat === "vaccination") {
        setVaxDialogOpen(true);
        toast.info(`Opening Vaccination Administration form for ${found.petName}`);
      } else if (cat === "spay-neuter") {
        setSurgeryDialogOpen(true);
        toast.info(`Opening Surgical Protocol form for ${found.petName}`);
      }
    }
  }, [allUnifiedQueue, targetEncounterNo, targetPet, targetTicket, targetAction, targetCategory]);

  // Helpers to clean and shorten verbose text for compact responsive layout
  const formatEncounterDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) return format(parsed, "MMM d, yyyy");
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const cleanBreed = (breed?: string) => {
    if (!breed) return "";
    return breed.replace(/\s*\([^)]*\)/g, "").trim();
  };

  const cleanBarangay = (b?: string) => {
    if (!b) return "CDO Central";
    const trimmed = b
      .replace(/Cagayan de Oro City/i, "")
      .replace(/^Barangay\s+/i, "Brgy. ")
      .replace(/^,\s*|,\s*$/g, "")
      .trim();
    return trimmed || "CDO Central";
  };

  const cleanVetName = (name?: string) => {
    if (!name || !isRecognizedAttendingVet(name)) return "";
    return name.split(",")[0].trim();
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return "U";
    return name
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // 24-Hour status for currently selected consultation
  const { isLockedPast24Hours, hoursRemaining } = useMemo(
    () => get24HourUpdateStatus(selectedConsultation),
    [selectedConsultation]
  );

  // Metrics
  const todaysItems = useMemo(
    () => userFilteredQueue.filter((c) => isTodayDate(c.date)),
    [userFilteredQueue]
  );
  const overdueCount = useMemo(
    () => userFilteredQueue.filter((c) => c.isOverdue).length,
    [userFilteredQueue]
  );
  const todaysWaitingCount = todaysItems.filter((c) => c.status === "waiting" && !c.isOverdue).length;
  const todaysActiveCount = todaysItems.filter((c) => c.status === "in-consultation" || c.status === "treatment").length;
  const todaysCompletedCount = todaysItems.filter((c) => c.status === "completed").length;

  // Category counts
  const consultationCount = useMemo(() => userFilteredQueue.filter((q) => q.category === "consultation").length, [userFilteredQueue]);
  const vaccinationCount = useMemo(() => userFilteredQueue.filter((q) => q.category === "vaccination").length, [userFilteredQueue]);
  const spayNeuterCount = useMemo(() => userFilteredQueue.filter((q) => q.category === "spay-neuter").length, [userFilteredQueue]);

  const metrics: PageMetric[] = [
    {
      title: "Today's Patient Intake",
      value: `${todaysItems.length}`,
      icon: CalendarCheck,
      gradient: "from-amber-500/5",
      iconClass: "text-amber-500",
      badge: overdueCount > 0 ? `${overdueCount} Past Due` : (todaysItems.length > 0 ? "Active Floor" : "Queue Clear"),
      badgeClass: overdueCount > 0 ? "text-rose-600 bg-rose-500/15" : "text-emerald-500 bg-emerald-500/10",
      sub: todayOnly ? "Showing today only (Click to reset)" : "Click to view today's schedule",
      onClick: () => {
        setTodayOnly((prev) => !prev);
        setPage(1);
      },
    },
    {
      title: "Anti-Rabies Caseload",
      value: `${vaccinationCount}`,
      icon: Syringe,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-500",
      badge: "RA 9482 Mandate",
      badgeClass: "text-blue-600 bg-blue-500/10",
      sub: "Canine & feline rabies immunizations",
    },
    {
      title: "Spay & Neuter (Kapon)",
      value: `${spayNeuterCount}`,
      icon: Scissors,
      gradient: "from-purple-500/5",
      iconClass: "text-purple-500",
      badge: "Sterilization Program",
      badgeClass: "text-purple-600 bg-purple-500/10",
      sub: "Municipal population control surgeries",
    },
    {
      title: "Clinical Consultations (EMR)",
      value: `${consultationCount}`,
      icon: Stethoscope,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-500",
      badge: "General Medicine",
      badgeClass: "text-emerald-600 bg-emerald-500/10",
      sub: "Outpatient exams, diagnosis & Rx",
    },
  ];

  // Filtering
  const filtered = useMemo(() => {
    return userFilteredQueue.filter((c) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.encounterNo.toLowerCase().includes(q) ||
        c.petName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.ownerBarangay.toLowerCase().includes(q) ||
        c.diagnosis.toLowerCase().includes(q);

      const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === "overdue") {
        matchesStatus = c.isOverdue;
      } else if (statusFilter === "all") {
        matchesStatus = true;
      } else if (statusFilter === "waiting") {
        matchesStatus = (c.status === "waiting" || c.status === "in-consultation" || c.status === "treatment") && !c.isOverdue;
      } else {
        matchesStatus = c.status === statusFilter;
      }

      const matchesToday = !todayOnly || isTodayDate(c.date);

      return matchesQuery && matchesCategory && matchesStatus && matchesToday;
    });
  }, [userFilteredQueue, query, categoryFilter, statusFilter, todayOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const getCategoryBadge = (category: QueueCategory) => {
    switch (category) {
      case "vaccination":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
            <Syringe className="size-2.5 shrink-0" /> Anti-Rabies
          </span>
        );
      case "spay-neuter":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
            <Scissors className="size-2.5 shrink-0" /> Kapon
          </span>
        );
      case "consultation":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            <Stethoscope className="size-2.5 shrink-0" /> EMR Consult
          </span>
        );
    }
  };

  const getStatusBadge = (status: CVOConsultation["status"], isOverdue?: boolean) => {
    if (isOverdue) {
      return (
        <Badge className="text-[10px] bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 border-rose-500/30 whitespace-nowrap">
          Overdue
        </Badge>
      );
    }
    switch (status) {
      case "in-consultation":
        return <Badge className="text-[10px] bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 whitespace-nowrap">In Consultation</Badge>;
      case "treatment":
        return <Badge className="text-[10px] bg-purple-500/15 text-purple-500 hover:bg-purple-500/25 whitespace-nowrap">Treatment</Badge>;
      case "completed":
        return <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 whitespace-nowrap">Completed</Badge>;
      case "waiting":
      default:
        return <Badge className="text-[10px] bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 whitespace-nowrap">Waiting</Badge>;
    }
  };

  // Handle status update (for consultations or procedure appointments)
  const handleUpdateStatus = (item: QueueEncounter, newStatus: CVOConsultation["status"]) => {
    if (item.isOverdue) return;

    // Practical Clinical Intercept: Vaccination requires recording batch, dose, & tag
    if (newStatus === "completed" && item.category === "vaccination" && item.status !== "completed") {
      if (isVaccineOutOfStock) {
        toast.error("Vaccination Restricted: Vaccine Out of Stock", {
          description: "There are currently 0 doses of anti-rabies vaccine in cold-chain inventory. Please add or receive stock in Vaccine Inventory before completing this encounter.",
        });
        return;
      }
      setVaxDialogOpen(true);
      return;
    }

    // Practical Clinical Intercept: Kapon requires confirming pre-op fasting, anesthesia, & recovery
    if (newStatus === "completed" && item.category === "spay-neuter" && item.status !== "completed") {
      setSurgeryDialogOpen(true);
      return;
    }

    if (item.status === "completed" && newStatus !== "completed") {
      const { isLockedPast24Hours: locked } = get24HourUpdateStatus(item);
      if (locked) {
        toast.error("Record Finalized", {
          description: "You cannot update this clinical encounter after 24 hours of completion.",
        });
        return;
      }
    }

    if (newStatus === "completed") {
      const nowIso = new Date().toISOString();
      try {
        const compMap = JSON.parse(localStorage.getItem("syncvet_completed_timestamps") || "{}");
        compMap[item.id] = nowIso;
        if (item.id.startsWith("proc-")) {
          compMap[item.id.replace("proc-", "")] = nowIso;
        }
        if (item.encounterNo) compMap[item.encounterNo] = nowIso;
        localStorage.setItem("syncvet_completed_timestamps", JSON.stringify(compMap));
      } catch {}
    }

    if (item.id.startsWith("proc-")) {
      const rawId = item.id.replace("proc-", "");
      const supabase = getPublicSupabaseClient();
      supabase.from("appointments").update({ status: newStatus }).eq("id", rawId).then();
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        const updated = local.map((l: any) => (l.id === rawId ? { ...l, status: newStatus } : l));
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(updated));
      } catch {}
    } else {
      updateConsultationStatus(item.id, newStatus);
    }
    setSelectedConsultation({ ...item, status: newStatus });
  };

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      {/* ── Page Header ── */}
      <PageHeader
        supertitle="Clinical & Preventive Operations"
        title="Clinical Queue & Procedures"
        subtitle={<>Municipal veterinary consultations, clinical diagnosis, <span className="text-foreground">electronic medical records (EMR)</span>, rabies vaccinations, and spay/neuter encounters for Cagayan de Oro pet owners.</>}
        actions={<NewConsultationDialog />}
      />

      {/* ── Metrics ── */}
      <PageMetricCards metrics={metrics} />

      {/* ── Encounters Table ── */}
      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg font-bold">Clinical Encounters & Procedures Queue</CardTitle>
                {todayOnly && (
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold gap-1 py-0.5">
                    <CalendarCheck className="size-3" /> Today's Schedule Only
                  </Badge>
                )}
              </div>
              <CardDescription className="text-[11px] text-muted-foreground/80">
                {todayOnly
                  ? `Showing ${filtered.length} encounter${filtered.length === 1 ? "" : "s"} scheduled for today (${format(new Date(), "MMMM d, yyyy")})`
                  : "Live patient queue at the CVO Central Clinic with categorized encounter and procedure lifecycle"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search pet, owner, diagnosis, or encounter #..."
                  className="h-8 w-full sm:w-56 pl-8 text-xs bg-muted/20"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-xs bg-muted/20">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all" className="text-xs py-1 cursor-pointer">All Categories</SelectItem>
                  <SelectItem value="consultation" className="text-xs py-1 cursor-pointer">EMR Consult</SelectItem>
                  <SelectItem value="vaccination" className="text-xs py-1 cursor-pointer">Vaccination</SelectItem>
                  <SelectItem value="spay-neuter" className="text-xs py-1 cursor-pointer">Spay / Neuter</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-32 text-xs bg-muted/20">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all" className="text-xs py-1 cursor-pointer">All Statuses</SelectItem>
                  <SelectItem value="waiting" className="text-xs py-1 cursor-pointer">Waiting</SelectItem>
                  <SelectItem value="overdue" className="text-xs py-1 cursor-pointer">Overdue</SelectItem>
                  <SelectItem value="completed" className="text-xs py-1 cursor-pointer">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Today's Scheduled Filter Icon Button (Beside Filter) */}
              <Button
                type="button"
                variant={todayOnly ? "default" : "outline"}
                size="icon"
                onClick={() => {
                  setTodayOnly((prev) => !prev);
                  setPage(1);
                }}
                className={cn(
                  "size-8 rounded-lg cursor-pointer transition-all shrink-0",
                  todayOnly
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs border-primary"
                    : "bg-muted/20 hover:bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground"
                )}
                title={todayOnly ? "Showing today's schedule only (Click to show all)" : `Filter today's scheduled (${todaysItems.length} appointments)`}
                aria-label="Filter today's schedule"
              >
                <CalendarCheck className={cn("size-3.5", todayOnly ? "text-primary-foreground" : "text-foreground")} />
                <span className="sr-only">Today's Schedule</span>
              </Button>

              {/* Table Column Filter Icon Button */}
              <TableColumnFilter
                columns={columns}
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {visibleColumns.includes("transaction") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Transaction ID & Type</TableHead>
                )}
                {visibleColumns.includes("owner") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Owner / Area</TableHead>
                )}
                {visibleColumns.includes("animal") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Animal</TableHead>
                )}
                {visibleColumns.includes("service") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Service & Diagnosis</TableHead>
                )}
                {visibleColumns.includes("vet") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Attending Vet</TableHead>
                )}
                {visibleColumns.includes("status") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-center">Status</TableHead>
                )}
                {visibleColumns.includes("date") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right pr-6">
                    <button
                      type="button"
                      onClick={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
                      className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer ml-auto font-bold uppercase tracking-widest group"
                      title={sortDirection === "desc" ? "Sorted: Newest to Oldest (Click to sort Oldest to Newest)" : "Sorted: Oldest to Newest (Click to sort Newest to Oldest)"}
                    >
                      <span>Schedule Date</span>
                      {sortDirection === "desc" ? (
                        <ArrowDown className="size-3 text-primary shrink-0 transition-transform group-hover:translate-y-0.5" />
                      ) : (
                        <ArrowUp className="size-3 text-primary shrink-0 transition-transform group-hover:-translate-y-0.5" />
                      )}
                    </button>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="py-12 text-center text-muted-foreground text-xs space-y-2">
                    <p className="font-semibold text-foreground">
                      {todayOnly
                        ? "No clinical encounters or procedures scheduled for today."
                        : "No clinical encounters or procedure appointments match the selected filter."}
                    </p>
                    {todayOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTodayOnly(false)}
                        className="text-xs h-7 px-2.5 rounded-lg border-border hover:bg-muted cursor-pointer"
                      >
                        Show All Encounters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c, idx) => (
                  <TableRow
                    key={`${c.id}-${idx}`}
                    onClick={() => setSelectedConsultation(c)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    title={`Click to view details for ${c.petName} (${c.encounterNo})`}
                  >
                    {/* 1. Transaction ID & Type */}
                    {visibleColumns.includes("transaction") && (
                      <TableCell className="pl-6 py-3.5 align-middle whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors tracking-tight block">
                            {c.encounterNo}
                          </span>
                          <div>
                            {getCategoryBadge(c.category)}
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* 2. Owner & Barangay (Next to Transaction ID) */}
                    {visibleColumns.includes("owner") && (
                      <TableCell className="py-3 align-middle">
                        <div className="flex items-center gap-2.5 max-w-[160px]">
                          <Avatar className="size-8 shrink-0 border border-border/80 shadow-2xs">
                            {c.ownerAvatarUrl && (
                              <AvatarImage src={c.ownerAvatarUrl} alt={c.ownerName} className="object-cover" />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                              {getInitials(c.ownerName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-xs font-semibold text-foreground truncate" title={c.ownerName}>
                              {c.ownerName}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate" title={c.ownerBarangay}>
                              <MapPin className="size-3 text-primary/60 shrink-0" />
                              <span className="truncate">{cleanBarangay(c.ownerBarangay)}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* 3. Patient / Animal */}
                    {visibleColumns.includes("animal") && (
                      <TableCell className="py-3 align-middle">
                        <div className="flex items-center gap-2 max-w-[150px]">
                          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                            <PawPrint className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors leading-tight truncate">
                              {c.petName}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={`${c.species} • ${c.breed}`}>
                              {c.species} <span className="text-muted-foreground/40">•</span> {cleanBreed(c.breed)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* 4. Complaint & Diagnosis */}
                    {visibleColumns.includes("service") && (
                      <TableCell className="max-w-[170px] py-3 align-middle">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-foreground truncate" title={c.diagnosis}>
                            {c.diagnosis}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate italic" title={c.chiefComplaint}>
                            {c.chiefComplaint || "Routine examination"}
                          </p>
                        </div>
                      </TableCell>
                    )}

                    {/* 5. Attending Veterinarian */}
                    {visibleColumns.includes("vet") && (
                      <TableCell className="py-3 align-middle">
                        {isRecognizedAttendingVet(c.vetName) ? (
                          <div className="flex items-center gap-2 text-xs max-w-[160px]">
                            <div
                              className="size-6 shrink-0 rounded-full bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center border border-primary/25 shadow-2xs"
                              title={cleanVetName(c.vetName)}
                            >
                              <Stethoscope className="size-3" />
                            </div>
                            <span className="font-medium text-foreground truncate" title={c.vetName}>
                              {cleanVetName(c.vetName)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 font-medium select-none">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* 6. Status */}
                    {visibleColumns.includes("status") && (
                      <TableCell className="py-3 align-middle whitespace-nowrap text-center">
                        {getStatusBadge(c.status, c.isOverdue)}
                      </TableCell>
                    )}

                    {/* 7. Schedule Date (Last Column, time removed) */}
                    {visibleColumns.includes("date") && (
                      <TableCell className="py-3.5 align-middle whitespace-nowrap text-right pr-6">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                            <Calendar className="size-3.5 text-muted-foreground/60 shrink-0" />
                            <span>{formatEncounterDate(c.date)}</span>
                            {isTodayDate(c.date) && !c.isOverdue && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/25">
                                Today
                              </span>
                            )}
                          </div>
                          <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            itemLabel="encounters"
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* ── Consultation & Procedure Detail Drawer ── */}
      <Sheet
        open={!!selectedConsultation && !examDialogOpen && !officialFormOpen}
        onOpenChange={(open) => {
          if (!open && !examDialogOpen && !officialFormOpen) {
            setSelectedConsultation(null);
          }
        }}
      >
        <SheetContent className="sm:max-w-[500px] overflow-y-auto p-6">
          {selectedConsultation && (
            <div className="space-y-5">
              <SheetHeader className="p-0 text-left">
                <div className="flex items-center justify-between pr-8">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {selectedConsultation.encounterNo}
                    </Badge>
                    {getCategoryBadge(selectedConsultation.category)}
                  </div>
                  {getStatusBadge(selectedConsultation.status, selectedConsultation.isOverdue)}
                </div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  {selectedConsultation.category === "vaccination" ? (
                    <Syringe className="size-5 text-blue-500" />
                  ) : selectedConsultation.category === "spay-neuter" ? (
                    <Scissors className="size-5 text-purple-500" />
                  ) : (
                    <Stethoscope className="size-5 text-primary" />
                  )}
                  {selectedConsultation.petName} ({selectedConsultation.species})
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {selectedConsultation.category === "vaccination"
                    ? "Anti-Rabies Vaccination Appointment"
                    : selectedConsultation.category === "spay-neuter"
                    ? "Spay / Neuter (Kapon) Procedure"
                    : "Clinical Consultation & EMR Encounter"}{" "}
                  on {formatEncounterDate(selectedConsultation.date)} at {selectedConsultation.time}
                </SheetDescription>
              </SheetHeader>

              {/* Overdue Warning Banner */}
              {selectedConsultation.isOverdue && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>Schedule Overdue — Archived (View Only)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    This scheduled encounter was not processed on its appointed date ({formatEncounterDate(selectedConsultation.date)}). It has been automatically archived in view-only mode to preserve official clinic audit integrity. Editing is disabled.
                  </p>
                </div>
              )}

              {/* Veterinary Examination Action Banner (only for clinical consultations) */}
              {!isPetOwner && selectedConsultation.category === "consultation" && (
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-2",
                  selectedConsultation.isOverdue
                    ? "border-muted bg-muted/20 opacity-60"
                    : "border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/30"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Stethoscope className="size-4 text-blue-600 dark:text-blue-400" />
                      Veterinarian Clinical Chart
                    </span>
                    {selectedConsultation.isOverdue ? (
                      <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                        Locked
                      </Badge>
                    ) : selectedConsultation.diagnosis.toLowerCase().includes("pending") && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                        Exam Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {selectedConsultation.isOverdue
                      ? "Cannot record examination findings for an expired schedule."
                      : "Record vitals, perform the 12-system examination, input medical diagnosis, treatment administered, prescriptions, and follow-up care."}
                  </p>
                  <Button
                    size="sm"
                    disabled={selectedConsultation.isOverdue}
                    className={cn(
                      "w-full gap-2 text-xs font-bold",
                      selectedConsultation.isOverdue
                        ? "cursor-not-allowed opacity-50 bg-muted text-muted-foreground"
                        : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                    )}
                    onClick={() => !selectedConsultation.isOverdue && setExamDialogOpen(true)}
                  >
                    <ClipboardCheck className="size-3.5" />
                    <span>{selectedConsultation.isOverdue ? "Examination Locked (Schedule Due)" : "Fill Up Clinical Examination & Findings"}</span>
                  </Button>
                </div>
              )}

              {/* Anti-Rabies Vaccination Administration Banner */}
              {!isPetOwner && selectedConsultation.category === "vaccination" && (
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-2",
                  selectedConsultation.isOverdue
                    ? "border-muted bg-muted/20 opacity-60"
                    : selectedConsultation.status === "completed"
                    ? (isLockedPast24Hours
                        ? "border-border/80 bg-muted/25"
                        : "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/25")
                    : isVaccineOutOfStock
                    ? "border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/25"
                    : "border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/30"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Syringe className={cn(
                        "size-4",
                        selectedConsultation.status === "completed"
                          ? (isLockedPast24Hours ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400")
                          : isVaccineOutOfStock
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-blue-600 dark:text-blue-400"
                      )} />
                      Anti-Rabies Prophylaxis Protocol
                    </span>
                    {selectedConsultation.isOverdue ? (
                      <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                        Locked
                      </Badge>
                    ) : selectedConsultation.status === "completed" ? (
                      isLockedPast24Hours ? (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border/80 font-bold flex items-center gap-1">
                          <Lock className="size-3" /> Locked (Past 24h)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Dose Administered
                        </Badge>
                      )
                    ) : isVaccineOutOfStock ? (
                      <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold flex items-center gap-1">
                        <AlertTriangle className="size-3" /> Out of Stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold">
                        RA 9482 Ready
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {selectedConsultation.isOverdue
                      ? "Vaccination schedule expired. Rebooking required for cold-chain allocation."
                      : selectedConsultation.status === "completed"
                      ? isLockedPast24Hours
                        ? "Rabies vaccine dose successfully administered. This record has been finalized and cannot be updated after 24 hours pursuant to CVO regulatory audit standards."
                        : "Rabies vaccine dose successfully administered and verified in CVO Immunization Ledger. Pet is protected."
                      : isVaccineOutOfStock
                      ? "Vaccine doses currently unavailable in cold-chain inventory (0 stock). You cannot administer this vaccination until new stock is received or logged in Vaccine Inventory."
                      : "Conduct pre-vaccination clinical triage, verify body temperature & weight, inject 1.0 mL SC dose, issue municipal rabies tag, and schedule annual booster."}
                  </p>

                  {/* 24-Hour Policy Notice Bar when completed */}
                  {selectedConsultation.status === "completed" && !selectedConsultation.isOverdue && (
                    <div className={cn(
                      "flex items-center gap-2 p-2 rounded-lg text-[11px] font-medium border",
                      isLockedPast24Hours
                        ? "bg-muted/40 border-border/70 text-muted-foreground"
                        : "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300"
                    )}>
                      {isLockedPast24Hours ? (
                        <>
                          <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                          <span><strong>Locked:</strong> You cannot update after 24 hours of administration.</span>
                        </>
                      ) : (
                        <>
                          <Clock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span><strong>Notice:</strong> You can review or update this dose record within 24 hours only (<strong>{hoursRemaining}h remaining</strong>). You cannot update after 24 hours.</span>
                        </>
                      )}
                    </div>
                  )}

                  <Button
                    size="sm"
                    disabled={selectedConsultation.isOverdue || isLockedPast24Hours || (isVaccineOutOfStock && selectedConsultation.status !== "completed")}
                    className={cn(
                      "w-full gap-2 text-xs font-bold",
                      selectedConsultation.isOverdue || isLockedPast24Hours || (isVaccineOutOfStock && selectedConsultation.status !== "completed")
                        ? "cursor-not-allowed opacity-50 bg-muted text-muted-foreground"
                        : selectedConsultation.status === "completed"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                        : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                    )}
                    onClick={() => {
                      if (selectedConsultation.isOverdue) return;
                      if (isLockedPast24Hours) {
                        toast.error("Record Finalized", {
                          description: "You cannot update this vaccination record after 24 hours of administration.",
                        });
                        return;
                      }
                      if (isVaccineOutOfStock && selectedConsultation.status !== "completed") {
                        toast.error("Vaccine Out of Stock", {
                          description: "Cannot administer dose. Please receive or log inventory stock in Vaccine Inventory first.",
                        });
                        return;
                      }
                      setVaxDialogOpen(true);
                    }}
                  >
                    {isLockedPast24Hours ? (
                      <Lock className="size-3.5" />
                    ) : (
                      <Syringe className="size-3.5" />
                    )}
                    <span>
                      {selectedConsultation.isOverdue
                        ? "Vaccination Locked"
                        : selectedConsultation.status === "completed"
                        ? isLockedPast24Hours
                          ? "Locked — Cannot Update After 24 Hours"
                          : "Review / Update Vaccine Dose Record"
                        : isVaccineOutOfStock
                        ? "Cannot Administer (Out of Stock)"
                        : "Administer Vaccine & Record Batch / Dose"}
                    </span>
                  </Button>
                </div>
              )}

              {/* Spay & Neuter (Kapon) Surgical Protocol Banner */}
              {!isPetOwner && selectedConsultation.category === "spay-neuter" && (
                <div className={cn(
                  "p-3.5 rounded-xl border space-y-2",
                  selectedConsultation.isOverdue
                    ? "border-muted bg-muted/20 opacity-60"
                    : selectedConsultation.status === "completed"
                    ? (isLockedPast24Hours
                        ? "border-border/80 bg-muted/25"
                        : "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/25")
                    : "border-primary/30 bg-primary/5 dark:bg-primary/10"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Scissors className={cn(
                        "size-4",
                        selectedConsultation.status === "completed"
                          ? (isLockedPast24Hours ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400")
                          : "text-primary"
                      )} />
                      Spay & Neuter (Kapon) Surgical Protocol
                    </span>
                    {selectedConsultation.isOverdue ? (
                      <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                        Locked
                      </Badge>
                    ) : selectedConsultation.status === "completed" ? (
                      isLockedPast24Hours ? (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border/80 font-bold flex items-center gap-1">
                          <Lock className="size-3" /> Locked (Past 24h)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold">
                          Sterilization Complete
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/25 font-bold">
                        Pre-Op Ready
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {selectedConsultation.isOverdue
                      ? "Surgical schedule expired. Pet owner must be contacted to reschedule surgery."
                      : selectedConsultation.status === "completed"
                      ? isLockedPast24Hours
                        ? "Gonadectomy procedure completed. Record is finalized and cannot be updated after 24 hours pursuant to CVO regulatory audit standards."
                        : "Gonadectomy procedure completed under general anesthesia. Pet is officially recorded as sterilized."
                      : "Pre-anesthetic evaluation, gonadectomy surgical procedure, and post-op analgesia protocol."}
                  </p>

                  {/* 24-Hour Policy Notice Bar for Completed Surgery */}
                  {selectedConsultation.status === "completed" && !selectedConsultation.isOverdue && (
                    <div className={cn(
                      "flex items-center gap-2 p-2 rounded-lg text-[11px] font-medium border",
                      isLockedPast24Hours
                        ? "bg-muted/40 border-border/70 text-muted-foreground"
                        : "bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300"
                    )}>
                      {isLockedPast24Hours ? (
                        <>
                          <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                          <span><strong>Locked:</strong> You cannot update after 24 hours of surgery completion.</span>
                        </>
                      ) : (
                        <>
                          <Clock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span><strong>Notice:</strong> Updates allowed within 24 hours only (<strong>{hoursRemaining}h remaining</strong>). You cannot update after 24 hours.</span>
                        </>
                      )}
                    </div>
                  )}

                  <Button
                    size="sm"
                    disabled={selectedConsultation.isOverdue || isLockedPast24Hours}
                    className={cn(
                      "w-full gap-2 text-xs font-bold",
                      selectedConsultation.isOverdue || isLockedPast24Hours
                        ? "cursor-not-allowed opacity-50 bg-muted text-muted-foreground"
                        : selectedConsultation.status === "completed"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
                    )}
                    onClick={() => {
                      if (selectedConsultation.isOverdue) return;
                      if (isLockedPast24Hours) {
                        toast.error("Record Finalized", {
                          description: "You cannot update this surgical record after 24 hours of completion.",
                        });
                        return;
                      }
                      setSurgeryDialogOpen(true);
                    }}
                  >
                    {isLockedPast24Hours ? (
                      <Lock className="size-3.5" />
                    ) : (
                      <Scissors className="size-3.5" />
                    )}
                    <span>
                      {selectedConsultation.isOverdue
                        ? "Surgery Locked"
                        : selectedConsultation.status === "completed"
                        ? isLockedPast24Hours
                          ? "Locked — Cannot Update After 24 Hours"
                          : "Review / Update Surgical Clearance Record"
                        : "Execute Surgery & Complete Kapon"}
                    </span>
                  </Button>
                </div>
              )}

              {/* Owner Info */}
              <div className="p-3.5 rounded-lg border border-border/60 bg-muted/15 text-xs">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10 shrink-0 border border-border/80 shadow-2xs mt-0.5">
                    {selectedConsultation.ownerAvatarUrl && (
                      <AvatarImage src={selectedConsultation.ownerAvatarUrl} alt={selectedConsultation.ownerName} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {getInitials(selectedConsultation.ownerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <User className="size-3.5 text-primary" /> Owner Information
                    </p>
                    <p className="text-muted-foreground truncate">Name: <strong className="text-foreground">{selectedConsultation.ownerName}</strong></p>
                    <p className="text-muted-foreground truncate">Contact: {selectedConsultation.ownerContact}</p>
                    <p className="text-muted-foreground truncate">Barangay: {cleanBarangay(selectedConsultation.ownerBarangay)}, Cagayan de Oro City</p>
                  </div>
                </div>
              </div>

              {/* Findings & Medical Summary */}
              <div className="space-y-3 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {selectedConsultation.category === "consultation" ? "Chief Complaint" : "Procedure Title"}
                  </Label>
                  <p className="mt-0.5 p-2 rounded-md bg-muted/20 border border-border/50 text-foreground font-medium">
                    {selectedConsultation.chiefComplaint}
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {selectedConsultation.category === "consultation" ? "Diagnosis" : "Protocol / Service Category"}
                  </Label>
                  <p className="mt-0.5 p-2 rounded-md bg-muted/20 border border-border/50 text-foreground font-semibold">
                    {selectedConsultation.diagnosis}
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {selectedConsultation.category === "consultation" ? "Treatment Administered" : "Clinical Action"}
                  </Label>
                  <p className="mt-0.5 p-2 rounded-md bg-muted/20 border border-border/50 text-foreground">
                    {selectedConsultation.treatment || "Standard supportive care."}
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Pill className="size-3 text-primary" /> {selectedConsultation.category === "consultation" ? "Prescriptions & Instructions" : "Post-Care Guidelines"}
                  </Label>
                  <div className="mt-0.5 p-2.5 rounded-md bg-primary/5 border border-primary/20 space-y-1">
                    <p className="font-semibold text-foreground">{selectedConsultation.medication}</p>
                    <p className="text-muted-foreground">{selectedConsultation.dosageInstructions}</p>
                  </div>
                </div>

                {selectedConsultation.veterinarianNotes && (
                  <div>
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Veterinarian / Procedure Notes</Label>
                    <p className="mt-0.5 p-2 rounded-md bg-muted/20 border border-border/50 text-muted-foreground italic">
                      {selectedConsultation.veterinarianNotes}
                    </p>
                  </div>
                )}
              </div>

              {selectedConsultation.category === "consultation" && (
                <div className="pt-2">
                  <Button
                    className="w-full gap-2 text-xs font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs"
                    onClick={() => setOfficialFormOpen(true)}
                  >
                    <FileText className="size-3.5" />
                    <span>View Official CVO Field Treatment Form</span>
                  </Button>
                </div>
              )}

              <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate">
                  {isRecognizedAttendingVet(selectedConsultation.vetName) ? (
                    <>
                      <div className="size-5 shrink-0 rounded-full bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center border border-primary/20 shadow-2xs">
                        <Stethoscope className="size-2.5" />
                      </div>
                      Attending: <strong className="text-foreground ml-0.5">{cleanVetName(selectedConsultation.vetName)}</strong>
                    </>
                  ) : (
                    <>
                      Attending: <span className="text-muted-foreground/60 italic ml-0.5">Unassigned</span>
                    </>
                  )}
                </span>
                <span className="shrink-0 text-[11px]">City Veterinary Office — CDO</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <OfficialConsultationSheetDialog
        consultation={selectedConsultation}
        open={officialFormOpen}
        onOpenChange={setOfficialFormOpen}
      />

      <ClinicalExaminationDialog
        consultation={selectedConsultation}
        open={examDialogOpen}
        onOpenChange={setExamDialogOpen}
        onSaved={(updated) => setSelectedConsultation({ ...updated, category: "consultation", isOverdue: isItemOverdue(updated.date, updated.status) })}
      />

      <AdministerVaccinationDialog
        consultation={selectedConsultation}
        open={vaxDialogOpen}
        onOpenChange={setVaxDialogOpen}
        onCompleted={(updated) => setSelectedConsultation(updated)}
      />

      <CompleteSurgeryDialog
        consultation={selectedConsultation}
        open={surgeryDialogOpen}
        onOpenChange={setSurgeryDialogOpen}
        onCompleted={(updated) => setSelectedConsultation(updated)}
      />
    </div>
  );
}

export default function ConsultationsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center p-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <ConsultationsContent />
    </Suspense>
  );
}

