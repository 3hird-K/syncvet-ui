"use client";

import { useState, useMemo } from "react";
import {
  Syringe,
  ShieldCheck,
  AlertTriangle,
  CalendarCheck,
  Search,
  Settings2,
  Download,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { LogVaccinationDialog } from "@/components/dashboard/log-vaccination-dialog";

const metrics: PageMetric[] = [
  { title: "Total Doses Given", value: "19,240", icon: Syringe, gradient: "from-blue-500/5", iconClass: "text-blue-400", badge: "All Types", badgeClass: "text-blue-400 bg-blue-400/10", sub: "Anti-Rabies / Parvo / Deworm" },
  { title: "Anti-Rabies (2026)", value: "4,812", icon: ShieldCheck, gradient: "from-emerald-500/5", iconClass: "text-emerald-400", badge: "On Track", badgeClass: "text-emerald-400 bg-emerald-400/10", sub: "Canine & Feline doses" },
  { title: "Overdue Boosters", value: "342", icon: AlertTriangle, gradient: "from-amber-500/5", iconClass: "text-amber-400", badge: "Needs Follow-up", badgeClass: "text-amber-400 bg-amber-400/10", sub: "Past scheduled date" },
  { title: "Scheduled This Week", value: "87", icon: CalendarCheck, gradient: "from-primary/5", iconClass: "text-primary", badge: "Upcoming", badgeClass: "text-primary bg-primary/10", sub: "Booster appointments" },
];

const allRecords = [
  { id: "VAX-2026-04821", petName: "Bantay", petId: "CDO-2026-00142", vaccine: "Anti-Rabies", batch: "AR-Q3-2026-014", date: "May 14, 2026", vet: "Dr. Elena Santos", nextDue: "May 14, 2027", status: "complete" },
  { id: "VAX-2026-04820", petName: "Muning", petId: "CDO-2026-00141", vaccine: "Anti-Rabies", batch: "AR-Q3-2026-014", date: "May 14, 2026", vet: "Dr. Elena Santos", nextDue: "May 14, 2027", status: "complete" },
  { id: "VAX-2026-04819", petName: "Rocky", petId: "CDO-2026-00138", vaccine: "Anti-Parvovirus", batch: "PV-Q2-2026-008", date: "May 13, 2026", vet: "Dr. Sarah Chen", nextDue: "Aug 13, 2026", status: "complete" },
  { id: "VAX-2026-04818", petName: "Princess", petId: "CDO-2026-00136", vaccine: "Anti-Rabies", batch: "AR-Q3-2026-013", date: "May 12, 2026", vet: "Officer Mark Velez", nextDue: "May 12, 2027", status: "complete" },
  { id: "VAX-2026-04817", petName: "Blackie", petId: "CDO-2026-00135", vaccine: "Deworming", batch: "DW-Q2-2026-041", date: "May 12, 2026", vet: "Dr. Sarah Chen", nextDue: "Aug 12, 2026", status: "complete" },
  { id: "VAX-2026-04816", petName: "Brownie", petId: "CDO-2026-00140", vaccine: "Anti-Rabies", batch: "—", date: "—", vet: "—", nextDue: "Overdue", status: "overdue" },
  { id: "VAX-2026-04815", petName: "Tiger", petId: "CDO-2026-00137", vaccine: "Anti-Rabies", batch: "—", date: "—", vet: "—", nextDue: "Overdue", status: "overdue" },
  { id: "VAX-2026-04814", petName: "Mingming", petId: "CDO-2026-00139", vaccine: "Anti-Parvovirus", batch: "PV-Q2-2026-007", date: "May 10, 2026", vet: "Dr. Elena Santos", nextDue: "Aug 10, 2026", status: "complete" },
  { id: "VAX-2026-04813", petName: "Choco", petId: "CDO-2026-00134", vaccine: "Anti-Rabies", batch: "AR-Q3-2026-012", date: "May 9, 2026", vet: "Officer Mark Velez", nextDue: "May 9, 2027", status: "complete" },
  { id: "VAX-2026-04812", petName: "Kitty", petId: "CDO-2026-00133", vaccine: "Deworming", batch: "DW-Q2-2026-040", date: "May 8, 2026", vet: "Dr. Sarah Chen", nextDue: "Aug 8, 2026", status: "complete" },
  { id: "VAX-2026-04811", petName: "Max", petId: "CDO-2026-00132", vaccine: "Anti-Rabies", batch: "AR-Q3-2026-011", date: "May 7, 2026", vet: "Dr. Elena Santos", nextDue: "May 7, 2027", status: "complete" },
  { id: "VAX-2026-04810", petName: "Luna", petId: "CDO-2026-00131", vaccine: "Anti-Rabies", batch: "—", date: "—", vet: "—", nextDue: "Overdue", status: "overdue" },
];

export default function VaccinationRecordsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const columns = [
    { id: "id", label: "Vax ID" },
    { id: "pet", label: "Pet", required: true },
    { id: "vaccine", label: "Vaccine" },
    { id: "batch", label: "Batch No." },
    { id: "date", label: "Date" },
    { id: "vet", label: "Veterinarian" },
    { id: "nextDue", label: "Next Due" },
    { id: "status", label: "Status" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRecords;
    return allRecords.filter(
      (r) =>
        r.petName.toLowerCase().includes(q) ||
        r.vaccine.toLowerCase().includes(q) ||
        r.vet.toLowerCase().includes(q) ||
        r.batch.toLowerCase().includes(q)
    );
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleExport = () => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
      loading: "Generating vaccination report...",
      success: () => {
        const content = "Vax ID,Pet Name,Pet ID,Vaccine,Batch No.,Date,Veterinarian,Next Due,Status\n" + 
          allRecords.map(r => `${r.id},${r.petName},${r.petId},${r.vaccine},${r.batch},${r.date},${r.vet},${r.nextDue},${r.status}`).join("\n");
        const blob = new Blob([content], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `syncvet_vax_records_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        return "Records exported successfully";
      },
      error: "Export failed",
    });
  };

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="Animal Health Module"
        title="Vaccination Records"
        subtitle={<>Anti-rabies, anti-parvovirus, and deworming dose tracking with <span className="text-foreground">batch traceability</span> and booster scheduling.</>}
        actions={<>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-xs"
            onClick={handleExport}
          >
            <Download className="size-3.5" /> Export Records
          </Button>
          <LogVaccinationDialog />
        </>}
      />
      <PageMetricCards metrics={metrics} />
      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Vaccination Log</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/60">All administered doses and overdue boosters across CDO barangays</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by pet, batch, or vet..." className="h-8 w-full sm:w-64 pl-8 text-xs bg-muted/20" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
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
              <TableRow>
                {visibleColumns.includes("id") && <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Vax ID</TableHead>}
                {visibleColumns.includes("pet") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Pet</TableHead>}
                {visibleColumns.includes("vaccine") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Vaccine</TableHead>}
                {visibleColumns.includes("batch") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Batch No.</TableHead>}
                {visibleColumns.includes("date") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Date</TableHead>}
                {visibleColumns.includes("vet") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Veterinarian</TableHead>}
                {visibleColumns.includes("nextDue") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Next Due</TableHead>}
                {visibleColumns.includes("status") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={visibleColumns.length} className="py-8 text-center text-muted-foreground">No records match your search.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/50">
                  {visibleColumns.includes("id") && <TableCell className="font-mono text-xs text-muted-foreground pl-6">{r.id}</TableCell>}
                  {visibleColumns.includes("pet") && (
                    <TableCell>
                      <div><p className="text-sm font-semibold">{r.petName}</p><p className="text-[10px] text-muted-foreground">{r.petId}</p></div>
                    </TableCell>
                  )}
                  {visibleColumns.includes("vaccine") && <TableCell><Badge variant="outline" className="text-[10px]">{r.vaccine}</Badge></TableCell>}
                  {visibleColumns.includes("batch") && <TableCell className="font-mono text-xs text-muted-foreground">{r.batch}</TableCell>}
                  {visibleColumns.includes("date") && <TableCell className="text-xs">{r.date}</TableCell>}
                  {visibleColumns.includes("vet") && <TableCell className="text-xs text-muted-foreground">{r.vet}</TableCell>}
                  {visibleColumns.includes("nextDue") && <TableCell className="text-xs">{r.nextDue}</TableCell>}
                  {visibleColumns.includes("status") && (
                    <TableCell>
                      <Badge className={cn("text-[10px]", r.status === "complete" ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25" : "bg-red-500/15 text-red-500 hover:bg-red-500/25")}>
                        {r.status === "complete" ? "Complete" : "Overdue"}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination page={safePage} totalPages={totalPages} pageSize={pageSize} totalItems={filtered.length} itemLabel="records" onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
}
