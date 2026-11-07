"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useUser } from "@clerk/nextjs";
import {
  Sparkles,
  QrCode,
  BellRing,
  CheckCircle2,
  Clock,
  RotateCcw,
  Volume2,
  ArrowRight,
  TestTube2,
  CalendarCheck,
  Stethoscope,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getDailyQueue,
  saveDailyQueue,
  checkInPetOwnerToQueue,
  callQueueTicket,
  completeQueueTicket,
  resetPetOwnerQueue,
  getTodayDateStr,
  syncQueueFromSupabase,
  type DailyQueueState,
  type QueueTicket,
} from "@/lib/cvo-queue";
import { getPublicSupabaseClient } from "@/lib/supabase/client";

interface QueueSimulatorDialogProps {
  trigger?: React.ReactNode;
}

export function QueueSimulatorDialog({ trigger }: QueueSimulatorDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const todayStr = getTodayDateStr();

  const ownerId = user?.id || "user_sim_test_owner";
  const ownerName = user?.fullName || "Neil Dime";
  const ownerEmail = (user?.primaryEmailAddress?.emailAddress || "petowner@syncvet.cdo").toLowerCase();

  // Helper to persist local test appointment for today
  const seedTodayAppointment = (petName = "Eunchae") => {
    try {
      const aptId = `apt-sim-${todayStr}-${petName.toLowerCase()}`;
      const simApt = {
        id: aptId,
        owner_id: ownerId,
        owner_name: ownerName,
        pet_id: `pet-sim-${petName.toLowerCase()}`,
        pet_name: petName,
        species: petName === "Eunchae" ? "Cat" : "Dog",
        breed: petName === "Eunchae" ? "Puspin" : "Aspin",
        service_id: "vaccination",
        service_type: "Anti-Rabies Prophylaxis & Vaccination",
        service_title: "Anti-Rabies Vaccination",
        date: todayStr,
        appointment_date: todayStr,
        time: "09:00 AM",
        time_slot: "09:00 AM - 10:00 AM",
        status: "confirmed",
        location: "City Veterinary Office - Carmen Central Clinic",
        notes: "Municipal Anti-Rabies Program • Scheduled for Today",
        created_at: new Date().toISOString(),
      };

      const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
      const filtered = local.filter((a: any) => a.id !== aptId);
      filtered.unshift(simApt);
      localStorage.setItem("syncvet_local_appointments", JSON.stringify(filtered));

      // Also try to mirror to Supabase if accessible
      try {
        const supabase = getPublicSupabaseClient();
        supabase.from("appointments").upsert(simApt).then();
      } catch { }

      window.dispatchEvent(new Event("syncvet-appointment-updated"));
      window.dispatchEvent(new Event("storage"));
      return simApt;
    } catch {
      return null;
    }
  };

  // 1. Simulate Scheduled Appointment for Today (Not Yet Scanned)
  const handleSimulateScheduledOnly = () => {
    seedTodayAppointment("Eunchae");
    // Clear queue so it is not checked in yet
    resetPetOwnerQueue(ownerId, todayStr);
    window.dispatchEvent(new CustomEvent("syncvet-queue-updated"));
    toast.success("Simulation Step 1 Active", {
      description: "Eunchae has an appointment for today. The Pet Owner portal will now show 'Ready for Check-In • Scan Reception QR', and Admin Queue shows 0 active.",
    });
    setOpen(false);
  };

  // 2. Simulate QR Check-In (Enters Live Queue with 1 patient ahead)
  const handleSimulateQueueEntry = () => {
    seedTodayAppointment("Eunchae");

    const current = getDailyQueue(todayStr);

    // Seed prior patient Q-001 so Eunchae has someone ahead
    const ticket1: QueueTicket = {
      id: `ticket_sim_001_${todayStr}`,
      ticketNumber: "Q-001",
      queueSequence: 1,
      appointmentId: "apt-sim-lisbon",
      date: todayStr,
      checkInTime: "08:15 AM",
      checkedInAt: new Date(Date.now() - 30 * 60000).toISOString(),
      ownerId: "owner_other_01",
      ownerName: "Maria Santos",
      petName: "Lisbon",
      species: "Dog",
      breed: "Aspin",
      serviceId: "consultation",
      serviceTitle: "Clinical Consultation",
      status: "waiting",
      checkedInVia: "qr",
    };

    // Eunchae as Q-002 (Waiting)
    const ticket2: QueueTicket = {
      id: `ticket_sim_002_${todayStr}`,
      ticketNumber: "Q-002",
      queueSequence: 2,
      appointmentId: `apt-sim-${todayStr}-eunchae`,
      date: todayStr,
      checkInTime: format(new Date(), "h:mm a"),
      checkedInAt: new Date().toISOString(),
      ownerId,
      ownerName,
      petName: "Eunchae",
      species: "Cat",
      breed: "Puspin",
      serviceId: "vaccination",
      serviceTitle: "Anti-Rabies Vaccination",
      status: "waiting",
      checkedInVia: "qr",
    };

    const newState: DailyQueueState = {
      date: todayStr,
      activeTickets: [ticket1, ticket2],
      nowServingTicketNumber: "Q-001",
      isClosed: false,
    };

    saveDailyQueue(newState);
    toast.success("Simulation Step 2 Active: Checked-in by QR", {
      description: "Ticket Q-002 issued to Eunchae. Position: 1 patient ahead (Q-001 now calling). Admin shows Queue (2).",
    });
    setOpen(false);
  };

  // 3. Simulate Next in Line (0 ahead)
  const handleSimulateNextInLine = () => {
    seedTodayAppointment("Eunchae");

    // Ticket 1 is now in-consultation or being served
    const ticket1: QueueTicket = {
      id: `ticket_sim_001_${todayStr}`,
      ticketNumber: "Q-001",
      queueSequence: 1,
      appointmentId: "apt-sim-lisbon",
      date: todayStr,
      checkInTime: "08:15 AM",
      checkedInAt: new Date(Date.now() - 30 * 60000).toISOString(),
      ownerId: "owner_other_01",
      ownerName: "Maria Santos",
      petName: "Lisbon",
      species: "Dog",
      breed: "Aspin",
      serviceId: "consultation",
      serviceTitle: "Clinical Consultation",
      status: "in-consultation",
      servingVet: "Dr. Helen Ann P. Tacandong, DVM",
      consultationRoom: "Consultation Desk 1",
      checkedInVia: "qr",
    };

    // Eunchae as Q-002 (Earliest waiting ticket = Next in Line)
    const ticket2: QueueTicket = {
      id: `ticket_sim_002_${todayStr}`,
      ticketNumber: "Q-002",
      queueSequence: 2,
      appointmentId: `apt-sim-${todayStr}-eunchae`,
      date: todayStr,
      checkInTime: format(new Date(), "h:mm a"),
      checkedInAt: new Date().toISOString(),
      ownerId,
      ownerName,
      petName: "Eunchae",
      species: "Cat",
      breed: "Puspin",
      serviceId: "vaccination",
      serviceTitle: "Anti-Rabies Vaccination",
      status: "waiting",
      checkedInVia: "qr",
    };

    const newState: DailyQueueState = {
      date: todayStr,
      activeTickets: [ticket1, ticket2],
      nowServingTicketNumber: "Q-001",
      servingVet: "Dr. Helen Ann P. Tacandong, DVM",
      servingRoom: "Consultation Desk 1",
      isClosed: false,
    };

    saveDailyQueue(newState);
    toast.success("Simulation Step 3 Active: You're Next in Line!", {
      description: "Q-001 is being served in Desk 1. Eunchae is next (0 patients ahead). Check the Pet Owner card alert!",
    });
    setOpen(false);
  };

  // 4. Simulate Pet Owner is Called Now! (Sound & Beacon Banner)
  const handleSimulateCallNow = () => {
    seedTodayAppointment("Eunchae");

    const ticket2: QueueTicket = {
      id: `ticket_sim_002_${todayStr}`,
      ticketNumber: "Q-002",
      queueSequence: 1,
      appointmentId: `apt-sim-${todayStr}-eunchae`,
      date: todayStr,
      checkInTime: format(new Date(), "h:mm a"),
      checkedInAt: new Date().toISOString(),
      ownerId,
      ownerName,
      petName: "Eunchae",
      species: "Cat",
      breed: "Puspin",
      serviceId: "vaccination",
      serviceTitle: "Anti-Rabies Vaccination",
      status: "in-consultation",
      servingVet: "Dr. Helen Ann P. Tacandong, DVM",
      consultationRoom: "Consultation Desk 1",
      calledAt: new Date().toISOString(),
      checkedInVia: "qr",
    };

    const newState: DailyQueueState = {
      date: todayStr,
      activeTickets: [ticket2],
      nowServingTicketNumber: "Q-002",
      servingVet: "Dr. Helen Ann P. Tacandong, DVM",
      servingRoom: "Consultation Desk 1",
      lastCalledAt: new Date().toISOString(),
      isClosed: false,
    };

    saveDailyQueue(newState);
      toast.info("Simulation Step 4 Active: YOU ARE BEING CALLED NOW!", {
        description: "Attending Vet called Q-002 (Eunchae). Check Pet Owner screen for acoustic chime and high-visibility alert banner!",
      });
      setOpen(false);
    };

    // 5. Simulate Visit Completed
    const handleSimulateCompleted = () => {
      const ticket2: QueueTicket = {
        id: `ticket_sim_002_${todayStr}`,
        ticketNumber: "Q-002",
        queueSequence: 1,
        appointmentId: `apt-sim-${todayStr}-eunchae`,
        date: todayStr,
        checkInTime: format(new Date(), "h:mm a"),
        checkedInAt: new Date().toISOString(),
        ownerId,
        ownerName,
        petName: "Eunchae",
        species: "Cat",
        breed: "Puspin",
        serviceId: "vaccination",
        serviceTitle: "Anti-Rabies Vaccination",
        status: "completed",
        completedAt: new Date().toISOString(),
        checkedInVia: "qr",
      };

      const newState: DailyQueueState = {
        date: todayStr,
        activeTickets: [ticket2],
        nowServingTicketNumber: null,
        isClosed: false,
      };

      saveDailyQueue(newState);
      toast.success("Simulation Step 5 Active: Visit Completed", {
        description: "Eunchae's visit has concluded. Ticket marked as completed.",
      });
      setOpen(false);
    };

    // 6. Reset & Clear All Queue Simulation Data
    const handleResetAll = () => {
      try {
        localStorage.removeItem(`syncvet_clinic_queue_${todayStr}`);
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        const filtered = local.filter((a: any) => !String(a.id).startsWith("apt-sim-"));
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(filtered));

        const emptyState: DailyQueueState = {
          date: todayStr,
          activeTickets: [],
          nowServingTicketNumber: null,
          isClosed: false,
        };
        saveDailyQueue(emptyState);

        try {
          const supabase = getPublicSupabaseClient();
          supabase.from("queue_tickets").delete().eq("date", todayStr).then();
        } catch { }

        window.dispatchEvent(new CustomEvent("syncvet-queue-updated"));
        window.dispatchEvent(new Event("syncvet-appointment-updated"));
        toast.info("Queue Simulation Cleared", {
          description: "All test queue tickets and dummy appointments for today have been reset.",
        });
        setOpen(false);
      } catch (e: any) {
        toast.error("Failed to reset: " + e.message);
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer shadow-2xs"
            >
              <TestTube2 className="size-3.5 text-emerald-600" />
              <span>Simulate Queue Flow</span>
            </Button>
          )}
        </DialogTrigger>

        <DialogContent className="sm:max-w-md p-5 rounded-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <TestTube2 className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Clinic Queue Flow Simulator
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Test and verify live transitions across Admin and Pet Owner tabs.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 pt-2">
            {/* Step 1 */}
            <button
              type="button"
              onClick={handleSimulateScheduledOnly}
              className="w-full p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/40 text-left transition-all space-y-1 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <CalendarCheck className="size-3.5 text-amber-500" />
                  1. Schedule for Today (Not Yet Scanned)
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-700 border-amber-500/30">
                  Ready to Scan
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Sets appointment for <strong>Eunchae</strong> today. Admin queue remains 0 active. Pet Owner shows &quot;Ready for Check-In • Scan Reception QR&quot;.
              </p>
            </button>

            {/* Step 2 */}
            <button
              type="button"
              onClick={handleSimulateQueueEntry}
              className="w-full p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/40 text-left transition-all space-y-1 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <QrCode className="size-3.5 text-emerald-600" />
                  2. QR Check-In (Enter Queue with 1 Ahead)
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  Ticket Q-002
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Simulates scanning station QR code. Injects Q-001 (Lisbon) ahead. Pet Owner shows &quot;In Queue • 1 patient ahead (~10m)&quot;. Admin shows Queue (2).
              </p>
            </button>

            {/* Step 3 */}
            <button
              type="button"
              onClick={handleSimulateNextInLine}
              className="w-full p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/40 text-left transition-all space-y-1 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <Clock className="size-3.5 text-emerald-600" />
                  3. Advance to &quot;Next in Line&quot;
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                  0 Ahead
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Moves Q-001 into Desk 1. Pet Owner sees green alert banner: <strong>&quot;YOU&apos;RE NEXT IN LINE (0 ahead)&quot;</strong>.
              </p>
            </button>

            {/* Step 4 */}
            <button
              type="button"
              onClick={handleSimulateCallNow}
              className="w-full p-3 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 text-left transition-all space-y-1 cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <BellRing className="size-3.5 text-primary animate-bounce" />
                  4. Call Patient Now! (Chime + Live Alert)
                </span>
                <Badge className="text-[10px] font-bold bg-primary text-primary-foreground">
                  CALLED NOW
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Attending Vet calls <strong>Ticket Q-002 (Eunchae)</strong> to Desk 1. Plays 8x Ding-Dong chime, shows beacon notification on Pet Owner screen.
              </p>
            </button>

            {/* Step 5 */}
            <button
              type="button"
              onClick={handleSimulateCompleted}
              className="w-full p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/40 text-left transition-all space-y-1 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  5. Complete Consultation Visit
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  Completed
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Concludes the visit. Ticket status becomes completed.
              </p>
            </button>
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetAll}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 gap-1 rounded-lg cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset / Clear Queue</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-8 px-3 text-xs rounded-lg cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

