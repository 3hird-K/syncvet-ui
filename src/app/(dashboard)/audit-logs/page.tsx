"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useCVO } from "@/lib/cvo-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
import { ExportTableDialog } from "@/components/dashboard/export-table-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Search,
  Download,
  ShieldCheck,
  Stethoscope,
  FileCheck2,
  MapPin,
  PawPrint,
  Package,
  AlertTriangle,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CVOAuditLog } from "@/data/cvo-store";

const TABLE_COLUMNS = [
  { id: "date", label: "Date & Time", required: true },
  { id: "actor", label: "Staff / Actor", required: true },
  { id: "category", label: "Category" },
  { id: "action", label: "Action" },
  { id: "details", label: "Event Details", required: true },
];

export default function AuditLogsPage() {
  const { auditLogs } = useCVO();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("ALL");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "date",
    "actor",
    "category",
    "action",
    "details",
  ]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<CVOAuditLog | null>(null);

  // Query real user profiles for avatars
  const { data: dbUsers = [] } = useQuery<{ id: string; full_name: string | null; avatar_url: string | null }[]>({
    queryKey: ["users_for_audit_avatars"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, avatar_url");
        if (error) return [];
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fast map from user full_name to avatar_url
  const userAvatarMap = useMemo(() => {
    const map = new Map<string, string>();
    dbUsers.forEach((u) => {
      if (u.full_name && u.avatar_url) {
        const raw = u.full_name.toLowerCase().trim();
        map.set(raw, u.avatar_url);
        const clean = u.full_name.replace(/^(Dr\.|Dra\.|Atty\.)\s*/i, "").trim().toLowerCase();
        map.set(clean, u.avatar_url);
      }
    });
    return map;
  }, [dbUsers]);

  const getUserAvatar = (userName: string) => {
    if (!userName) return null;
    const nameLower = userName.toLowerCase().trim();
    if (userAvatarMap.has(nameLower)) return userAvatarMap.get(nameLower);
    const clean = userName.replace(/^(Dr\.|Dra\.|Atty\.)\s*/i, "").trim().toLowerCase();
    if (userAvatarMap.has(clean)) return userAvatarMap.get(clean);
    return null;
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Filtered logs (Search & Entity)
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Entity filter
      if (selectedEntity !== "ALL") {
        const matchesEntity =
          (selectedEntity === "Pet" && (log.entity === "Pet" || log.entity === "Animal")) ||
          (selectedEntity === "Inventory" && (log.entity === "Inventory" || log.entity === "Vaccination")) ||
          log.entity === selectedEntity;
        if (!matchesEntity) return false;
      }

      // Search query (matches action, details, user, recordId, entity)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          log.action.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          log.user.toLowerCase().includes(q) ||
          log.recordId.toLowerCase().includes(q) ||
          log.entity.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [auditLogs, selectedEntity, searchQuery]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, safePage, pageSize]);

  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Export CSV Handler
  const handleExportCSV = (logsToExport: CVOAuditLog[], filterSummary?: string) => {
    if (logsToExport.length === 0) {
      toast.error("No logs to export matching current filters");
      return;
    }

    const headers = ["Timestamp", "Date", "User", "Role", "Entity", "Action", "Details"];
    const rows = logsToExport.map((log) => {
      const dateStr = log.createdAt ? format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss") : log.timestamp;
      return [
        `"${log.timestamp}"`,
        `"${dateStr}"`,
        `"${log.user.replace(/"/g, '""')}"`,
        `"${log.role.replace(/"/g, '""')}"`,
        `"${log.entity.replace(/"/g, '""')}"`,
        `"${log.action.replace(/"/g, '""')}"`,
        `"${log.details.replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `syncvet-cvo-audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${logsToExport.length} audit logs to CSV${filterSummary ? ` (${filterSummary})` : ""}`);
  };

  const getEntityBadge = (entity: string) => {
    switch (entity) {
      case "Consultation":
        return (
          <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
            <Stethoscope className="size-3 text-blue-500" />
            <span>Consultation</span>
          </Badge>
        );
      case "Certificate":
        return (
          <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            <FileCheck2 className="size-3 text-emerald-500" />
            <span>Certificate</span>
          </Badge>
        );
      case "Field Operations":
        return (
          <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-primary/10 text-primary border-primary/30">
            <MapPin className="size-3 text-primary" />
            <span>Field Ops</span>
          </Badge>
        );
      case "Animal Control":
        return (
          <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
            <AlertTriangle className="size-3 text-amber-500" />
            <span>Animal Control</span>
          </Badge>
        );
      case "Pet":
      case "Animal":
        return (
          <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
            <PawPrint className="size-3 text-emerald-600" />
            <span>Pet Registry</span>
          </Badge>
        );
      case "Inventory":
      case "Vaccination":
        return (
          <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
            <Package className="size-3 text-indigo-500" />
            <span>Inventory</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-semibold gap-1 bg-muted text-muted-foreground border-border">
            <ShieldCheck className="size-3 text-primary" />
            <span>{entity || "System"}</span>
          </Badge>
        );
    }
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("delete") || act.includes("remove") || act.includes("cancel")) {
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    }
    if (act.includes("create") || act.includes("register") || act.includes("add") || act.includes("issue")) {
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    }
    if (act.includes("update") || act.includes("edit") || act.includes("complete") || act.includes("status")) {
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <div className="flex-1 w-full min-w-0 max-w-7xl mx-auto space-y-5 p-4 sm:p-5 md:p-6 pb-12 bg-background text-foreground">
      {/* ── Standard Page Header ── */}
      <PageHeader
        supertitle="CVO AUDIT & COMPLIANCE"
        title="Office Activity & Audit Logs"
        subtitle="Official real-time immutable audit trail of clinical actions, citizen records, inventory logs, and system operations."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            className="h-8.5 text-xs font-semibold gap-1.5 border-border shadow-xs hover:bg-muted cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        }
      />

      {/* ── Standard Services DataTable Card ── */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-4 border-b border-border/60 bg-card">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="size-4 text-primary" />
                <span>Audit Event Ledger</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Showing {filteredLogs.length} of {auditLogs.length} total recorded operations across Cagayan de Oro City.
              </CardDescription>
            </div>

            {/* Toolbar: Search + Entity Category + Column Filter */}
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search user, action, details, tag..."
                  className="h-8.5 w-full sm:w-64 pl-8 text-xs bg-muted/20 border-border/80"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Entity Category Filter */}
              <Select
                value={selectedEntity}
                onValueChange={(val) => {
                  setSelectedEntity(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8.5 w-fit min-w-[130px] rounded-lg border-border/80 bg-background px-2.5 text-xs font-medium">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover z-[160]">
                  <SelectItem value="ALL" className="text-xs">All Categories</SelectItem>
                  <SelectItem value="Pet" className="text-xs">Pet Registry</SelectItem>
                  <SelectItem value="Consultation" className="text-xs">Clinical Encounters</SelectItem>
                  <SelectItem value="Inventory" className="text-xs">Vaccines & Inventory</SelectItem>
                  <SelectItem value="Certificate" className="text-xs">Health Certificates</SelectItem>
                  <SelectItem value="Field Operations" className="text-xs">Field Operations</SelectItem>
                  <SelectItem value="Animal Control" className="text-xs">Animal Control</SelectItem>
                </SelectContent>
              </Select>

              {/* Column Filter Button */}
              <TableColumnFilter
                columns={TABLE_COLUMNS}
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
              />
            </div>
          </div>
        </CardHeader>

        {/* ── Table Content ── */}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/60 bg-muted/15">
                {visibleColumns.includes("date") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider pl-6 py-3 whitespace-nowrap">
                    Date & Time
                  </TableHead>
                )}
                {visibleColumns.includes("actor") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    Staff / Actor
                  </TableHead>
                )}
                {visibleColumns.includes("category") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    Category
                  </TableHead>
                )}
                {visibleColumns.includes("action") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    Action
                  </TableHead>
                )}
                {visibleColumns.includes("details") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider min-w-[280px]">
                    Event Details
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                        <History className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">No Audit Logs Found</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          No database audit records match your selected search or filter criteria. Try resetting your filters to view full activity.
                        </p>
                      </div>
                      {(searchQuery || selectedEntity !== "ALL") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedEntity("ALL");
                            setPage(1);
                          }}
                          className="h-8 text-xs font-semibold cursor-pointer"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => {
                  const formattedDate = log.createdAt
                    ? format(new Date(log.createdAt), "MMM d, yyyy")
                    : log.timestamp;
                  const formattedTime = log.createdAt
                    ? format(new Date(log.createdAt), "h:mm a")
                    : log.timestamp;

                  const avatarUrl = getUserAvatar(log.user);

                  return (
                    <TableRow
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-muted/40 cursor-pointer group transition-colors border-b border-border/40 text-xs"
                    >
                      {/* Date & Time */}
                      {visibleColumns.includes("date") && (
                        <TableCell className="pl-6 py-3 whitespace-nowrap font-mono">
                          <span className="font-semibold text-foreground block text-xs">
                            {formattedDate}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {formattedTime}
                          </span>
                        </TableCell>
                      )}

                      {/* Staff Actor with Profile Image */}
                      {visibleColumns.includes("actor") && (
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8 rounded-full border border-border/80 shadow-2xs shrink-0">
                              {avatarUrl ? (
                                <AvatarImage src={avatarUrl} alt={log.user} className="object-cover" />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                {log.user.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-semibold text-foreground block leading-tight">
                                {log.user}
                              </span>
                              {log.role && (
                                <span className="text-[10px] text-muted-foreground font-medium block">
                                  {log.role}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {/* Category */}
                      {visibleColumns.includes("category") && (
                        <TableCell className="py-3 whitespace-nowrap">
                          {getEntityBadge(log.entity)}
                        </TableCell>
                      )}

                      {/* Action */}
                      {visibleColumns.includes("action") && (
                        <TableCell className="py-3 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn("text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5", getActionBadgeClass(log.action))}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                      )}

                      {/* Event Details */}
                      {visibleColumns.includes("details") && (
                        <TableCell className="py-3 pr-6">
                          <p className="text-xs text-foreground/90 font-medium leading-relaxed line-clamp-2 max-w-2xl">
                            {log.details}
                          </p>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* ── Standard Table Pagination ── */}
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredLogs.length}
            itemLabel="audit records"
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* ── Event Details Modal (When row clicked) ── */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="w-[95vw] sm:max-w-lg rounded-2xl bg-card border-border p-6 shadow-2xl">
            <DialogHeader className="space-y-1 pb-2 border-b border-border/60">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Info className="size-4" />
                <DialogTitle className="text-base font-extrabold text-foreground">
                  Audit Record Details
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Immutable record hash and transaction details from the City Veterinary database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Recorded At
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    {selectedLog.createdAt ? format(new Date(selectedLog.createdAt), "PPpp") : selectedLog.timestamp}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    System Entity
                  </span>
                  <span className="font-semibold text-foreground">
                    {selectedLog.entity}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Staff Member / Actor
                </span>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/50 bg-background">
                  <Avatar className="size-8 rounded-full border border-border/80 shadow-2xs shrink-0">
                    {getUserAvatar(selectedLog.user) ? (
                      <AvatarImage src={getUserAvatar(selectedLog.user)!} alt={selectedLog.user} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {selectedLog.user.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-bold text-foreground block">{selectedLog.user}</span>
                    <span className="text-[10.5px] text-muted-foreground">{selectedLog.role}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Action Executed
                </span>
                <div className="p-2.5 rounded-xl border border-border/50 bg-background">
                  <Badge variant="outline" className={cn("text-xs font-bold uppercase", getActionBadgeClass(selectedLog.action))}>
                    {selectedLog.action}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Description & Meta
                </span>
                <div className="p-3 rounded-xl border border-border/50 bg-muted/20 text-foreground leading-relaxed font-medium">
                  {selectedLog.details}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Record Identifier
                </span>
                <div className="p-2 rounded-lg bg-muted/40 border border-border/50 font-mono text-[11px] text-muted-foreground break-all">
                  {selectedLog.recordId}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Pre-Export Filter Dialog ── */}
      <ExportTableDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        title="Export Audit & Activity Logs"
        description="Filter office audit records by day, month, year, date range, entity category, or staff role before exporting to CSV."
        data={auditLogs}
        dateExtractor={(log) => log.createdAt || log.timestamp}
        customFilters={[
          {
            id: "entity",
            label: "Entity Scope",
            placeholder: "All Entities",
            options: [
              { label: "All Entities", value: "ALL" },
              { label: "Consultation", value: "Consultation" },
              { label: "Pet / Animal", value: "Pet" },
              { label: "Inventory / Vaccines", value: "Inventory" },
              { label: "Field Operations", value: "Operation" },
              { label: "System / Auth", value: "System" },
            ],
            predicate: (log, val) => {
              if (val === "ALL") return true;
              if (val === "Pet") return log.entity === "Pet" || log.entity === "Animal";
              if (val === "Inventory") return log.entity === "Inventory" || log.entity === "Vaccination";
              return log.entity === val;
            },
          },
          {
            id: "role",
            label: "Actor Role",
            placeholder: "All Roles",
            options: [
              { label: "All Roles", value: "ALL" },
              { label: "Admin", value: "Admin" },
              { label: "Veterinarian", value: "Veterinarian" },
              { label: "Pet Owner", value: "Pet Owner" },
            ],
            predicate: (log, val) => {
              if (val === "ALL") return true;
              const r = (log.role || "").toLowerCase();
              if (val === "Admin") return r.includes("admin");
              if (val === "Veterinarian") return r.includes("vet");
              if (val === "Pet Owner") return r.includes("owner") || r.includes("citizen") || r.includes("pet");
              return r.includes(val.toLowerCase());
            },
          },
        ]}
        onExport={handleExportCSV}
      />
    </div>
  );
}
