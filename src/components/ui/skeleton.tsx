import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted-foreground/15 dark:bg-muted-foreground/20",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
