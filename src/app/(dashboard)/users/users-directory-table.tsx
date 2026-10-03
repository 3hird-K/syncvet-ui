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
} from "lucide-react";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  type SupabaseUser,
  type SyncVetRole,
  SYNCVET_ROLES,
  normalizeSyncVetRole,
} from "@/data/syncvet-users";
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
    case "Vaccinator":
      return "bg-gradient-to-br from-cyan-600 to-blue-800 text-white";
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
    vaccinators: number;
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

  // Profile Drawer State
  const [selectedUser, setSelectedUser] = useState<SupabaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>("pets");

  // Edit Fields State
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState<SyncVetRole>("Pet Owner");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Determine viewing mode / permissions automatically based on the logged-in user's role
  const userPerspective: "admin" | "veterinary" | "pet_owner" = useMemo(() => {
    if (currentUserRole === "Administrator") return "admin";
    if (currentUserRole === "Veterinarian" || currentUserRole === "Vaccinator") return "veterinary";
    return "pet_owner";
  }, [currentUserRole]);

  // Fetch pets owned by selectedUser
  const { data: userPets = [], isLoading: loadingPets } = useQuery<SupabasePet[]>({
    queryKey: ["user-pets", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", selectedUser.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching user pets:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!selectedUser?.id,
  });

  // Fetch appointments for selectedUser
  const { data: userAppointments = [], isLoading: loadingAppointments } = useQuery<SupabaseAppointment[]>({
    queryKey: ["user-appointments", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("owner_id", selectedUser.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching user appointments:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!selectedUser?.id,
  });

  // Fetch service transactions for selectedUser
  const { data: userTransactions = [], isLoading: loadingTransactions } = useQuery<SupabaseTransaction[]>({
    queryKey: ["user-transactions", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const { data, error } = await supabase
        .from("service_transactions")
        .select("*")
        .eq("owner_id", selectedUser.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching user transactions:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!selectedUser?.id,
  });

  // Merge any metadata pets if present
  const allPets = useMemo(() => {
    const list: SupabasePet[] = [...userPets];
    if (selectedUser?.raw_user_meta_data && typeof selectedUser.raw_user_meta_data === "object") {
      const meta = selectedUser.raw_user_meta_data as { pets?: any[] };
      if (Array.isArray(meta.pets)) {
        for (const mp of meta.pets) {
          if (mp && mp.name && !list.some((p) => p.name.toLowerCase() === String(mp.name).toLowerCase())) {
            list.push({
              id: mp.id || `meta-${mp.name}`,
              owner_id: selectedUser.id,
              name: String(mp.name),
              species: String(mp.species || mp.type || "dog"),
              breed: (mp.breed as string) || null,
              birth_year: typeof mp.birthYear === "number" ? mp.birthYear : null,
              gender: (mp.gender as string) || null,
              is_vaccinated: Boolean(mp.isVaccinated),
              rabies_vaccinated: Boolean(mp.rabiesVaccinated || mp.vaccinated),
              is_spayed_neutered: Boolean(mp.isSpayedNeutered),
              weight_category: (mp.weightCategory as string) || null,
              microchip_number: (mp.microchipNumber || mp.microchip as string) || null,
              notes: (mp.notes as string) || null,
              photo_url: null,
              avatar_id: (mp.avatarId as string) || null,
              vaccination_doses: 0,
              last_vaccination_date: null,
              next_vaccination_date: null,
              created_at: (mp.createdAt as string) || new Date().toISOString(),
              updated_at: (mp.updatedAt as string) || new Date().toISOString(),
            });
          }
        }
      }
    }
    return list;
  }, [userPets, selectedUser]);

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
  ]);

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Open User Dossier & Management Console
  const handleOpenEdit = (u: SupabaseUser) => {
    setSelectedUser(u);
    setEditFirstName(u.first_name || (u.full_name ? u.full_name.split(" ")[0] : ""));
    setEditLastName(
      u.last_name ||
        (u.full_name && u.full_name.split(" ").length > 1
          ? u.full_name.split(" ").slice(1).join(" ")
          : "")
    );
    setEditRole(normalizeSyncVetRole(u.role));
    setEditPhoneNumber(u.phone_number || "");
    setEditAddress(u.address || "");
    setActiveTab("pets");
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

  // Save Changes via Supabase (Admin Only)
  const handleSaveUser = async () => {
    if (!selectedUser) return;

    if (!isAdmin) {
      toast.error("Access denied. Only Administrators can edit user accounts.");
      return;
    }

    setIsSaving(true);
    const updatedFullName =
      `${editFirstName.trim()} ${editLastName.trim()}`.trim() || selectedUser.email;

    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
          full_name: updatedFullName,
          role: editRole,
          phone_number: editPhoneNumber.trim() || null,
          address: editAddress.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedUser.id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error:", error);
        toast.error(`Update failed: ${error.message}`);
        return;
      }

      toast.success(`User updated to ${editRole} successfully`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (onUserUpdated && data) {
        onUserUpdated(data);
      }
      setSelectedUser(null);
    } catch (err) {
      console.error("Unexpected update error:", err);
      toast.error("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete User via Supabase (Admin Only)
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (!isAdmin) {
      toast.error("Access denied. Only Administrators can delete user accounts.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${selectedUser.full_name || selectedUser.email}" from the directory?`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", selectedUser.id);

      if (error) {
        console.error("Supabase delete error:", error);
        toast.error(`Deletion failed: ${error.message}`);
        return;
      }

      toast.success("User account deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (onUserDeleted) {
        onUserDeleted(selectedUser.id);
      }
      setSelectedUser(null);
    } catch (err) {
      console.error("Unexpected delete error:", err);
      toast.error("Failed to delete user profile.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Export current table view
  const handleExportCurrentView = () => {
    if (filtered.length === 0) {
      toast.error("No users to export in current view.");
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

    const rows = filtered.map((u) => [
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
    link.setAttribute("download", `syncvet-filtered-users-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filtered.length} filtered users to CSV`);
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
            <ShieldCheck className="size-3" />
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
      case "Vaccinator":
        return (
          <Badge
            variant="outline"
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold gap-1 bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
          >
            <Syringe className="size-3" />
            Vaccinator
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
                          <ShieldCheck className="size-3 text-rose-500" />
                        )}
                        {role === "Vaccinator" && (
                          <Syringe className="size-3 text-cyan-500" />
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
              onClick={handleExportCurrentView}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg border-border/60"
              title="Download current filtered list to CSV"
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
                <TableHead className="text-[10px] font-bold uppercase tracking-widest">
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
              pageRows.map((u) => {
                const normalizedRole = normalizeSyncVetRole(u.role);
                const initials = getInitials(u.full_name, u.email);
                const avatarBg = getAvatarBackground(normalizedRole);

                return (
                  <TableRow
                    key={u.id}
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
                      <TableCell className="text-xs text-muted-foreground">
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

        {/* ── 80% Width User Profile Dossier & Management Console ── */}
        <Sheet
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
        >
          <SheetContent className="!sm:max-w-[80vw] !w-[80vw] !max-w-[85vw] p-0 flex flex-col h-full bg-background border-l border-border/80 shadow-2xl overflow-hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>
                {selectedUser ? `${selectedUser.full_name || selectedUser.email || "User"} Profile Dossier` : "User Profile Dossier"}
              </SheetTitle>
              <SheetDescription>
                Detailed overview of user pets, appointments, services, and account details.
              </SheetDescription>
            </SheetHeader>
            {selectedUser && (
              <motion.div
                key={selectedUser.id}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col h-full overflow-hidden"
              >
                {/* ── Top Header Section ── */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="px-7 py-5 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar className="size-14 shrink-0 border-2 border-border shadow-md">
                      {selectedUser.avatar_url && (
                        <AvatarImage
                          src={selectedUser.avatar_url}
                          alt={selectedUser.full_name || selectedUser.email}
                        />
                      )}
                      <AvatarFallback
                        className={cn(
                          "text-lg font-bold",
                          getAvatarBackground(editRole)
                        )}
                      >
                        {getInitials(selectedUser.full_name, selectedUser.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-extrabold text-foreground truncate">
                          {selectedUser.full_name || "SyncVet User"}
                        </h2>
                        {renderRoleBadge(editRole)}
                        {selectedUser.profile_completed ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          >
                            <CheckCircle2 className="size-3 mr-1" /> Profile Verified
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          >
                            <Clock className="size-3 mr-1" /> Pending Profile
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Mail className="size-3.5 text-muted-foreground/70" />
                          <span>{selectedUser.email}</span>
                        </div>
                        {selectedUser.phone_number && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="size-3.5 text-muted-foreground/70" />
                            <span>{selectedUser.phone_number}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80">
                          <span>ID: {selectedUser.id}</span>
                          <button
                            type="button"
                            onClick={() => copyId(selectedUser.id)}
                            className="hover:text-primary p-0.5"
                            title="Copy ID"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Active Mode / Permissions Badge + Save Button */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {userPerspective === "admin" && (
                      <Badge
                        variant="outline"
                        className="h-9 px-3.5 border-primary/30 text-primary bg-primary/10 gap-2 text-xs font-semibold rounded-xl inline-flex items-center"
                      >
                        <ShieldCheck className="size-4" />
                        <span>Admin Access</span>
                      </Badge>
                    )}
                    {userPerspective === "veterinary" && (
                      <Badge
                        variant="outline"
                        className="h-9 px-3.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-2 text-xs font-semibold rounded-xl inline-flex items-center"
                      >
                        <Stethoscope className="size-4" />
                        <span>Veterinary Clinical Access</span>
                      </Badge>
                    )}
                    {userPerspective === "pet_owner" && (
                      <Badge
                        variant="outline"
                        className="h-9 px-3.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 gap-2 text-xs font-semibold rounded-xl inline-flex items-center"
                      >
                        <PawPrint className="size-4" />
                        <span>Pet Owner View</span>
                      </Badge>
                    )}

                    {isAdmin && (
                      <Button
                        size="sm"
                        onClick={handleSaveUser}
                        disabled={isSaving || isDeleting}
                        className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl shadow-sm cursor-pointer inline-flex items-center"
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                  </div>
                </motion.div>

                {/* ── Metrics Ribbon ── */}
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="px-7 py-2.5 bg-muted/10 border-b border-border/40 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <PawPrint className="size-4 text-purple-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Registered Pets
                      </p>
                      <p className="font-extrabold text-foreground">
                        {loadingPets ? "..." : allPets.length} Animal{allPets.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Rabies Vaccinated
                      </p>
                      <p className="font-extrabold text-foreground">
                        {allPets.filter((p) => p.rabies_vaccinated).length} of {allPets.length} Vaccinated
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-indigo-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Appointments
                      </p>
                      <p className="font-extrabold text-foreground">
                        {loadingAppointments ? "..." : userAppointments.length} Booked
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-cyan-400" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Service Records
                      </p>
                      <p className="font-extrabold text-foreground">
                        {loadingTransactions ? "..." : userTransactions.length} Transactions
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* ── Tabbed Dossier Body ── */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.14 }}
                    className="px-7 py-3 border-b border-border/40 bg-muted/10 flex items-center justify-between shrink-0"
                  >
                    <TabsList className="h-11 p-1 bg-muted/80 border border-border/60 rounded-xl gap-1">
                      <TabsTrigger
                        value="pets"
                        className="h-9 px-4 text-xs md:text-sm font-semibold gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/60 transition-all"
                      >
                        <PawPrint className="size-4 text-purple-500" />
                        <span>Registered Pets</span>
                        <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {allPets.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="appointments"
                        className="h-9 px-4 text-xs md:text-sm font-semibold gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/60 transition-all"
                      >
                        <Calendar className="size-4 text-blue-500" />
                        <span>Appointments</span>
                        <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {userAppointments.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="transactions"
                        className="h-9 px-4 text-xs md:text-sm font-semibold gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/60 transition-all"
                      >
                        <FileText className="size-4 text-amber-500" />
                        <span>Service Transactions</span>
                        <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {userTransactions.length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="account"
                        className="h-9 px-4 text-xs md:text-sm font-semibold gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-border/60 transition-all"
                      >
                        <User className="size-4 text-primary" />
                        <span>Account & Permissions</span>
                      </TabsTrigger>
                    </TabsList>

                    <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 pb-1">
                      {userPerspective === "veterinary" && (
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <Stethoscope className="size-3" /> Clinical History & Rabies Registry Active
                        </span>
                      )}
                      {userPerspective === "pet_owner" && (
                        <span className="text-purple-400 font-semibold flex items-center gap-1">
                          <PawPrint className="size-3" /> Digital Pet Passports & Owner View
                        </span>
                      )}
                      {userPerspective === "admin" && (
                        <span className="text-primary font-semibold flex items-center gap-1">
                          <ShieldCheck className="size-3" /> CVO Administrator Controls & Clinical Records
                        </span>
                      )}
                    </div>
                  </motion.div>

                  {/* ── TAB 1: REGISTERED PETS ── */}
                  <TabsContent value="pets" className="flex-1 p-7 overflow-y-auto m-0 space-y-4">
                    {/* Perspective Banner */}
                    {(userPerspective === "veterinary" || userPerspective === "admin") && (
                      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Stethoscope className="size-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              Veterinary Clinical Inspection Mode
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Reviewing animal patient health histories, rabies vaccination compliance, and municipal tag records for {selectedUser.full_name || selectedUser.email}.
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[10px] font-bold uppercase tracking-wider">
                          {userPerspective === "admin" ? "Admin Oversight" : "DVM Review"}
                        </Badge>
                      </div>
                    )}

                    {userPerspective === "pet_owner" && (
                      <div className="bg-purple-500/10 border border-purple-500/25 rounded-2xl p-4 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                            <PawPrint className="size-5 text-purple-500" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              Pet Owner Citizen View
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Full overview of your household pets, digital pet passports, and anti-rabies status registered with the City Veterinary Office.
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-500 bg-purple-500/10 text-[10px] font-bold uppercase tracking-wider">
                          Citizen Record
                        </Badge>
                      </div>
                    )}

                    {/* Pets Grid */}
                    {loadingPets ? (
                      <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-xs">Loading registered pets from Supabase...</span>
                      </div>
                    ) : allPets.length === 0 ? (
                      <div className="py-16 text-center border-2 border-dashed border-border/60 rounded-2xl p-8 space-y-2">
                        <div className="size-12 rounded-full bg-muted/40 mx-auto flex items-center justify-center text-muted-foreground">
                          <PawPrint className="size-6" />
                        </div>
                        <p className="text-sm font-bold text-foreground">No Pets Registered</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          This user account currently has no animals registered in the CDO municipal pet database.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allPets.map((pet) => {
                          const isDog = (pet.species || "").toLowerCase().includes("dog") || (pet.species || "").toLowerCase().includes("canine");
                          return (
                            <Card
                              key={pet.id}
                              className="border-border/70 hover:border-primary/50 transition-all rounded-2xl shadow-xs overflow-hidden group bg-card"
                            >
                              <CardHeader className="p-4 pb-3 border-b border-border/40">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                      {isDog ? (
                                        <Dog className="size-5 text-primary" />
                                      ) : (
                                        <Cat className="size-5 text-primary" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <h3 className="text-sm font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                                        {pet.name}
                                      </h3>
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        {pet.species || "Pet"} · {pet.breed || "Standard Breed"}
                                      </p>
                                    </div>
                                  </div>

                                  {pet.rabies_vaccinated ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px] font-semibold gap-1 shrink-0"
                                    >
                                      <ShieldCheck className="size-3" /> Vaccinated
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-500/10 text-amber-500 border-amber-500/25 text-[10px] font-semibold gap-1 shrink-0"
                                    >
                                      <AlertCircle className="size-3" /> Vaccine Due
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>

                              <CardContent className="p-4 space-y-3 text-xs">
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                  <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                                    <span className="text-muted-foreground/70 block text-[9px] uppercase font-bold">Gender & Age</span>
                                    <span className="font-semibold text-foreground">
                                      {pet.gender ? pet.gender.toUpperCase() : "Unknown"} {pet.birth_year ? `· Born ${pet.birth_year}` : ""}
                                    </span>
                                  </div>

                                  <div className="bg-muted/30 p-2 rounded-lg border border-border/40">
                                    <span className="text-muted-foreground/70 block text-[9px] uppercase font-bold">Neutered/Spayed</span>
                                    <span className="font-semibold text-foreground">
                                      {pet.is_spayed_neutered ? "Spayed / Neutered" : "Intact"}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1 pt-1 text-[11px] text-muted-foreground">
                                  <div className="flex items-center justify-between">
                                    <span>Microchip Number:</span>
                                    <span className="font-mono text-foreground font-medium">
                                      {pet.microchip_number || "Not microchipped"}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span>Weight Category:</span>
                                    <span className="text-foreground capitalize font-medium">
                                      {pet.weight_category || "Medium (10-25 kg)"}
                                    </span>
                                  </div>

                                  {pet.last_vaccination_date && (
                                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                                      <span>Last Anti-Rabies Shot:</span>
                                      <span>{formatDate(pet.last_vaccination_date)}</span>
                                    </div>
                                  )}

                                  {pet.next_vaccination_date && (
                                    <div className="flex items-center justify-between text-primary font-medium">
                                      <span>Next Booster Date:</span>
                                      <span>{formatDate(pet.next_vaccination_date)}</span>
                                    </div>
                                  )}
                                </div>

                                {pet.notes && (
                                  <div className="bg-muted/20 border border-border/30 rounded-lg p-2 text-[10px] text-muted-foreground">
                                    <strong className="text-foreground block mb-0.5">Clinical Remarks:</strong>
                                    {pet.notes}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* ── TAB 2: APPOINTMENTS ── */}
                  <TabsContent value="appointments" className="flex-1 p-7 overflow-y-auto m-0 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Service Appointments</h3>
                        <p className="text-xs text-muted-foreground">
                          Scheduled municipal veterinary consultations, drives, and checkups.
                        </p>
                      </div>
                    </div>

                    {loadingAppointments ? (
                      <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-xs">Loading appointments...</span>
                      </div>
                    ) : userAppointments.length === 0 ? (
                      <div className="py-16 text-center border-2 border-dashed border-border/60 rounded-2xl p-8 space-y-2">
                        <div className="size-12 rounded-full bg-muted/40 mx-auto flex items-center justify-center text-muted-foreground">
                          <Calendar className="size-6" />
                        </div>
                        <p className="text-sm font-bold text-foreground">No Scheduled Appointments</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          There are currently no active or previous appointments booked for this user in the municipal scheduler.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userAppointments.map((apt) => (
                          <div
                            key={apt.id}
                            className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-2xs hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-start gap-3.5">
                              <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                <Calendar className="size-5" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-foreground">
                                    {apt.service_id.replace(/_/g, " ").toUpperCase()}
                                  </h4>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] font-semibold capitalize",
                                      apt.status === "confirmed" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                      apt.status === "completed" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                      apt.status === "pending" && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    )}
                                  >
                                    {apt.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Pet: <strong>{apt.pet_name}</strong> · Location: {apt.location || "CDO City Veterinary Office"}
                                </p>
                                {apt.notes && (
                                  <p className="text-[11px] text-muted-foreground/80 italic">
                                    Note: {apt.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right text-xs shrink-0 bg-muted/20 md:bg-transparent p-2 md:p-0 rounded-lg">
                              <p className="font-bold text-foreground">{formatDate(apt.date)}</p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                                <Clock className="size-3" /> {apt.time_slot}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* ── TAB 3: SERVICE TRANSACTIONS ── */}
                  <TabsContent value="transactions" className="flex-1 p-7 overflow-y-auto m-0 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Service History & Registrations</h3>
                        <p className="text-xs text-muted-foreground">
                          Official municipal certificates, vaccinations, and registration records.
                        </p>
                      </div>
                    </div>

                    {loadingTransactions ? (
                      <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-xs">Loading transaction history...</span>
                      </div>
                    ) : userTransactions.length === 0 ? (
                      <div className="py-16 text-center border-2 border-dashed border-border/60 rounded-2xl p-8 space-y-2">
                        <div className="size-12 rounded-full bg-muted/40 mx-auto flex items-center justify-center text-muted-foreground">
                          <FileText className="size-6" />
                        </div>
                        <p className="text-sm font-bold text-foreground">No Transactions Recorded</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          No official service transactions or certifications have been logged under this account yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userTransactions.map((txn) => (
                          <div
                            key={txn.id}
                            className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-start gap-3.5">
                              <div className="size-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                                <BadgeCheck className="size-5" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-foreground leading-tight">
                                    {txn.title}
                                  </h4>
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-500/10 text-emerald-500 border-emerald-500/25 text-[10px] font-semibold capitalize"
                                  >
                                    {txn.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {txn.detail || "Municipal Animal Record"}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground/70">
                                  Ref: {txn.transaction_no}
                                </p>
                              </div>
                            </div>

                            <div className="text-left sm:text-right text-xs shrink-0">
                              <p className="font-semibold text-foreground">{formatDate(txn.date)}</p>
                              <Badge variant="outline" className="text-[9px] uppercase font-bold text-muted-foreground/70 mt-1">
                                {txn.transaction_type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* ── TAB 4: ACCOUNT & PERMISSIONS ── */}
                  <TabsContent value="account" className="flex-1 p-7 overflow-y-auto m-0 space-y-6">
                    {!isAdmin && (
                      <div className="bg-muted/60 border border-border/60 text-muted-foreground rounded-2xl p-4 flex items-center gap-3 text-xs">
                        <Lock className="size-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-bold text-foreground">Read-Only Access</p>
                          <p className="text-[11px] text-muted-foreground">
                            You are viewing this account in directory mode. Only CDO Administrators possess privileges to alter system roles or user metadata.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Personal Info Box */}
                      <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                          <User className="size-4 text-primary" />
                          <h4 className="text-sm font-bold text-foreground">Personal Information</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="first-name" className="text-xs font-semibold">First Name</Label>
                            <Input
                              id="first-name"
                              value={editFirstName}
                              onChange={(e) => setEditFirstName(e.target.value)}
                              disabled={!isAdmin}
                              className="h-9 text-xs rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="last-name" className="text-xs font-semibold">Last Name</Label>
                            <Input
                              id="last-name"
                              value={editLastName}
                              onChange={(e) => setEditLastName(e.target.value)}
                              disabled={!isAdmin}
                              className="h-9 text-xs rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-xs font-semibold">Email Address (Google/Clerk Auth)</Label>
                          <Input
                            id="email"
                            value={selectedUser.email}
                            disabled
                            className="h-9 text-xs rounded-xl bg-muted/40 cursor-not-allowed opacity-80"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-xs font-semibold">Contact Mobile Number</Label>
                          <Input
                            id="phone"
                            value={editPhoneNumber}
                            onChange={(e) => setEditPhoneNumber(e.target.value)}
                            placeholder="e.g. 09918552251"
                            disabled={!isAdmin}
                            className="h-9 text-xs rounded-xl"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="address" className="text-xs font-semibold">Barangay & Residential Address</Label>
                          <Input
                            id="address"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            placeholder="e.g. Carmen, Cagayan de Oro City"
                            disabled={!isAdmin}
                            className="h-9 text-xs rounded-xl"
                          />
                        </div>
                      </div>

                      {/* System Role & Permissions Box */}
                      <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                            <ShieldCheck className="size-4 text-rose-500" />
                            <h4 className="text-sm font-bold text-foreground">Access Level & System Role</h4>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="role" className="text-xs font-semibold">Designated System Role</Label>
                              {!isAdmin && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                                  <Lock className="size-2.5" /> Admin Lock
                                </span>
                              )}
                            </div>
                            <Select
                              value={editRole}
                              onValueChange={(val) => setEditRole(val as SyncVetRole)}
                              disabled={!isAdmin}
                            >
                              <SelectTrigger id="role" className="h-10 text-xs rounded-xl">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Administrator">
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck className="size-3.5 text-rose-500" />
                                    <span>Administrator (Full Administrative Control)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="Vaccinator">
                                  <div className="flex items-center gap-2">
                                    <Syringe className="size-3.5 text-cyan-500" />
                                    <span>Vaccinator (Field Drives & Operations)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="Veterinarian">
                                  <div className="flex items-center gap-2">
                                    <Stethoscope className="size-3.5 text-emerald-500" />
                                    <span>Veterinarian (Licensed Clinical DVM)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="Pet Owner">
                                  <div className="flex items-center gap-2">
                                    <PawPrint className="size-3.5 text-purple-400" />
                                    <span>Pet Owner (Citizen Pet Registry)</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="bg-muted/30 border border-border/40 rounded-xl p-3.5 text-xs text-muted-foreground space-y-1.5">
                            <p className="font-bold text-foreground">Role Specifications:</p>
                            <p>• <strong>Administrator:</strong> Manage directory, system configs & analytics.</p>
                            <p>• <strong>Vaccinator:</strong> Perform field tag verifications & mobile vaccination drives.</p>
                            <p>• <strong>Veterinarian:</strong> Inspect health records, certify rabies status & diagnosis.</p>
                            <p>• <strong>Pet Owner:</strong> Manage pet digital passports & municipal appointments.</p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="pt-4 border-t border-border/40">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleDeleteUser}
                              disabled={isSaving || isDeleting}
                              className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 h-9 rounded-xl cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                              {isDeleting ? "Deleting Account..." : "Permanently Delete User Account"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}
