"use client";

import { useState, useMemo } from "react";
import {
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Filter,
  Plus,
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
  { title: "Active Deployments", value: "6", icon: Truck, gradient: "from-primary/5", iconClass: "text-primary", badge: "In Field", badgeClass: "text-primary bg-primary/10", sub: "Mobile units deployed" },
  { title: "Barangays Covered", value: "42", icon: MapPin, gradient: "from-emerald-500/5", iconClass: "text-emerald-400", badge: "52% of CDO", badgeClass: "text-emerald-400 bg-emerald-400/10", sub: "Out of 80 total" },
  { title: "Completed Drives", value: "38", icon: CheckCircle2, gradient: "from-blue-500/5", iconClass: "text-blue-400", badge: "This Quarter", badgeClass: "text-blue-400 bg-blue-400/10", sub: "Anti-rabies campaigns" },
  { title: "Field Personnel", value: "14", icon: Users, gradient: "from-amber-500/5", iconClass: "text-amber-400", badge: "3 Teams", badgeClass: "text-amber-400 bg-amber-400/10", sub: "Vets & officers" },
];

const allOps = [
  { id: "FO-2026-048", barangay: "Lapasan", type: "Mass Anti-Rabies Drive", team: "Mobile Unit — Team A", lead: "Officer Mark Velez", date: "May 15, 2026", petsTarget: 120, petsVaccinated: 98, status: "in-progress" },
  { id: "FO-2026-047", barangay: "Bulua", type: "Mass Anti-Rabies Drive", team: "Mobile Unit — Team B", lead: "Dr. Elena Santos", date: "May 14, 2026", petsTarget: 150, petsVaccinated: 150, status: "completed" },
  { id: "FO-2026-046", barangay: "Iponan", type: "Stray Dog Assessment", team: "Assessment Unit", lead: "Officer Jay Ramos", date: "May 13, 2026", petsTarget: 80, petsVaccinated: 72, status: "completed" },
  { id: "FO-2026-045", barangay: "Kauswagan", type: "Deworming Campaign", team: "Mobile Unit — Team A", lead: "Officer Mark Velez", date: "May 12, 2026", petsTarget: 100, petsVaccinated: 100, status: "completed" },
  { id: "FO-2026-044", barangay: "Carmen", type: "Mass Anti-Rabies Drive", team: "Mobile Unit — Team C", lead: "Dr. Sarah Chen", date: "May 11, 2026", petsTarget: 90, petsVaccinated: 88, status: "completed" },
  { id: "FO-2026-043", barangay: "Gusa", type: "Mass Anti-Rabies Drive", team: "Mobile Unit — Team B", lead: "Dr. Elena Santos", date: "May 10, 2026", petsTarget: 110, petsVaccinated: 110, status: "completed" },
  { id: "FO-2026-042", barangay: "Macasandig", type: "Anti-Rabies + Registration", team: "Mobile Unit — Team A", lead: "Officer Mark Velez", date: "May 16, 2026", petsTarget: 95, petsVaccinated: 0, status: "scheduled" },
  { id: "FO-2026-041", barangay: "Patag", type: "Mass Anti-Rabies Drive", team: "Mobile Unit — Team C", lead: "Dr. Sarah Chen", date: "May 17, 2026", petsTarget: 85, petsVaccinated: 0, status: "scheduled" },
  { id: "FO-2026-040", barangay: "Agusan", type: "Mass Anti-Rabies Drive", team: "Mobile Unit — Team B", lead: "Dr. Elena Santos", date: "May 18, 2026", petsTarget: 100, petsVaccinated: 0, status: "scheduled" },
  { id: "FO-2026-039", barangay: "Cugman", type: "Deworming Campaign", team: "Mobile Unit — Team A", lead: "Officer Mark Velez", date: "May 8, 2026", petsTarget: 75, petsVaccinated: 75, status: "completed" },
  { id: "FO-2026-038", barangay: "Tignapoloan", type: "Stray Dog Assessment", team: "Assessment Unit", lead: "Officer Jay Ramos", date: "May 7, 2026", petsTarget: 60, petsVaccinated: 54, status: "completed" },
];

export default function FieldOperationsPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOps;
    return allOps.filter(
      (op) =>
        op.barangay.toLowerCase().includes(q) ||
        op.type.toLowerCase().includes(q) ||
        op.team.toLowerCase().includes(q) ||
        op.lead.toLowerCase().includes(q)
    );
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="flex-1 space-y-4 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="Animal Health Module"
        title="Field Operations"
        subtitle={<>Barangay-level <span className="text-foreground">field vaccination drives</span> and mobile team deployment with <span className="text-foreground">offline-first data capture</span>.</>}
        actions={<Button size="sm" className="gap-2 text-xs"><Plus className="size-3.5" /> Schedule Drive</Button>}
      />
      <PageMetricCards metrics={metrics} />
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Deployment Log</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/60">Scheduled, active, and completed field vaccination drives across CDO barangays</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by barangay or team..." className="h-8 w-64 pl-8 text-xs" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><Filter className="size-3" /> Filter</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Op ID</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Barangay</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Operation Type</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Team</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Lead</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Date</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Progress</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No operations match your search.</TableCell></TableRow>
              ) : rows.map((op) => {
                const pct = op.petsTarget > 0 ? Math.round((op.petsVaccinated / op.petsTarget) * 100) : 0;
                return (
                  <TableRow key={op.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs text-muted-foreground pl-6">{op.id}</TableCell>
                    <TableCell className="text-sm font-semibold">{op.barangay}</TableCell>
                    <TableCell className="text-xs">{op.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{op.team}</TableCell>
                    <TableCell className="text-xs">{op.lead}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{op.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{op.petsVaccinated}/{op.petsTarget}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px]",
                        op.status === "completed" && "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25",
                        op.status === "in-progress" && "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25",
                        op.status === "scheduled" && "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25",
                      )}>
                        {op.status === "in-progress" ? <><Clock className="mr-1 size-3" /> In Progress</> : op.status === "completed" ? <><CheckCircle2 className="mr-1 size-3" /> Completed</> : "Scheduled"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination page={safePage} totalPages={totalPages} pageSize={pageSize} totalItems={filtered.length} itemLabel="operations" onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
}
