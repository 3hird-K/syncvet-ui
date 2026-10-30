"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { cvoBarangays } from "@/data/cvo-store";
import { toast } from "sonner";
import Logo from "@/assets/logo-dark.png";
import {
  Phone,
  MapPin,
  User,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  HeartHandshake,
  Search,
  Check,
  Loader2,
  AlertCircle,
  X,
  Bell,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
  onCompleted?: () => void;
}

// Philippine Mobile Validation & Carrier Resolver
const GLOBE_PREFIXES = [
  "0905", "0906", "0915", "0916", "0917", "0926", "0927", "0935", "0936", "0937",
  "0945", "0953", "0954", "0955", "0956", "0965", "0966", "0967", "0975", "0976",
  "0977", "0978", "0979", "0995", "0996", "0997"
];

const SMART_PREFIXES = [
  "0907", "0908", "0909", "0910", "0911", "0912", "0918", "0919", "0920", "0921",
  "0922", "0923", "0924", "0925", "0928", "0929", "0930", "0938", "0939", "0940",
  "0946", "0947", "0948", "0949", "0950", "0951", "0961", "0963", "0968", "0969",
  "0970", "0971", "0981", "0982", "0985", "0998", "0999"
];

const DITO_PREFIXES = ["0895", "0896", "0897", "0898", "0991", "0992", "0993", "0994"];

function validatePHPhone(phoneStr: string, isOptional: boolean = false): {
  isValid: boolean;
  clean: string;
  error?: string;
  carrier?: string;
} {
  const clean = phoneStr.replace(/[^0-9]/g, "");

  if (!clean) {
    if (isOptional) {
      return { isValid: true, clean: "" };
    }
    return { isValid: false, clean: "", error: "Mobile number is required" };
  }

  let normalized = clean;
  if (normalized.startsWith("639")) {
    normalized = "0" + normalized.slice(2);
  } else if (normalized.startsWith("9")) {
    normalized = "0" + normalized;
  }

  if (!normalized.startsWith("09")) {
    return {
      isValid: false,
      clean: normalized,
      error: "Number must start with 09 (e.g. 0917-xxx-xxxx)",
    };
  }

  if (normalized.length < 11) {
    return {
      isValid: false,
      clean: normalized,
      error: `${11 - normalized.length} more digit${11 - normalized.length === 1 ? "" : "s"} needed (${normalized.length}/11)`,
    };
  }

  if (normalized.length > 11) {
    return {
      isValid: false,
      clean: normalized,
      error: "Exceeds 11 digits",
    };
  }

  // Carrier resolution
  const prefix = normalized.slice(0, 4);
  let carrier = "PH Mobile";
  if (GLOBE_PREFIXES.includes(prefix)) carrier = "Globe / TM";
  else if (SMART_PREFIXES.includes(prefix)) carrier = "Smart / TNT";
  else if (DITO_PREFIXES.includes(prefix)) carrier = "DITO";

  return { isValid: true, clean: normalized, carrier };
}

function formatPhoneDisplay(val: string): string {
  let digits = val.replace(/[^0-9]/g, "");

  if (digits.startsWith("639")) {
    digits = "0" + digits.slice(2);
  } else if (digits.startsWith("9")) {
    digits = "0" + digits;
  }

  digits = digits.slice(0, 11);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

export function OnboardingWizard({ onCompleted }: OnboardingWizardProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [smsConsent, setSmsConsent] = useState(true);

  // Location State
  const [barangay, setBarangay] = useState("");
  const [barangaySearch, setBarangaySearch] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");

  // Emergency & Pet State
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyPhoneTouched, setEmergencyPhoneTouched] = useState(false);
  const [emergencyRelation, setEmergencyRelation] = useState("Spouse");
  const [selectedPetTypes, setSelectedPetTypes] = useState<string[]>(["Dogs"]);
  const [certifiedTruth, setCertifiedTruth] = useState(true);

  const hasInitializedRef = useRef(false);

  // Initialize once with Clerk user details (does not overwrite user when they clear/edit inputs)
  useEffect(() => {
    if (user && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (user.firstName) setFirstName(user.firstName);
      if (user.lastName) setLastName(user.lastName);
      const meta = user.unsafeMetadata as Record<string, unknown> | undefined;
      if (meta?.phoneNumber) setPhoneNumber(formatPhoneDisplay(String(meta.phoneNumber)));
      if (meta?.barangay) setBarangay(String(meta.barangay));
      if (meta?.streetAddress) setStreetAddress(String(meta.streetAddress));
    }
  }, [user]);

  // Filtered Barangays (only computed when user starts typing)
  const filteredBarangays = useMemo(() => {
    const q = barangaySearch.toLowerCase().trim();
    if (!q) return [];
    return cvoBarangays.filter((b) => b.toLowerCase().includes(q));
  }, [barangaySearch]);

  // Live validation for primary phone
  const phoneValidation = useMemo(() => validatePHPhone(phoneNumber), [phoneNumber]);
  const isValidPhone = phoneValidation.isValid;

  // Live validation for emergency contact phone (optional, but if filled must be 11 digits starting with 09)
  const emergencyPhoneValidation = useMemo(
    () => validatePHPhone(emergencyPhone, true),
    [emergencyPhone]
  );
  const isValidEmergencyPhone = emergencyPhoneValidation.isValid;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneDisplay(e.target.value);
    setPhoneNumber(formatted);
    if (!phoneTouched) setPhoneTouched(true);
  };

  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneDisplay(e.target.value);
    setEmergencyPhone(formatted);
    if (!emergencyPhoneTouched) setEmergencyPhoneTouched(true);
  };

  const togglePetType = (type: string) => {
    setSelectedPetTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev; // keep at least 1 selected
        return prev.filter((p) => p !== type);
      }
      return [...prev, type];
    });
  };

  // Step Validations
  const canProceedStep1 = firstName.trim().length > 0 && isValidPhone;
  const canProceedStep2 = barangay.trim().length > 0 && streetAddress.trim().length > 0;
  const canComplete = certifiedTruth && isValidEmergencyPhone;

  // Swipe animation variants
  const swipeVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  const handleNext = () => {
    setDirection(1);
    if (step === 1) {
      setPhoneTouched(true);
      if (!firstName.trim()) {
        toast.error("Please enter your first name");
        return;
      }
      if (!isValidPhone) {
        toast.error(phoneValidation.error || "Please enter a valid 11-digit mobile number");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!barangay) {
        toast.error("Please select your Cagayan de Oro barangay");
        return;
      }
      if (!streetAddress.trim()) {
        toast.error("Please enter your street address or house number");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = (toStep: 1 | 2) => {
    setDirection(-1);
    setStep(toStep);
  };

  const handleStep1Back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleCurrentBack = () => {
    if (step === 1) {
      handleStep1Back();
    } else if (step === 2) {
      handleBack(1);
    } else if (step === 3) {
      handleBack(2);
    }
  };

  const handleCurrentNext = () => {
    if (step === 1 || step === 2) {
      handleNext();
    } else if (step === 3) {
      handleSubmit();
    }
  };

  const isCurrentNextDisabled =
    isSubmitting ||
    (step === 1 && !canProceedStep1) ||
    (step === 2 && !canProceedStep2) ||
    (step === 3 && !canComplete);

  const isCurrentBackDisabled = isSubmitting;

  const handleSubmit = async () => {
    if (!user) return;
    if (!certifiedTruth) {
      toast.error("Please check the municipal certification confirmation to proceed");
      return;
    }
    if (!isValidEmergencyPhone) {
      setEmergencyPhoneTouched(true);
      toast.error(
        emergencyPhoneValidation.error ||
        "Please enter a valid 11-digit emergency contact phone starting with 09 or leave it blank"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const fullAddress = `${streetAddress.trim()}${landmark ? ` (Near ${landmark.trim()})` : ""}, ${barangay}, Cagayan de Oro City, Misamis Oriental`;

      const normalizedPhone = phoneValidation.clean || phoneNumber.replace(/[^0-9]/g, "");

      // 1. Update Clerk user profile & unsafeMetadata
      const clerkMeta = {
        ...(user.unsafeMetadata || {}),
        phoneNumber: normalizedPhone,
        mobileNumber: normalizedPhone,
        barangay,
        streetAddress: streetAddress.trim(),
        landmark: landmark.trim(),
        address: fullAddress,
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhoneValidation.clean || emergencyPhone.replace(/[^0-9]/g, ""),
        emergencyContactRelation: emergencyRelation,
        petTypes: selectedPetTypes,
        smsConsent,
        profileCompleted: true,
        accountType: (user.unsafeMetadata?.accountType as string) || "pet_owner",
        roleTitle: (user.unsafeMetadata?.roleTitle as string) || "Pet Owner",
      };

      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        unsafeMetadata: clerkMeta,
      });

      await user.reload();

      // 2. Synchronize to Supabase `public.users` table
      const supabase = getPublicSupabaseClient();
      const email = user.primaryEmailAddress?.emailAddress || "";
      const currentRole = (user.unsafeMetadata?.roleTitle as string) || "Pet Owner";

      const { data: upsertedUser, error: supabaseError } = await supabase.from("users").upsert(
        {
          id: user.id,
          email,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: formattedFullName || user.fullName || email,
          avatar_url: user.imageUrl || "",
          role: currentRole,
          address: fullAddress,
          phone_number: normalizedPhone,
          profile_completed: true,
          raw_user_meta_data: clerkMeta,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      ).select().maybeSingle();

      if (supabaseError) {
        console.error("Supabase user onboarding upsert notice:", supabaseError.message);
      } else {
        console.log("Supabase resident profile successfully saved:", upsertedUser?.id || user.id);
      }

      // Invalidate queries so tables and sidebars update immediately
      queryClient.invalidateQueries({ queryKey: ["current-user-role", user.id] });
      queryClient.invalidateQueries({ queryKey: ["current-user-role-sidebar", user.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["supabase-owners"] });

      setIsFinished(true);
      toast.success("Welcome to SyncVet!", {
        description: "Your official municipal resident registration has been completed.",
      });

      // Redirect after brief animation
      setTimeout(() => {
        if (onCompleted) {
          onCompleted();
        } else {
          const isStaff = currentRole === "Administrator" || currentRole === "Veterinarian";
          router.replace(isStaff ? "/dashboard" : "/pet-owner");
        }
      }, 1000);
    } catch (err: unknown) {
      console.error("Onboarding submission error:", err);
      toast.error("Failed to complete onboarding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="h-screen max-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs font-medium text-muted-foreground">
            Verifying your municipal Google session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-between items-center bg-background px-4 py-3 sm:py-4 select-none relative overflow-y-auto sm:overflow-hidden">
      {/* Ambient background glows for depth without harsh card borders */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[450px] rounded-full bg-emerald-500/10 blur-[130px] -z-10" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 size-[350px] rounded-full bg-primary/10 blur-[130px] -z-10" />

      {/* Main Content Area flanked by Vertically Centered Navigation Controls (Carousel Style) */}
      <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center my-auto px-1 sm:px-2">
        {/* Left / Previous Button (Hidden on Step 1) */}
        {!isFinished && (
          <div className="shrink-0 size-9 sm:size-11 flex items-center justify-center">
            {step > 1 && (
              <button
                type="button"
                onClick={handleCurrentBack}
                disabled={isCurrentBackDisabled}
                aria-label="Previous step"
                title="Previous step"
                className="size-9 sm:size-11 rounded-full border border-border/80 bg-background hover:bg-muted text-foreground shadow-sm hover:shadow flex items-center justify-center p-0 transition-all cursor-pointer active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed z-20"
              >
                <ChevronLeft className="size-4.5 sm:size-5 stroke-[2.2]" />
              </button>
            )}
          </div>
        )}

        {/* Center Content Box */}
        <div className="w-full max-w-md mx-2 sm:mx-6 flex flex-col justify-center">
        {/* Brand Header (Compact) */}
        <div className="flex items-center justify-center gap-2 mb-2 sm:mb-2.5 text-center">
          <Image
            src={Logo}
            alt="SyncVet Logo"
            className="size-7 object-contain drop-shadow-sm shrink-0"
            priority
          />
          <div className="text-left">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-sm font-black tracking-tight text-foreground">
                SYNCVET
              </span>
              <span className="text-[8.5px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/20">
                CVO CDO
              </span>
            </div>
            <p className="text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
              CITY VETERINARY OFFICE · CAGAYAN DE ORO
            </p>
          </div>
        </div>

        {/* Step Progress Stepper (Connected Circles with SyncVet Theme) */}
        <div className="mb-2.5 sm:mb-3 px-1">
          <div className="flex items-start justify-between max-w-xs sm:max-w-sm mx-auto">
            {[
              { s: 1, label: "Profile & Contact" },
              { s: 2, label: "CDO Location" },
              { s: 3, label: "Safety & Pets" },
            ].map((item, idx, arr) => {
              const isPassed = step > item.s;
              const isCurrent = step === item.s;
              return (
                <div key={item.s} className="flex items-center flex-1 last:flex-none">
                  {/* Step Node */}
                  <div className="flex flex-col items-center">
                    {/* Step Circle */}
                    <div
                      className={cn(
                        "size-7.5 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-2xs select-none",
                        isCurrent
                          ? "bg-primary text-primary-foreground ring-3 ring-primary/20 scale-105"
                          : isPassed
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground/80 border border-border/80"
                      )}
                    >
                      {isPassed ? <Check className="size-3.5 stroke-[3]" /> : item.s}
                    </div>

                    {/* Step Label Below Circle */}
                    <span
                      className={cn(
                        "mt-1 text-[10px] transition-colors text-center whitespace-nowrap",
                        isCurrent
                          ? "text-primary font-bold"
                          : isPassed
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground font-medium"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Horizontal Connector Line between steps */}
                  {idx < arr.length - 1 && (
                    <div className="flex-1 mx-2 sm:mx-3 h-[2px] bg-border/80 self-start mt-3.5 overflow-hidden rounded-full">
                      <div
                        className={cn(
                          "h-full bg-primary transition-all duration-300",
                          step > item.s ? "w-full" : "w-0"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Steps (Completely seamless without card borders, with swipe animation) */}
        <div className="relative w-full overflow-hidden px-1 pt-0.5 pb-2">
          <AnimatePresence mode="wait" custom={direction}>
            {isFinished ? (
              <motion.div
                key="finished"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-8 flex flex-col items-center text-center space-y-3"
              >
                <div className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="size-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">
                    Registration Completed!
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Your resident profile is now officially linked with the Cagayan de Oro City Veterinary Office. Redirecting to your portal...
                  </p>
                </div>
                <Loader2 className="size-4 animate-spin text-primary mt-1" />
              </motion.div>
            ) : step === 1 ? (
              /* ── STEP 1: Personal & Contact Information (Swipeable) ── */
              <motion.div
                key="step1"
                custom={direction}
                variants={swipeVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-2.5 sm:space-y-3"
              >
                {/* Step Header (No badge) */}
                <div className="space-y-0.5 text-left mb-1">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    Resident Profile & Contact
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                    Verify your legal name and provide an active mobile number for official vaccination reminders and rabies alerts.
                  </p>
                </div>

                {/* Name Fields (2 Columns) */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-xs font-bold text-foreground/90">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="e.g. Juan"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-8 sm:h-8.5 text-[11px] sm:text-xs placeholder:text-[11px] rounded-lg bg-muted/40 border border-border/80 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-xs font-bold text-foreground/90">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="e.g. Dela Cruz"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-8 sm:h-8.5 text-[11px] sm:text-xs placeholder:text-[11px] rounded-lg bg-muted/40 border border-border/80 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                {/* Google Verified Account Card/Banner (Elevated & Clean) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground/90">
                      Google Account
                    </Label>
                    <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="size-2.5" /> Linked & Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 px-3 py-1.5 sm:py-2 rounded-lg border border-border/70 bg-muted/30">
                    <Avatar className="size-6.5 sm:size-7 shrink-0 ring-1 ring-border/80">
                      <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {(firstName?.[0] || user.firstName?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate leading-tight">
                        {user.primaryEmailAddress?.emailAddress || ""}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground flex items-center gap-1">
                        Google Single Sign-On Account
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mobile / Contact Number with strict validation */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="phoneNumber" className="text-xs font-bold text-foreground/90 flex items-center gap-1">
                      <span>Mobile Number</span>
                      <span className="text-destructive">*</span>
                    </Label>

                    {/* Dynamic Realtime Phone Validation Feedback */}
                    {isValidPhone ? (
                      <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Check className="size-2.5" />
                        {phoneValidation.carrier} Valid
                      </span>
                    ) : phoneTouched && phoneNumber ? (
                      <span className="text-[9.5px] text-destructive font-semibold flex items-center gap-1">
                        <AlertCircle className="size-2.5" />
                        {phoneValidation.error}
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-muted-foreground font-normal">
                        11 digits (09XX-XXX-XXXX)
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-2 border-r border-border/80 text-muted-foreground">
                      <span className="text-xs">🇵🇭</span>
                      <span className="text-[11px] font-bold text-foreground/80">+63</span>
                    </div>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="0917-123-4567"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      onBlur={() => setPhoneTouched(true)}
                      maxLength={13}
                      className={cn(
                        "h-8 sm:h-8.5 text-[11px] sm:text-xs placeholder:text-[11px] pl-15.5 font-medium tracking-wide rounded-lg bg-muted/40 border border-border/80 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all",
                        isValidPhone && "border-emerald-500/60 focus-visible:ring-emerald-500/20 text-foreground",
                        phoneTouched && !isValidPhone && phoneNumber && "border-destructive focus-visible:ring-destructive/20"
                      )}
                    />
                  </div>
                </div>

                {/* SMS & Call Consent Toggle (Tactile, cardless interactive row) */}
                <div
                  onClick={() => setSmsConsent(!smsConsent)}
                  className={cn(
                    "flex items-start gap-2.5 p-2 sm:p-2.5 rounded-lg border transition-all cursor-pointer shadow-2xs select-none",
                    smsConsent
                      ? "bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10"
                      : "bg-muted/20 border-border/60 hover:bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "size-7 rounded-md flex items-center justify-center shrink-0 transition-colors mt-0.5",
                      smsConsent
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Bell className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        Enable Official CVO SMS Notifications
                      </span>
                      <div
                        className={cn(
                          "size-4 rounded border flex items-center justify-center transition-all",
                          smsConsent
                            ? "bg-primary border-primary text-primary-foreground shadow-2xs"
                            : "border-border/80 bg-background"
                        )}
                      >
                        {smsConsent && <Check className="size-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">
                      Receive text alerts for annual rabies boosters and Barangay mobile vaccination schedules.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : step === 2 ? (
              /* ── STEP 2: Cagayan de Oro Location (Swipeable) ── */
              <motion.div
                key="step2"
                custom={direction}
                variants={swipeVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-2.5 sm:space-y-3"
              >
                {/* Step Header (No badge) */}
                <div className="space-y-0.5 text-left mb-1">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    Cagayan de Oro Residence
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                    Required for rabies zoning, field vaccination operations, and lost pet registry mapping.
                  </p>
                </div>

                {/* Barangay Selection */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground/90 flex items-center gap-1">
                      <span>Barangay in CDO</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    {barangay ? (
                      <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="size-2.5" />
                        Selected: {barangay}
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-muted-foreground">
                        Type to see suggestions
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="size-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Type CDO Barangay (e.g. Carmen, Nazareth, Lapasan)..."
                      value={barangaySearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBarangaySearch(val);
                        const match = cvoBarangays.find(
                          (b) => b.toLowerCase() === val.toLowerCase().trim()
                        );
                        if (match) {
                          setBarangay(match);
                        } else if (barangay && val !== barangay) {
                          setBarangay("");
                        }
                      }}
                      className={cn(
                        "h-8 sm:h-8.5 text-[11px] sm:text-xs placeholder:text-[11px] pl-8 pr-7 rounded-lg bg-muted/40 border border-border/80 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all",
                        barangay && "border-emerald-500/60 font-semibold text-foreground"
                      )}
                    />
                    {barangaySearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setBarangaySearch("");
                          setBarangay("");
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                        title="Clear"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* Suggestions in single line when user starts typing */}
                  {barangaySearch.trim().length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar text-xs">
                      {filteredBarangays.length === 0 ? (
                        <span className="text-[10.5px] text-muted-foreground italic px-1">
                          No barangay found matching &ldquo;{barangaySearch}&rdquo;
                        </span>
                      ) : (
                        filteredBarangays.slice(0, 10).map((b) => {
                          const isSelected = barangay.toLowerCase() === b.toLowerCase();
                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => {
                                setBarangay(b);
                                setBarangaySearch(b);
                              }}
                              className={cn(
                                "shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer flex items-center gap-1 border shadow-2xs",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs scale-[1.02]"
                                  : "bg-background border-border/80 hover:border-primary/60 hover:bg-primary/5 text-foreground"
                              )}
                            >
                              {isSelected ? (
                                <Check className="size-2" />
                              ) : (
                                <MapPin className="size-2 text-primary" />
                              )}
                              <span>{b}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Street / House No. and Landmark */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="streetAddress" className="text-xs font-bold text-foreground/90">
                      Street / House No. <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="streetAddress"
                      placeholder="e.g. Block 4 Lot 12, Xavier Estates"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="h-8 sm:h-8.5 text-[11px] sm:text-xs placeholder:text-[11px] rounded-lg bg-muted/40 border border-border/80 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="landmark" className="text-xs font-semibold text-muted-foreground">
                      Landmark (Optional)
                    </Label>
                    <Input
                      id="landmark"
                      placeholder="e.g. Near Barangay Hall"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="h-8 sm:h-8.5 text-[11px] sm:text-xs placeholder:text-[11px] rounded-lg bg-muted/40 border border-border/80 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ── STEP 3: Emergency Contact & Pet Ownership (Swipeable) ── */
              <motion.div
                key="step3"
                custom={direction}
                variants={swipeVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-2.5 sm:space-y-3"
              >
                {/* Step Header (No badge) */}
                <div className="space-y-0.5 text-left mb-1">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    Emergency Contact & Pet Info
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                    Helps municipal veterinarians reach secondary contact in animal emergencies or lost pet recoveries.
                  </p>
                </div>

                {/* Emergency Contact Name & Relation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="emergencyName" className="text-xs font-bold text-foreground/90">
                      Emergency Contact Person
                    </Label>
                    <Input
                      id="emergencyName"
                      placeholder="e.g. Maria Dela Cruz"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className="h-8 sm:h-8.5 text-[11px] sm:text-xs placeholder:text-[11px] rounded-lg bg-muted/40 border border-border/80 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="emergencyRelation" className="text-xs font-bold text-foreground/90">
                      Relationship
                    </Label>
                    <Select
                      value={emergencyRelation}
                      onValueChange={(val) => setEmergencyRelation(val)}
                    >
                      <SelectTrigger id="emergencyRelation" className="h-8 sm:h-8.5 text-[11px] sm:text-xs rounded-lg bg-muted/40 border border-border/80 [&>span]:text-[11px] sm:[&>span]:text-xs">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spouse" className="text-xs">Spouse / Partner</SelectItem>
                        <SelectItem value="Parent" className="text-xs">Parent</SelectItem>
                        <SelectItem value="Sibling" className="text-xs">Sibling</SelectItem>
                        <SelectItem value="Child" className="text-xs">Child</SelectItem>
                        <SelectItem value="Relative" className="text-xs">Relative</SelectItem>
                        <SelectItem value="Friend" className="text-xs">Friend / Neighbor</SelectItem>
                        <SelectItem value="Other" className="text-xs">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Emergency Phone */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emergencyPhone" className="text-xs font-bold text-foreground/90">
                      Emergency Contact Phone <span className="text-[9.5px] text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    {emergencyPhone && emergencyPhoneValidation.isValid ? (
                      <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="size-2.5" />
                        {emergencyPhoneValidation.carrier ? `${emergencyPhoneValidation.carrier} Verified` : "Valid Contact"}
                      </span>
                    ) : emergencyPhoneTouched && emergencyPhone && !emergencyPhoneValidation.isValid ? (
                      <span className="text-[9.5px] text-destructive font-semibold flex items-center gap-1">
                        <AlertCircle className="size-2.5" />
                        {emergencyPhoneValidation.error}
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-muted-foreground font-normal">
                        09XX-XXX-XXXX (11 digits)
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-2 border-r border-border/80 text-muted-foreground">
                      <span className="text-xs">🇵🇭</span>
                      <span className="text-[11px] font-bold text-foreground/80">+63</span>
                    </div>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      placeholder="0918-987-6543"
                      value={emergencyPhone}
                      onChange={handleEmergencyPhoneChange}
                      onBlur={() => setEmergencyPhoneTouched(true)}
                      maxLength={13}
                      className={cn(
                        "h-8 sm:h-8.5 text-[11px] sm:text-xs placeholder:text-[11px] pl-15.5 font-medium tracking-wide rounded-lg bg-muted/40 border border-border/80 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all",
                        emergencyPhone && emergencyPhoneValidation.isValid && "border-emerald-500/60 focus-visible:ring-emerald-500/20 text-foreground",
                        emergencyPhoneTouched && emergencyPhone && !emergencyPhoneValidation.isValid && "border-destructive focus-visible:ring-destructive/20"
                      )}
                    />
                  </div>
                </div>

                {/* What animals do you care for */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground/90">
                    What animals do you care for in CDO?
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "Dogs", label: "Dogs", emoji: "🐕", desc: "Canines" },
                      { id: "Cats", label: "Cats", emoji: "🐈", desc: "Felines" },
                    ].map((item) => {
                      const isSelected = selectedPetTypes.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => togglePetType(item.id)}
                          className={cn(
                            "flex items-center justify-center gap-2 p-2 rounded-lg border text-center transition-all cursor-pointer text-xs font-semibold shadow-2xs",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/40 scale-[1.01]"
                              : "border-border/70 bg-muted/30 hover:bg-muted/60 text-foreground"
                          )}
                        >
                          <span className="text-sm">{item.emoji}</span>
                          <span className="font-bold">{item.label}</span>
                          <span className="text-[9.5px] text-muted-foreground font-normal">({item.desc})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Municipal Declaration Checkbox */}
                <div
                  onClick={() => setCertifiedTruth(!certifiedTruth)}
                  className={cn(
                    "flex items-start gap-2.5 p-2 sm:p-2.5 rounded-lg border transition-all cursor-pointer shadow-2xs select-none",
                    certifiedTruth
                      ? "bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10"
                      : "bg-muted/20 border-border/60 hover:bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "size-4 rounded border flex items-center justify-center transition-all mt-0.5 shrink-0",
                      certifiedTruth
                        ? "bg-primary border-primary text-primary-foreground shadow-2xs"
                        : "border-border/80 bg-background"
                    )}
                  >
                    {certifiedTruth && <Check className="size-2.5 stroke-[3]" />}
                  </div>
                  <div className="text-left space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      Municipal Health Declaration & Consent
                    </span>
                    <p className="text-[10.5px] text-muted-foreground leading-tight">
                      I certify that information provided is accurate and consent to official CVO health notifications.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CVO Security & Privacy Footnote */}
        <div className="mt-3 sm:mt-4 text-center">
          <p className="text-[10px] text-muted-foreground/80 flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span>Protected by City Veterinary Office of Cagayan de Oro · Data Privacy Act of 2012</span>
          </p>
        </div>
      </div>

      {/* Right / Next Button (Centered vertically with content) */}
      {!isFinished && (
        <button
          type="button"
          onClick={handleCurrentNext}
          disabled={isCurrentNextDisabled}
          aria-label={step === 3 ? "Complete Registration" : "Next step"}
          title={step === 3 ? "Complete Registration" : "Next step"}
          className="shrink-0 size-9 sm:size-11 rounded-full border border-border/80 bg-background hover:bg-muted text-foreground shadow-sm hover:shadow flex items-center justify-center p-0 transition-all cursor-pointer active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed z-20"
        >
          {step === 3 ? (
            isSubmitting ? (
              <Loader2 className="size-4.5 sm:size-5 animate-spin text-primary" />
            ) : (
              <Check className="size-4.5 sm:size-5 stroke-[2.5] text-primary" />
            )
          ) : (
            <ChevronRight className="size-4.5 sm:size-5 stroke-[2.2]" />
          )}
        </button>
      )}
    </div>
    </div>
  );
}
