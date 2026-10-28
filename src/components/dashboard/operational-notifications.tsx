"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  X,
  ShieldAlert,
  Syringe,
  Package,
  PackagePlus,
  ArrowRight,
  CalendarClock,
  AlertTriangle,
  Clock,
  Calendar,
} from "lucide-react";
import {
  format,
  parseISO,
  isValid,
  isBefore,
  isAfter,
  addDays,
  startOfDay,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCVO } from "@/lib/cvo-context";
import { useUser } from "@clerk/nextjs";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn, isTodayDate } from "@/lib/utils";
import { toast } from "sonner";

export type OperationalAlertCategory =
  | "booster_due"
  | "booster_overdue"
  | "low_stock"
  | "fefo_expiry"
  | "stock_added"
  | "today_patient"
  | "bite_surveillance"
  | "new_booking";

export interface OperationalAlert {
  id: string;
  category: OperationalAlertCategory;
  title: string;
  message: string;
  timestamp: string;
  createdAt: number;
  href: string;
  isRead: boolean;
  priority: "high" | "medium" | "low";
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDestinationLabel(category: OperationalAlertCategory): string {
  switch (category) {
    case "booster_due":
    case "booster_overdue":
      return "Vaccination Records";
    case "low_stock":
    case "fefo_expiry":
    case "stock_added":
      return "Vaccine Inventory";
    case "today_patient":
    case "new_booking":
      return "Consultations";
    case "bite_surveillance":
      return "Animal Bite Center";
    default:
      return "Dashboard";
  }
}

export function OperationalNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { activeRoleView, consultations, animalControlCases, inventory, auditLogs } = useCVO();

  // Role validation: Strictly for Admin & Veterinarian staff
  const roleFromMeta = (user?.publicMetadata?.role as string) || (user?.unsafeMetadata?.role as string);
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";
  const isPetOwner =
    !isAdminEmail &&
    (pathname?.startsWith("/pet-owner") ||
      activeRoleView === "Pet Owner" ||
      roleFromMeta?.toLowerCase()?.includes("owner") ||
      roleFromMeta?.toLowerCase()?.includes("citizen"));

  const isStaff = !isPetOwner;

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [realtimeAlerts, setRealtimeAlerts] = useState<OperationalAlert[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "unread">("all");
  const [isOpen, setIsOpen] = useState(false);

  // Load persisted read & dismissed state from localStorage so counts don't revert on refresh
  useEffect(() => {
    try {
      const storedRead = localStorage.getItem("syncvet_notif_read_ids");
      if (storedRead) {
        setReadIds(new Set(JSON.parse(storedRead)));
      }
      const storedDismissed = localStorage.getItem("syncvet_notif_dismissed_ids");
      if (storedDismissed) {
        setDismissedIds(new Set(JSON.parse(storedDismissed)));
      }
    } catch {
      // ignore JSON parse error
    }
  }, []);

  const persistReadIds = (newIds: Set<string>) => {
    setReadIds(newIds);
    try {
      localStorage.setItem("syncvet_notif_read_ids", JSON.stringify(Array.from(newIds)));
    } catch {}
  };

  const persistDismissedIds = (newIds: Set<string>) => {
    setDismissedIds(newIds);
    try {
      localStorage.setItem("syncvet_notif_dismissed_ids", JSON.stringify(Array.from(newIds)));
    } catch {}
  };

  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  // 1. Fetch vaccination records for Booster Due Soon & Overdue Boosters
  const { data: vaxRecords = [] } = useQuery({
    queryKey: ["notifications_vaccination_records"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("vaccination_records")
          .select("id, record_no, pet_name, species, owner_name, vaccine_name, next_due_date, status, administered_date")
          .order("next_due_date", { ascending: true });
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
    staleTime: 30000,
    enabled: isStaff,
  });

  // 2. Fetch procedure appointments for Today's Patients & New Bookings
  const { data: queueAppointments = [] } = useQuery({
    queryKey: ["notifications_queue_appointments"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("id, pet_name, service_id, status, date, time, time_slot, created_at, notes, users(full_name)")
          .order("date", { ascending: false });
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
    staleTime: 30000,
    enabled: isStaff,
  });

  // Generate operational alerts across required categories
  const derivedAlerts = useMemo<OperationalAlert[]>(() => {
    if (!isStaff) return [];

    const list: OperationalAlert[] = [];
    const today = startOfDay(new Date());
    const in30Days = addDays(today, 30);
    const in60Days = addDays(today, 60);

    // ── 1. Annual Boosters Due Soon (Within next 30 days) ──
    const dueSoon = vaxRecords.filter((r: any) => {
      if (!r.next_due_date || r.next_due_date === "—") return false;
      try {
        const d = parseISO(r.next_due_date);
        return isValid(d) && isAfter(d, today) && isBefore(d, in30Days);
      } catch {
        return false;
      }
    });

    for (const r of dueSoon.slice(0, 4)) {
      const d = parseISO(r.next_due_date);
      const diffDays = Math.max(1, Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      list.push({
        id: `booster-due-${r.id || r.record_no}`,
        category: "booster_due",
        title: "Annual Booster Due Soon",
        message: `${r.pet_name || "Pet"} (${r.species || "Dog"}) • Rabies booster due in ${diffDays} day${diffDays === 1 ? "" : "s"} (${format(d, "MMM d, yyyy")}). Owner: ${r.owner_name || "Citizen"}`,
        timestamp: `${diffDays}d left`,
        createdAt: d.getTime() - 30 * 24 * 60 * 60 * 1000,
        href: "/vaccination-records",
        isRead: false,
        priority: diffDays <= 7 ? "high" : "medium",
      });
    }

    // ── 2. Overdue Boosters (Past due date) ──
    const overdue = vaxRecords.filter((r: any) => {
      if (r.status === "overdue") return true;
      if (!r.next_due_date || r.next_due_date === "—") return false;
      try {
        const d = parseISO(r.next_due_date);
        return isValid(d) && isBefore(startOfDay(d), today);
      } catch {
        return false;
      }
    });

    for (const r of overdue.slice(0, 4)) {
      const d = parseISO(r.next_due_date);
      const diffDays = Math.max(1, Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
      list.push({
        id: `booster-overdue-${r.id || r.record_no}`,
        category: "booster_overdue",
        title: "Overdue Rabies Booster",
        message: `${r.pet_name || "Pet"} (${r.species || "Dog"}) • Rabies booster overdue by ${diffDays} day${diffDays === 1 ? "" : "s"}. Citizen follow-up required under RA 9482.`,
        timestamp: `${diffDays}d overdue`,
        createdAt: Date.now() - diffDays * 24 * 60 * 60 * 1000,
        href: "/vaccination-records",
        isRead: false,
        priority: "high",
      });
    }

    // ── 3. Low Stock Alerts (Inventory threshold breaches) ──
    const lowStockItems = inventory.filter(
      (i) => i.status === "low-stock" || i.stock <= (i.minimumStock || 15)
    );

    for (const item of lowStockItems.slice(0, 3)) {
      const isOut = item.stock <= 0;
      list.push({
        id: `low-stock-${item.id || item.batchNumber}`,
        category: "low_stock",
        title: isOut ? "Out of Stock Alert" : "Low Stock Alert",
        message: `${item.name} • ${isOut ? "0 doses left in storage" : `Only ${item.stock} ${item.unit} remaining`} (Minimum safe count: ${item.minimumStock || 15}).`,
        timestamp: isOut ? "Restock Needed" : "Low Stock",
        createdAt: Date.now() - 3600000,
        href: "/vaccine-inventory",
        isRead: false,
        priority: isOut ? "high" : "medium",
      });
    }

    // ── 4. FEFO Near Expiry (Expiring within 60 days) ──
    const nearExpiryItems = inventory.filter((i) => {
      if (i.status === "expiring-soon") return true;
      if (!i.expirationDate) return false;
      try {
        const exp = parseISO(i.expirationDate);
        if (!isValid(exp)) return false;
        return isAfter(exp, today) && isBefore(exp, in60Days);
      } catch {
        return false;
      }
    });

    for (const item of nearExpiryItems.slice(0, 3)) {
      const exp = parseISO(item.expirationDate);
      const diffDays = Math.max(1, Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      list.push({
        id: `fefo-expiry-${item.id || item.batchNumber}`,
        category: "fefo_expiry",
        title: "FEFO Near Expiry Priority",
        message: `${item.name} (Lot #${item.batchNumber}) • Expires on ${format(exp, "MMM d, yyyy")} (${diffDays} days left). First-Expire, First-Out rule applies.`,
        timestamp: `${diffDays}d left`,
        createdAt: exp.getTime() - 60 * 24 * 60 * 60 * 1000,
        href: "/vaccine-inventory",
        isRead: false,
        priority: diffDays <= 30 ? "high" : "medium",
      });
    }

    // ── 5. Added Vaccine Stocks (Recent intake logs and stock receipts) ──
    const recentStockLogs = auditLogs
      .filter((log) => {
        const act = (log.action || "").toLowerCase();
        return act.includes("batch") || act.includes("inventory") || act.includes("stock");
      })
      .slice(0, 2);

    for (const log of recentStockLogs) {
      const timeMs = new Date(log.timestamp).getTime() || Date.now();
      list.push({
        id: `stock-log-${log.id}`,
        category: "stock_added",
        title: "Added Vaccine Stock",
        message: log.details || `Logged new batch ${log.recordId} into clinic storage.`,
        timestamp: formatRelativeTime(timeMs),
        createdAt: timeMs,
        href: "/vaccine-inventory",
        isRead: false,
        priority: "low",
      });
    }

    if (recentStockLogs.length === 0 && inventory.length > 0) {
      const newestBatch = inventory[inventory.length - 1];
      list.push({
        id: `stock-batch-${newestBatch.id || newestBatch.batchNumber}`,
        category: "stock_added",
        title: "Vaccine Stock Available",
        message: `${newestBatch.stock} ${newestBatch.unit} of ${newestBatch.name} (Lot #${newestBatch.batchNumber}) active in ${newestBatch.storageLocation || "Main Refrigerator"}.`,
        timestamp: "Active Stock",
        createdAt: Date.now() - 7200000,
        href: "/vaccine-inventory",
        isRead: false,
        priority: "low",
      });
    }

    // ── 6. Today's Patient Schedule (Scheduled intakes & procedures) ──
    const todayConsultations = consultations.filter((c) => isTodayDate(c.date));
    const todayAppts = queueAppointments.filter((a: any) => a.date && isTodayDate(a.date));

    const allTodayPatients = [
      ...todayConsultations.map((c) => ({
        id: c.id,
        name: c.petName,
        species: c.species,
        owner: c.ownerName,
        time: c.time || "09:00 AM",
        service: c.chiefComplaint || "Clinical Consultation",
      })),
      ...todayAppts.map((a: any) => ({
        id: a.id,
        name: a.pet_name || "Pet",
        species: "Patient",
        owner: a.users?.full_name || "Citizen",
        time: a.time || (a.time_slot === "afternoon" ? "01:30 PM" : "09:00 AM"),
        service: a.service_id === "spay-neuter" ? "Spay & Neuter" : "Anti-Rabies Vaccination",
      })),
    ].slice(0, 4);

    for (const p of allTodayPatients) {
      list.push({
        id: `today-pt-${p.id}`,
        category: "today_patient",
        title: "Today's Patient Intake",
        message: `${p.name} (${p.species}) • ${p.service} scheduled today at ${p.time}. Owner: ${p.owner}`,
        timestamp: p.time,
        createdAt: Date.now(),
        href: "/consultations",
        isRead: false,
        priority: "high",
      });
    }

    // ── 7. Essential Bite Surveillance Alerts ──
    const biteCases = animalControlCases
      .filter((c) => (c.reason || "").toLowerCase().includes("bite") || (c.reason || "").toLowerCase().includes("rabies"))
      .slice(0, 2);

    for (const b of biteCases) {
      const timeMs = new Date(b.dateCaptured || Date.now()).getTime();
      list.push({
        id: `bite-${b.caseId}`,
        category: "bite_surveillance",
        title: "Bite Surveillance Advisory",
        message: `Canine bite surveillance active in ${b.barangay || "Lapasan"}. Observation protocol assigned.`,
        timestamp: formatRelativeTime(timeMs),
        createdAt: timeMs,
        href: "/consultations",
        isRead: false,
        priority: "high",
      });
    }

    return list;
  }, [isStaff, vaxRecords, queueAppointments, inventory, consultations, animalControlCases, auditLogs]);

  // Merge realtime alerts & filter out dismissed items
  const allAlerts = useMemo(() => {
    const combined = [...realtimeAlerts, ...derivedAlerts];
    const seen = new Set<string>();
    const unique: OperationalAlert[] = [];
    for (const a of combined) {
      if (!seen.has(a.id) && !dismissedIds.has(a.id)) {
        seen.add(a.id);
        unique.push({
          ...a,
          isRead: readIds.has(a.id) || a.isRead,
        });
      }
    }
    return unique.sort((a, b) => b.createdAt - a.createdAt);
  }, [realtimeAlerts, derivedAlerts, dismissedIds, readIds]);

  const filteredAlerts = useMemo(() => {
    if (selectedFilter === "unread") {
      return allAlerts.filter((a) => !a.isRead);
    }
    return allAlerts;
  }, [allAlerts, selectedFilter]);

  const unreadCount = useMemo(() => allAlerts.filter((a) => !a.isRead).length, [allAlerts]);

  // Realtime Postgres subscriptions: Exclude chat messages; listen to inventory, appointments, & vax records
  useEffect(() => {
    if (!isStaff) return;
    const channelId = `cvo-operational-alerts-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inventory_items" },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          const newAlert: OperationalAlert = {
            id: `rt-inv-${row.id || Date.now()}`,
            category: "stock_added",
            title: "Added Vaccine Stock",
            message: `New batch ${row.batch_number || "BATCH"} (${row.quantity || row.stock || 0} ${row.unit || "doses"} of ${row.item_name || row.name}) logged into inventory.`,
            timestamp: "Just now",
            createdAt: Date.now(),
            href: "/vaccine-inventory",
            isRead: false,
            priority: "medium",
          };
          setRealtimeAlerts((prev) => [newAlert, ...prev]);
          queryClient.invalidateQueries({ queryKey: ["cvo_inventory"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          const serviceName = row.service_id === "spay-neuter" ? "Spay & Neuter" : "Anti-Rabies Vaccination";
          const newAlert: OperationalAlert = {
            id: `rt-appt-${row.id || Date.now()}`,
            category: "new_booking",
            title: "New Citizen Booking",
            message: `New appointment registered for ${row.pet_name || "Pet"} (${serviceName}) on ${row.date || "scheduled date"}.`,
            timestamp: "Just now",
            createdAt: Date.now(),
            href: "/consultations",
            isRead: false,
            priority: "medium",
          };
          setRealtimeAlerts((prev) => [newAlert, ...prev]);
          queryClient.invalidateQueries({ queryKey: ["notifications_queue_appointments"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vaccination_records" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications_vaccination_records"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, isStaff, queryClient]);

  // If user is a Pet Owner or in Pet Owner view, do not display the notification bell
  if (!isStaff || pathname?.startsWith("/pet-owner")) {
    return null;
  }

  const markAllAsRead = () => {
    const allIds = new Set([...readIds, ...allAlerts.map((a) => a.id)]);
    persistReadIds(allIds);
  };

  const dismissAlert = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = new Set(dismissedIds);
    updated.add(id);
    persistDismissedIds(updated);
  };

  const handleAlertClick = (alert: OperationalAlert) => {
    const updated = new Set(readIds);
    updated.add(alert.id);
    persistReadIds(updated);
    setIsOpen(false);
    toast.info(alert.title, {
      description: alert.message,
      duration: 5000,
    });
    router.push(alert.href);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full bg-muted/60 dark:bg-zinc-800/90 hover:bg-muted dark:hover:bg-zinc-700 text-foreground transition-all cursor-pointer flex items-center justify-center shrink-0 border border-border/40"
          aria-label="Operational Notifications"
        >
          <Bell className="size-5.5 fill-current text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 z-10 flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-rose-600 text-[11px] font-extrabold text-white shadow-md border-2 border-background animate-in zoom-in-75">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[400px] p-3 bg-background border border-border shadow-xl rounded-2xl z-50 animate-in fade-in-50 zoom-in-95"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2.5 border-b border-border/50">
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              title="Mark all notifications as read"
            >
              <Check className="size-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 py-2">
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
              selectedFilter === "all"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("unread")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
              selectedFilter === "unread"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            Unread {unreadCount > 0 && <span className="ml-1 text-red-500 font-bold">{unreadCount}</span>}
          </button>
        </div>

        {/* Recent Activity Section Header */}
        <div className="flex items-center justify-between pt-1 pb-1.5 px-0.5">
          <span className="text-xs font-bold text-foreground">Recent Activity</span>
          {allAlerts.length > 5 && (
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className="text-xs text-primary font-semibold hover:underline cursor-pointer"
            >
              See all
            </button>
          )}
        </div>

        {/* Alerts List - without left-side avatar container (User: 'first remove that side of the notification') */}
        <div className="space-y-1 max-h-[360px] overflow-y-auto pr-0.5 py-1">
          {filteredAlerts.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500/70" />
              <p className="text-xs font-bold text-foreground">No notifications</p>
              <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto">
                You're all caught up with clinic operations and inventory updates.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isUnread = !alert.isRead;
              return (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className={cn(
                    "group relative flex items-start justify-between gap-3 p-2.5 rounded-xl transition-all cursor-pointer select-none",
                    isUnread
                      ? "bg-muted/40 hover:bg-muted/70"
                      : "hover:bg-muted/30 opacity-80 hover:opacity-100"
                  )}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className={cn(
                      "text-xs leading-snug line-clamp-2",
                      isUnread ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
                    )}>
                      <span className="font-bold text-foreground">{alert.title}: </span>
                      <span className={cn(isUnread ? "text-foreground/90 font-medium" : "text-muted-foreground")}>{alert.message}</span>
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{alert.timestamp}</span>
                      <span>•</span>
                      <span className="text-primary font-medium">{getDestinationLabel(alert.category)}</span>
                    </div>
                  </div>

                  {/* Right side: Unread blue indicator dot + Dismiss X */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-1">
                    {isUnread && (
                      <span className="size-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => dismissAlert(e, alert.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Dismiss notification"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Link to Dashboard Operations */}
        <div className="pt-2 border-t border-border/50 mt-1">
          <Link href="/dashboard" onClick={() => setIsOpen(false)} className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-primary font-bold justify-between h-8 cursor-pointer hover:bg-primary/10 rounded-xl"
            >
              <span>View Operations Dashboard</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
