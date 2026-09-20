"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShieldCheck, Check, Settings2 } from "lucide-react";
import { toast } from "sonner";

export function CookieConsent() {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  const [isOpen, setIsOpen] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    if (!isLandingPage) return;

    // Check if consent has already been given
    const consent = localStorage.getItem("syncvet_cookie_consent");
    if (!consent) {
      // Delay showing by 1.2s for pleasant entrance after initial page load
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isLandingPage]);

  useEffect(() => {
    if (!isLandingPage) return;

    // Listen for custom event triggered by footer "Cookie Preferences" button
    const handleOpenPreferences = () => {
      const stored = localStorage.getItem("syncvet_cookie_consent");
      if (stored === "declined") {
        setAnalyticsEnabled(false);
      } else {
        setAnalyticsEnabled(true);
      }
      setIsOpen(true);
      setShowCustomize(true);
    };

    window.addEventListener("open-cookie-preferences", handleOpenPreferences);
    return () => window.removeEventListener("open-cookie-preferences", handleOpenPreferences);
  }, [isLandingPage]);

  if (!isLandingPage) {
    return null;
  }

  const handleAcceptAll = () => {
    localStorage.setItem("syncvet_cookie_consent", "accepted");
    localStorage.setItem("syncvet_analytics_cookies", "true");
    setIsOpen(false);
    toast.success("Cookie Preferences Saved", {
      description: "All cookies enabled for an optimal browsing and portal experience.",
    });
  };

  const handleDecline = () => {
    localStorage.setItem("syncvet_cookie_consent", "declined");
    localStorage.setItem("syncvet_analytics_cookies", "false");
    setIsOpen(false);
    toast.info("Essential Cookies Only", {
      description: "Non-essential and analytics cookies have been declined.",
    });
  };

  const handleSaveCustom = () => {
    localStorage.setItem("syncvet_cookie_consent", "custom");
    localStorage.setItem("syncvet_analytics_cookies", analyticsEnabled ? "true" : "false");
    setIsOpen(false);
    toast.success("Preferences Updated", {
      description: `Analytics cookies: ${analyticsEnabled ? "Enabled" : "Disabled"}. Essential cookies: Active.`,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-label="Cookie consent banner"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 max-w-[420px] w-[calc(100vw-32px)] sm:w-full bg-background/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl p-5 text-foreground"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <svg
                  className="size-4 fill-none stroke-current stroke-2"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                  <path d="M8.5 8.5v.01" />
                  <path d="M16 15.5v.01" />
                  <path d="M12 12v.01" />
                  <path d="M11 17v.01" />
                  <path d="M7 14v.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                  Cookie & Privacy Choices
                </h3>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                  SyncVet Platform
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              aria-label="Dismiss cookie notice"
              className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed mt-3">
            We utilize cookies to maintain secure sessions, remember veterinary clinic preferences, and gather anonymous usage insights to enhance municipal care delivery.
          </p>

          {/* Customizable Accordion */}
          {showCustomize && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3.5 pt-3 border-t border-border/60 space-y-2.5"
            >
              {/* Essential */}
              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border/40">
                <div className="space-y-0.5 pr-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="size-3.5 text-primary" /> Strictly Essential
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Required for authentication, session integrity, and security.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-primary tracking-wider uppercase shrink-0">
                  Always Active
                </span>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between text-xs bg-muted/30 p-2.5 rounded-lg border border-border/40">
                <div className="space-y-0.5 pr-2">
                  <span className="font-semibold text-foreground text-[11px]">
                    Analytics & Performance
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Anonymous telemetry to improve page loading and UI workflows.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`size-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    analyticsEnabled
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border/80 bg-background text-transparent"
                  }`}
                  aria-label="Toggle analytics cookies"
                >
                  <Check className="size-3 stroke-[3]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {showCustomize ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors text-center"
                >
                  Save Choices
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-3 py-2 rounded-lg border border-border/80 font-medium text-xs text-foreground hover:bg-muted/50 transition-colors text-center"
                >
                  Accept All
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors text-center"
                >
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  className="flex-1 px-3 py-2 rounded-lg border border-border/80 font-medium text-xs text-foreground hover:bg-muted/50 transition-colors text-center"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomize(true)}
                  aria-label="Customize cookie settings"
                  className="size-8 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0 hidden sm:flex"
                  title="Preferences"
                >
                  <Settings2 className="size-3.5" />
                </button>
              </>
            )}
          </div>

          {!showCustomize && (
            <div className="mt-2.5 text-center sm:hidden">
              <button
                type="button"
                onClick={() => setShowCustomize(true)}
                className="text-[10px] text-muted-foreground hover:text-primary underline"
              >
                Customize choices
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
