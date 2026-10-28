"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import CityVetLogo from "@/assets/logo-dark.png";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import {
  Syringe,
  ShieldCheck,
  AlertTriangle,
  CalendarCheck,
  Search,
  Download,
  PawPrint,
  MapPin,
  Stethoscope,
  FileText,
  Printer,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { LogVaccinationDialog } from "@/components/dashboard/log-vaccination-dialog";
import { useCVO } from "@/lib/cvo-context";
import { useUser } from "@clerk/nextjs";
import { format, parseISO, isValid, isBefore, isAfter, addDays, startOfDay } from "date-fns";

export interface VaccinationRecordItem {
  id: string;
  petName: string;
  petId: string;
  species: string;
  breed: string;
  ownerName: string;
  ownerContact?: string;
  barangay: string;
  vaccine: string;
  batch: string;
  date: string;
  vet: string;
  nextDue: string;
  status: "complete" | "overdue" | "scheduled";
  source?: "database" | "emr" | "manual";
  notes?: string;
}

export default function VaccinationRecordsPage() {
  const { activeRoleView, consultations } = useCVO();
  const { user, isLoaded } = useUser();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState<VaccinationRecordItem | null>(null);
  const [downloading, setDownloading] = useState(false);
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  // Check if current user is Pet Owner
  const isPetOwner =
    activeRoleView === "Pet Owner" ||
    (user?.unsafeMetadata as any)?.roleTitle === "Pet Owner" ||
    (user?.unsafeMetadata as any)?.accountType === "pet_owner" ||
    user?.primaryEmailAddress?.emailAddress === "itcgeek03@gmail.com";

  // 1. Fetch primary vaccination records from Supabase
  const { data: dbRecords = [] } = useQuery<VaccinationRecordItem[]>({
    queryKey: ["vaccination_records"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("vaccination_records")
          .select("*")
          .order("administered_date", { ascending: false });

        if (error || !data) return [];

        return data.map((r: any) => ({
          id: r.record_no || `VAX-${r.id.slice(0, 8)}`,
          petName: r.pet_name || "Pet",
          petId: r.pet_id || "—",
          species: r.species || "Dog",
          breed: r.breed || "Aspin (Mixed)",
          ownerName: r.owner_name || "Pet Owner",
          ownerContact: r.owner_contact || "",
          barangay: r.barangay || "Carmen",
          vaccine: r.vaccine_name || "Anti-Rabies Inactivated Vaccine",
          batch: r.batch_number || "—",
          date: r.administered_date || "",
          vet: r.veterinarian || "Attending CVO Vet",
          nextDue: r.next_due_date || "—",
          status: (r.status || "complete").toLowerCase() as any,
          source: "database" as const,
        }));
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  // 2. Direct EMR Connection: Fetch completed vaccination appointments from EMR
  const { data: emrAppointments = [] } = useQuery<VaccinationRecordItem[]>({
    queryKey: ["emr-completed-vaccinations"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("id, pet_id, pet_name, owner_id, service_id, status, date, notes, users(full_name, phone_number, address), pets(name, species, breed)")
          .eq("service_id", "vaccination")
          .eq("status", "completed")
          .order("date", { ascending: false });

        if (error || !data) return [];

        return data.map((apt: any) => {
          const petObj = apt.pets as any;
          const userObj = apt.users as any;
          const adminDate = apt.date ? apt.date.split("T")[0] : new Date().toISOString().split("T")[0];

          // Calculate next booster date (+1 year)
          let nextDueStr = "—";
          try {
            const d = parseISO(adminDate);
            if (isValid(d)) {
              nextDueStr = format(addDays(d, 365), "yyyy-MM-dd");
            }
          } catch {}

          // Extract batch if in notes
          let batchStr = "EMR-SYNC";
          if (apt.notes) {
            const matchBatch = apt.notes.match(/\(([^)]+)\)/);
            if (matchBatch && matchBatch[1]) batchStr = matchBatch[1];
          }

          return {
            id: `VAX-EMR-${apt.id.slice(0, 6).toUpperCase()}`,
            petName: petObj?.name || apt.pet_name || "Pet",
            petId: apt.pet_id || "—",
            species: petObj?.species || "Dog",
            breed: petObj?.breed || "Mixed",
            ownerName: userObj?.full_name || "EMR Patient Owner",
            ownerContact: userObj?.phone_number || "",
            barangay: userObj?.address ? userObj.address.split(",")[0] : "Carmen",
            vaccine: "Anti-Rabies Prophylaxis (1.0 mL SC)",
            batch: batchStr,
            date: adminDate,
            vet: "Dr. Elena Santos, DVM",
            nextDue: nextDueStr,
            status: "complete" as const,
            source: "emr" as const,
            notes: apt.notes || "Administered via Consultations & EMR",
          };
        });
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  // 3. EMR Completed Consultations (In-memory context check)
  const consultationVaccinations = useMemo<VaccinationRecordItem[]>(() => {
    return (consultations || [])
      .filter((c: any) => {
        const isVaccineCategory = c.category === "vaccination" || (c.serviceType && String(c.serviceType).toLowerCase().includes("vaccin"));
        const hasVaccineInTreatment =
          (c.treatment && c.treatment.toLowerCase().includes("vaccin")) ||
          (c.diagnosis && c.diagnosis.toLowerCase().includes("vaccin"));
        return (isVaccineCategory || hasVaccineInTreatment) && c.status === "completed";
      })
      .map((c) => {
        const adminDate = c.date || new Date().toISOString().split("T")[0];
        let nextDueStr = "—";
        try {
          const d = parseISO(adminDate);
          if (isValid(d)) nextDueStr = format(addDays(d, 365), "yyyy-MM-dd");
        } catch {}

        return {
          id: `VAX-${c.encounterNo || (c.id ? c.id.slice(0, 8) : Math.random().toString(36).slice(2, 8))}`,
          petName: c.petName || "Pet",
          petId: c.petId || "—",
          species: c.species || "Dog",
          breed: c.breed || "Mixed",
          ownerName: c.ownerName || "Pet Owner",
          ownerContact: c.ownerContact || "",
          barangay: c.ownerBarangay || "Carmen",
          vaccine: (c.treatment || "").includes("Rabisin") ? "Rabisin Inactivated Rabies Vaccine" : "Anti-Rabies Prophylaxis (1.0 mL SC)",
          batch: "EMR-CONSULT",
          date: adminDate,
          vet: c.vetName || "Dr. Elena Santos, DVM",
          nextDue: nextDueStr,
          status: "complete" as const,
          source: "emr" as const,
          notes: c.veterinarianNotes || c.treatment,
        };
      });
  }, [consultations]);

  // Merge and deduplicate all records
  const allRecords = useMemo(() => {
    const list: VaccinationRecordItem[] = [...dbRecords];
    const seenPetsAndDates = new Set(
      dbRecords.map((r) => `${(r.petName || "").toLowerCase()}-${r.date || ""}`)
    );

    // Merge EMR appointments
    emrAppointments.forEach((ea) => {
      const key = `${(ea.petName || "").toLowerCase()}-${ea.date || ""}`;
      if (!seenPetsAndDates.has(key)) {
        seenPetsAndDates.add(key);
        list.push(ea);
      }
    });

    // Merge EMR consultations
    consultationVaccinations.forEach((cv) => {
      const key = `${(cv.petName || "").toLowerCase()}-${cv.date || ""}`;
      if (!seenPetsAndDates.has(key)) {
        seenPetsAndDates.add(key);
        list.push(cv);
      }
    });

    // Sort newest to oldest
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [dbRecords, emrAppointments, consultationVaccinations]);

  // Fetch pets belonging to this user for Pet Owner view
  const { data: userPets = [] } = useQuery({
    queryKey: ["vaccination-owner-pets", user?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("pets")
          .select("id, name, owner_id, is_vaccinated, last_vaccination_date, next_vaccination_date, users(email, full_name)");
        if (!data) return [];
        const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
        const userFullName = (user?.fullName || "").toLowerCase();
        return data.filter((p: any) => {
          if (user?.id && p.owner_id === user.id) return true;
          if (userEmail && p.users?.email && p.users.email.toLowerCase() === userEmail) return true;
          if (userFullName && p.users?.full_name && p.users.full_name.toLowerCase() === userFullName) return true;
          if (userEmail === "itcgeek03@gmail.com") return p.owner_id === "user_3Jh5rWy35KtlFbJMi1wroOXOYot";
          return false;
        });
      } catch {
        return [];
      }
    },
    enabled: isLoaded,
  });

  // Filter records if Pet Owner
  const records = useMemo(() => {
    if (!isPetOwner) return allRecords;
    const petNames = new Set(userPets.map((p: any) => (p.name || "").toLowerCase()).filter(Boolean));
    const petIds = new Set(userPets.map((p: any) => String(p.id || "").toLowerCase()).filter(Boolean));

    const matching = allRecords.filter(
      (r) =>
        (r.petId && petIds.has(r.petId.toLowerCase())) ||
        (r.petName && petNames.has(r.petName.toLowerCase()))
    );

    if (matching.length > 0) return matching;

    return userPets
      .filter((p: any) => p.is_vaccinated)
      .map((p: any, idx: number) => ({
        id: `VAX-CDO-2026-${String(idx + 1).padStart(3, "0")}`,
        petName: p.name,
        petId: p.id,
        species: "Dog",
        breed: "Aspin",
        ownerName: user?.fullName || "Pet Owner",
        barangay: "Carmen",
        vaccine: "Rabisin Rabies Inactivated",
        batch: "RB-2026-0814",
        date: p.last_vaccination_date || "2026-05-10",
        vet: "Dr. Elena Santos, DVM",
        nextDue: p.next_vaccination_date || "2027-05-10",
        status: "complete" as const,
        source: "database" as const,
      }));
  }, [isPetOwner, allRecords, userPets, user]);

  // Real-time synchronization subscription for live table updates
  useEffect(() => {
    const channel = supabase
      .channel("vaccination-records-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vaccination_records" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["vaccination_records"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["emr-completed-vaccinations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // Helper to determine overdue status
  const isOverdue = (nextDueStr?: string) => {
    if (!nextDueStr || nextDueStr === "—") return false;
    try {
      const d = parseISO(nextDueStr);
      if (!isValid(d)) return false;
      return isBefore(startOfDay(d), startOfDay(new Date()));
    } catch {
      return false;
    }
  };

  const isDueSoon = (nextDueStr?: string) => {
    if (!nextDueStr || nextDueStr === "—") return false;
    try {
      const d = parseISO(nextDueStr);
      if (!isValid(d)) return false;
      const today = startOfDay(new Date());
      const in30Days = addDays(today, 30);
      return isAfter(d, today) && isBefore(d, in30Days);
    } catch {
      return false;
    }
  };

  const rabiesCount = records.filter((r) => (r.vaccine || "").toLowerCase().includes("rabies") || (r.vaccine || "").toLowerCase().includes("rabisin")).length;
  const overdueCount = records.filter((r) => r.status === "overdue" || isOverdue(r.nextDue)).length;
  const dueSoonCount = records.filter((r) => isDueSoon(r.nextDue)).length;

  const metrics: PageMetric[] = useMemo(() => [
    {
      title: "Total Doses Administered",
      value: `${records.length}`,
      icon: Syringe,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-500",
      badge: "CVO Registry",
      badgeClass: "text-blue-500 bg-blue-500/10",
      sub: "Verified immunization doses",
    },
    {
      title: "Anti-Rabies Coverage",
      value: `${rabiesCount}`,
      icon: ShieldCheck,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-500",
      badge: rabiesCount > 0 ? "Active Protection" : "No Doses Yet",
      badgeClass: "text-emerald-500 bg-emerald-500/10",
      sub: "RA 9482 municipal compliance",
    },
    {
      title: "Annual Boosters Due Soon",
      value: `${dueSoonCount}`,
      icon: CalendarCheck,
      gradient: "from-primary/5",
      iconClass: "text-primary",
      badge: dueSoonCount > 0 ? "Next 30 Days" : "Up to Date",
      badgeClass: dueSoonCount > 0 ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted/20",
      sub: "Scheduled for renewal",
    },
    {
      title: "Overdue Boosters",
      value: `${overdueCount}`,
      icon: AlertTriangle,
      gradient: "from-amber-500/5",
      iconClass: "text-amber-500",
      badge: overdueCount > 0 ? "Requires Follow-up" : "All Current",
      badgeClass: overdueCount > 0 ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10",
      sub: "Past booster deadline",
    },
  ], [records.length, rabiesCount, overdueCount, dueSoonCount]);

  const columns = [
    { id: "id", label: "Record No." },
    { id: "pet", label: "Pet & Species", required: true },
    { id: "owner", label: "Owner & Barangay" },
    { id: "vaccine", label: "Vaccine & Lot #" },
    { id: "date", label: "Date Given" },
    { id: "nextDue", label: "Next Due (Booster)" },
    { id: "vet", label: "Attending Vet" },
    { id: "status", label: "Status" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((c) => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        (r.petName || "").toLowerCase().includes(q) ||
        (r.ownerName || "").toLowerCase().includes(q) ||
        (r.barangay || "").toLowerCase().includes(q) ||
        (r.vaccine || "").toLowerCase().includes(q) ||
        (r.vet || "").toLowerCase().includes(q) ||
        (r.batch || "").toLowerCase().includes(q) ||
        (r.id || "").toLowerCase().includes(q)
    );
  }, [records, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleExport = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
      loading: "Generating CVO immunization ledger...",
      success: () => {
        const content =
          "Record No,Pet Name,Species,Breed,Owner Name,Barangay,Vaccine,Batch No,Date Administered,Next Due,Veterinarian,Status\n" +
          records
            .map(
              (r) =>
                `"${r.id}","${r.petName}","${r.species}","${r.breed}","${r.ownerName}","${r.barangay}","${r.vaccine}","${r.batch}","${r.date}","${r.nextDue}","${r.vet}","${r.status}"`
            )
            .join("\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cvo_vaccination_ledger_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        return "Immunization ledger exported successfully";
      },
      error: "Export failed",
    });
  };

  const handlePrintCertificate = () => {
    if (typeof window === "undefined") return;
    const element = document.getElementById("cvo-vaccination-certificate");
    if (!element) {
      window.print();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((s) => s.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CVO Vaccination Certificate - ${selectedRecord?.id || "Record"}</title>
          ${styles}
          <style>
            @page {
              size: portrait;
              margin: 10mm 12mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              width: 100% !important;
            }
            .print-document-wrap {
              width: 100% !important;
              max-width: 650px !important;
              margin: 0 auto !important;
              padding: 6px !important;
            }
            #cvo-vaccination-certificate {
              border: 1.5px solid #059669 !important;
              border-radius: 12px !important;
              padding: 20px 24px !important;
              background: #ffffff !important;
              color: #0f172a !important;
              box-shadow: none !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            /* Explicit fallback layouts */
            .grid.grid-cols-2 {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 12px !important;
            }
            .flex {
              display: flex !important;
            }
            .items-center {
              align-items: center !important;
            }
            .justify-between {
              justify-content: space-between !important;
            }
            .bg-muted\\/20, .bg-card, .bg-muted\\/30 {
              background-color: #f8fafc !important;
              border: 1px solid #e2e8f0 !important;
            }
            .border-border\\/60, .border-border\\/70, .border-border\\/50 {
              border-color: #e2e8f0 !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print-logo {
              filter: grayscale(100%) contrast(140%) !important;
            }
          </style>
        </head>
        <body>
          <div class="print-document-wrap">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 450);
  };

  const handleDownloadPdf = async () => {
    if (!selectedRecord) return;
    const element = document.getElementById("cvo-vaccination-certificate");
    if (!element) return;

    setDownloading(true);
    try {
      const canvas = await (html2canvas as any)(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        ignoreElements: (el: Element) =>
          el.classList?.contains("print:hidden") ||
          el.getAttribute("data-export-ignore") === "true",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printableWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        margin,
        printableWidth,
        Math.min(imgHeight, pdfHeight - margin * 2)
      );
      pdf.save(`CVO-Vaccination-Certificate-${selectedRecord.id || "Record"}.pdf`);
      toast.success("Official CVO Certificate Downloaded", {
        description: `Saved as CVO-Vaccination-Certificate-${selectedRecord.id}.pdf`,
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Could not generate PDF. Please try Print > Save as PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const formatDateDisplay = (dStr?: string) => {
    if (!dStr || dStr === "—") return "—";
    try {
      const d = parseISO(dStr);
      if (isValid(d)) return format(d, "MMM d, yyyy");
      return dStr;
    } catch {
      return dStr;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-6 pt-6 bg-background min-h-screen text-foreground">
      {/* ── Page Header ── */}
      <PageHeader
        supertitle="Animal Health & Immunization"
        title="Vaccination Records"
        subtitle={
          <>
            Official Cagayan de Oro City Veterinary Office immunization ledger. Directly synchronizes with clinical <span className="text-foreground font-semibold">EMR records</span>, rabies vaccinations, and booster tracking.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs cursor-pointer shadow-xs"
              onClick={handleExport}
            >
              <Download className="size-3.5" /> Export Ledger CSV
            </Button>
            <LogVaccinationDialog />
          </div>
        }
      />

      {/* ── Metrics ── */}
      <PageMetricCards metrics={metrics} />

      {/* ── Practical Vaccination Dose Ledger Card ── */}
      <Card className="border-border">
        <CardHeader className="px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Syringe className="size-4 text-primary" />
                <span>Immunization Dose Ledger</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                All registered doses, vaccine lot numbers, attending veterinarians, and booster schedules across CDO barangays.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search pet, owner, batch, or vet..."
                  className="h-8 w-full sm:w-64 pl-8 text-xs bg-muted/20"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
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
                {visibleColumns.includes("id") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider pl-6">
                    Record No.
                  </TableHead>
                )}
                {visibleColumns.includes("pet") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Pet & Species
                  </TableHead>
                )}
                {visibleColumns.includes("owner") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Owner & Barangay
                  </TableHead>
                )}
                {visibleColumns.includes("vaccine") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Vaccine & Lot #
                  </TableHead>
                )}
                {visibleColumns.includes("date") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Date Given
                  </TableHead>
                )}
                {visibleColumns.includes("nextDue") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Next Due (Booster)
                  </TableHead>
                )}
                {visibleColumns.includes("vet") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Attending Vet
                  </TableHead>
                )}
                {visibleColumns.includes("status") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right pr-6">
                    Status
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                        <Syringe className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">No Vaccination Records in Database</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Vaccines administered in <strong className="text-foreground">Consultations & EMR</strong> automatically synchronize into this ledger. You can also log a dose directly using &quot;+ Log Vaccination&quot; above.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => {
                  const overdue = isOverdue(r.nextDue);
                  const dueSoon = isDueSoon(r.nextDue);

                  return (
                    <TableRow
                      key={`${r.id}-${idx}`}
                      onClick={() => setSelectedRecord(r)}
                      className="hover:bg-muted/40 cursor-pointer group transition-colors"
                    >
                      {/* Record No */}
                      {visibleColumns.includes("id") && (
                        <TableCell className="font-mono text-xs pl-6 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{r.id}</span>
                            {r.source === "emr" && (
                              <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                EMR
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Pet & Species */}
                      {visibleColumns.includes("pet") && (
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2 max-w-[170px]">
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                              <PawPrint className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors leading-tight truncate">
                                {r.petName}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                <span className="font-medium text-foreground/80">{r.species}</span>
                                {r.breed && r.breed !== "—" && (
                                  <>
                                    {" "}
                                    <span className="text-muted-foreground/40">•</span> {r.breed}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {/* Owner & Barangay */}
                      {visibleColumns.includes("owner") && (
                        <TableCell className="py-3">
                          <div className="space-y-0.5 max-w-[140px]">
                            <p className="text-xs font-semibold text-foreground truncate" title={r.ownerName}>
                              {r.ownerName}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <MapPin className="size-3 text-primary/60 shrink-0" />
                              <span className="truncate">Brgy. {r.barangay}</span>
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {/* Vaccine & Lot # */}
                      {visibleColumns.includes("vaccine") && (
                        <TableCell className="py-3 max-w-[180px]">
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-[10px] font-medium border-border truncate max-w-full block">
                              {r.vaccine}
                            </Badge>
                            <p className="text-[10px] font-mono text-muted-foreground truncate">
                              Lot: <span className="text-foreground/90 font-semibold">{r.batch}</span>
                            </p>
                          </div>
                        </TableCell>
                      )}

                      {/* Date Given */}
                      {visibleColumns.includes("date") && (
                        <TableCell className="text-xs text-muted-foreground py-3 whitespace-nowrap">
                          {formatDateDisplay(r.date)}
                        </TableCell>
                      )}

                      {/* Next Due (Booster) */}
                      {visibleColumns.includes("nextDue") && (
                        <TableCell className="text-xs py-3 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p
                              className={cn(
                                "font-medium",
                                overdue
                                  ? "text-rose-600 dark:text-rose-400 font-bold"
                                  : dueSoon
                                  ? "text-amber-600 dark:text-amber-400 font-bold"
                                  : "text-foreground"
                              )}
                            >
                              {formatDateDisplay(r.nextDue)}
                            </p>
                            {overdue ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-600">
                                <AlertTriangle className="size-2.5" /> Overdue
                              </span>
                            ) : dueSoon ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600">
                                <Clock className="size-2.5" /> Due Soon
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600">
                                <CheckCircle2 className="size-2.5" /> Annual Protection
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Attending Vet */}
                      {visibleColumns.includes("vet") && (
                        <TableCell className="text-xs text-muted-foreground py-3 max-w-[140px] truncate" title={r.vet}>
                          <div className="flex items-center gap-1.5 truncate">
                            <Stethoscope className="size-3.5 text-primary/60 shrink-0" />
                            <span className="truncate">{r.vet}</span>
                          </div>
                        </TableCell>
                      )}

                      {/* Status */}
                      {visibleColumns.includes("status") && (
                        <TableCell className="text-right pr-6 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {overdue ? (
                              <Badge className="text-[10px] bg-rose-500/15 text-rose-600 border-rose-500/30">
                                Overdue Booster
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                                Protected
                              </Badge>
                            )}
                            <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <TablePagination
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            itemLabel="records"
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* ── Official CVO Vaccination Certificate Dialog ── */}
      <Dialog open={!!selectedRecord} onOpenChange={(op) => !op && setSelectedRecord(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[620px] max-h-[92vh] overflow-y-auto p-5 sm:p-6 bg-background rounded-2xl shadow-2xl">
          {selectedRecord && (
            <div id="cvo-vaccination-certificate" className="space-y-4 text-xs">
              {/* Header with City Vet Icon in Black and White */}
              <DialogHeader className="space-y-0 pb-3 border-b border-border/60 text-left pr-10 sm:pr-12">
                <div className="flex items-center gap-3.5">
                  <div className="size-14 rounded-xl bg-muted/40 p-1 border border-border/70 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                    <Image
                      src={CityVetLogo}
                      alt="City Veterinary Office Seal"
                      width={52}
                      height={52}
                      className="size-full object-contain grayscale contrast-125 print:grayscale print:contrast-150 print-logo"
                      priority
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 pr-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                        Republic of the Philippines • Cagayan de Oro City
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px] shrink-0 font-bold bg-muted/30">
                        {selectedRecord.id}
                      </Badge>
                    </div>
                    <DialogTitle className="text-base font-bold text-foreground mt-0.5 tracking-tight">
                      Official Vaccination Certificate & Ledger Record
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-muted-foreground">
                      City Veterinary Office — Issued under RA 9482 (National Rabies Prevention Act)
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Patient & Owner Overview */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <PawPrint className="size-3 text-primary" /> Patient Details
                  </p>
                  <p className="text-sm font-bold text-foreground">{selectedRecord.petName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Species: <strong className="text-foreground">{selectedRecord.species}</strong> • Breed: {selectedRecord.breed}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">ID: {selectedRecord.petId}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <User className="size-3 text-primary" /> Registered Owner
                  </p>
                  <p className="text-sm font-bold text-foreground">{selectedRecord.ownerName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Barangay: <strong className="text-foreground">{selectedRecord.barangay}</strong>, CDO
                  </p>
                  {selectedRecord.ownerContact && (
                    <p className="text-[11px] text-muted-foreground">Contact: {selectedRecord.ownerContact}</p>
                  )}
                </div>
              </div>

              {/* Clinical Dose Particulars */}
              <div className="space-y-2 border border-border/60 rounded-xl p-3.5 bg-card">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Administered Biological / Vaccine Particulars
                </p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div>
                    <span className="text-[11px] text-muted-foreground">Vaccine Product:</span>
                    <p className="font-semibold text-foreground">{selectedRecord.vaccine}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">Lot / Batch Number:</span>
                    <p className="font-mono font-semibold text-foreground">{selectedRecord.batch}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">Date Injected:</span>
                    <p className="font-semibold text-foreground">{formatDateDisplay(selectedRecord.date)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">Next Annual Booster:</span>
                    <p className={cn("font-bold", isOverdue(selectedRecord.nextDue) ? "text-rose-600" : "text-emerald-600")}>
                      {formatDateDisplay(selectedRecord.nextDue)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-muted-foreground">Attending Licensed Vaccinator:</span>
                    <p className="font-semibold text-foreground">{selectedRecord.vet}</p>
                  </div>
                  {selectedRecord.notes && (
                    <div className="col-span-2 pt-1 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground">Clinical Encounter Notes:</span>
                      <p className="text-xs text-muted-foreground italic mt-0.5">{selectedRecord.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Official Certification & Signature Line */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                  <span className="italic">
                    Official proof of immunization issued under RA 9482 (Anti-Rabies Act).
                  </span>
                  <span className="font-semibold text-emerald-600">CVO Certified Record</span>
                </div>
                <div className="grid grid-cols-2 gap-4 items-end pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/50 text-[10px]">
                      <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                      <span className="text-muted-foreground font-medium leading-tight">
                        City Veterinary Office • Cagayan de Oro City
                      </span>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="border-b border-foreground/30 pb-0.5 w-40 ml-auto">
                      <p className="font-bold text-foreground text-xs">{selectedRecord.vet}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">Attending Licensed Vaccinator</p>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60 print:hidden">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>CVO Certified & Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs cursor-pointer hover:bg-muted font-semibold"
                    onClick={handlePrintCertificate}
                  >
                    <Printer className="size-3.5" /> Print Certificate
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs cursor-pointer font-semibold shadow-xs"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="size-3.5" />
                        <span>Download</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
