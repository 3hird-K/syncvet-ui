import { Badge } from "@/components/ui/badge";

export function DashboardHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-0">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-1">
          SyncVet Management System
        </p>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
          {new Intl.DateTimeFormat('en-PH', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }).format(new Date()) < "12" 
            ? "Good Morning" 
            : new Intl.DateTimeFormat('en-PH', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }).format(new Date()) < "18" 
            ? "Good Afternoon" 
            : "Good Evening"}
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Here&apos;s the operational overview for <span className="text-foreground">{new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date())}</span>.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex flex-col items-end mr-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Server Status</p>
          <p className="text-[11px] font-medium text-emerald-500">Latency: 24ms</p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 px-4 py-1.5 font-bold uppercase tracking-wider text-[10px] shadow-sm shadow-emerald-500/10">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Sync
        </Badge>
      </div>
    </div>
  );
}
