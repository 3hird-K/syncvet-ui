import type { ReactNode } from "react";

/**
 * Reusable page header that matches the dashboard header typography exactly:
 *  - Supertitle: text-[10px] font-bold uppercase tracking-[0.3em] text-primary
 *  - Title: text-3xl font-bold tracking-tight
 *  - Subtitle: text-sm text-muted-foreground font-medium
 */
export function PageHeader({
  supertitle,
  title,
  subtitle,
  actions,
}: {
  supertitle: string;
  title: string;
  subtitle: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-1">
          {supertitle}
        </p>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          {subtitle}
        </p>
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
