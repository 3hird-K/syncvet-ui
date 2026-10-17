"use client";

import { useState, useMemo } from "react";
import {
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  Users,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  CloudUpload,
  Calendar,
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
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { ScheduleDriveDialog } from "@/components/dashboard/schedule-drive-dialog";
import { OfflineFieldEntryDialog } from "@/components/dashboard/offline-field-entry-dialog";
import { useCVO } from "@/lib/cvo-context";

export default function FieldOperationsPage() {
  const { fieldOperations, offlineRecords, syncOfflineRecords } = useCVO();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isSyncing, setIsSyncing] = useState(false);

  const pendingSyncCount = offlineRecords.filter((r) => r.syncStatus === "pending").length;
  const inProgressCount = fieldOperations.filter((o) => o.status === "in-progress").length;
  const completedCount = fieldOperations.filter((o) => o.status === "completed").length;
  const barangaysCoveredCount = useMemo(() => {
    const set = new Set<string>();
    fieldOperations.forEach((o) => o.barangay && set.add(o.barangay));
    return set.size;
  }, [fieldOperations]);

  // Dynamic live metric cards based on real operations
  const metrics: PageMetric[] = [
    {
      title: "Active Deployments",
      value: `${inProgressCount}`,
      icon: Truck,
      gradient: "from-primary/5",
      iconClass: "text-primary",
      badge: inProgressCount > 0 ? "In Field" : "Standby",
      badgeClass: inProgressCount > 0 ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted/20",
      sub: "Mobile units currently active",
    },
    {
      title: "Barangays Covered",
      value: `${barangaysCoveredCount}`,
      icon: MapPin,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-400",
      badge: barangaysCoveredCount > 0 ? `${barangaysCoveredCount} of 80 CDO` : "0 of 80 CDO",
      badgeClass: "text-emerald-400 bg-emerald-400/10",
      sub: "From logged field operations",
    },
    {
      title: "Offline Queue",
      value: `${pendingSyncCount}`,
      icon: pendingSyncCount > 0 ? WifiOff : Wifi,
      gradient: "from-amber-500/5",
      iconClass: pendingSyncCount > 0 ? "text-amber-500" : "text-emerald-500",
      badge: pendingSyncCount > 0 ? "Pending Sync" : "Clean Cache",
      badgeClass: pendingSyncCount > 0 ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10",
      sub: "Field records in local cache",
    },
    {
      title: "Completed Operations",
      value: `${completedCount}`,
      icon: CheckCircle2,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-400",
      badge: `${fieldOperations.length} Total`,
      badgeClass: "text-blue-400 bg-blue-400/10",
      sub: "Scheduled & concluded drives",
    },
  ];

  // Columns definition (Team column removed)
  const columns = [
    { id: "id", label: "Op ID" },
    { id: "barangay", label: "Barangay", required: true },
    { id: "type", label: "Operation Type" },
    { id: "lead", label: "Lead / OIC" },
    { id: "date", label: "Scheduled Date" },
    { id: "progress", label: "Target vs Vaccinated" },
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
    if (!q) return fieldOperations;
    return fieldOperations.filter(
      (op) =>
        op.barangay.toLowerCase().includes(q) ||
        op.type.toLowerCase().includes(q) ||
        op.lead.toLowerCase().includes(q) ||
        op.opId.toLowerCase().includes(q)
    );
  }, [fieldOperations, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineRecords();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="SyncVet Dashboard"
        title="Barangay Field Operations"
        subtitle={
          <>
            Barangay-level <span className="text-foreground">field vaccination drives</span> and outreach deployment with offline-first data capture and synchronization.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <OfflineFieldEntryDialog />
            <ScheduleDriveDialog />
          </div>
        }
      />

      <PageMetricCards metrics={metrics} />

      {/* ── Offline Sync Notification Bar ── */}
      <Card className="border border-border/80 bg-muted/20">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-8 rounded-lg flex items-center justify-center shrink-0",
                pendingSyncCount > 0
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-emerald-500/10 text-emerald-500"
              )}
            >
              {pendingSyncCount > 0 ? (
                <WifiOff className="size-4" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Offline Field Synchronization Queue
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    pendingSyncCount > 0
                      ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
                      : "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                  )}
                >
                  {pendingSyncCount > 0
                    ? `${pendingSyncCount} Records Pending`
                    : "All Synced"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pendingSyncCount > 0
                  ? "Field entries recorded while offline in barangays. Connect to internet to push."
                  : "All local field records are synchronized with central municipal databases."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={pendingSyncCount > 0 ? "default" : "outline"}
            disabled={pendingSyncCount === 0 || isSyncing}
            onClick={handleSync}
            className="gap-1.5 text-xs self-stretch sm:self-auto cursor-pointer"
          >
            {isSyncing ? (
              <RefreshCw className="size-3.5 animate-spin" />
            ) : (
              <CloudUpload className="size-3.5" />
            )}
            Sync with CVO Server
          </Button>
        </CardContent>
      </Card>

      {/* ── Field Operations Table ── */}
      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Barangay Deployment Log</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/80">
                Scheduled, active, and completed field vaccination drives across CDO barangays
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search barangay, OIC, or ID..."
                  className="h-8 w-full sm:w-60 pl-8 text-xs bg-muted/20"
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
              <TableRow>
                {visibleColumns.includes("id") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">Op ID</TableHead>
                )}
                {visibleColumns.includes("barangay") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Barangay</TableHead>
                )}
                {visibleColumns.includes("type") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Operation Type</TableHead>
                )}
                {visibleColumns.includes("lead") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Lead / OIC</TableHead>
                )}
                {visibleColumns.includes("date") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Date</TableHead>
                )}
                {visibleColumns.includes("progress") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Target vs Vaccinated</TableHead>
                )}
                {visibleColumns.includes("status") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="py-12 text-center text-muted-foreground">
                    <div className="space-y-2 max-w-sm mx-auto">
                      <Truck className="size-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-xs font-semibold text-foreground">No field operations scheduled yet</p>
                      <p className="text-[11px] text-muted-foreground">
                        {query
                          ? `No field deployments matching "${query}".`
                          : "Click '+ Schedule Drive' to deploy a mobile vaccination outreach in a CDO barangay."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((op, idx) => {
                  const pct = op.petsTarget > 0 ? Math.round((op.petsVaccinated / op.petsTarget) * 100) : 0;
                  return (
                    <TableRow key={`${op.id}-${idx}`} className="hover:bg-muted/50">
                      {visibleColumns.includes("id") && (
                        <TableCell className="font-mono text-xs text-muted-foreground pl-6">
                          {op.opId}
                        </TableCell>
                      )}
                      {visibleColumns.includes("barangay") && (
                        <TableCell className="text-sm font-semibold">
                          Barangay {op.barangay}
                        </TableCell>
                      )}
                      {visibleColumns.includes("type") && (
                        <TableCell className="text-xs">
                          {op.type}
                        </TableCell>
                      )}
                      {visibleColumns.includes("lead") && (
                        <TableCell className="text-xs text-muted-foreground">
                          {op.lead}
                        </TableCell>
                      )}
                      {visibleColumns.includes("date") && (
                        <TableCell className="text-xs text-muted-foreground">
                          {op.date}
                        </TableCell>
                      )}
                      {visibleColumns.includes("progress") && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {op.petsVaccinated}/{op.petsTarget} ({pct}%)
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes("status") && (
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-[10px]",
                              op.status === "completed" && "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25",
                              op.status === "in-progress" && "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25",
                              op.status === "scheduled" && "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25",
                              op.status === "cancelled" && "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                            )}
                          >
                            {op.status === "in-progress" ? (
                              <><Clock className="mr-1 size-3" /> In Progress</>
                            ) : op.status === "completed" ? (
                              <><CheckCircle2 className="mr-1 size-3" /> Completed</>
                            ) : op.status === "cancelled" ? (
                              "Cancelled"
                            ) : (
                              "Scheduled"
                            )}
                          </Badge>
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
            itemLabel="operations"
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
