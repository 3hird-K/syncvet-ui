import { Users, Shield, Stethoscope, Activity } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { syncVetUserStats } from "@/data/syncvet-users";
import { cn } from "@/lib/utils";

export function UsersStatCards({
  total,
  admins,
  veterinarians,
  online,
}: ReturnType<typeof syncVetUserStats>) {
  const items = [
    {
      title: "Total users",
      value: String(total),
      icon: Users,
      iconClass: "bg-muted text-muted-foreground",
    },
    {
      title: "Admins",
      value: String(admins),
      icon: Shield,
      iconClass: "bg-primary/15 text-primary",
    },
    {
      title: "Veterinarians",
      value: String(veterinarians),
      icon: Stethoscope,
      iconClass: "bg-chart-2/15 text-chart-2",
    },
    {
      title: "Online",
      value: String(online),
      icon: Activity,
      iconClass: "bg-chart-3/15 text-chart-3",
    },
  ] as const;

  const cardSurface =
    "dark:border-0 dark:ring-1 dark:ring-white/[0.05]";

  return (
    <div className="grid grid-cols-2 gap-6 md:gap-8 xl:grid-cols-4">
      {items.map((m) => (
        <Card key={m.title} className={cn("overflow-hidden", cardSurface)}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 !p-8 !pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:text-[13px] md:tracking-[0.2em]">
              {m.title}
            </p>
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${m.iconClass}`}
            >
              <m.icon className="size-5" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="!px-8 !pb-8 !pt-0">
            <p className="text-4xl font-bold tracking-tight sm:text-5xl">{m.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
