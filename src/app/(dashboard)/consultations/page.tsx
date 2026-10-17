"use client";

import { useState, useMemo } from "react";
import {
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  FileText,
  User,
  MapPin,
  Calendar,
  Pill,
  ClipboardCheck,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { NewConsultationDialog } from "@/components/dashboard/new-consultation-dialog";
import { OfficialConsultationSheetDialog } from "@/components/dashboard/official-consultation-sheet-dialog";
import { ClinicalExaminationDialog } from "@/components/dashboard/clinical-examination-dialog";
import { useCVO } from "@/lib/cvo-context";
import { type CVOConsultation } from "@/data/cvo-store";
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
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";

export default function ConsultationsPage() {
  const { consultations: allConsultations, updateConsultationStatus, activeRoleView } = useCVO();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedConsultation, setSelectedConsultation] = useState<CVOConsultation | null>(null);
  const [officialFormOpen, setOfficialFormOpen] = useState(false);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isPetOwner =
    activeRoleView === "Pet Owner" ||
    (user?.unsafeMetadata as any)?.roleTitle === "Pet Owner" ||
    (user?.unsafeMetadata as any)?.accountType === "pet_owner" ||
    user?.primaryEmailAddress?.emailAddress === "itcgeek03@gmail.com";

  const consultations = useMemo(() => {
    if (!isPetOwner) return allConsultations;
    const userFullName = (user?.fullName || "").toLowerCase();
    const userEmail = (user?.primaryEmailAddress?.emailAddress || "").toLowerCase();

    return allConsultations.filter((c) => {
      const owner = c.ownerName.toLowerCase();
      if (userFullName && owner.includes(userFullName)) return true;
      if (userEmail === "itcgeek03@gmail.com" && (owner.includes("urgentrouse") || owner.includes("kyle"))) return true;
      // Also match by pet names if Kyle Urgentrouse
      if (userEmail === "itcgeek03@gmail.com" && ["kay", "hello", "jazy", "lex"].includes(c.petName.toLowerCase())) return true;
      return false;
    });
  }, [allConsultations, isPetOwner, user]);

  const waitingCount = consultations.filter((c) => c.status === "waiting").length;
  const activeCount = consultations.filter((c) => c.status === "in-consultation" || c.status === "treatment").length;
  const completedCount = consultations.filter((c) => c.status === "completed").length;

  const metrics: PageMetric[] = [
    {
      title: "Today's Consultations",
      value: `${consultations.length}`,
      icon: Stethoscope,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-500",
      badge: "Clinical Walk-ins",
      badgeClass: "text-blue-500 bg-blue-500/10",
      sub: "Free municipal services",
    },
    {
      title: "Waiting in Queue",
      value: `${waitingCount}`,
      icon: Clock,
      gradient: "from-amber-500/5",
      iconClass: "text-amber-500",
      badge: "In Triage",
      badgeClass: "text-amber-500 bg-amber-500/10",
      sub: "Next for vitals/exam",
    },
    {
      title: "In Consultation / Tx",
      value: `${activeCount}`,
      icon: AlertCircle,
      gradient: "from-purple-500/5",
      iconClass: "text-purple-500",
      badge: "Active Encounters",
      badgeClass: "text-purple-500 bg-purple-500/10",
      sub: "Exam & treatment rooms",
    },
    {
      title: "Completed Encounters",
      value: `${completedCount}`,
      icon: CheckCircle2,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-500",
      badge: "Resolved",
      badgeClass: "text-emerald-500 bg-emerald-500/10",
      sub: "Discharged with RX",
    },
  ];

  const filtered = useMemo(() => {
    return consultations.filter((c) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.encounterNo.toLowerCase().includes(q) ||
        c.petName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.ownerBarangay.toLowerCase().includes(q) ||
        c.diagnosis.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [consultations, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const getStatusBadge = (status: CVOConsultation["status"]) => {
    switch (status) {
      case "in-consultation":
        return <Badge className="text-[10px] bg-blue-500/15 text-blue-500 hover:bg-blue-500/25">In Consultation</Badge>;
      case "treatment":
        return <Badge className="text-[10px] bg-purple-500/15 text-purple-500 hover:bg-purple-500/25">Treatment</Badge>;
      case "completed":
        return <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25">Completed</Badge>;
      case "waiting":
      default:
        return <Badge className="text-[10px] bg-amber-500/15 text-amber-500 hover:bg-amber-500/25">Waiting</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      {/* ── Page Header ── */}
      <PageHeader
        supertitle="Clinical Operations"
        title="Consultations & EMR"
        subtitle={<>Free municipal veterinary consultations, clinical diagnosis, <span className="text-foreground">electronic medical records (EMR)</span>, and treatment encounters for Cagayan de Oro pet owners.</>}
        actions={<NewConsultationDialog />}
      />

      {/* ── Metrics ── */}
      <PageMetricCards metrics={metrics} />

      {/* ── Encounters Table ── */}
      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Clinical Encounters Queue</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/80">
                Live patient queue at the CVO Central Clinic with encounter lifecycle status
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search pet, owner, diagnosis, or encounter #..."
                  className="h-8 w-full sm:w-64 pl-8 text-xs bg-muted/20"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-36 text-xs bg-muted/20">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="in-consultation">In Consultation</SelectItem>
                  <SelectItem value="treatment">Treatment</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Encounter #</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Animal</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Owner / Barangay</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Complaint & Diagnosis</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Vitals</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Attending Vet</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No clinical encounters match the filter.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c, idx) => (
                  <TableRow key={`${c.id}-${idx}`} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground pl-6">
                      {c.encounterNo}
                      <p className="text-[10px] text-muted-foreground/60">{c.time}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-sm text-foreground">{c.petName}</span>
                      <p className="text-xs text-muted-foreground">{c.species} • {c.breed}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium text-foreground">{c.ownerName}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3 text-primary/60" /> {c.ownerBarangay}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="text-xs font-semibold text-foreground truncate">{c.diagnosis}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.chiefComplaint}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.vitals.weightKg} kg • {c.vitals.temperatureC} °C
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.vetName}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(c.status)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isPetOwner && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedConsultation(c);
                              setExamDialogOpen(true);
                            }}
                            className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs font-semibold px-2.5"
                          >
                            <Stethoscope className="size-3.5" /> Examine
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedConsultation(c)}
                          className="h-7 text-xs gap-1 text-primary hover:text-primary cursor-pointer"
                        >
                          <Eye className="size-3.5" /> Details
                        </Button>
                      </div>
                    </TableCell>
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

      {/* ── Consultation EMR Detail Drawer ── */}
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
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedConsultation.encounterNo}
                  </Badge>
                  {getStatusBadge(selectedConsultation.status)}
                </div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  <Stethoscope className="size-5 text-primary" />
                  {selectedConsultation.petName} ({selectedConsultation.species})
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Encounter on {selectedConsultation.date} at {selectedConsultation.time}
                </SheetDescription>
              </SheetHeader>

              {/* Status Update Quick Bar */}
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Update Encounter Lifecycle
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {(["waiting", "in-consultation", "treatment", "completed"] as const).map((st) => (
                    <Button
                      key={st}
                      variant={selectedConsultation.status === st ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[11px] capitalize cursor-pointer"
                      onClick={() => {
                        updateConsultationStatus(selectedConsultation.id, st);
                        setSelectedConsultation({ ...selectedConsultation, status: st });
                      }}
                    >
                      {st.replace("-", " ")}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Veterinary Examination Action Banner */}
              {!isPetOwner && (
                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Stethoscope className="size-4 text-blue-600 dark:text-blue-400" />
                      Veterinarian Clinical Chart
                    </span>
                    {selectedConsultation.diagnosis.toLowerCase().includes("pending") && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                        Exam Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Record vitals, perform the 12-system examination, input medical diagnosis, treatment administered, prescriptions, and follow-up care.
                  </p>
                  <Button
                    size="sm"
                    className="w-full gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                    onClick={() => setExamDialogOpen(true)}
                  >
                    <ClipboardCheck className="size-3.5" />
                    <span>Fill Up Clinical Examination & Findings</span>
                  </Button>
                </div>
              )}

              {/* Owner Info */}
              <div className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-1 text-xs">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" /> Owner Information
                </p>
                <p className="text-muted-foreground">Name: <strong className="text-foreground">{selectedConsultation.ownerName}</strong></p>
                <p className="text-muted-foreground">Contact: {selectedConsultation.ownerContact}</p>
                <p className="text-muted-foreground">Barangay: Barangay {selectedConsultation.ownerBarangay}, Cagayan de Oro City</p>
              </div>

              {/* Clinical Vitals */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/15">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Body Weight</span>
                  <p className="text-sm font-extrabold text-foreground mt-0.5">{selectedConsultation.vitals.weightKg} kg</p>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/15">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Temperature</span>
                  <p className="text-sm font-extrabold text-foreground mt-0.5">{selectedConsultation.vitals.temperatureC} °C</p>
                </div>
              </div>

              {/* Findings */}
              <div className="space-y-3 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Chief Complaint</Label>
                  <p className="mt-0.5 p-2 rounded-md bg-muted/20 border border-border/50 text-foreground font-medium">
                    {selectedConsultation.chiefComplaint}
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Diagnosis</Label>
                  <p className="mt-0.5 p-2 rounded-md bg-muted/20 border border-border/50 text-foreground font-semibold">
                    {selectedConsultation.diagnosis}
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Treatment Administered</Label>
                  <p className="mt-0.5 p-2 rounded-md bg-muted/20 border border-border/50 text-foreground">
                    {selectedConsultation.treatment || "Standard supportive care."}
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Pill className="size-3 text-primary" /> Prescriptions & Instructions
                  </Label>
                  <div className="mt-0.5 p-2.5 rounded-md bg-primary/5 border border-primary/20 space-y-1">
                    <p className="font-semibold text-foreground">{selectedConsultation.medication}</p>
                    <p className="text-muted-foreground">{selectedConsultation.dosageInstructions}</p>
                  </div>
                </div>

                {selectedConsultation.veterinarianNotes && (
                  <div>
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Veterinarian Notes</Label>
                    <p className="mt-0.5 p-2 rounded-md bg-muted/20 border border-border/50 text-muted-foreground italic">
                      {selectedConsultation.veterinarianNotes}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  className="w-full gap-2 text-xs font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs"
                  onClick={() => setOfficialFormOpen(true)}
                >
                  <FileText className="size-3.5" />
                  <span>View Official CVO Field Treatment Form</span>
                </Button>
              </div>

              <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                <span>Attending: <strong>{selectedConsultation.vetName}</strong></span>
                <span>City Veterinary Office — CDO</span>
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
        onSaved={(updated) => setSelectedConsultation(updated)}
      />
    </div>
  );
}
