"use client";

import { useCVO } from "@/lib/cvo-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Flame,
} from "lucide-react";
import Link from "next/link";

export function InventoryFEFOCard() {
  const { inventory } = useCVO();

  // Sort inventory by FEFO (nearest expiration date first)
  const fefoSorted = [...inventory].sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  const urgentBatches = fefoSorted.slice(0, 4);

  const getStatusBadge = (status: string, daysToExpiry: number) => {
    if (daysToExpiry <= 30) {
      return (
        <Badge className="text-[9px] bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20">
          Expiring ({daysToExpiry}d)
        </Badge>
      );
    }
    if (status === "low-stock") {
      return (
        <Badge className="text-[9px] bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-amber-500/20">
          Low Stock
        </Badge>
      );
    }
    return (
      <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20">
        In Stock
      </Badge>
    );
  };

  return (
    <Card className="border-border">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
              <Package className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground leading-snug">
                FEFO Inventory & Cold-Chain Alerts
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 sm:line-clamp-none">
                First-Expire, First-Out queue prioritizing nearest expiration batches for active municipal deployment
              </CardDescription>
            </div>
          </div>
          <Link href="/vaccine-inventory" className="shrink-0">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary gap-1 cursor-pointer">
              Full Inventory <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {urgentBatches.length === 0 ? (
          <div className="py-8 text-center border border-dashed rounded-lg border-border/80 bg-muted/10 space-y-2">
            <Package className="size-6 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground">No Cold-Chain Inventory Logged</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Vaccine and medical inventory batches registered in database will be tracked and prioritized here under FEFO protocols.
            </p>
          </div>
        ) : (
          <>
            {urgentBatches.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground truncate">{item.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/70 shrink-0">Lot #{item.batchNumber}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Stock: <strong className="text-foreground">{item.stock} {item.unit}</strong> (Min: {item.minimumStock}) • {item.storageLocation}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70">
                    Expires: {item.expirationDate} • FEFO Priority #{item.fefoPriority}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {getStatusBadge(item.status, item.daysToExpiry)}
                </div>
              </div>
            ))}

            <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              <span>
                FEFO Protocol Active: Nearest expiry vaccine and medicine batches are prioritized for upcoming field mobile teams.
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
