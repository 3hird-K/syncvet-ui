import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const activities = [
  {
    name: "Dr. Elena Santos",
    initials: "ES",
    avatarClass: "bg-blue-600",
    action: "Confirmed vaccine inventory for",
    highlight: "Anti-Rabies Batch Q3",
    location: "CDO Central Storage — Zone 1",
    time: "2 hours ago",
    badge: "Inventory Verified",
  },
  {
    name: "Officer Mark Velez",
    initials: "MV",
    avatarClass: "bg-emerald-600",
    action: "Completed field vaccination drive in",
    highlight: "Barangay Lapasan",
    location: "Mobile Unit — Team A",
    time: "5 hours ago",
    badge: null as string | null,
  },
  {
    name: "Dr. Sarah Chen",
    initials: "SC",
    avatarClass: "bg-sky-600",
    action: "Uploaded diagnostic results for",
    highlight: "Canine Parvovirus Case #842",
    location: "Clinical Laboratory — Annex",
    time: "Yesterday",
    badge: "Urgent Review",
  },
] as const;

export function ActivityFeed({ className }: { className?: string }) {
  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle className="text-lg font-bold tracking-tight">
            System Activity
          </CardTitle>
          <CardDescription className="text-xs font-medium text-muted-foreground/40">
            Latest operational field updates.
          </CardDescription>
        </div>
        <Button
          variant="link"
          className="h-auto p-0 text-[10px] font-black uppercase tracking-[0.2em] text-primary transition-opacity hover:opacity-80"
        >
          View All
        </Button>
      </CardHeader>

      <CardContent className="flex-1 space-y-6 py-2">
        {activities.map((a) => (
          <div key={a.name + a.time} className="flex gap-3">
            <Avatar className="size-10 shrink-0 border border-white/5 ring-1 ring-white/5">
              <AvatarFallback
                className={cn(
                  "text-[12px] font-bold text-white",
                  a.avatarClass,
                )}
              >
                {a.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-white truncate">
                  {a.name}
                </p>
                <span className="text-[10px] font-medium text-muted-foreground/30 shrink-0 ml-4">
                  {a.time}
                </span>
              </div>
              <p className="text-[13px] font-medium text-muted-foreground/60 leading-snug">
                {a.action}{" "}
                <span className="font-bold text-primary">
                  {a.highlight}
                </span>
              </p>
              <div className="flex flex-wrap gap-2 pt-1.5">
                <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">
                  {a.location}
                </span>
                {a.badge && (
                  <Badge
                    variant="outline"
                    className="border-primary/20 bg-primary/5 text-[9px] font-black uppercase tracking-wider text-primary px-1.5 py-0"
                  >
                    {a.badge}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="border-t border-border/50 justify-center py-6">
        <Button
          variant="link"
          className="group h-auto p-0 text-xs font-bold text-muted-foreground/40 hover:text-foreground transition-all"
        >
          <ArrowUpRight className="mr-2 size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          Open Audit Logs
        </Button>
      </CardFooter>
    </Card>
  );
}
