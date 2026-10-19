"use client";

import { useCVO } from "@/lib/cvo-context";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, ShieldCheck, Stethoscope, FileCheck2, MapPin } from "lucide-react";

export function ActivityFeed({ className }: { className?: string }) {
  const { auditLogs } = useCVO();

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case "Consultation":
        return <Stethoscope className="size-3.5 text-blue-500" />;
      case "Certificate":
        return <FileCheck2 className="size-3.5 text-emerald-500" />;
      case "Field Operations":
        return <MapPin className="size-3.5 text-primary" />;
      case "Animal Control":
        return <Clock className="size-3.5 text-amber-500" />;
      default:
        return <ShieldCheck className="size-3.5 text-primary" />;
    }
  };

  return (
    <Card className={cn("flex h-full flex-col border-border", className)}>
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
              <Clock className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground leading-snug">
                Office Activity Timeline
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 sm:line-clamp-none">
                Real-time audit trail of official actions, clinical encounters, and field deployments
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] text-muted-foreground font-mono shrink-0">
            CVO Audit v2
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0 max-h-[420px] overflow-y-auto">
        {auditLogs.length === 0 ? (
          <div className="py-8 text-center border border-dashed rounded-lg border-border/80 bg-muted/10 space-y-2">
            <Clock className="size-6 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground">No Office Activity Recorded Yet</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Clinical encounters, certificates, animal control, and vaccinations will automatically stream here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditLogs.slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 p-2 rounded-lg border border-border/50 bg-muted/15 text-xs hover:bg-muted/30 transition-colors"
              >
                <div className="size-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5 border border-border/60">
                  {getEntityIcon(log.entity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-bold text-[11px] text-foreground truncate">
                      {log.user}
                    </p>
                    <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-primary">
                    {log.action}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 leading-snug mt-0.5 line-clamp-2">
                    {log.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
