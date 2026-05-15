"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Copy,
  Crown,
  Search,
  User,
  Filter,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold">User Directory</CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground/60">
              All SyncVet accounts across the CDO City Veterinary Office
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 w-64 pl-8 text-xs"
                placeholder="Search users, emails, or roles..."
                value={query}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Search users"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Filter className="size-3" /> Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">User</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">User ID</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Email</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Role</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Status</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No users match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/50">
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
                      <code className="font-mono text-[10px] text-muted-foreground truncate">
                        {truncateId(u.id)}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
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
                  <TableCell>
                    <Badge className={cn("text-[10px]", u.online ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25" : "bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25")}>
                      {u.online ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full px-2.5 text-[10px] font-semibold uppercase"
                    >
                      Edit
                    </Button>
                  </TableCell>
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
      </CardContent>
    </Card>
  );
}
