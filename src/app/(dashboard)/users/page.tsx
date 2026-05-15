import { Badge } from "@/components/ui/badge";
import { SYNCVET_USERS, syncVetUserStats } from "@/data/syncvet-users";
import { UsersDirectoryTable } from "./users-directory-table";
import { UsersStatCards } from "./users-stat-cards";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Users — SyncVet",
  description: "Manage SyncVet accounts for the CDO City Veterinary Office.",
};

export default function UsersPage() {
  const stats = syncVetUserStats(SYNCVET_USERS);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1840px]",
        "space-y-8 px-8 py-10 md:space-y-10 md:px-12 md:py-12 lg:px-16 lg:py-14",
      )}
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500 md:text-[13px]">
            User directory
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Users</h1>
          <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
            Accounts for{" "}
            <span className="font-semibold text-foreground/95">
              SyncVet: web and mobile animal health management with predictive resource forecasting
            </span>{" "}
            at the Cagayan de Oro City Veterinary Office.
          </p>
        </div>
        <Badge
          variant="outline"
          className="h-fit shrink-0 gap-2 self-start rounded-full border-primary/45 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-destructive" />
          </span>
          Admin privileges active
        </Badge>
      </div>

      <UsersStatCards {...stats} />

      <UsersDirectoryTable users={SYNCVET_USERS} />
    </div>
  );
}
