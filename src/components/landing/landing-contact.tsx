"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MotionFadeIn } from "./motion-wrapper";

export function LandingContact() {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    purpose: "Barangay Rabies Vaccination Schedule",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Realistic API submission simulation
    setTimeout(() => {
      setLoading(false);

      // Trigger Sonner toast notification
      toast.success("Inquiry sent successfully!", {
        description:
          "The City Veterinary Office has received your message and will respond within 1 business day.",
        duration: 4500,
      });

      // Clear all inputs
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        purpose: "Barangay Rabies Vaccination Schedule",
        message: "",
      });
    }, 600);
  };

  return (
    <section
      id="contact"
      aria-label="Contact City Veterinary Office"
      className="relative scroll-mt-20 overflow-hidden border-t border-border/70 bg-background py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10">
        {/* ── Section Header (1:1 Match with Reference Layout) ── */}
        <MotionFadeIn direction="up" amount={0.2} className="mb-8 sm:mb-10">
          <div className="space-y-2 sm:space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-primary/80" />
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-primary">
                MUNICIPAL CONSULTATION & INQUIRIES
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-foreground leading-[1.12]">
              Let&apos;s discuss{" "}
              <em className="font-serif italic font-medium text-primary">
                your companion&apos;s care.
              </em>
            </h2>
          </div>
        </MotionFadeIn>

        {/* ── Two-Column Layout (Twin Cards) ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-stretch">
          {/* ── LEFT CARD: Head of Office Profile & Direct Contact Details (5 Cols) ── */}
          <MotionFadeIn
            direction="up"
            delay={0.08}
            className="lg:col-span-5 flex"
          >
            <div className="flex w-full flex-col justify-between rounded-2xl border border-black/[0.07] dark:border-white/10 bg-[#fbf9f5] dark:bg-card/75 p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all duration-300">
              <div>
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="relative size-14 sm:size-16 shrink-0 overflow-hidden rounded-full border-2 border-primary/40 shadow-sm">
                    <Image
                      src="/dr-helen-tacandong.jpg"
                      alt="Dr. Helen Ann P. Tacandong"
                      fill
                      sizes="64px"
                      className="object-cover object-top"
                    />
                  </div>
                  <div>
                    <span className="block text-[9.5px] sm:text-[10px] font-bold tracking-[0.2em] uppercase text-primary">
                      CITY VETERINARIAN · DEPARTMENT HEAD
                    </span>
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                      Dr. Helen Ann P. Tacandong
                    </h3>
                    <p className="text-[12px] text-muted-foreground">
                      City Veterinary Office · Cagayan de Oro City
                    </p>
                  </div>
                </div>

                {/* Italicized Editorial Quote Block */}
                <blockquote className="my-5 border-l-2 border-primary/50 pl-3.5 text-xs sm:text-[13px] italic font-serif leading-relaxed text-muted-foreground">
                  &ldquo;Whether coordinating a barangay mobile vaccination campaign, securing digital pet health records, or seeking clinical consultations, our direct office line is always open.&rdquo;
                </blockquote>

                {/* Contact Coordinates List */}
                <div className="space-y-3.5 pt-1">
                  {/* Item 1: Phone */}
                  <a
                    href="tel:0888572260"
                    className="group/item flex items-center gap-3.5 transition-colors"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-colors">
                      <Phone className="size-4" />
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                        DIRECT OFFICE LINE
                      </span>
                      <span className="text-xs sm:text-[13px] font-semibold text-foreground group-hover/item:text-primary transition-colors">
                        (088) 857-2260
                      </span>
                    </div>
                  </a>

                  {/* Item 2: Email */}
                  <a
                    href="mailto:cityvet@cagayandeoro.gov.ph"
                    className="group/item flex items-center gap-3.5 transition-colors"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-colors">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                        OFFICIAL CVO EMAIL
                      </span>
                      <span className="text-xs sm:text-[13px] font-semibold text-foreground group-hover/item:text-primary transition-colors">
                        cityvet@cagayandeoro.gov.ph
                      </span>
                    </div>
                  </a>

                  {/* Item 3: Address */}
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="size-4" />
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                        CLINICAL HEADQUARTERS
                      </span>
                      <span className="text-xs sm:text-[13px] font-semibold text-foreground">
                        CVO Complex, J.V. Seriña St., Carmen, CDO
                      </span>
                    </div>
                  </div>

                  {/* Item 4: Hours */}
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="size-4" />
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                        HOURS & AVAILABILITY
                      </span>
                      <span className="text-xs sm:text-[13px] font-semibold text-foreground">
                        Mon – Fri: 8:00 am – 5:00 pm · 24/7 Hotline
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Social Connections */}
              <div className="mt-6 flex items-center justify-between border-t border-black/[0.06] dark:border-white/10 pt-4">
                <span className="text-[9.5px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                  CONNECT WITH CVO
                </span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <a
                    href="https://www.facebook.com/CityVetCDO"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="City Veterinary Office Facebook"
                    className="hover:text-primary transition-colors"
                  >
                    <svg className="size-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a
                    href="https://cagayandeoro.gov.ph"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Cagayan de Oro Official Portal"
                    className="hover:text-primary transition-colors"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                      <path d="M2 12h20" />
                    </svg>
                  </a>
                  <a
                    href="mailto:cityvet@cagayandeoro.gov.ph"
                    aria-label="Email City Veterinary Office"
                    className="hover:text-primary transition-colors"
                  >
                    <Mail className="size-4" />
                  </a>
                  <a
                    href="tel:0888572260"
                    aria-label="Call City Veterinary Office"
                    className="hover:text-primary transition-colors"
                  >
                    <Phone className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </MotionFadeIn>

          {/* ── RIGHT CARD: Inquiry Concierge Form (7 Cols) ── */}
          <MotionFadeIn
            direction="up"
            delay={0.14}
            className="lg:col-span-7 flex"
          >
            <div className="flex w-full flex-col justify-between rounded-2xl border border-black/[0.07] dark:border-white/10 bg-[#fbf9f5] dark:bg-card/75 p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)] transition-all duration-300">
              {/* Interactive Inquiry Form */}
              <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="mb-5">
                    <span className="block text-[9.5px] sm:text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-1">
                      MUNICIPAL INQUIRY CONCIERGE
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      Start the conversation.
                    </h3>
                    <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
                      Direct municipal advisory, barangay clinic coordination, and digital pet passport support.
                    </p>
                  </div>

                  {/* Inputs Grid */}
                  <div className="space-y-3.5">
                    {/* Row 1: Name & Email */}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label
                          htmlFor="fullName"
                          className="block text-[10px] font-bold tracking-wider uppercase text-foreground/80"
                        >
                          FULL NAME <span className="text-primary">*</span>
                        </label>
                        <input
                          id="fullName"
                          required
                          type="text"
                          placeholder="e.g. Maria Santos"
                          value={formData.fullName}
                          onChange={(e) =>
                            setFormData({ ...formData, fullName: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-lg border border-black/10 dark:border-white/10 bg-background text-foreground text-xs sm:text-[13px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="email"
                          className="block text-[10px] font-bold tracking-wider uppercase text-foreground/80"
                        >
                          EMAIL ADDRESS <span className="text-primary">*</span>
                        </label>
                        <input
                          id="email"
                          required
                          type="email"
                          placeholder="maria@example.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-lg border border-black/10 dark:border-white/10 bg-background text-foreground text-xs sm:text-[13px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 2: Phone & Purpose */}
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label
                          htmlFor="phone"
                          className="block text-[10px] font-bold tracking-wider uppercase text-foreground/80"
                        >
                          PHONE NUMBER <span className="text-muted-foreground font-normal">(OPTIONAL)</span>
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          placeholder="+63 912 345 6789"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-lg border border-black/10 dark:border-white/10 bg-background text-foreground text-xs sm:text-[13px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="purpose"
                          className="block text-[10px] font-bold tracking-wider uppercase text-foreground/80"
                        >
                          PURPOSE OF INQUIRY
                        </label>
                        <Select
                          value={formData.purpose}
                          onValueChange={(val) =>
                            setFormData((prev) => ({ ...prev, purpose: val }))
                          }
                        >
                          <SelectTrigger
                            id="purpose"
                            className="w-full h-10 px-3 rounded-lg border border-black/10 dark:border-white/10 bg-background text-foreground text-xs sm:text-[13px] focus:ring-1 focus:ring-primary shadow-none"
                          >
                            <SelectValue placeholder="Select inquiry purpose" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border shadow-xl rounded-xl z-50">
                            <SelectItem value="Barangay Rabies Vaccination Schedule">
                              Barangay Rabies Vaccination Schedule
                            </SelectItem>
                            <SelectItem value="Digital Pet Passport & QR Collar Tag">
                              Digital Pet Passport & QR Collar Tag
                            </SelectItem>
                            <SelectItem value="Free Spay & Neuter (Kapon) Program">
                              Free Spay & Neuter (Kapon) Program
                            </SelectItem>
                            <SelectItem value="Clinical Consultation & Diagnostics">
                              Clinical Consultation & Diagnostics
                            </SelectItem>
                            <SelectItem value="Animal Welfare & Stray Coordination">
                              Animal Welfare & Stray Coordination
                            </SelectItem>
                            <SelectItem value="Community Deputization Training">
                              Community Deputization Training
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Row 3: Message Textarea */}
                    <div className="space-y-1">
                      <label
                        htmlFor="message"
                        className="block text-[10px] font-bold tracking-wider uppercase text-foreground/80"
                      >
                        TELL US ABOUT YOUR INQUIRY <span className="text-primary">*</span>
                      </label>
                      <textarea
                        id="message"
                        required
                        rows={3}
                        placeholder="Describe your pet's needs, barangay location, schedule preference, or questions..."
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        className="w-full p-3 rounded-lg border border-black/10 dark:border-white/10 bg-background text-foreground text-xs sm:text-[13px] placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Footer */}
                <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="size-3.5 text-primary" />
                    <span>Replies within 1 business day</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto h-10 px-6 rounded-lg bg-primary text-primary-foreground text-xs sm:text-[13px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98] inline-flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    <span>{loading ? "Sending..." : "Send Message"}</span>
                    {loading ? (
                      <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <ArrowRight className="size-3.5" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </MotionFadeIn>
        </div>
      </div>
    </section>
  );
}
