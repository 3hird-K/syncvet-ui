"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Shield,
  Stethoscope,
  Syringe,
  RefreshCw,
  Download,
  ShieldCheck,
  PawPrint,
  Users as UsersIcon,
  Lock,
  ArrowRight,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { UsersDirectoryTable } from "./users-directory-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import {
  type SupabaseUser,
  syncVetUserStats,
  normalizeSyncVetRole,
} from "@/data/syncvet-users";
import { toast } from "sonner";

export default function UsersPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();
  const { user: currentClerkUser, isLoaded } = useUser();

  // TanStack Query for caching and reactivity
  const {
    data: users = [],
    isLoading: loading,
    refetch,
  } = useQuery<SupabaseUser[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase user fetch error:", error);
        throw error;
      }
      return data || [];
    },
    staleTime: 1000 * 30, // 30 seconds cache
  });

  // Supabase Realtime Postgres subscription syncing directly with TanStack Query cache
  useEffect(() => {
    const channel = supabase
      .channel("syncvet-users-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newUser = payload.new as SupabaseUser;
            queryClient.setQueryData<SupabaseUser[]>(["users"], (old = []) => [
              newUser,
              ...old.filter((u) => u.id !== newUser.id),
            ]);
            toast.info(`New user registered: ${newUser.full_name || newUser.email}`);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as SupabaseUser;
            queryClient.setQueryData<SupabaseUser[]>(["users"], (old = []) =>
              old.map((u) => (u.id === updated.id ? updated : u))
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            queryClient.setQueryData<SupabaseUser[]>(["users"], (old = []) =>
              old.filter((u) => u.id !== deleted.id)
            );
            toast.info("User removed from directory");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("User directory refreshed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const stats = useMemo(() => syncVetUserStats(users), [users]);

  // Export Users to CSV Handler
  const handleExport = (category: string) => {
    let exportList: SupabaseUser[] = [];
    let filenameSuffix = "all-users";

    if (category === "all") {
      exportList = users;
      filenameSuffix = "all-users";
    } else {
      exportList = users.filter((u) => normalizeSyncVetRole(u.role) === category);
      filenameSuffix = category.toLowerCase().replace(/\s+/g, "-");
    }

    if (exportList.length === 0) {
      toast.error(`No user records found to export under "${category}".`);
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
      escapeCSV(
        u.created_at
          ? new Date(u.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : ""
      ),
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `syncvet-${filenameSuffix}-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${exportList.length} user records to CSV successfully`);
  };

  const metrics: PageMetric[] = [
    {
      title: "Total Users",
      value: loading ? "..." : String(stats.total),
      icon: Users,
      gradient: "from-indigo-500/5",
      iconClass: "text-indigo-400",
      badge: "All Roles",
      badgeClass: "text-indigo-400 bg-indigo-400/10",
      sub: "System-wide accounts",
    },
    {
      title: "Administrators",
      value: loading ? "..." : String(stats.admins),
      icon: Shield,
      gradient: "from-primary/5",
      iconClass: "text-primary",
      badge: "Full Access",
      badgeClass: "text-primary bg-primary/10",
      sub: "CVO Administrative staff",
    },
    {
      title: "Veterinarians",
      value: loading ? "..." : String(stats.veterinarians),
      icon: Stethoscope,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-400",
      badge: "Clinical",
      badgeClass: "text-emerald-400 bg-emerald-400/10",
      sub: "Licensed DVMs",
    },
    {
      title: "Vaccinators",
      value: loading ? "..." : String(stats.vaccinators),
      icon: Syringe,
      gradient: "from-cyan-500/5",
      iconClass: "text-cyan-400",
      badge: "Field Ops",
      badgeClass: "text-cyan-400 bg-cyan-400/10",
      sub: "Vaccination Officers",
    },
  ];

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

  if (isLoaded && currentUserRole === "Pet Owner") {
    return (
      <div className="flex-1 space-y-4 p-6 pt-16 bg-background min-h-screen text-foreground flex flex-col items-center justify-center">
        <div className="max-w-md w-full text-center space-y-4 p-8 border border-border/70 rounded-3xl bg-card shadow-lg">
          <div className="size-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 mx-auto flex items-center justify-center text-purple-500">
            <Lock className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              CVO Staff Directory Restricted
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The User Directory is reserved for City Veterinary Office staff (Administrators, Clinicians, and Vaccinators). As a registered Pet Owner, you have full access to manage your own pets and appointments.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button asChild variant="outline" className="w-full text-xs rounded-xl cursor-pointer">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
            <Button asChild className="w-full text-xs rounded-xl bg-primary text-primary-foreground cursor-pointer">
              <Link href="/pet-registry">
                <span>View My Pets</span>
                <ArrowRight className="size-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="Service Management"
        title="User Directory"
        subtitle={
          <>
            Manage accounts for <span className="text-foreground font-semibold">SyncVet</span> — real-time synchronization with Supabase and Clerk.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs rounded-lg shadow-sm font-semibold border-border/60 hover:bg-muted/60"
                >
                  <Download className="size-3.5 text-primary" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs p-1">
                <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                  Export Data to CSV
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-xs"
                  onClick={() => handleExport("all")}
                >
                  <UsersIcon className="size-3.5 mr-2 text-indigo-400" />
                  <span>All Users ({stats.total})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-xs"
                  onClick={() => handleExport("Administrator")}
                >
                  <ShieldCheck className="size-3.5 mr-2 text-rose-500" />
                  <span>Administrators Only ({stats.admins})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-xs"
                  onClick={() => handleExport("Vaccinator")}
                >
                  <Syringe className="size-3.5 mr-2 text-cyan-500" />
                  <span>Vaccinators Only ({stats.vaccinators})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-xs"
                  onClick={() => handleExport("Veterinarian")}
                >
                  <Stethoscope className="size-3.5 mr-2 text-emerald-500" />
                  <span>Veterinarians Only ({stats.veterinarians})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-xs"
                  onClick={() => handleExport("Pet Owner")}
                >
                  <PawPrint className="size-3.5 mr-2 text-purple-400" />
                  <span>Pet Owners Only ({stats.petOwners})</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Action */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 gap-1.5 text-xs rounded-lg border-border/60"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <PageMetricCards metrics={metrics} />

      <UsersDirectoryTable
        users={users}
        loading={loading}
        stats={stats}
        onUserUpdated={(updatedUser) => {
          queryClient.setQueryData<SupabaseUser[]>(["users"], (old = []) =>
            old.map((u) => (u.id === updatedUser.id ? updatedUser : u))
          );
        }}
        onUserDeleted={(deletedId) => {
          queryClient.setQueryData<SupabaseUser[]>(["users"], (old = []) =>
            old.filter((u) => u.id !== deletedId)
          );
        }}
      />
    </div>
  );
}
