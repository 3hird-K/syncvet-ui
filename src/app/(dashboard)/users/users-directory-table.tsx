"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Copy,
  Crown,
  Search,
  User,
  Settings2,
} from "lucide-react";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { type SyncVetUser, formatRoleLabel } from "@/data/syncvet-users";
import { TablePagination } from "@/components/dashboard/table-pagination";

function truncateId(id: string) {
  if (id.length <= 16) return id;
  return `${id.slice(0, 10)}…`;
}

export function UsersDirectoryTable({ users }: { users: SyncVetUser[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedUser, setSelectedUser] = useState<SyncVetUser | null>(null);

  const columns = [
    { id: "user", label: "User", required: true },
    { id: "id", label: "User ID" },
    { id: "email", label: "Email" },
    { id: "role", label: "Role" },
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
    if (!q) return users;
    return users.filter((u) => {
      const roleLabel = formatRoleLabel(u.role).toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        roleLabel.includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [users, query]);

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
    } catch {
      // ignore
    }
  }, []);

  const handleUpdate = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
      loading: "Saving user changes...",
      success: "User profile updated successfully.",
      error: "Failed to update profile.",
    });
    setSelectedUser(null);
  };

  const handleDelete = () => {
    toast.promise(new Promise((_, reject) => setTimeout(() => reject(new Error("DB Error")), 1200)), {
      loading: "Authenticating admin privileges...",
      success: "User account deleted.",
      error: "Database Connection Error. Deletion aborted.",
    });
    setSelectedUser(null);
  };

  return (
    <Card>
      <CardHeader className="px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold">User Directory</CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground/60">
              All SyncVet accounts across the CDO City Veterinary Office
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 w-full sm:w-64 pl-8 text-xs bg-muted/20"
                placeholder="Search users, emails, or roles..."
                value={query}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search users"
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
              {visibleColumns.includes("user") && <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">User</TableHead>}
              {visibleColumns.includes("id") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">User ID</TableHead>}
              {visibleColumns.includes("email") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Email</TableHead>}
              {visibleColumns.includes("role") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Role</TableHead>}
              {visibleColumns.includes("status") && <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="py-8 text-center text-muted-foreground">
                  No users match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/50">
                  {visibleColumns.includes("user") && (
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 shrink-0 border border-border">
                          <AvatarFallback
                            className={cn("text-[10px] font-semibold text-white", u.avatarClass)}
                          >
                            {u.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight truncate">{u.fullName}</p>
                          {u.pendingForecasts ? (
                            <p className="text-[10px] font-medium text-primary">
                              {u.pendingForecasts} pending forecast{u.pendingForecasts > 1 ? "s" : ""}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes("id") && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyId(u.id)}
                          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={`Copy ID for ${u.fullName}`}
                        >
                          <Copy className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="font-mono text-[10px] text-muted-foreground hover:underline hover:text-primary transition-colors text-left truncate"
                        >
                          {truncateId(u.id)}
                        </button>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes("email") && <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>}
                  {visibleColumns.includes("role") && (
                    <TableCell>
                      {u.role === "administrator" ? (
                        <Badge
                          variant="roleAdmin"
                          className="rounded-full px-2 py-0.5 text-[10px] gap-1"
                        >
                          <Crown className="size-3" />
                          {formatRoleLabel(u.role)}
                        </Badge>
                      ) : (
                        <Badge
                          variant="role"
                          className="rounded-full px-2 py-0.5 text-[10px] gap-1"
                        >
                          <User className="size-3" />
                          {formatRoleLabel(u.role)}
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes("status") && (
                    <TableCell>
                      <Badge className={cn("text-[10px]", u.online ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25" : "bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25")}>
                        {u.online ? "Online" : "Offline"}
                      </Badge>
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
          totalItems={totalFiltered}
          itemLabel="users"
          onPageChange={setPage}
          onPageSizeChange={onPageSizeChange}
        />

        <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <SheetContent className="sm:max-w-md w-full overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-xl font-bold">Edit User Profile</SheetTitle>
            </SheetHeader>
            {selectedUser && (
              <div className="flex flex-col gap-6">
                {/* Header Profile Section */}
                <div className="flex flex-col items-center justify-center mt-4 mb-2">
                  <div className="relative mb-3">
                    <Avatar className="size-20 border-2 border-background shadow-sm">
                      <AvatarFallback className={cn("text-2xl font-bold text-white", selectedUser.avatarClass)}>
                        {selectedUser.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "absolute bottom-0.5 right-0.5 size-5 rounded-full border-2 border-background",
                        selectedUser.online ? "bg-emerald-500" : "bg-zinc-400"
                      )}
                    />
                  </div>
                  <h3 className="text-lg font-bold">{selectedUser.fullName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>

                <div className="h-px w-full bg-border/50" />

                {/* Form Fields */}
                <div className="grid gap-4 px-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="first-name" className="text-xs font-bold px-1">First Name</Label>
                      <Input
                        id="first-name"
                        defaultValue={selectedUser.fullName.split(' ')[0]}
                        className="h-10 rounded-full px-4"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="last-name" className="text-xs font-bold px-1">Last Name</Label>
                      <Input
                        id="last-name"
                        defaultValue={selectedUser.fullName.split(' ').slice(1).join(' ')}
                        className="h-10 rounded-full px-4"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="role" className="text-xs font-bold px-1">Account Type (Role)</Label>
                    <Select defaultValue={selectedUser.role}>
                      <SelectTrigger id="role" className="h-10 rounded-full px-4">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrator">Administrator</SelectItem>
                        <SelectItem value="lead-veterinarian">Lead Veterinarian</SelectItem>
                        <SelectItem value="field-officer">Field Officer</SelectItem>
                        <SelectItem value="encoder">Data Encoder</SelectItem>
                        <SelectItem value="viewer">User (Read-only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-muted/30 border border-border/50 rounded-md p-3 text-xs text-muted-foreground">
                    Administrators have full CRUD access. Staff can add data but require Admin to officially approve it.
                  </div>
                </div>

                <div className="h-px w-full bg-border/50 mt-2" />

                {/* Actions */}
                <div className="flex flex-col gap-3 mt-4 px-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="w-full h-10 font-semibold rounded-full border-border/50" onClick={() => setSelectedUser(null)}>
                      Cancel
                    </Button>
                    <Button variant="default" className="w-full h-10 font-semibold rounded-full bg-[#2094f3] hover:bg-[#1a7bc9] text-white" onClick={handleUpdate}>
                      Save Changes
                    </Button>
                  </div>
                  <Button variant="destructive" className="w-full h-10 font-semibold rounded-full bg-[#b01e28] hover:bg-[#8c171f] text-white mt-1" onClick={handleDelete}>
                    Delete Profile
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}
