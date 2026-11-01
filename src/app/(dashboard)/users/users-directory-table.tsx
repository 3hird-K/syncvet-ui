"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Copy,
  Crown,
  Search,
  ShieldCheck,
  Stethoscope,
  Syringe,
  PawPrint,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Lock,
  Download,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Clock,
  Sparkles,
  RefreshCw,
  Dog,
  Cat,
  BadgeCheck,
  MapPin,
  KeyRound,
  UserCog,
  Fingerprint,
  X,
  Save,
} from "lucide-react";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
import { ExportTableDialog } from "@/components/dashboard/export-table-dialog";
import { UserProfileDialog } from "@/components/dashboard/user-profile-dialog";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  type SupabaseUser,
  type SyncVetRole,
  SYNCVET_ROLES,
  normalizeSyncVetRole,
} from "@/data/syncvet-users";
import { cvoBarangays } from "@/data/cvo-store";
import {
  type SupabasePet,
  type SupabaseAppointment,
  type SupabaseTransaction,
} from "@/types/supabase.types";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function truncateId(id: string) {
  if (id.length <= 16) return id;
  return `${id.slice(0, 10)}…`;
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getInitials(name: string | null, email: string) {
  if (name && name.trim()) {
    return name
      .trim()
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "U";
}

function getAvatarBackground(role: SyncVetRole) {
  switch (role) {
    case "Administrator":
      return "bg-gradient-to-br from-rose-600 to-red-800 text-white";
    case "Veterinarian":
      return "bg-gradient-to-br from-emerald-600 to-teal-800 text-white";
    case "Pet Owner":
    default:
      return "bg-gradient-to-br from-purple-600 to-indigo-800 text-white";
  }
}

interface UsersDirectoryTableProps {
  users: SupabaseUser[];
  loading?: boolean;
  stats?: {
    total: number;
    admins: number;
    veterinarians: number;
    petOwners: number;
  };
  onUserUpdated?: (user: SupabaseUser) => void;
  onUserDeleted?: (id: string) => void;
}

export function UsersDirectoryTable({
  users,
  loading = false,
  stats,
  onUserUpdated,
  onUserDeleted,
}: UsersDirectoryTableProps) {
  const [query, setQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Profile Modal State
  const [selectedUser, setSelectedUser] = useState<SupabaseUser | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();
  const { user: currentClerkUser } = useUser();

  // Determine if active session user has Admin privileges
  const currentUserRole = useMemo(() => {
    if (!currentClerkUser) return "Pet Owner";
    const userInDb = users.find(
      (u) =>
        u.id === currentClerkUser.id ||
        (currentClerkUser.primaryEmailAddress?.emailAddress &&
          u.email.toLowerCase() ===
            currentClerkUser.primaryEmailAddress.emailAddress.toLowerCase())
    );
    const roleString =
      userInDb?.role ||
      (currentClerkUser.unsafeMetadata?.roleTitle as string) ||
      (currentClerkUser.publicMetadata?.role as string);
    return normalizeSyncVetRole(roleString);
  }, [currentClerkUser, users]);

  const isAdmin = currentUserRole === "Administrator";

  const columns = [
    { id: "user", label: "User", required: true },
    { id: "id", label: "User ID" },
    { id: "email", label: "Email" },
    { id: "role", label: "Role" },
    { id: "phone", label: "Contact" },
    { id: "created_at", label: "Joined Date" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "user",
    "id",
    "email",
    "role",
    "phone",
    "created_at",
  ]);

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Open User Profile Dialog
  const handleOpenEdit = (u: SupabaseUser) => {
    setSelectedUser(u);
  };

  // Filter users by role and search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const userRole = normalizeSyncVetRole(u.role);

      if (selectedRoleFilter !== "all" && userRole !== selectedRoleFilter) {
        return false;
      }

      if (!q) return true;
      const fullName = (u.full_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = userRole.toLowerCase();
      const id = (u.id || "").toLowerCase();
      const phone = (u.phone_number || "").toLowerCase();
      const address = (u.address || "").toLowerCase();

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        role.includes(q) ||
        id.includes(q) ||
        phone.includes(q) ||
        address.includes(q)
      );
    });
  }, [users, query, selectedRoleFilter]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageSliceStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageSliceStart, pageSliceStart + pageSize);

  const onSearchChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const onPageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const copyId = useCallback(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("User ID copied to clipboard");
    } catch {
      toast.error("Failed to copy ID");
    }
  }, []);

  // Export CSV Handler
  const handleExportCSV = (exportList: SupabaseUser[], filterSummary?: string) => {
    if (exportList.length === 0) {
      toast.error("No users to export in current selection.");
      return;
    }

    const headers = [
      "User ID",
      "Full Name",
      "First Name",
      "Last Name",
      "Email",
      "Role",
      "Contact Number",
      "Address",
      "Joined Date",
    ];

    const escapeCSV = (val: string | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = exportList.map((u) => [
      escapeCSV(u.id),
      escapeCSV(u.full_name || "SyncVet User"),
      escapeCSV(u.first_name || ""),
      escapeCSV(u.last_name || ""),
      escapeCSV(u.email),
      escapeCSV(normalizeSyncVetRole(u.role)),
      escapeCSV(u.phone_number || ""),
      escapeCSV(u.address || ""),
      escapeCSV(formatDate(u.created_at)),
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `syncvet-users-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${exportList.length} users to CSV${filterSummary ? ` (${filterSummary})` : ""}`);
  };

  const renderRoleBadge = (rawRole: string | null) => {
    const role = normalizeSyncVetRole(rawRole);
    switch (role) {
      case "Administrator":
        return (
          <Badge
            variant="outline"
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold gap-1 bg-rose-500/10 text-rose-500 border-rose-500/20"
          >
            <UserCog className="size-3" />
            Administrator
          </Badge>
        );
      case "Veterinarian":
        return (
          <Badge
            variant="outline"
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          >
            <Stethoscope className="size-3" />
            Veterinarian
          </Badge>
        );
      case "Pet Owner":
      default:
        return (
          <Badge
            variant="outline"
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold gap-1 bg-purple-500/10 text-purple-400 border-purple-500/20"
          >
            <PawPrint className="size-3" />
            Pet Owner
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="px-6 py-5 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold">User Directory</CardTitle>
              {isAdmin ? (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider"
                >
                  Admin Mode
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground border-border text-[10px] font-medium px-2 py-0.5"
                >
                  Read-Only Mode
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              All registered accounts synchronized in real-time from Supabase
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown Filter */}
            <Select
              value={selectedRoleFilter}
              onValueChange={(val) => {
                setSelectedRoleFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-44 text-xs bg-muted/20 rounded-lg">
                <SelectValue placeholder="Category: All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Crown className="size-3 text-muted-foreground" />
                    <span>All Users ({users.length})</span>
                  </div>
                </SelectItem>
                {SYNCVET_ROLES.map((role) => {
                  const count = users.filter(
                    (u) => normalizeSyncVetRole(u.role) === role
                  ).length;
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {role === "Administrator" && (
                          <UserCog className="size-3 text-rose-500" />
                        )}
                        {role === "Veterinarian" && (
                          <Stethoscope className="size-3 text-emerald-500" />
                        )}
                        {role === "Pet Owner" && (
                          <PawPrint className="size-3 text-purple-400" />
                        )}
                        <span>
                          {role} ({count})
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 w-full sm:w-60 pl-8 text-xs bg-muted/20"
                placeholder="Search by name, email, or role..."
                value={query}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search users"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg border-border/60 cursor-pointer"
              title="Download filtered users to CSV"
            >
              <Download className="size-3.5 text-primary" />
              <span className="hidden sm:inline">CSV</span>
            </Button>

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
            <TableRow className="border-b border-border/60 hover:bg-transparent">
              {visibleColumns.includes("user") && (
                <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">
                  User
                </TableHead>
              )}
              {visibleColumns.includes("id") && (
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                  User ID
                </TableHead>
              )}
              {visibleColumns.includes("email") && (
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                  Email
                </TableHead>
              )}
              {visibleColumns.includes("role") && (
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                  Role
                </TableHead>
              )}
              {visibleColumns.includes("phone") && (
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                  Contact
                </TableHead>
              )}
              {visibleColumns.includes("created_at") && (
                <TableHead className="text-[10px] font-bold uppercase tracking-widest pr-6">
                  Joined
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-xs">Fetching users from Supabase...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="py-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <p className="text-sm font-semibold">No users found</p>
                    <p className="text-xs text-muted-foreground/80">
                      {query
                        ? `No accounts matching "${query}"`
                        : "No users registered with this role category."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((u, idx) => {
                const normalizedRole = normalizeSyncVetRole(u.role);
                const initials = getInitials(u.full_name, u.email);
                const avatarBg = getAvatarBackground(normalizedRole);

                return (
                  <TableRow
                    key={`${u.id}-${idx}`}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => handleOpenEdit(u)}
                  >
                    {visibleColumns.includes("user") && (
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 shrink-0 border border-border">
                            {u.avatar_url && (
                              <AvatarImage
                                src={u.avatar_url}
                                alt={u.full_name || u.email}
                              />
                            )}
                            <AvatarFallback
                              className={cn("text-xs font-bold", avatarBg)}
                            >
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate text-foreground group-hover:text-primary transition-colors">
                              {u.full_name || "SyncVet User"}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              Joined {formatDate(u.created_at)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.includes("id") && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyId(u.id)}
                            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={`Copy ID for ${u.full_name || u.email}`}
                          >
                            <Copy className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="font-mono text-[11px] text-muted-foreground hover:underline hover:text-primary transition-colors text-left truncate"
                          >
                            {truncateId(u.id)}
                          </button>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.includes("email") && (
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                          <Mail className="size-3 shrink-0 opacity-60" />
                          <span className="truncate">{u.email}</span>
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.includes("role") && (
                      <TableCell>{renderRoleBadge(u.role)}</TableCell>
                    )}

                    {visibleColumns.includes("phone") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {u.phone_number ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="size-3 shrink-0 opacity-60" />
                            <span>{u.phone_number}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.includes("created_at") && (
                      <TableCell className="text-xs text-muted-foreground pr-6">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3 shrink-0 opacity-60" />
                          <span>{formatDate(u.created_at)}</span>
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
          totalItems={totalFiltered}
          itemLabel="users"
          onPageChange={setPage}
          onPageSizeChange={onPageSizeChange}
        />

        {/* ── User Profile Dialog Modal ── */}
        <UserProfileDialog
          user={selectedUser}
          open={!!selectedUser}
          onOpenChange={(open) => {
            if (!open) setSelectedUser(null);
          }}
          isAdmin={isAdmin}
          onUserUpdated={(updated) => {
            setSelectedUser(updated);
            queryClient.invalidateQueries({ queryKey: ["users"] });
            if (onUserUpdated) onUserUpdated(updated);
          }}
          onUserDeleted={(deletedId) => {
            setSelectedUser(null);
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["supabase-owners"] });
            queryClient.invalidateQueries({ queryKey: ["supabase-pet-owners-list"] });
            if (onUserDeleted) onUserDeleted(deletedId);
          }}
        />

        {/* ── Pre-Export Filter Dialog ── */}
        <ExportTableDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          title="Export Users Directory"
          description="Filter users by registration date (day, month, year, or range) and assigned role before exporting to CSV."
          data={users}
          dateExtractor={(u) => u.created_at}
          customFilters={[
            {
              id: "role",
              label: "User Role",
              placeholder: "All Roles",
              options: [
                { label: "All Roles", value: "ALL" },
                { label: "Administrators", value: "Administrator" },
                { label: "Veterinarians", value: "Veterinarian" },
                { label: "Pet Owners", value: "Pet Owner" },
              ],
              predicate: (u, val) => {
                if (val === "ALL") return true;
                return normalizeSyncVetRole(u.role) === val;
              },
            },
          ]}
          onExport={handleExportCSV}
        />
      </CardContent>
    </Card>
  );
}
