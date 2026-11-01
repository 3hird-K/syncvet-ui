"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  PawPrint,
  ShieldCheck,
  AlertCircle,
  Copy,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Tag,
  Stethoscope,
  Syringe,
  Scissors,
  UserCog,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { PetProfileDialog, type PetProfileRecord } from "@/components/dashboard/pet-profile-dialog";
import { RegisterPetDialog } from "@/components/dashboard/register-pet-dialog";
import { getPetAvatarUrl } from "@/lib/pet-avatars";
import {
  type SupabaseUser,
  type SyncVetRole,
  SYNCVET_ROLES,
  normalizeSyncVetRole,
} from "@/data/syncvet-users";
import { cvoBarangays } from "@/data/cvo-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { type SupabasePet, type SupabaseAppointment } from "@/types/supabase.types";
import { parsePetWeightKg } from "@/lib/pet-weight";

export interface UserProfileDialogProps {
  user: SupabaseUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  onUserUpdated?: (user: SupabaseUser) => void;
  onUserDeleted?: (userId: string) => void;
}

const USER_PRESET_AVATARS = [
  { id: "fam1", label: "Citizen Profile 1", url: "/assets/no-backgrounds/fam1-removebg-preview.png" },
  { id: "fam2", label: "Citizen Profile 2", url: "/assets/no-backgrounds/fam2-removebg-preview.png" },
  { id: "boy11", label: "Guardian Profile", url: "/assets/no-backgrounds/boy11-removebg-preview.png" },
  { id: "girl3", label: "Youth Profile", url: "/assets/no-backgrounds/girl3-removebg-preview.png" },
  { id: "doctor11", label: "Clinical DVM", url: "/assets/no-backgrounds/doctor11-removebg-preview.png" },
  { id: "nurse1", label: "Veterinary Nurse", url: "/assets/no-backgrounds/nurse1-removebg-preview.png" },
  { id: "helen", label: "City Veterinarian", url: "/dr-helen-tacandong.jpg" },
  { id: "nurse_pets", label: "Care Assistant", url: "/assets/no-backgrounds/nurse-pets-removebg-preview.png" },
];

function getInitials(name: string | null, email: string) {
  if (name && name.trim()) {
    return name
      .trim()
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "U";
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function UserProfileDialog({
  user,
  open,
  onOpenChange,
  isAdmin = true,
  onUserUpdated,
  onUserDeleted,
}: UserProfileDialogProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "appointments">("overview");

  // Side panels matching pet dialog pattern (Images 2 & 3)
  const [showEditUserPanel, setShowEditUserPanel] = useState(false);
  const [showAvatarPickerPanel, setShowAvatarPickerPanel] = useState(false);

  // Editable user state
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(user);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState<SyncVetRole>("Pet Owner");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Clickable pet in user profile to open full PetProfileDialog
  const [selectedPetForProfile, setSelectedPetForProfile] = useState<PetProfileRecord | null>(null);

  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  // Sync state when user prop changes
  useEffect(() => {
    setCurrentUser(user);
    if (user) {
      setEditFirstName(user.first_name || (user.full_name ? user.full_name.split(" ")[0] : ""));
      setEditLastName(
        user.last_name ||
          (user.full_name && user.full_name.split(" ").length > 1
            ? user.full_name.split(" ").slice(1).join(" ")
            : "")
      );
      setEditRole(normalizeSyncVetRole(user.role));
      setEditPhoneNumber(user.phone_number || "");
      setEditAddress(user.address || "");
    }
  }, [user]);

  // Reset side panels when opening
  useEffect(() => {
    if (open) {
      setActiveTab("overview");
      setShowEditUserPanel(false);
      setShowAvatarPickerPanel(false);
      setSelectedPetForProfile(null);
    }
  }, [open, user?.id]);

  // Fetch pets owned by this user
  const { data: userPets = [], isLoading: loadingPets } = useQuery<SupabasePet[]>({
    queryKey: ["user-profile-pets", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", currentUser.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching user pets:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!currentUser?.id && open,
    refetchOnWindowFocus: true,
    refetchInterval: open ? 5000 : false,
  });

  // Supabase Realtime Postgres subscription syncing directly with TanStack Query cache
  useEffect(() => {
    if (!currentUser?.id || !open) return;

    const channel = supabase
      .channel(`realtime-user-profile-pets-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pets",
          filter: `owner_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newPet = payload.new as SupabasePet;
            queryClient.setQueryData<SupabasePet[]>(
              ["user-profile-pets", currentUser.id],
              (old = []) => [newPet, ...old.filter((p) => p.id !== newPet.id)]
            );
          } else if (payload.eventType === "UPDATE") {
            const updatedPet = payload.new as SupabasePet;
            queryClient.setQueryData<SupabasePet[]>(
              ["user-profile-pets", currentUser.id],
              (old = []) => old.map((p) => (p.id === updatedPet.id ? updatedPet : p))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedPet = payload.old as { id: string };
            queryClient.setQueryData<SupabasePet[]>(
              ["user-profile-pets", currentUser.id],
              (old = []) => old.filter((p) => p.id !== deletedPet.id)
            );
          }

          queryClient.invalidateQueries({ queryKey: ["user-profile-pets", currentUser.id] });
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
          queryClient.invalidateQueries({ queryKey: ["supabase-owners-pets"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, open, supabase, queryClient]);

  // Fetch appointments for this user
  const { data: userAppointments = [] } = useQuery<SupabaseAppointment[]>({
    queryKey: ["user-profile-appointments", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("owner_id", currentUser.id)
        .order("created_at", { ascending: false });
      if (error) {
        return [];
      }
      return data || [];
    },
    enabled: !!currentUser?.id && open,
  });

  // Merge any metadata pets if present
  const allPets = useMemo(() => {
    const list: SupabasePet[] = [...userPets];
    if (currentUser?.raw_user_meta_data && typeof currentUser.raw_user_meta_data === "object") {
      const meta = currentUser.raw_user_meta_data as { pets?: any[] };
      if (Array.isArray(meta.pets)) {
        for (const mp of meta.pets) {
          if (mp && mp.name && !list.some((p) => p.name.toLowerCase() === String(mp.name).toLowerCase())) {
            list.push({
              id: mp.id || `meta-${mp.name}`,
              owner_id: currentUser.id,
              name: String(mp.name),
              species: String(mp.species || mp.type || "dog"),
              breed: (mp.breed as string) || null,
              birth_year: typeof mp.birthYear === "number" ? mp.birthYear : null,
              gender: (mp.gender as string) || null,
              is_vaccinated: Boolean(mp.isVaccinated),
              rabies_vaccinated: Boolean(mp.rabiesVaccinated || mp.vaccinated),
              is_spayed_neutered: Boolean(mp.isSpayedNeutered),
              weight_category: (mp.weightCategory as string) || null,
              microchip_number: (mp.microchipNumber || mp.microchip as string) || null,
              notes: (mp.notes as string) || null,
              photo_url: (mp.photo_url || mp.photoUrl || null) as string | null,
              avatar_id: (mp.avatarId as string) || null,
              vaccination_doses: 0,
              last_vaccination_date: null,
              next_vaccination_date: null,
              created_at: (mp.createdAt as string) || new Date().toISOString(),
              updated_at: (mp.updatedAt as string) || new Date().toISOString(),
            });
          }
        }
      }
    }
    return list;
  }, [userPets, currentUser]);

  // Pet Registry Carousel Horizontal Scrolling & Edge Navigation (Matching Image 2)
  const petsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkPetScroll = useCallback(() => {
    const el = petsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  useEffect(() => {
    const el = petsScrollRef.current;
    if (!el) return;

    checkPetScroll();

    el.addEventListener("scroll", checkPetScroll, { passive: true });
    window.addEventListener("resize", checkPetScroll);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        checkPetScroll();
      });
      ro.observe(el);
    }

    const timer = setTimeout(checkPetScroll, 150);

    return () => {
      el.removeEventListener("scroll", checkPetScroll);
      window.removeEventListener("resize", checkPetScroll);
      if (ro) ro.disconnect();
      clearTimeout(timer);
    };
  }, [allPets, open, checkPetScroll]);

  const scrollPets = (direction: "left" | "right") => {
    if (petsScrollRef.current) {
      const scrollAmount = direction === "left" ? -260 : 260;
      petsScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkPetScroll, 350);
    }
  };

  // Unsaved changes detection for Save icon highlight
  const hasUnsavedChanges = useMemo(() => {
    if (!currentUser) return false;
    const currentFirst = currentUser.first_name || (currentUser.full_name ? currentUser.full_name.split(" ")[0] : "");
    const currentLast = currentUser.last_name || (currentUser.full_name && currentUser.full_name.split(" ").length > 1 ? currentUser.full_name.split(" ").slice(1).join(" ") : "");
    const currentPhone = currentUser.phone_number || "";
    const currentAddr = currentUser.address || "";
    const currentRole = normalizeSyncVetRole(currentUser.role);

    return (
      editFirstName.trim() !== currentFirst.trim() ||
      editLastName.trim() !== currentLast.trim() ||
      editPhoneNumber.trim() !== currentPhone.trim() ||
      editAddress.trim() !== currentAddr.trim() ||
      editRole !== currentRole
    );
  }, [currentUser, editFirstName, editLastName, editPhoneNumber, editAddress, editRole]);

  // Copy User ID
  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("User ID copied to clipboard");
    } catch {
      toast.error("Failed to copy ID");
    }
  };

  // Copy User Email
  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email address copied to clipboard");
    } catch {
      toast.error("Failed to copy email");
    }
  };

  // Save user profile changes
  const handleSaveUser = async () => {
    if (!currentUser) return;
    if (!isAdmin) {
      toast.error("Access restricted: Administrator role required to edit accounts.");
      return;
    }

    setIsSaving(true);
    const updatedFullName = `${editFirstName.trim()} ${editLastName.trim()}`.trim() || currentUser.email;

    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
          full_name: updatedFullName,
          role: editRole,
          phone_number: editPhoneNumber.trim() || null,
          address: editAddress.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id)
        .select()
        .single();

      if (error) throw error;

      const updatedUserRecord: SupabaseUser = {
        ...currentUser,
        first_name: editFirstName.trim() || null,
        last_name: editLastName.trim() || null,
        full_name: updatedFullName,
        role: editRole,
        phone_number: editPhoneNumber.trim() || null,
        address: editAddress.trim() || null,
      };

      setCurrentUser(updatedUserRecord);
      if (onUserUpdated && data) {
        onUserUpdated(data);
      }

      await queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["queue-users"] });

      toast.success("User Profile Updated", {
        description: `Saved changes for ${updatedFullName}.`,
      });
      setShowEditUserPanel(false);
    } catch (err: any) {
      console.error("User update error:", err);
      toast.error("Failed to save changes", { description: err?.message || "An error occurred" });
    } finally {
      setIsSaving(false);
    }
  };

  // Select user avatar preset
  const handleSelectAvatarPreset = async (url: string, label: string) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq("id", currentUser.id)
        .select()
        .single();

      if (error) throw error;

      const updatedRecord: SupabaseUser = {
        ...currentUser,
        avatar_url: url,
      };
      setCurrentUser(updatedRecord);
      if (onUserUpdated && data) {
        onUserUpdated(data);
      }

      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["queue-users"] });

      toast.success("Profile photo updated!", {
        description: `Set profile picture to ${label}.`,
      });
    } catch (err: any) {
      toast.error("Failed to update profile photo", { description: err?.message || "An error occurred" });
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm delete user account
  const handleConfirmDelete = async () => {
    if (!currentUser) return;
    if (!isAdmin) {
      toast.error("Access denied. Only Administrators can delete accounts.");
      return;
    }

    setIsDeleting(true);
    const targetUserId = currentUser.id;
    const targetUserLabel = currentUser.full_name || currentUser.email;

    try {
      const { error } = await supabase.from("users").delete().eq("id", targetUserId);
      if (error) throw error;

      toast.success("Account Terminated", {
        description: `User account for ${targetUserLabel} has been permanently deleted.`,
      });

      if (onUserDeleted) {
        onUserDeleted(targetUserId);
      }
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to delete user account", { description: err?.message || "An error occurred" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Pet in PetProfileDialog
  const handleOpenPetProfile = (pet: SupabasePet) => {
    if (!currentUser) return;
    const petRecord: PetProfileRecord = {
      id: pet.id,
      name: pet.name,
      species: ((pet.species || "Dog").charAt(0).toUpperCase() + (pet.species || "Dog").slice(1).toLowerCase()) as "Dog" | "Cat" | "Livestock",
      breed: pet.breed || "Aspin",
      sex: ((pet.gender || "Male").charAt(0).toUpperCase() + (pet.gender || "Male").slice(1).toLowerCase()) as "Male" | "Female",
      age: pet.birth_year ? `${new Date().getFullYear() - pet.birth_year} yrs` : "2 years",
      weightKg: parsePetWeightKg(pet.weight_category, pet.species),
      ownerId: currentUser.id,
      owner: currentUser.full_name || currentUser.email,
      ownerEmail: currentUser.email,
      ownerAvatarUrl: currentUser.avatar_url || undefined,
      barangay: currentUser.address || "Carmen",
      address: currentUser.address || "District Proper",
      vaccinated: Boolean(pet.rabies_vaccinated || pet.is_vaccinated),
      sterilized: Boolean(pet.is_spayed_neutered),
      microchip: pet.microchip_number || pet.id.slice(0, 8),
      classification: "Domestic",
      photo_url: pet.photo_url || null,
      lastVaccinationDate: pet.last_vaccination_date || undefined,
      nextVaccinationDate: pet.next_vaccination_date || undefined,
      createdAt: pet.created_at,
    };
    setSelectedPetForProfile(petRecord);
  };

  if (!currentUser) return null;

  const normalizedRole = normalizeSyncVetRole(currentUser.role);
  const initials = getInitials(currentUser.full_name, currentUser.email);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "w-full p-0 bg-transparent border-0 shadow-none transition-all duration-300 ease-in-out h-[88vh] max-h-[88vh] flex flex-col no-scrollbar",
            showAvatarPickerPanel || showEditUserPanel
              ? "max-w-5xl sm:max-w-5xl xl:max-w-6xl"
              : activeTab !== "overview"
              ? "max-w-4xl sm:max-w-4xl"
              : "max-w-3xl sm:max-w-3xl"
          )}
        >
          <div className="flex items-stretch gap-1.5 sm:gap-2 w-full h-full min-h-0 flex-1 overflow-hidden">
            {/* ── Left Side: User Profile & Pets Card (Matching Pet Profile Style) ── */}
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden min-w-0 rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl">
              <DialogHeader className="sr-only">
                <DialogTitle>{currentUser.full_name || currentUser.email} - User Profile</DialogTitle>
                <DialogDescription>
                  CDO Municipal Citizen profile and companion animals for {currentUser.full_name || currentUser.email}
                </DialogDescription>
              </DialogHeader>

              {/* ── Top Hero Card with Role-Tailored Gradient ── */}
              <div
                className={cn(
                  "p-5 text-white relative overflow-hidden shrink-0",
                  normalizedRole === "Veterinarian"
                    ? "bg-gradient-to-br from-emerald-800 via-teal-950 to-slate-950"
                    : normalizedRole === "Administrator"
                    ? "bg-gradient-to-br from-sky-800 via-blue-950 to-slate-950"
                    : "bg-gradient-to-br from-purple-800 via-indigo-950 to-slate-950"
                )}
              >
                <div className="absolute -bottom-10 -right-10 size-40 bg-white/[0.05] rounded-full blur-2xl pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.08] rounded-full blur-3xl pointer-events-none" />

                {/* Top Action Icons: Appointments, Save, Delete, Close */}
                <div className="flex items-center justify-end relative z-10 mb-3 gap-1.5">
                  {/* Appointments View Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab((prev) => (prev === "appointments" ? "overview" : "appointments"));
                      setShowEditUserPanel(false);
                      setShowAvatarPickerPanel(false);
                    }}
                    className={cn(
                      "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      activeTab === "appointments"
                        ? "bg-white/30 text-white border-white/60 ring-2 ring-white/40 shadow-md scale-105"
                        : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                    )}
                    title={activeTab === "appointments" ? "Close Appointments View" : "Clinic Appointments & History"}
                  >
                    <Calendar className="size-4 text-white" />
                    <span className="sr-only">Appointments & Care</span>
                  </button>

                  {/* Save User Button (floppy disk icon with unsaved changes highlight) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleSaveUser}
                      disabled={isSaving}
                      className={cn(
                        "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                        hasUnsavedChanges
                          ? "bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-300 ring-2 ring-emerald-400/50 shadow-md animate-pulse"
                          : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                      )}
                      title={hasUnsavedChanges ? "Save account changes" : "Save User"}
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin text-white" />
                      ) : (
                        <Save className="size-4 text-white" />
                      )}
                      <span className="sr-only">Save User</span>
                    </button>
                  )}

                  {/* Delete User Button (Admin Only) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={isDeleting}
                      className="size-8 rounded-full bg-white/10 hover:bg-rose-600/80 text-white border border-white/20 hover:border-rose-400 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      title="Permanently Delete Account"
                    >
                      <Trash2 className="size-4 text-white" />
                      <span className="sr-only">Delete Account</span>
                    </button>
                  )}

                  {/* Close Dialog */}
                  <DialogClose asChild>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        setActiveTab("overview");
                        setShowEditUserPanel(false);
                        setShowAvatarPickerPanel(false);
                      }}
                      className="size-8 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ml-2.5 sm:ml-3"
                      title="Close"
                    >
                      <X className="size-4 text-white" />
                      <span className="sr-only">Close</span>
                    </button>
                  </DialogClose>
                </div>

                {/* Hero Identity: Avatar, Name with Edit & Photo Buttons, Badges */}
                <div className="flex items-center gap-4 relative z-10">
                  {/* Avatar with Photo Picker trigger */}
                  <div className="relative group shrink-0">
                    <Avatar className="size-16 sm:size-20 border-2 border-white/40 shadow-xl">
                      {currentUser.avatar_url && (
                        <AvatarImage src={currentUser.avatar_url} alt={currentUser.full_name || currentUser.email} />
                      )}
                      <AvatarFallback className="bg-white/20 text-white font-extrabold text-lg sm:text-xl backdrop-blur-md">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* User Name with Clickable Edit and Photo Icon Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                        {currentUser.full_name || currentUser.email}
                      </h2>
                      <div className="flex items-center gap-1">
                        {/* Edit Pencil Icon (Toggles side panel matching Image 2) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditUserPanel((prev) => !prev);
                            setShowAvatarPickerPanel(false);
                          }}
                          className={cn(
                            "size-7 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95",
                            showEditUserPanel
                              ? "bg-white text-slate-900 border-white shadow-md scale-105"
                              : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                          )}
                          title={showEditUserPanel ? "Close edit panel" : "Edit User Information"}
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit User</span>
                        </button>
                      </div>
                    </div>

                    {/* Subtitle: Email, Contact, Address */}
                    <div className="flex items-center gap-2 text-xs text-white/80 flex-wrap">
                      <button
                        type="button"
                        onClick={() => copyEmail(currentUser.email)}
                        className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                        title="Click to copy email"
                      >
                        <Mail className="size-3 text-white/70" />
                        <span className="truncate max-w-[180px] sm:max-w-none">{currentUser.email}</span>
                      </button>

                      {currentUser.phone_number && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3 text-white/70" />
                            <span>{currentUser.phone_number}</span>
                          </span>
                        </>
                      )}

                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => copyId(currentUser.id)}
                        className="font-mono text-[10px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded border border-white/20 transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Click to copy User ID"
                      >
                        <span>ID: {currentUser.id.slice(0, 10)}...</span>
                        <Copy className="size-2.5 opacity-70" />
                      </button>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      {/* Role Badge */}
                      <span
                        className={cn(
                          "text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md inline-flex items-center gap-1",
                          normalizedRole === "Administrator"
                            ? "bg-rose-500/90 text-white"
                            : normalizedRole === "Veterinarian"
                            ? "bg-emerald-500/90 text-white"
                            : "bg-purple-500/90 text-white"
                        )}
                      >
                        {normalizedRole === "Administrator" && <UserCog className="size-3" />}
                        {normalizedRole === "Veterinarian" && <Stethoscope className="size-3" />}
                        {normalizedRole === "Pet Owner" && <PawPrint className="size-3" />}
                        <span>{normalizedRole}</span>
                      </span>

                      {/* Total Registered Pets Badge */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md border bg-white/10 text-white/90 border-white/20 inline-flex items-center gap-1">
                        <PawPrint className="size-3" />
                        <span>{allPets.length} {allPets.length === 1 ? "Pet" : "Pets"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Content Area ── */}
              <div
                className={cn(
                  "flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                  activeTab !== "overview" ? "p-3 sm:p-3.5 space-y-2.5" : "p-3 sm:p-4 space-y-4"
                )}
              >
                {/* ── OVERVIEW TAB ── */}
                {activeTab === "overview" && (
                  <>
                    {/* ── Registered Companion Animals Section (No outer container box) ── */}
                    <div className="space-y-2.5">
                      {/* Image 3 Header */}
                      <div className="flex items-center justify-between px-0.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <PawPrint className="size-4 stroke-[2.2]" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                              Registered Companion Animals
                            </h3>
                            <p className="text-[10px] text-muted-foreground">
                              Household pets registered under {currentUser.full_name || currentUser.email}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg"
                        >
                          {allPets.length} {allPets.length === 1 ? "Pet Registered" : "Pets Registered"}
                        </Badge>
                      </div>

                      {/* Pet Registry Strip - Compact / Reduced Height */}
                      {loadingPets ? (
                        <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                          <Loader2 className="size-4 animate-spin text-emerald-600" />
                          <span>Fetching registered companion animals...</span>
                        </div>
                      ) : (
                        <div className="relative group/stories pt-0.5">
                          <div
                            ref={petsScrollRef}
                            className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth snap-x snap-mandatory"
                          >
                            {/* 1. Register Pet Card - Compact */}
                            <RegisterPetDialog
                              defaultOwnerId={currentUser.id}
                              onPetCreated={(newPet) => {
                                queryClient.setQueryData<SupabasePet[]>(
                                  ["user-profile-pets", currentUser.id],
                                  (old = []) => [newPet, ...old.filter((p) => p.id !== newPet.id)]
                                );
                                queryClient.invalidateQueries({ queryKey: ["user-profile-pets", currentUser.id] });
                                queryClient.invalidateQueries({ queryKey: ["users"] });
                              }}
                              trigger={
                                <div
                                  className="w-[105px] sm:w-[118px] md:w-[128px] h-36 sm:h-40 md:h-42 rounded-xl sm:rounded-2xl bg-gradient-to-b from-card/90 via-card/60 to-emerald-500/[0.04] dark:from-card/60 dark:to-emerald-950/20 hover:from-emerald-500/[0.08] hover:via-emerald-500/[0.05] hover:to-emerald-500/[0.12] border-2 border-dashed border-emerald-500/35 hover:border-emerald-500 dark:border-emerald-500/25 dark:hover:border-emerald-400 overflow-hidden relative flex flex-col items-center justify-center p-2.5 text-center shrink-0 cursor-pointer shadow-2xs hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 select-none group/story snap-start"
                                  title="Register a new pet into CVO database"
                                >
                                  {/* Atmospheric Ambient Glow on Hover */}
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 size-24 rounded-full bg-emerald-500/15 blur-xl opacity-40 group-hover/story:opacity-100 group-hover/story:scale-125 transition-all duration-500 pointer-events-none" />

                                  {/* Plus Icon Box */}
                                  <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs mb-2 group-hover/story:bg-emerald-600 group-hover/story:text-white group-hover/story:border-emerald-600 group-hover/story:scale-110 group-hover/story:rotate-90 group-hover/story:shadow-md group-hover/story:shadow-emerald-600/30 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-10">
                                    <Plus className="size-4 sm:size-5 stroke-[2.5]" />
                                  </div>

                                  <p className="text-[11px] sm:text-xs font-extrabold text-foreground group-hover/story:text-emerald-600 dark:group-hover/story:text-emerald-400 transition-colors duration-300 leading-tight relative z-10">
                                    Register Pet
                                  </p>
                                  <p className="text-[9px] text-muted-foreground group-hover/story:text-foreground/80 leading-tight mt-0.5 transition-colors duration-300 relative z-10">
                                    Add Companion
                                  </p>
                                </div>
                              }
                            />

                            {/* 2..N: Each Pet's Digital Passport Card - Compact / Reduced Height */}
                            {allPets.map((pet, idx) => {
                              const isCat =
                                (pet.species || "").toLowerCase().includes("cat") ||
                                (pet.species || "").toLowerCase().includes("feline");
                              const resolvedPhotoUrl = getPetAvatarUrl(pet.photo_url, pet.species);

                              const gradientBg = isCat
                                ? "bg-gradient-to-b from-violet-600 via-indigo-950 to-slate-950"
                                : idx % 2 === 0
                                ? "bg-gradient-to-b from-teal-600 via-emerald-950 to-slate-950"
                                : "bg-gradient-to-b from-cyan-700 via-slate-900 to-slate-950";

                              return (
                                <div
                                  key={pet.id}
                                  onClick={() => handleOpenPetProfile(pet)}
                                  className={cn(
                                    "w-[105px] sm:w-[118px] md:w-[128px] h-36 sm:h-40 md:h-42 rounded-xl sm:rounded-2xl overflow-hidden relative shrink-0 cursor-pointer shadow-sm hover:shadow-lg hover:border-white/25 transition-all duration-300 border border-white/15 dark:border-white/10 select-none group/story flex flex-col justify-end p-2 sm:p-2.5 snap-start",
                                    gradientBg
                                  )}
                                  title={`${pet.name} (${pet.species}) — Click to view Pet Details & Passport`}
                                >
                                  {/* Atmospheric Top Spotlight & Glowing Halo */}
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 size-28 rounded-full bg-white/20 blur-xl pointer-events-none" />
                                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 size-20 rounded-full bg-radial from-white/15 via-transparent to-transparent pointer-events-none" />
                                  <div className="absolute -bottom-6 -right-6 size-20 bg-white/[0.04] rounded-full blur-lg pointer-events-none" />

                                  {/* Middle / Bottom: Transparent Pet Cutout Anchored at bottom-0 */}
                                  <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-center pointer-events-none overflow-hidden z-10">
                                    <img
                                      src={resolvedPhotoUrl}
                                      alt={pet.name}
                                      className="h-[88%] w-auto max-w-none object-contain object-bottom origin-bottom filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.65)] group-hover/story:scale-108 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                                      loading="lazy"
                                    />
                                  </div>

                                  {/* Dark Gradient Scrim to Guarantee Text Readability */}
                                  <div className="absolute inset-x-0 bottom-0 h-16 sm:h-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent z-20 pointer-events-none" />

                                  {/* Bottom: Pet Name & Breed */}
                                  <div className="relative z-30 space-y-0.5 w-full">
                                    <h3 className="text-xs sm:text-[13px] font-black text-white leading-tight truncate tracking-tight drop-shadow-md">
                                      {pet.name}
                                    </h3>
                                    <p className="text-[9px] sm:text-[10px] text-white/80 font-medium truncate drop-shadow-xs">
                                      {pet.breed || pet.species}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Edge Navigation Buttons */}
                          {canScrollLeft && (
                            <button
                              type="button"
                              onClick={() => scrollPets("left")}
                              className="absolute -left-2 sm:-left-2.5 top-1/2 -translate-y-1/2 z-40 size-7 sm:size-8 rounded-full bg-card/95 hover:bg-card border border-border/80 shadow-md flex items-center justify-center text-foreground hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
                              title="View previous pets"
                              aria-label="View previous pets"
                            >
                              <ChevronLeft className="size-3.5 sm:size-4" />
                            </button>
                          )}

                          {canScrollRight && (
                            <button
                              type="button"
                              onClick={() => scrollPets("right")}
                              className="absolute -right-2 sm:-right-2.5 top-1/2 -translate-y-1/2 z-40 size-7 sm:size-8 rounded-full bg-card/95 hover:bg-card border border-border/80 shadow-md flex items-center justify-center text-foreground hover:scale-110 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
                              title="View next pets"
                              aria-label="View next pets"
                            >
                              <ChevronRight className="size-3.5 sm:size-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Citizen & Custodian Official Municipal Profile ── */}
                    <div className="p-3.5 rounded-2xl border border-border/80 bg-card/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <User className="size-3.5 text-primary" />
                          <span>Citizen & Account Dossier</span>
                        </h4>
                        <span className="text-[10.5px] text-muted-foreground">
                          Joined: <strong>{formatDate(currentUser.created_at)}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                          <span className="text-[10px] text-muted-foreground block">Full Legal Name</span>
                          <span className="font-semibold text-foreground truncate block">
                            {currentUser.full_name || "—"}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                          <span className="text-[10px] text-muted-foreground block">Official Email</span>
                          <span className="font-mono text-[10.5px] text-foreground truncate block">
                            {currentUser.email}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                          <span className="text-[10px] text-muted-foreground block">Contact Number</span>
                          <span className="font-semibold text-foreground truncate block">
                            {currentUser.phone_number || "Not provided"}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 col-span-2">
                          <span className="text-[10px] text-muted-foreground block">Barangay / Residence</span>
                          <span className="font-semibold text-foreground truncate block flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground shrink-0" />
                            {currentUser.address || "Cagayan de Oro Central Proper"}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                          <span className="text-[10px] text-muted-foreground block">System Role</span>
                          <span className="font-bold text-primary capitalize block">
                            {normalizedRole}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── APPOINTMENTS TAB ── */}
                {activeTab === "appointments" && (
                  <div className="space-y-3 animate-in fade-in-0 duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground">
                          Clinic Appointments & Encounters
                        </h4>
                        <p className="text-[10px] text-muted-foreground">
                          Encounter lifecycle and history for {currentUser.full_name || currentUser.email}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab("overview")}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Back to Overview
                      </Button>
                    </div>

                    {userAppointments.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No appointments found for this user account.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {userAppointments.map((apt: any) => {
                          // Find pet matching this appointment or fallback to account pet
                          const matchedPet = allPets.find(
                            (p) =>
                              (apt.pet_id && (p.id === apt.pet_id || String(p.id).toLowerCase() === String(apt.pet_id).toLowerCase())) ||
                              (apt.pet_name && p.name.toLowerCase() === String(apt.pet_name).toLowerCase())
                          ) || (allPets.length === 1 ? allPets[0] : null);

                          const petName = matchedPet?.name || apt.pet_name || (allPets.length > 0 ? allPets[0]?.name : "Companion Animal");
                          const petSpecies = matchedPet?.species || "Dog";
                          const petBreed = matchedPet?.breed || (petSpecies.toLowerCase().includes("cat") ? "Domestic Short Hair" : "Aspin (Asong Pinoy)");
                          const petPhoto = matchedPet ? getPetAvatarUrl(matchedPet.photo_url, matchedPet.species) : getPetAvatarUrl(null, petSpecies);

                          const s = (apt.service_id || "").toLowerCase();
                          const isVax = s.includes("vax") || s.includes("vaccin") || s.includes("rabies");
                          const isSurgery = s.includes("spay") || s.includes("neuter") || s.includes("kapon") || s.includes("surger");
                          const isConsult = s.includes("consult") || s.includes("exam") || s.includes("check");

                          const procedureTitle = isVax
                            ? "Anti-Rabies Vaccination"
                            : isSurgery
                            ? "Spay & Neuter (Kapon)"
                            : isConsult
                            ? "Clinical Consultation"
                            : apt.service_id
                            ? String(apt.service_id).charAt(0).toUpperCase() + String(apt.service_id).slice(1)
                            : "Clinical Procedure";

                          const handleCardClick = () => {
                            if (matchedPet) {
                              handleOpenPetProfile(matchedPet);
                            } else {
                              const dynamicPet: PetProfileRecord = {
                                id: apt.pet_id || `apt-pet-${apt.id}`,
                                name: petName,
                                species: (petSpecies.charAt(0).toUpperCase() + petSpecies.slice(1).toLowerCase()) as "Dog" | "Cat",
                                breed: petBreed,
                                sex: "Male",
                                age: "Adult",
                                weightKg: 10,
                                ownerId: currentUser.id,
                                owner: currentUser.full_name || currentUser.email,
                                ownerEmail: currentUser.email,
                                ownerAvatarUrl: currentUser.avatar_url || undefined,
                                barangay: currentUser.address || "Carmen",
                                address: currentUser.address || "Carmen, CDO",
                                vaccinated: isVax,
                                sterilized: isSurgery,
                                microchip: apt.pet_id ? apt.pet_id.slice(0, 8) : apt.id.slice(0, 8),
                                classification: "Domestic",
                                photo_url: null,
                                lastVaccinationDate: apt.date ? String(apt.date).split("T")[0] : undefined,
                                createdAt: apt.created_at || new Date().toISOString(),
                              };
                              setSelectedPetForProfile(dynamicPet);
                            }
                          };

                          return (
                            <div
                              key={apt.id}
                              onClick={handleCardClick}
                              className="p-2 sm:p-2.5 px-3 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/50 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group/apt select-none flex items-center justify-between gap-3"
                              title={`Click to view ${petName}'s digital passport & medical record`}
                            >
                              {/* Left: Pet Avatar Thumbnail + Procedure Info */}
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="size-8 sm:size-9 rounded-lg border border-border/80 overflow-hidden shrink-0 bg-muted/50 group-hover/apt:scale-105 transition-transform shadow-2xs">
                                  <img
                                    src={petPhoto}
                                    alt={petName}
                                    className="size-full object-cover"
                                    loading="lazy"
                                  />
                                </div>

                                <div className="min-w-0 flex-1 space-y-0.5">
                                  {/* Line 1: Pet Name + Breed + Procedure Badge */}
                                  <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                                    <span className="font-extrabold text-xs text-foreground group-hover/apt:text-primary transition-colors truncate">
                                      {petName}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/75 truncate">
                                      ({petSpecies} • {petBreed})
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/40">•</span>
                                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-foreground/90 truncate">
                                      {isVax && <Syringe className="size-2.5 text-emerald-500 shrink-0" />}
                                      {isSurgery && <Scissors className="size-2.5 text-purple-500 shrink-0" />}
                                      {isConsult && <Stethoscope className="size-2.5 text-blue-500 shrink-0" />}
                                      {!isVax && !isSurgery && !isConsult && (
                                        <Calendar className="size-2.5 text-primary shrink-0" />
                                      )}
                                      <span className="truncate">{procedureTitle}</span>
                                    </span>
                                  </div>

                                  {/* Line 2: Date + Notes Snippet */}
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate leading-tight">
                                    <span className="inline-flex items-center gap-1 font-mono shrink-0">
                                      <Calendar className="size-2.5 text-muted-foreground/70" />
                                      <span>{(apt.date || "").split("T")[0]}</span>
                                      {apt.time && <span>• {apt.time}</span>}
                                    </span>
                                    {apt.notes && (
                                      <>
                                        <span className="text-muted-foreground/40 shrink-0">•</span>
                                        <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md text-muted-foreground/80">
                                          {apt.notes}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Status Badge + Click Indicator */}
                              <div className="shrink-0 flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider rounded-md",
                                    apt.status === "completed"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                      : apt.status === "confirmed"
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                      : "bg-muted text-muted-foreground border-border"
                                  )}
                                >
                                  {apt.status || "Scheduled"}
                                </Badge>
                                <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover/apt:text-primary group-hover/apt:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Side: Choose Photo Panel (Matching Image 3) ── */}
            {showAvatarPickerPanel && (
              <div className="w-[340px] sm:w-[390px] md:w-[430px] rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl flex flex-col h-full min-h-0 shrink-0 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-right-8 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                {/* Panel Header */}
                <div className="p-3.5 px-4 border-b border-border/70 flex items-center justify-between bg-muted/40 shrink-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Camera className="size-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground truncate">
                        Choose Profile Photo
                      </h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Select citizen profile picture for {currentUser.full_name || currentUser.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarPickerPanel(false)}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors"
                    title="Close photo selector"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Preset Avatars Grid */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 flex items-center justify-between text-xs">
                    <span className="text-[10.5px] font-medium text-muted-foreground">
                      Preset Citizen & Staff Avatars
                    </span>
                    <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                      {USER_PRESET_AVATARS.length} Profiles
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {USER_PRESET_AVATARS.map((avatar) => {
                      const isSelected = currentUser.avatar_url === avatar.url;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleSelectAvatarPreset(avatar.url, avatar.label)}
                          className={cn(
                            "relative group flex flex-col items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer text-left focus:outline-none",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-xs scale-[1.02]"
                              : "border-border/60 bg-muted/20 hover:bg-accent/40 hover:border-border hover:scale-[1.03]"
                          )}
                          title={`Select ${avatar.label}`}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 z-10 size-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="size-2.5 stroke-[3]" />
                            </div>
                          )}
                          <Avatar className="size-12 border border-border shadow-xs">
                            <AvatarImage src={avatar.url} alt={avatar.label} />
                            <AvatarFallback className="text-[10px] font-bold">
                              {avatar.label.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={cn(
                              "mt-1 text-[8.5px] font-medium text-center truncate w-full px-0.5 leading-tight",
                              isSelected
                                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                : "text-muted-foreground"
                            )}
                          >
                            {avatar.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Right Side: Edit User Details Panel (Matching Image 2) ── */}
            {showEditUserPanel && (
              <div className="w-[320px] sm:w-[360px] md:w-[390px] rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl flex flex-col h-full min-h-0 shrink-0 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-right-8 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                {/* Panel Header */}
                <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/40 shrink-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <Pencil className="size-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground truncate">
                        Edit User Account
                      </h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Update details for {currentUser.full_name || currentUser.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditUserPanel(false)}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors"
                    title="Close edit panel"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Form Inputs Area */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">First Name</label>
                      <Input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="e.g. Patrick"
                        className="h-8 text-xs px-2.5 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Last Name</label>
                      <Input
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="e.g. Jane"
                        className="h-8 text-xs px-2.5 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* System Role Selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">System Role</label>
                    <Select value={editRole} onValueChange={(v) => setEditRole(v as SyncVetRole)}>
                      <SelectTrigger className="w-full h-8 text-xs px-2.5 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SYNCVET_ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Contact Number</label>
                    <Input
                      value={editPhoneNumber}
                      onChange={(e) => setEditPhoneNumber(e.target.value)}
                      placeholder="e.g. 09934564354"
                      className="h-8 text-xs px-2.5 rounded-lg"
                    />
                  </div>

                  {/* Barangay / Address */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Barangay / Address</label>
                    <Select value={editAddress} onValueChange={setEditAddress}>
                      <SelectTrigger className="w-full h-8 text-xs px-2.5 rounded-lg">
                        <SelectValue placeholder="Select Barangay" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {cvoBarangays.map((b) => (
                          <SelectItem key={b} value={b} className="text-xs">
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Citizen Verification Note */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-foreground">
                      <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>SyncVet Security & Clerk Sync</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground leading-relaxed">
                      Changes synchronize directly with Supabase authentication and Clerk user metadata.
                    </p>
                  </div>
                </div>

                {/* Panel Footer Actions */}
                <div className="p-4 border-t border-border/70 bg-muted/30 flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (currentUser) {
                        setEditFirstName(currentUser.first_name || (currentUser.full_name ? currentUser.full_name.split(" ")[0] : ""));
                        setEditLastName(currentUser.last_name || (currentUser.full_name && currentUser.full_name.split(" ").length > 1 ? currentUser.full_name.split(" ").slice(1).join(" ") : ""));
                        setEditPhoneNumber(currentUser.phone_number || "");
                        setEditAddress(currentUser.address || "");
                        setEditRole(normalizeSyncVetRole(currentUser.role));
                      }
                      setShowEditUserPanel(false);
                    }}
                    className="flex-1 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveUser}
                    disabled={isSaving || !hasUnsavedChanges}
                    className="flex-1 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    <span>Save Changes</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Nested Pet Profile Dialog (Opens when clicking any pet inside user profile) ── */}
      <PetProfileDialog
        pet={selectedPetForProfile}
        open={!!selectedPetForProfile}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPetForProfile(null);
          }
        }}
        onDeletePet={() => {
          setSelectedPetForProfile(null);
          queryClient.invalidateQueries({ queryKey: ["user-profile-pets", currentUser?.id] });
          queryClient.invalidateQueries({ queryKey: ["users"] });
        }}
        onPetUpdate={(updatedPet) => {
          setSelectedPetForProfile(updatedPet);
          queryClient.invalidateQueries({ queryKey: ["user-profile-pets"] });
        }}
      />

      {/* ── Account Deletion Confirmation Dialog ── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-background rounded-2xl shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="size-11 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center">
              <Trash2 className="size-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Delete User Account?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete the account for{" "}
              <strong className="text-foreground">{currentUser.full_name || currentUser.email}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeleteConfirmOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer shadow-xs"
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              <span>Permanently Delete Account</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
