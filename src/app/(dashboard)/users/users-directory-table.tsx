"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Search,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

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

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

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
    <div className="space-y-3">
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 pl-8"
          placeholder="Search users, emails, or roles…"
          value={query}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search users"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[32%] min-w-0">User</TableHead>
              <TableHead className="w-[30%] min-w-0">ID</TableHead>
              <TableHead className="w-[26%] min-w-0">Role</TableHead>
              <TableHead className="w-[12%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No users match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="min-w-0">
                    <div className="flex max-w-full items-center gap-2">
                      <Avatar className="size-8 shrink-0 border border-border">
                        <AvatarFallback
                          className={cn("text-[10px] font-semibold text-white", u.avatarClass)}
                        >
                          {u.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight">
                          {u.fullName}
                        </p>
                        <p className="truncate text-[11px] leading-tight text-muted-foreground">
                          {u.email}
                        </p>
                        {u.pendingForecasts ? (
                          <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-primary">
                            {u.pendingForecasts} pending forecast
                            {u.pendingForecasts > 1 ? "s" : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <div className="flex max-w-full items-center gap-1">
                      <button
                        type="button"
                        onClick={() => copyId(u.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`Copy ID for ${u.fullName}`}
                      >
                        <Copy className="size-3" />
                      </button>
                      <code className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                        {truncateId(u.id)}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <div className="flex min-w-0 justify-start">
                      {u.role === "administrator" ? (
                        <Badge
                          variant="roleAdmin"
                          className="max-w-full truncate rounded-full px-2 py-0.5 text-[10px]"
                        >
                          <Crown className="size-3 shrink-0" />
                          <span className="truncate">{formatRoleLabel(u.role)}</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="role"
                          className="max-w-full truncate rounded-full px-2 py-0.5 text-[10px]"
                        >
                          <User className="size-3 shrink-0" />
                          <span className="truncate">{formatRoleLabel(u.role)}</span>
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
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

        <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="sr-only">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-8 cursor-pointer rounded-full border border-border bg-muted/50 px-2.5 pr-7 text-[10px] font-semibold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} rows
                  </option>
                ))}
              </select>
            </label>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {totalFiltered} total users
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Page {safePage} / {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-full"
                onClick={goPrev}
                disabled={safePage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-full"
                onClick={goNext}
                disabled={safePage >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
