"use client";

import { useState, useMemo } from "react";
import {
  Syringe,
  ShieldCheck,
  AlertTriangle,
  CalendarCheck,
  Search,
  Filter,
  Download,
} from "lucide-react";
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
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";

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

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="Animal Health Module"
        title="Vaccination Records"
        subtitle={<>Anti-rabies, anti-parvovirus, and deworming dose tracking with <span className="text-foreground">batch traceability</span> and booster scheduling.</>}
        actions={<><Button variant="outline" size="sm" className="gap-2 text-xs"><Download className="size-3.5" /> Export Records</Button><Button size="sm" className="gap-2 text-xs"><Syringe className="size-3.5" /> Log Vaccination</Button></>}
      />
      <PageMetricCards metrics={metrics} />
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Vaccination Log</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/60">All administered doses and overdue boosters across CDO barangays</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by pet, batch, or vet..." className="h-8 w-64 pl-8 text-xs" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><Filter className="size-3" /> Filter</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Vax ID</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Pet</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Vaccine</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Batch No.</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Date</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Veterinarian</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Next Due</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No records match your search.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground pl-6">{r.id}</TableCell>
                  <TableCell>
                    <div><p className="text-sm font-semibold">{r.petName}</p><p className="text-[10px] text-muted-foreground">{r.petId}</p></div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.vaccine}</Badge></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.batch}</TableCell>
                  <TableCell className="text-xs">{r.date}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.vet}</TableCell>
                  <TableCell className="text-xs">{r.nextDue}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px]", r.status === "complete" ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25" : "bg-red-500/15 text-red-500 hover:bg-red-500/25")}>
                      {r.status === "complete" ? "Complete" : "Overdue"}
                    </Badge>
                  </TableCell>
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
