"use client";

import { useState } from "react";
import { Loader2, Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCVO } from "@/lib/cvo-context";
import type { CVOInventoryItem } from "@/data/cvo-store";

interface DeleteBatchDialogProps {
  batch: CVOInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteBatchDialog({
  batch,
  open,
  onOpenChange,
  onDeleted,
}: DeleteBatchDialogProps) {
  const [loading, setLoading] = useState(false);
  const { deleteInventoryBatch, addAuditLog } = useCVO();

  const handleDelete = async () => {
    if (!batch) return;
    setLoading(true);

    try {
      const identifier = batch.id || batch.batchNumber;
      const success = await deleteInventoryBatch(identifier);

      if (success) {
        addAuditLog({
          user: "CVO Logistics Officer",
          role: "Administrator",
          action: "Deleted Inventory Batch",
          entity: "Inventory",
          recordId: batch.batchNumber,
          details: `Removed batch ${batch.batchNumber} (${batch.name}) with ${batch.stock} ${batch.unit} from cold-chain ledger.`,
        });

        toast.success("Batch Deleted", {
          description: `Batch ${batch.batchNumber} has been removed from the inventory.`,
        });

        if (onDeleted) onDeleted();
        onOpenChange(false);
      } else {
        toast.error("Failed to delete batch. Please try again.");
      }
    } catch {
      toast.error("An error occurred while deleting the batch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[420px] p-6 bg-background rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2 pb-2">
          <div className="flex items-center justify-between">
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-full border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
          <DialogTitle className="text-base font-bold text-foreground">
            Delete Inventory Batch
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to remove this batch from the cold-chain ledger? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {batch && (
          <div className="p-3.5 bg-muted/30 rounded-xl border border-border/60 text-xs space-y-1.5 my-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Batch / Lot No:</span>
              <span className="font-mono font-bold text-primary">{batch.batchNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-semibold text-foreground text-right truncate max-w-[200px]" title={batch.name}>
                {batch.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stock On Hand:</span>
              <span className="font-mono font-bold text-foreground">
                {batch.stock} {batch.unit}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Storage Location:</span>
              <span className="text-[11px] text-muted-foreground text-right truncate max-w-[180px]">
                {batch.storageLocation}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs cursor-pointer rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="text-xs cursor-pointer font-semibold rounded-lg gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Delete Batch</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
