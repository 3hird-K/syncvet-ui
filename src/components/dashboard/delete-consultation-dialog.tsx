"use client";

import { useState } from "react";
import { Loader2, Trash2, AlertTriangle, Stethoscope, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCVO } from "@/lib/cvo-context";
import { type CVOConsultation, isConsultationLockedByVet } from "@/data/cvo-store";

interface DeleteConsultationDialogProps {
  consultation: CVOConsultation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteConsultationDialog({
  consultation,
  open,
  onOpenChange,
  onDeleted,
}: DeleteConsultationDialogProps) {
  const [loading, setLoading] = useState(false);
  const { deleteConsultation } = useCVO();

  if (!consultation) return null;

  const isLocked = isConsultationLockedByVet(consultation);

  const handleDelete = async () => {
    if (isLocked) {
      toast.error("Cannot Delete Official Record", {
        description: "Official records that have already been reviewed or modified by a veterinarian cannot be deleted.",
      });
      onOpenChange(false);
      return;
    }

    setLoading(true);

    try {
      const success = await deleteConsultation(consultation.id);

      if (success) {
        toast.success("Consultation Record Deleted", {
          description: `Encounter #${consultation.encounterNo} for ${consultation.petName} has been removed.`,
        });
        if (onDeleted) onDeleted();
        onOpenChange(false);
      } else {
        toast.error("Failed to delete record. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred while deleting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md p-6 bg-background rounded-2xl shadow-xl overflow-hidden">
        <DialogHeader className="space-y-2">
          {isLocked ? (
            <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Lock className="size-5" />
            </div>
          ) : (
            <div className="size-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shrink-0">
              <Trash2 className="size-5" />
            </div>
          )}
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              {isLocked ? "Official Consultation Record Locked" : "Delete Consultation Encounter"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
              {isLocked
                ? "This consultation encounter has already been reviewed, diagnosed, or attended by a veterinarian. Official medical records and government clinical encounter files cannot be deleted."
                : "Are you sure you want to delete this consultation record? This action will remove the record from your portal and cancel the clinic queue intake."}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Record Summary Box */}
        <div
          className={`w-full min-w-0 p-3.5 rounded-xl border space-y-2 text-xs overflow-hidden ${
            isLocked ? "border-amber-500/20 bg-amber-500/5" : "border-destructive/20 bg-destructive/5"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className={`font-mono text-[10px] font-bold shrink-0 ${
                isLocked ? "border-amber-500/30 text-amber-600" : "border-destructive/30 text-destructive"
              }`}
            >
              #{consultation.encounterNo}
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase font-bold shrink-0">
              {consultation.status}
            </Badge>
          </div>
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-foreground flex items-center gap-1.5 truncate">
              <Stethoscope
                className={`size-3.5 shrink-0 ${isLocked ? "text-amber-600" : "text-destructive"}`}
              />
              <span className="truncate">
                {consultation.petName} ({consultation.species} • {consultation.breed || "Standard"})
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Date: {consultation.date} at {consultation.time}
            </p>
            {consultation.diagnosis && (
              <p className="text-[11px] text-foreground font-medium truncate">
                Diagnosis: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{consultation.diagnosis}</span>
              </p>
            )}
            <p className="text-[11px] text-muted-foreground break-words line-clamp-2 leading-relaxed">
              <span className="font-medium text-foreground/80">Reason:</span>{" "}
              {consultation.chiefComplaint || "General consultation"}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-border/40 flex flex-row items-center justify-end w-full">
          {isLocked ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 px-5 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Understood
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl cursor-pointer shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
