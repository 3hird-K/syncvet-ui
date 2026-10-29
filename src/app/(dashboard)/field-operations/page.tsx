"use client";

import { useState, useMemo } from "react";
import {
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Calendar,
  CalendarDays,
  Stethoscope,
  Syringe,
  Scissors,
  Megaphone,
  User,
  ShieldCheck,
  MoreVertical,
  Play,
  Trash2,
  ExternalLink,
  Info,
  Building2,
  Sparkles,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { ScheduleDriveDialog } from "@/components/dashboard/schedule-drive-dialog";
import { useCVO } from "@/lib/cvo-context";
import { findVetProfileByName, type CVOVetProfile } from "@/data/cvo-vets";
import type { CVOFieldOperation } from "@/data/cvo-store";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function FieldOperationsPage() {
  const { fieldOperations, updateFieldOperationStatus, deleteFieldOperation } = useCVO();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const { data: dbUsers = [] } = useQuery({
    queryKey: ["users_directory_for_field_ops"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("*");
      return data || [];
    },
    staleTime: 1000 * 60,
  });

  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Profile modal state
  const [profileModalVet, setProfileModalVet] = useState<CVOVetProfile | null>(null);
  const [announcementModalOp, setAnnouncementModalOp] = useState<CVOFieldOperation | null>(null);

  const inProgressCount = fieldOperations.filter((o) => o.status === "in-progress").length;
  const scheduledCount = fieldOperations.filter((o) => o.status === "scheduled").length;
  const completedCount = fieldOperations.filter((o) => o.status === "completed").length;
  const barangaysCoveredCount = useMemo(() => {
    const set = new Set<string>();
    fieldOperations.forEach((o) => o.barangay && set.add(o.barangay));
    return set.size;
  }, [fieldOperations]);

  // Practical metric cards (offline queue card removed)
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
      iconClass: "text-emerald-500",
      badge: `${barangaysCoveredCount} of 80 CDO`,
      badgeClass: "text-emerald-500 bg-emerald-500/10",
      sub: "From logged field operations",
    },
    {
      title: "Scheduled Outreach Visits",
      value: `${scheduledCount}`,
      icon: CalendarDays,
      gradient: "from-amber-500/5",
      iconClass: "text-amber-500",
      badge: scheduledCount > 0 ? "Active Broadcasts" : "None Pending",
      badgeClass: scheduledCount > 0 ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground bg-muted/20",
      sub: "Upcoming barangay visits announced",
    },
    {
      title: "Completed Operations",
      value: `${completedCount}`,
      icon: CheckCircle2,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-500",
      badge: `${fieldOperations.length} Total`,
      badgeClass: "text-blue-500 bg-blue-500/10",
      sub: "Concluded community missions",
    },
  ];

  const columns = [
    { id: "id", label: "Op ID" },
    { id: "barangay", label: "Barangay & Venue", required: true },
    { id: "services", label: "Services Offered", required: true },
    { id: "lead", label: "Assigned Veterinarian", required: true },
    { id: "date", label: "Date & Time Window" },
    { id: "progress", label: "Slots / Capacity" },
    { id: "announcement", label: "Announcement" },
    { id: "status", label: "Status" },
    { id: "actions", label: "Actions" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((c) => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    return fieldOperations.filter((op) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        op.barangay.toLowerCase().includes(q) ||
        op.type.toLowerCase().includes(q) ||
        op.lead.toLowerCase().includes(q) ||
        op.opId.toLowerCase().includes(q) ||
        (op.venue && op.venue.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" || op.status === statusFilter;

      let matchesService = true;
      if (serviceFilter !== "all") {
        if (op.services && op.services.length > 0) {
          matchesService = op.services.includes(serviceFilter as any);
        } else {
          const typeLower = op.type.toLowerCase();
          if (serviceFilter === "consultation") matchesService = typeLower.includes("consult");
          else if (serviceFilter === "vaccination") matchesService = typeLower.includes("vaccin") || typeLower.includes("rabies");
          else if (serviceFilter === "spay-neuter") matchesService = typeLower.includes("spay") || typeLower.includes("kapon");
        }
      }

      return matchesQuery && matchesStatus && matchesService;
    });
  }, [fieldOperations, query, statusFilter, serviceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleMarkComplete = async (op: CVOFieldOperation) => {
    try {
      await updateFieldOperationStatus(op.id, "completed");
      toast.success(`Outreach in Brgy. ${op.barangay} marked Completed`, {
        description: "Official public announcement has been automatically removed from the bulletin.",
      });
    } catch {
      toast.error("Failed to update operation status");
    }
  };

  const handleStartVisit = async (op: CVOFieldOperation) => {
    try {
      await updateFieldOperationStatus(op.id, "in-progress");
      toast.info(`Outreach in Brgy. ${op.barangay} is now In Progress`, {
        description: `Mobile team active on-site at ${op.venue || "Barangay Covered Court"}.`,
      });
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (op: CVOFieldOperation) => {
    if (!confirm(`Are you sure you want to cancel and delete outreach ${op.opId} for Brgy. ${op.barangay}?`)) {
      return;
    }
    try {
      await deleteFieldOperation(op.id);
      toast.success("Outreach Visit Deleted", {
        description: "Operation cancelled and announcement removed.",
      });
    } catch {
      toast.error("Failed to delete operation");
    }
  };

  return (
    <div className="flex-1 space-y-4 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="SyncVet Dashboard • City Veterinary Office"
        title="Barangay Field Operations"
        subtitle={
          <>
            Barangay-level <span className="text-foreground">veterinary outreach visits</span>, clinical consultations, mass anti-rabies vaccination, and community spay/neuter drives.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <ScheduleDriveDialog />
          </div>
        }
      />

      <PageMetricCards metrics={metrics} />

      {/* ── Field Operations Table ── */}
      <Card className="border border-border/80">
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Barangay Outreach Deployment Log</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/80">
                Scheduled, active, and completed veterinary visits across Cagayan de Oro barangays
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search barangay, venue, vet, or ID..."
                  className="h-8 w-full sm:w-64 pl-8 text-xs bg-muted/20"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Service Filter */}
              <Select
                value={serviceFilter}
                onValueChange={(val) => {
                  setServiceFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs bg-muted/20">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Services</SelectItem>
                  <SelectItem value="consultation" className="text-xs">Consultation</SelectItem>
                  <SelectItem value="vaccination" className="text-xs">Vaccination</SelectItem>
                  <SelectItem value="spay-neuter" className="text-xs">Spay / Neuter</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs bg-muted/20">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Status</SelectItem>
                  <SelectItem value="scheduled" className="text-xs">Scheduled</SelectItem>
                  <SelectItem value="in-progress" className="text-xs">In Progress</SelectItem>
                  <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                  <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                </SelectContent>
              </Select>

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
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Target Barangay & Venue</TableHead>
                )}
                {visibleColumns.includes("services") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Services Offered</TableHead>
                )}
                {visibleColumns.includes("lead") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Assigned Veterinarian</TableHead>
                )}
                {visibleColumns.includes("date") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Date & Time</TableHead>
                )}
                {visibleColumns.includes("progress") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Slots / Capacity</TableHead>
                )}
                {visibleColumns.includes("announcement") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Announcement</TableHead>
                )}
                {visibleColumns.includes("status") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
                )}
                {visibleColumns.includes("actions") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right pr-6">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="py-14 text-center text-muted-foreground">
                    <div className="space-y-2.5 max-w-sm mx-auto">
                      <Truck className="size-9 text-muted-foreground/40 mx-auto" />
                      <p className="text-xs font-semibold text-foreground">No outreach visits scheduled yet</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {query || statusFilter !== "all" || serviceFilter !== "all"
                          ? "No field deployments matching your selected filters."
                          : "Click '+ Schedule Barangay Visit' to plan a mobile consultation, vaccination, or spay/neuter outreach."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((op, idx) => {
                  const pct = op.petsTarget > 0 ? Math.round((op.petsVaccinated / op.petsTarget) * 100) : 0;
                  const vetProfile = findVetProfileByName(op.lead, dbUsers);

                  // Extract services list
                  const opServices = op.services || (
                    op.type.toLowerCase().includes("kapon") || op.type.toLowerCase().includes("spay")
                      ? ["vaccination", "spay-neuter"]
                      : op.type.toLowerCase().includes("rabies")
                      ? ["vaccination", "consultation"]
                      : ["consultation", "vaccination"]
                  );

                  return (
                    <TableRow key={`${op.id}-${idx}`} className="hover:bg-muted/40">
                      {/* Op ID */}
                      {visibleColumns.includes("id") && (
                        <TableCell className="font-mono text-xs text-muted-foreground pl-6">
                          {op.opId}
                        </TableCell>
                      )}

                      {/* Barangay & Venue */}
                      {visibleColumns.includes("barangay") && (
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-foreground">
                              Barangay {op.barangay}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Building2 className="size-3 text-primary shrink-0" />
                              <span className="truncate max-w-[200px]">
                                {op.venue || "Barangay Covered Court / Hall"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {/* Services Handled (Strictly Consultation, Vaccination, Spay/Neuter) */}
                      {visibleColumns.includes("services") && (
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                            {opServices.includes("consultation") && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-medium"
                              >
                                <Stethoscope className="size-2.5" /> Consultation
                              </Badge>
                            )}
                            {opServices.includes("vaccination") && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium"
                              >
                                <Syringe className="size-2.5" /> Vaccination
                              </Badge>
                            )}
                            {opServices.includes("spay-neuter") && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-1 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-medium"
                              >
                                <Scissors className="size-2.5" /> Spay/Neuter
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}

                      {/* Assigned Veterinarian Profile */}
                      {visibleColumns.includes("lead") && (
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setProfileModalVet(vetProfile)}
                            className="flex items-center gap-2.5 text-left group hover:opacity-90 cursor-pointer"
                            title="Click to view full veterinarian profile"
                          >
                            <Avatar className="size-8 rounded-lg border border-border group-hover:border-primary shrink-0 transition-colors">
                              <AvatarImage
                                src={vetProfile.avatarUrl || "/dr-helen-tacandong.jpg"}
                                alt={op.lead}
                                className="object-cover"
                              />
                              <AvatarFallback className="rounded-lg text-[10px] font-bold bg-primary/10 text-primary">
                                {op.lead
                                  .replace("Dr.", "")
                                  .trim()
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                {op.lead}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                {vetProfile.role}
                              </p>
                            </div>
                          </button>
                        </TableCell>
                      )}

                      {/* Date & Time Window */}
                      {visibleColumns.includes("date") && (
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="text-xs font-medium text-foreground">
                              {op.date}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="size-2.5" />
                              <span>{op.timeWindow || "08:00 AM - 12:00 PM"}</span>
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {/* Slots / Progress */}
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
                              {op.petsVaccinated}/{op.petsTarget}
                            </span>
                          </div>
                        </TableCell>
                      )}

                      {/* Public Announcement Status */}
                      {visibleColumns.includes("announcement") && (
                        <TableCell>
                          {op.status === "completed" ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground border-border bg-muted/20"
                            >
                              Auto-Archived
                            </Badge>
                          ) : op.status === "cancelled" ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground border-border bg-muted/20"
                            >
                              Cancelled
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAnnouncementModalOp(op)}
                              className="h-6 px-1.5 text-[10px] text-amber-600 dark:text-amber-400 gap-1 hover:bg-amber-500/10 cursor-pointer"
                              title="Click to preview public citizen announcement"
                            >
                              <Megaphone className="size-3" />
                              <span>Live Notice</span>
                            </Button>
                          )}
                        </TableCell>
                      )}

                      {/* Status */}
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

                      {/* Actions */}
                      {visibleColumns.includes("actions") && (
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              {op.status === "scheduled" && (
                                <DropdownMenuItem
                                  onClick={() => handleStartVisit(op)}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Play className="size-3.5 text-blue-500" />
                                  <span>Start Visit (In Progress)</span>
                                </DropdownMenuItem>
                              )}

                              {op.status !== "completed" && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkComplete(op)}
                                  className="gap-2 cursor-pointer font-semibold text-emerald-600 dark:text-emerald-400"
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  <span>Mark Completed</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => setAnnouncementModalOp(op)}
                                className="gap-2 cursor-pointer"
                              >
                                <Megaphone className="size-3.5 text-amber-500" />
                                <span>View Public Notice</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setProfileModalVet(vetProfile)}
                                className="gap-2 cursor-pointer"
                              >
                                <User className="size-3.5 text-primary" />
                                <span>Attending Vet Profile</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleDelete(op)}
                                className="gap-2 text-destructive cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                                <span>Cancel & Delete Drive</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* ── Modal 1: Veterinarian Profile Dialog ── */}
      <Dialog open={!!profileModalVet} onOpenChange={(open) => !open && setProfileModalVet(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {profileModalVet && (
            <div>
              <div className="p-6 pb-4 bg-muted/20 border-b border-border/60 flex items-start gap-4">
                <Avatar className="size-16 rounded-xl border border-primary/30 shrink-0">
                  <AvatarImage
                    src={profileModalVet.avatarUrl || "/dr-helen-tacandong.jpg"}
                    alt={profileModalVet.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-xl text-base font-bold bg-primary/10 text-primary">
                    {profileModalVet.name
                      .replace("Dr.", "")
                      .trim()
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base font-bold text-foreground">
                      {profileModalVet.name}
                    </DialogTitle>
                  </div>
                  <DialogDescription className="sr-only">
                    Profile credentials and field outreach duties for {profileModalVet.name}
                  </DialogDescription>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">
                    {profileModalVet.licenseNo}
                  </Badge>
                  <p className="text-xs text-primary font-medium">
                    {profileModalVet.title}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Designation & Specialization
                  </span>
                  <p className="text-foreground font-semibold">{profileModalVet.role}</p>
                  <p className="text-muted-foreground mt-0.5">{profileModalVet.specialization}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Official Duties in Field Outreach
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {profileModalVet.bio || "Leads mobile veterinary outreach operations, physical diagnostics, rabies cold-chain vaccination, and surgical spay/neuter drives."}
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Contact & Office Credentials
                  </span>
                  <p className="text-muted-foreground flex items-center justify-between">
                    <span>Email:</span>
                    <strong className="text-foreground">{profileModalVet.email}</strong>
                  </p>
                  <p className="text-muted-foreground flex items-center justify-between">
                    <span>Hotline:</span>
                    <strong className="text-foreground">{profileModalVet.phone}</strong>
                  </p>
                  <p className="text-muted-foreground flex items-center justify-between">
                    <span>Office:</span>
                    <strong className="text-foreground">City Veterinary Office (CVO)</strong>
                  </p>
                </div>

                <Button
                  className="w-full text-xs cursor-pointer"
                  onClick={() => setProfileModalVet(null)}
                >
                  Close Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal 2: Public Announcement Notice Preview ── */}
      <Dialog open={!!announcementModalOp} onOpenChange={(open) => !open && setAnnouncementModalOp(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {announcementModalOp && (
            <div>
              <div className="p-6 pb-4 bg-muted/20 border-b border-border/60">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                  <Megaphone className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Official Public Announcement Broadcast
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  CVO Outreach Visit: Brgy. {announcementModalOp.barangay}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  This notice is live for residents of Barangay {announcementModalOp.barangay} on the Pet Owner Portal.
                </DialogDescription>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                      Scheduled Date
                    </span>
                    <p className="font-bold text-foreground mt-0.5">{announcementModalOp.date}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                      Operating Hours
                    </span>
                    <p className="font-bold text-foreground mt-0.5">{announcementModalOp.timeWindow || "08:00 AM - 12:00 PM"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                      Outreach Venue
                    </span>
                    <p className="font-bold text-foreground mt-0.5">{announcementModalOp.venue || "Barangay Covered Court / Hall"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                      Attending Veterinarian
                    </span>
                    <p className="font-bold text-foreground mt-0.5">{announcementModalOp.lead}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Public Services Announced
                  </span>
                  <div className="space-y-1 text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Stethoscope className="size-3 text-blue-500 shrink-0" />
                      <span>Clinical Consultation (Physical examination & health advice)</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Syringe className="size-3 text-emerald-500 shrink-0" />
                      <span>Mass Anti-Rabies Vaccination & Core Immunization</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Scissors className="size-3 text-purple-500 shrink-0" />
                      <span>Free Community Spay & Neuter (Kapon) Surgical Program</span>
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground block mb-0.5">Automatic Lifecycle:</strong>
                  When this outreach is concluded or marked completed by the field team, this public announcement will be automatically removed from public feeds.
                </div>

                <div className="flex gap-2">
                  {announcementModalOp.status !== "completed" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        handleMarkComplete(announcementModalOp);
                        setAnnouncementModalOp(null);
                      }}
                      className="flex-1 text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="size-3.5 mr-1.5" />
                      Conclude & Auto-Delete Notice
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAnnouncementModalOp(null)}
                    className="text-xs cursor-pointer"
                  >
                    Close
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
