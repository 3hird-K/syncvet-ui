import { Users, Shield, Stethoscope, Activity } from "lucide-react";
import { SYNCVET_USERS, syncVetUserStats } from "@/data/syncvet-users";
import { UsersDirectoryTable } from "./users-directory-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { Badge } from "@/components/ui/badge";



export default function UsersPage() {
  const stats = syncVetUserStats(SYNCVET_USERS);

  const metrics: PageMetric[] = [
    {
      title: "Total Users",
      value: String(stats.total),
      icon: Users,
      gradient: "from-indigo-500/5",
      iconClass: "text-indigo-400",
      badge: "All Roles",
      badgeClass: "text-indigo-400 bg-indigo-400/10",
      sub: "System-wide accounts",
    },
    {
      title: "Administrators",
      value: String(stats.admins),
      icon: Shield,
      gradient: "from-primary/5",
      iconClass: "text-primary",
      badge: "Full Access",
      badgeClass: "text-primary bg-primary/10",
      sub: "CVO Office staff",
    },
    {
      title: "Veterinarians",
      value: String(stats.veterinarians),
      icon: Stethoscope,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-400",
      badge: "Clinical",
      badgeClass: "text-emerald-400 bg-emerald-400/10",
      sub: "Licensed DVMs",
    },
    {
      title: "Online Now",
      value: String(stats.online),
      icon: Activity,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-400",
      badge: "Active",
      badgeClass: "text-blue-400 bg-blue-400/10",
      sub: "Currently logged in",
    },
  ];

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="Service Management"
        title="User Directory"
        subtitle={
          <>
            Manage accounts for{" "}
            <span className="text-foreground">SyncVet</span> — web and mobile animal health management at the CDO Veterinary Office.
          </>
        }
        actions={
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20 gap-1.5 px-4 py-1.5 font-bold uppercase tracking-wider text-[10px] shadow-sm shadow-primary/10"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            Admin Privileges Active
          </Badge>
        }
      />

      <PageMetricCards metrics={metrics} />

      <UsersDirectoryTable users={SYNCVET_USERS} />
    </div>
  );
}
