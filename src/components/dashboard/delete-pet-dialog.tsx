"use client";

import { useState, useMemo } from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useCVO } from "@/lib/cvo-context";
import { useUser } from "@clerk/nextjs";

interface DeletePetDialogProps {
  pet: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeletePetDialog({
  pet,
  open,
  onOpenChange,
  onDeleted,
}: DeletePetDialogProps) {
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();
  const { addAuditLog } = useCVO();
  const { user } = useUser();

  const handleDelete = async () => {
    if (!pet?.id) return;
    setLoading(true);

    try {
      // Optimistically update TanStack Query cache immediately for instant UI response
      queryClient.setQueriesData({ queryKey: ["owner-pets"] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((p: any) => p.id !== pet.id);
      });
      queryClient.setQueriesData({ queryKey: ["pets_registry"] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((p: any) => p.id !== pet.id);
      });
      const petNameLower = pet.name?.toLowerCase() || "";

      // 1. Cascade delete appointments from Supabase
      try {
        if (pet.id) {
          await supabase.from("appointments").delete().eq("pet_id", pet.id);
        }
        if (pet.name) {
          await supabase.from("appointments").delete().eq("pet_name", pet.name);
        }
      } catch (e) {
        console.warn("Appointments delete warning:", e);
      }

      // 2. Cascade delete service transactions
      try {
        if (pet.id) {
          await supabase.from("service_transactions").delete().eq("reference_id", pet.id);
        }
        if (pet.name) {
          await supabase.from("service_transactions").delete().ilike("title", `%${pet.name}%`);
        }
      } catch (e) {
        console.warn("Transactions delete warning:", e);
      }

      // 3. Cascade delete consultations & chats & medical records for this pet
      try {
        if (pet.id) {
          await supabase.from("consultations").delete().eq("pet_id", pet.id);
        }
        if (pet.name) {
          await supabase.from("consultations").delete().eq("pet_name", pet.name);
        }
      } catch (e) {
        console.warn("Consultations delete warning:", e);
      }
      try {
        if (pet.id) {
          await supabase.from("vaccination_records").delete().eq("pet_id", pet.id);
        }
        if (pet.name) {
          await supabase.from("vaccination_records").delete().eq("pet_name", pet.name);
        }
      } catch (e) {
        console.warn("Vaccination delete warning:", e);
      }
      try {
        if (pet.id) {
          await supabase.from("chats").delete().eq("pet_id", pet.id);
        }
      } catch (e) {
        console.warn("Chats delete warning:", e);
      }

      // 5. Clean up localStorage cache
      try {
        const localApts = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        const filteredApts = localApts.filter(
          (a: any) =>
            a.pet_id !== pet.id &&
            a.pet_name?.toLowerCase() !== petNameLower
        );
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(filteredApts));

        const localConsultations = JSON.parse(localStorage.getItem("cvo_consultations_v2") || "[]");
        const filteredConsultations = localConsultations.filter(
          (c: any) =>
            c.petId !== pet.id &&
            c.petName?.toLowerCase() !== petNameLower
        );
        localStorage.setItem("cvo_consultations_v2", JSON.stringify(filteredConsultations));
      } catch {}

      // 6. Delete pet from Supabase `pets` table
      const { data, error } = await supabase
        .from("pets")
        .delete()
        .eq("id", pet.id)
        .select();

      if (error) {
        throw error;
      }

      // 7. Invalidate and refetch all pet-related queries across components
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner-pets"] }),
        queryClient.invalidateQueries({ queryKey: ["pets_registry"] }),
        queryClient.invalidateQueries({ queryKey: ["live_pets_count"] }),
        queryClient.invalidateQueries({ queryKey: ["supabase-owners-pets"] }),
        queryClient.invalidateQueries({ queryKey: ["chat-user-pets"] }),
        queryClient.invalidateQueries({ queryKey: ["user-appointments"] }),
        queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] }),
        queryClient.invalidateQueries({ queryKey: ["user-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["consultations"] }),
        queryClient.refetchQueries({ queryKey: ["owner-pets"] }),
        queryClient.refetchQueries({ queryKey: ["pets_registry"] }),
        queryClient.refetchQueries({ queryKey: ["user-appointments"] }),
      ]);

      // 4. Log to official municipal audit ledger
      try {
        addAuditLog({
          user: user?.fullName || "Pet Owner",
          role: "Pet Owner",
          action: "Removed Animal from CVO Database",
          entity: "Pet Registry",
          recordId: pet.id,
          details: `Deleted pet record: ${pet.name || "Pet"} (${pet.species || "Animal"} • ${pet.breed || "Mixed"}), Tag #${pet.microchip || pet.id}.`,
        });
      } catch {}

      toast.success("Pet Removed", {
        description: `${pet.name || "The pet"} has been successfully removed from the registry.`,
      });

      onDeleted?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Delete pet error:", err);
      toast.error("Failed to delete pet", {
        description: err.message || "An unexpected error occurred while deleting the pet.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!pet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-5 rounded-2xl">
        <DialogHeader className="space-y-2">
          <div className="size-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20 shadow-2xs">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Delete {pet.name}?
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to remove <strong className="text-foreground">{pet.name}</strong> from your official registered pets? This action will remove their digital passport and medical ledger link.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-3 border-t border-border/50 flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="flex-1 h-9 text-xs rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={handleDelete}
            className="flex-1 h-9 text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Yes, Delete Pet</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
