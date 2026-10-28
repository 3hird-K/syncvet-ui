"use client";

import { useState, useMemo } from "react";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  HeartHandshake,
  Search,
  Eye,
  MapPin,
  Calendar,
  AlertTriangle,
  History,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
import { NewAnimalControlDialog } from "@/components/dashboard/new-animal-control-dialog";
import { useCVO } from "@/lib/cvo-context";
import { type CVOAnimalControlCase } from "@/data/cvo-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

export default function AnimalControlPage() {
  const { animalControlCases, updateAnimalControlStatus } = useCVO();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<CVOAnimalControlCase | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const columns = [
    { id: "caseId", label: "Case ID", required: true },
    { id: "animal", label: "Animal Description" },
    { id: "location", label: "Barangay & Location" },
    { id: "reason", label: "Reason" },
    { id: "holding", label: "Holding Period" },
    { id: "date", label: "Intake Date" },
    { id: "status", label: "Status" },
    { id: "action", label: "Action" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((c) => c.id));
  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const impoundedCount = animalControlCases.filter((c) => c.status === "impounded").length;
  const claimedCount = animalControlCases.filter((c) => c.status === "claimed").length;
  const adoptedCount = animalControlCases.filter((c) => c.status === "adopted").length;
  const biteObservationCount = animalControlCases.filter((c) => c.reason.includes("Bite") && c.status === "impounded").length;

  const metrics: PageMetric[] = [
    {
      title: "Currently Impounded",
      value: `${impoundedCount}`,
      icon: ShieldAlert,
      gradient: "from-amber-500/5",
      iconClass: "text-amber-500",
      badge: "In Holding",
      badgeClass: "text-amber-500 bg-amber-500/10",
      sub: "CVO Agusan facility",
    },
    {
      title: "Rabies Bite Quarantine",
      value: `${biteObservationCount}`,
      icon: AlertTriangle,
      gradient: "from-red-500/5",
      iconClass: "text-red-500",
      badge: "14-Day Protocol",
      badgeClass: "text-red-500 bg-red-500/10",
      sub: "Bite case observation",
    },
    {
      title: "Owner Redemptions",
      value: `${claimedCount}`,
      icon: UserCheck,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-500",
      badge: "Claimed & Fined",
      badgeClass: "text-blue-500 bg-blue-500/10",
      sub: "Reunited with families",
    },
    {
      title: "Adoptions Completed",
      value: `${adoptedCount}`,
      icon: HeartHandshake,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-500",
      badge: "Rehomed",
      badgeClass: "text-emerald-500 bg-emerald-500/10",
      sub: "Adoption program",
    },
  ];

  const filtered = useMemo(() => {
    return animalControlCases.filter((c) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        c.caseId.toLowerCase().includes(q) ||
        c.barangay.toLowerCase().includes(q) ||
        c.specificLocation.toLowerCase().includes(q) ||
        c.animalDescription.toLowerCase().includes(q) ||
        c.reason.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [animalControlCases, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const getStatusBadge = (status: CVOAnimalControlCase["status"]) => {
    switch (status) {
      case "impounded":
        return <Badge className="text-[10px] bg-amber-500/15 text-amber-500 hover:bg-amber-500/25">IMPOUNDED</Badge>;
      case "claimed":
        return <Badge className="text-[10px] bg-blue-500/15 text-blue-500 hover:bg-blue-500/25">CLAIMED</Badge>;
      case "adopted":
        return <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25">ADOPTED</Badge>;
      case "released":
        return <Badge className="text-[10px] bg-purple-500/15 text-purple-500">RELEASED</Badge>;
      case "closed":
      default:
        return <Badge variant="secondary" className="text-[10px] text-muted-foreground">CLOSED</Badge>;
    }
  };

  const handleUpdateStatus = (caseId: string, st: CVOAnimalControlCase["status"]) => {
    updateAnimalControlStatus(caseId, st);
    if (selectedCase) {
      setSelectedCase({
        ...selectedCase,
        status: st,
        timeline: [
          ...selectedCase.timeline,
          {
            timestamp: new Intl.DateTimeFormat("en-PH", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date()),
            stage: `Status updated to ${st.toUpperCase()}`,
            officer: "CVO Animal Welfare Division",
            notes: `Case status marked as ${st}.`,
          },
        ],
      });
    }
    toast.success("Case Status Updated", {
      description: `Case ${caseId} updated to ${st.toUpperCase()}.`,
    });
  };

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      {/* ── Page Header ── */}
      <PageHeader
        supertitle="Animal Control & Regulatory"
        title="Animal Control & Impound"
        subtitle={<>Municipal stray animal apprehension, humane intake, <span className="text-foreground">rabies quarantine observation</span>, owner redemptions, and community adoption programs.</>}
        actions={<NewAnimalControlDialog />}
      />

      {/* ── Metrics ── */}
      <PageMetricCards metrics={metrics} />

      {/* ── Table Card ── */}
      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Impound & Quarantine Case Registry</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/80">
                Official animal welfare intake registry at the CVO Impounding Facility (Barangay Agusan)
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search case #, location, description, or reason..."
                  className="h-8 w-full sm:w-64 pl-8 text-xs bg-muted/20"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-32 text-xs bg-muted/20">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="impounded">Impounded</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="adopted">Adopted</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                </SelectContent>
              </Select>

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
              <TableRow>
                {visibleColumns.includes("caseId") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Case ID</TableHead>
                )}
                {visibleColumns.includes("animal") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Animal Description</TableHead>
                )}
                {visibleColumns.includes("location") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Barangay & Location</TableHead>
                )}
                {visibleColumns.includes("reason") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Reason</TableHead>
                )}
                {visibleColumns.includes("holding") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Holding Period</TableHead>
                )}
                {visibleColumns.includes("date") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Intake Date</TableHead>
                )}
                {visibleColumns.includes("status") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                )}
                {visibleColumns.includes("action") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right pr-6">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="py-8 text-center text-muted-foreground">
                    No animal control cases match the filter.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c, idx) => (
                  <TableRow key={`${c.caseId}-${idx}`} className="hover:bg-muted/50">
                    {visibleColumns.includes("caseId") && (
                      <TableCell className="font-mono text-xs font-bold text-foreground pl-6">
                        {c.caseId}
                      </TableCell>
                    )}
                    {visibleColumns.includes("animal") && (
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] py-0">{c.species}</Badge>
                          <span className="text-xs font-medium text-foreground truncate">{c.breedEstimate}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{c.animalDescription}</p>
                      </TableCell>
                    )}
                    {visibleColumns.includes("location") && (
                      <TableCell>
                        <p className="text-xs font-medium text-foreground">Barangay {c.barangay}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{c.specificLocation}</p>
                      </TableCell>
                    )}
                    {visibleColumns.includes("reason") && (
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            c.reason.includes("Bite")
                              ? "border-red-500/30 text-red-500 bg-red-500/10"
                              : "border-border"
                          }`}
                        >
                          {c.reason}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("holding") && (
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">Day {c.holdingDaysElapsed}</span> of {c.maxHoldingDays}
                      </TableCell>
                    )}
                    {visibleColumns.includes("date") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {c.dateCaptured}
                      </TableCell>
                    )}
                    {visibleColumns.includes("status") && (
                      <TableCell>
                        {getStatusBadge(c.status)}
                      </TableCell>
                    )}
                    {visibleColumns.includes("action") && (
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCase(c)}
                          className="h-7 text-xs gap-1 text-primary hover:text-primary cursor-pointer"
                        >
                          <Eye className="size-3.5" /> Case Details
                        </Button>
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
            itemLabel="cases"
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* ── Case Timeline & Detail Drawer ── */}
      <Sheet open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto p-6">
          {selectedCase && (
            <div className="space-y-5">
              <SheetHeader className="p-0 text-left">
                <div className="flex items-center justify-between pr-8">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedCase.caseId}
                  </Badge>
                  {getStatusBadge(selectedCase.status)}
                </div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  <ShieldAlert className="size-5 text-amber-500" />
                  {selectedCase.species} Intake Record
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Captured at {selectedCase.specificLocation}, Brgy. {selectedCase.barangay}
                </SheetDescription>
              </SheetHeader>

              {/* Status Action Buttons */}
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Update Animal Case Outcome
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {(["impounded", "claimed", "adopted", "released", "closed"] as const).map((st) => (
                    <Button
                      key={st}
                      variant={selectedCase.status === st ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-[11px] capitalize cursor-pointer"
                      onClick={() => handleUpdateStatus(selectedCase.caseId, st)}
                    >
                      {st}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Animal Overview */}
              <div className="p-3.5 rounded-lg border border-border/60 bg-muted/15 space-y-2 text-xs">
                <p className="font-bold text-foreground">Animal Profile</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Species & Breed</span>
                    <strong>{selectedCase.species} • {selectedCase.breedEstimate}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Gender & Age</span>
                    <strong>{selectedCase.gender} • {selectedCase.estimatedAge}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[10px]">Physical Markings</span>
                    <p className="text-foreground mt-0.5">{selectedCase.animalDescription}</p>
                  </div>
                </div>
              </div>

              {/* Holding & Facility */}
              <div className="p-3 rounded-lg border border-border/60 bg-muted/15 text-xs space-y-1">
                <p><span className="text-muted-foreground">Impound Facility:</span> <strong>{selectedCase.impoundingFacility}</strong></p>
                <p><span className="text-muted-foreground">Intake Officer:</span> <strong>{selectedCase.intakeOfficer}</strong></p>
                <p><span className="text-muted-foreground">Holding Period:</span> <strong>Day {selectedCase.holdingDaysElapsed}</strong> of {selectedCase.maxHoldingDays} legal days</p>
              </div>

              {/* Case History Timeline */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <History className="size-3.5 text-primary" /> Animal Event Timeline
                </p>
                <div className="space-y-2 relative border-l-2 border-border/70 ml-2 pl-4">
                  {selectedCase.timeline.map((evt, idx) => (
                    <div key={idx} className="relative space-y-0.5 text-xs">
                      <div className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{evt.stage}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{evt.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{evt.notes}</p>
                      <p className="text-[10px] text-primary/80 font-medium">Logged by {evt.officer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
