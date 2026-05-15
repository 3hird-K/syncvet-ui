import { Users, Clock, Briefcase, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const metrics = [
  {
    title: "Registered Pets",
    value: "12,842",
    icon: Users,
    gradient: "from-indigo-500/5",
    iconClass: "text-indigo-400",
    badge: "CDO District",
    badgeClass: "text-indigo-400 bg-indigo-400/10",
    sub: "City-wide database",
  },
  {
    title: "Vaccine Stock (Units)",
    value: "19,240",
    icon: Clock,
    gradient: "from-amber-500/5",
    iconClass: "text-amber-400",
    badge: "Optimal Level",
    badgeClass: "text-emerald-400 bg-emerald-400/10",
    sub: "Anti-Rabies / Parvo",
  },
  {
    title: "Monthly Field Tasks",
    value: "42",
    icon: Briefcase,
    gradient: "from-blue-500/5",
    iconClass: "text-blue-400",
    badge: "In Progress",
    badgeClass: "text-blue-400 bg-blue-400/10",
    sub: "Vaccination Drives",
  },
  {
    title: "Forecasting Load",
    value: "High",
    icon: ShieldCheck,
    gradient: "from-emerald-500/5",
    iconClass: "text-emerald-400",
    badge: "ML Model Active",
    badgeClass: "text-emerald-400 bg-emerald-400/10",
    sub: "Predicting May demand",
  },
] as const;

export function MetricCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4">
      {metrics.map((m) => (
        <Card key={m.title} className="bg-card border-border shadow-md rounded-2xl overflow-hidden relative group py-0">
          <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none", m.gradient)} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2 relative z-10 mb-4">
            <div className="flex items-center gap-2">
              <m.icon className={cn("h-3.5 w-3.5", m.iconClass)} />
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{m.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 relative z-10">
            <div className="text-2xl font-bold mb-0.5 tracking-tight">{m.value}</div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", m.badgeClass)}>{m.badge}</span>
              <p className="text-[10px] text-muted-foreground/60">{m.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
