"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  X,
  MessageSquare,
  ShieldAlert,
  Syringe,
  Package,
  ArrowRight,
  ExternalLink,
  CalendarClock,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO, isValid, isBefore, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCVO } from "@/lib/cvo-context";
import { useCitizenChat } from "@/lib/chat-context";
import { useUser } from "@clerk/nextjs";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface OperationalAlert {
  id: string;
  type: "inquiry" | "bite" | "inventory" | "vaccine" | "system";
  title: string;
  message: string;
  timestamp: string; // ISO or relative
  createdAt: number; // millisecond timestamp
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

export function OperationalNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { activeRoleView, consultations, animalControlCases, inventory } = useCVO();

  const roleFromMeta = (user?.publicMetadata?.role as string) || (user?.unsafeMetadata?.role as string);
  const isPetOwner =
    pathname?.startsWith("/pet-owner") ||
    activeRoleView === "Pet Owner" ||
    roleFromMeta?.toLowerCase()?.includes("owner") ||
    roleFromMeta?.toLowerCase()?.includes("citizen");

  const isStaff = !isPetOwner;

  const userRef = useRef(user);
  userRef.current = user;

  const isStaffRef = useRef(isStaff);
  isStaffRef.current = isStaff;

  const { messages } = useCitizenChat();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [realtimeAlerts, setRealtimeAlerts] = useState<OperationalAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [ownerAppointments, setOwnerAppointments] = useState<any[]>([]);

  // Query appointments for current pet owner to check for missed/unattended schedules
  useEffect(() => {
    let isMounted = true;
    const fetchAppointments = async () => {
      try {
        const ownerId = user?.id;
        const seen = new Set<string>();
        const list: any[] = [];

        // 1. Supabase appointments table
        if (ownerId) {
          try {
            const { data } = await supabase
              .from("appointments")
              .select("*")
              .or(`owner_id.eq.${ownerId}`)
              .neq("status", "cancelled");
            if (data) {
              data.forEach((d) => {
                if (!seen.has(d.id)) {
                  seen.add(d.id);
                  list.push(d);
                }
              });
            }
          } catch {}

          // 2. service_transactions
          try {
            const { data: txData } = await supabase
              .from("service_transactions")
              .select("*")
              .or(`owner_id.eq.${ownerId}`)
              .in("transaction_type", ["Vaccination Booking", "Spay & Neuter Booking"])
              .neq("status", "cancelled");
            if (txData) {
              txData.forEach((tx: any) => {
                const refId = tx.reference_id || tx.id;
                if (!seen.has(refId)) {
                  seen.add(refId);
                  const serviceType = tx.transaction_type === "Vaccination Booking" ? "vaccination" : "spay-neuter";
                  const petNameMatch = tx.title ? tx.title.replace(/^[^f]+for\s+/i, "") : "Pet";
                  list.push({
                    id: refId,
                    owner_id: tx.owner_id,
                    pet_name: petNameMatch,
                    service_id: serviceType,
                    date: tx.date ? tx.date.split("T")[0] : "",
                    status: tx.status || "confirmed",
                  });
                }
              });
            }
          } catch {}
        }

        // 3. localStorage cache (ensures offline/immediate sync)
        try {
          const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
          local.forEach((item: any) => {
            if (!seen.has(item.id) && item.status !== "cancelled" && (!ownerId || !item.owner_id || item.owner_id === ownerId)) {
              seen.add(item.id);
              list.push(item);
            }
          });
        } catch {}

        if (isMounted) {
          setOwnerAppointments(list);
        }
      } catch (e) {
        // ignore
      }
    };

    fetchAppointments();

    const handleUpdate = () => {
      fetchAppointments();
    };
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("syncvet-appointment-updated", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("syncvet-appointment-updated", handleUpdate);
    };
  }, [supabase, user?.id]);

  // Compute live alerts derived from active system data
  const derivedAlerts = useMemo<OperationalAlert[]>(() => {
    const list: OperationalAlert[] = [];
    const todayStart = startOfDay(new Date());

    // 1. Citizen Inquiries & unread messages from pet owners (Only visible to Staff, never own messages)
    if (isStaff) {
      const currentUserName = user?.fullName?.toLowerCase().trim();
      const recentPetOwnerMessages = messages
        .filter((m) => {
          if (m.senderRole !== "Pet Owner") return false;
          if (user?.id && (m as any).senderId === user.id) return false;
          if (currentUserName && m.senderName?.toLowerCase().trim() === currentUserName) return false;
          return true;
        })
        .slice(-3);

      for (const msg of recentPetOwnerMessages) {
        const timeMs = new Date(msg.timestamp).getTime() || Date.now();
        list.push({
          id: `msg-${msg.id}`,
          type: "inquiry",
          title: "Citizen Inquiry",
          message: `${msg.senderName}: "${msg.text.length > 55 ? msg.text.slice(0, 52) + "..." : msg.text}"`,
          timestamp: formatRelativeTime(timeMs),
          createdAt: timeMs,
          href: "/messages",
          isRead: false,
          priority: "high",
        });
      }

      // 2. Bite Surveillance & Urgent Consultations
      const biteCases = animalControlCases
        .filter(
          (c) =>
            c.reason?.toLowerCase().includes("bite") ||
            c.reason?.toLowerCase().includes("rabies")
        )
        .slice(0, 2);

      for (const b of biteCases) {
        const timeMs = new Date(b.dateCaptured || Date.now()).getTime();
        list.push({
          id: `bite-${b.caseId}`,
          type: "bite",
          title: "Bite Surveillance",
          message: `Canine bite observation registered in ${b.barangay || "Lapasan"}`,
          timestamp: formatRelativeTime(timeMs),
          createdAt: timeMs,
          href: "/consultations",
          isRead: false,
          priority: "high",
        });
      }

      // 3. Cold-Chain Watch & Critical Inventory
      const criticalInventory = inventory
        .filter(
          (i) =>
            i.status === "low-stock" ||
            i.status === "expiring-soon" ||
            i.stock <= (i.minimumStock || 10)
        )
        .slice(0, 2);

      for (const inv of criticalInventory) {
        list.push({
          id: `inv-${inv.id}`,
          type: "inventory",
          title: "Cold-Chain Watch",
          message: `${inv.name} (Batch ${inv.batchNumber}) low stock: ${inv.stock} ${inv.unit} left`,
          timestamp: "Today",
          createdAt: Date.now() - 3600000,
          href: "/vaccine-inventory",
          isRead: false,
          priority: "medium",
        });
      }

      // 4. Clinical Queue Advisory
      const waitingConsultations = consultations.filter((c) => c.status === "waiting").length;
      if (waitingConsultations > 0) {
        list.push({
          id: "cons-waiting",
          type: "vaccine",
          title: "Clinical Queue Advisory",
          message: `${waitingConsultations} citizen pet${waitingConsultations > 1 ? "s" : ""} waiting in CVO central triage`,
          timestamp: "Live",
          createdAt: Date.now() - 1800000,
          href: "/consultations",
          isRead: false,
          priority: "medium",
        });
      }
    }

    // 5. Missed & Unattended Appointment Alerts for Pet Owners (Action Required to Reschedule)
    if (ownerAppointments.length > 0) {
      for (const appt of ownerAppointments) {
        if (appt.status === "cancelled" || appt.status === "completed") continue;

        let isMissed = appt.status === "missed";
        let parsedDate: Date | null = null;
        try {
          if (appt.date) {
            const parsed = parseISO(appt.date);
            if (isValid(parsed)) {
              parsedDate = parsed;
              if (isBefore(startOfDay(parsed), todayStart)) {
                isMissed = true;
              }
            }
          }
        } catch {}

        if (isMissed) {
          const petName = appt.pet_name || "Your pet";
          const serviceName = appt.service_id === "spay-neuter" ? "Spay & Neuter" : "Vaccination";
          const formattedDate = parsedDate ? format(parsedDate, "EEEE, MMMM d") : (appt.date || "scheduled date");

          list.push({
            id: `missed-appt-${appt.id}`,
            type: "vaccine",
            title: `Missed ${serviceName} — Reschedule Now`,
            message: `${petName}'s ${serviceName} on ${formattedDate} was unattended. Click to choose a new clinic date.`,
            timestamp: "Needs Reschedule",
            createdAt: parsedDate ? parsedDate.getTime() : Date.now(),
            href: "/pet-owner",
            isRead: false,
            priority: "high",
          });
        }
      }
    }

    return list;
  }, [isStaff, user?.id, messages, animalControlCases, inventory, consultations, ownerAppointments]);

  // Combine derived alerts with any incoming real-time alerts
  const allAlerts = useMemo(() => {
    const combined = [...realtimeAlerts, ...derivedAlerts];
    // Deduplicate by ID
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
    // Sort highest priority first, then latest
    return unique.sort((a, b) => b.createdAt - a.createdAt);
  }, [realtimeAlerts, derivedAlerts, dismissedIds, readIds]);

  const unreadAlerts = useMemo(
    () => allAlerts.filter((a) => !a.isRead),
    [allAlerts]
  );

  // Subscribe to live Postgres changes across tables
  useEffect(() => {
    const channelId = `cvo-realtime-notifications-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;

          const currentUser = userRef.current;
          const currentUserId = currentUser?.id;
          const currentUserName = currentUser?.fullName?.toLowerCase().trim();
          const isStaffNow = isStaffRef.current;

          // Never notify the author of their own outgoing message!
          if (currentUserId && row.sender_id === currentUserId) return;
          if (
            currentUserName &&
            row.sender_name &&
            row.sender_name.toLowerCase().trim() === currentUserName
          ) {
            return;
          }

          if (row.sender_role === "Pet Owner") {
            // Citizen message -> Only notify veterinary and administrative staff
            if (!isStaffNow) return;

            const newAlert: OperationalAlert = {
              id: `rt-msg-${row.id}`,
              type: "inquiry",
              title: "Live Citizen Inquiry",
              message: `${row.sender_name || "Pet Owner"}: "${(row.message_text || "").slice(0, 50)}..."`,
              timestamp: "Just now",
              createdAt: Date.now(),
              href: "/messages",
              isRead: false,
              priority: "high",
            };
            setRealtimeAlerts((prev) => [newAlert, ...prev]);
          } else {
            // Staff message (Vet or Admin Desk) -> Only notify the intended pet owner in notification bell
            if (isStaffNow) return;

            supabase
              .from("chats")
              .select("owner_id")
              .eq("id", row.chat_id)
              .maybeSingle()
              .then(({ data }) => {
                if (data && currentUserId && data.owner_id === currentUserId) {
                  const senderTitle =
                    row.sender_name ||
                    (row.sender_role === "Admin" || row.sender_role === "Staff" ? "CVO Admin Desk" : "Dr. Helen");
                  const newAlert: OperationalAlert = {
                    id: `rt-msg-${row.id}`,
                    type: "inquiry",
                    title: `Message from ${senderTitle}`,
                    message: `${senderTitle}: "${(row.message_text || "").slice(0, 50)}..."`,
                    timestamp: "Just now",
                    createdAt: Date.now(),
                    href: "/messages",
                    isRead: false,
                    priority: "high",
                  };
                  setRealtimeAlerts((prev) => [newAlert, ...prev]);
                }
              });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "consultations" },
        (payload: any) => {
          const row = payload.new;
          if (row) {
            const isBite =
              (row.chief_complaint || "").toLowerCase().includes("bite") ||
              (row.diagnosis || "").toLowerCase().includes("rabies");
            const newAlert: OperationalAlert = {
              id: `rt-cons-${row.id}`,
              type: isBite ? "bite" : "vaccine",
              title: isBite ? "Urgent Bite Incident" : "New Patient Intake",
              message: `${row.pet_name || "Patient"} • ${row.owner_name || "Citizen"} (${row.chief_complaint || "Consultation requested"})`,
              timestamp: "Just now",
              createdAt: Date.now(),
              href: "/consultations",
              isRead: false,
              priority: isBite ? "high" : "medium",
            };
            setRealtimeAlerts((prev) => [newAlert, ...prev]);
            if (isBite) {
              toast.warning(`Urgent Bite Consultation: ${row.pet_name || "Patient"}`, {
                description: `${row.owner_barangay || "Cagayan de Oro"} • ${row.chief_complaint}`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const a of allAlerts) {
        next.add(a.id);
      }
      return next;
    });
  }, [allAlerts]);

  const dismissAlert = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const handleAlertClick = (alert: OperationalAlert) => {
    setReadIds((prev) => new Set(prev).add(alert.id));
    setIsOpen(false);
    router.push(alert.href);
  };

  const unreadCount = unreadAlerts.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer shadow-none"
          aria-label="System and Operational Notifications"
          title={
            unreadCount > 0
              ? `${unreadCount} unread operational alert${unreadCount > 1 ? "s" : ""}`
              : "Operational Notifications & Alerts (All Clear)"
          }
        >
          <Bell className="size-4 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-amber-500 ring-2 ring-background text-[8px] font-bold text-white items-center justify-center" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-84 sm:w-92 p-2 space-y-1.5 z-50 shadow-xl border border-border/60">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <Bell className="size-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">
              {isPetOwner ? "Citizen & Procedure Notifications" : "Operational Alerts & Dispatch"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 ? (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-600 bg-amber-500/10 font-bold"
              >
                {unreadCount} New
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-semibold"
              >
                Live Ready
              </Badge>
            )}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[10px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                title="Mark all alerts as read"
              >
                <CheckCheck className="size-3" />
                <span>Read all</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-0.5">
          {allAlerts.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500/70" />
              <p className="text-xs font-bold text-foreground">
                {isPetOwner ? "All Notifications Up to Date" : "All Operational Systems Clear"}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto">
                {isPetOwner
                  ? "No missed appointments or urgent clinical notices."
                  : "No active emergencies, pending citizen inquiries, or cold-chain breaches."}
              </p>
            </div>
          ) : (
            allAlerts.map((alert) => {
              const isUnread = !alert.isRead;
              return (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all cursor-pointer space-y-1 relative group select-none",
                    isUnread
                      ? "bg-muted/40 border-border/80 hover:bg-muted/70 hover:border-primary/40 shadow-2xs"
                      : "bg-background/50 border-border/30 hover:bg-muted/30 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "font-bold text-xs flex items-center gap-1.5 truncate",
                        isUnread ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {alert.type === "inquiry" && (
                        <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                      {alert.type === "bite" && (
                        <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                      {alert.type === "inventory" && (
                        <span className="size-2 rounded-full bg-purple-500 shrink-0" />
                      )}
                      {alert.type === "vaccine" && (
                        <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                      {alert.title}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {alert.timestamp}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => dismissAlert(e, alert.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Dismiss alert"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </div>

                  <p
                    className={cn(
                      "text-[11px] leading-snug line-clamp-2",
                      isUnread ? "font-medium text-foreground/90" : "text-muted-foreground"
                    )}
                  >
                    {alert.message}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="my-1" />

        {/* Footer Link */}
        <Link href="/dashboard" onClick={() => setIsOpen(false)} className="block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary font-bold justify-between h-7.5 cursor-pointer hover:bg-primary/10 rounded-lg"
          >
            <span>View Operations Hub on Dashboard</span>
            <ArrowRight className="size-3" />
          </Button>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
