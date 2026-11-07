"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { toast } from "sonner";
import { Download, X, Smartphone, Wifi, WifiOff, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isIOS: boolean;
  promptInstall: () => Promise<boolean>;
  dismissBanner: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  isOnline: true,
  isIOS: false,
  promptInstall: async () => false,
  dismissBanner: () => {},
});

export function usePwa() {
  return useContext(PwaContext);
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // 1. Service Worker Registration & Online/Offline Listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Check localStorage banner dismissal
    const dismissed = localStorage.getItem("syncvet_pwa_banner_dismissed");
    if (dismissed) {
      setBannerDismissed(true);
    }

    // Register Service Worker in production / supported environments
    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "development") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Check for updates periodically
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    toast.info("A new version of SyncVet is available. Refresh to update.", {
                      action: {
                        label: "Refresh",
                        onClick: () => window.location.reload(),
                      },
                    });
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn("Service worker registration error:", err);
          });
      });
    }

    // Online / Offline Listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online. Connected to SyncVet CVO network.", {
        icon: <Wifi className="size-4 text-emerald-500" />,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are currently offline. Viewing cached records.", {
        icon: <WifiOff className="size-4 text-amber-500" />,
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Capture beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("SyncVet successfully installed to your home screen!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // 2. Trigger install prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    }

    if (isIOS && !isInstalled) {
      setShowIOSGuide(true);
      return false;
    }

    return false;
  }, [deferredPrompt, isIOS, isInstalled]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    try {
      localStorage.setItem("syncvet_pwa_banner_dismissed", "true");
    } catch {}
  }, []);

  const isInstallable = Boolean(deferredPrompt || (isIOS && !isInstalled));
  const showBanner = isInstallable && !isInstalled && !bannerDismissed;

  return (
    <PwaContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isOnline,
        isIOS,
        promptInstall,
        dismissBanner,
      }}
    >
      {children}

      {/* Modern floating install prompt banner */}
      {showBanner && (
        <aside
          aria-label="Install SyncVet App"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="rounded-2xl border border-emerald-500/30 bg-card/95 backdrop-blur-md p-4 shadow-2xl flex items-start gap-3.5 ring-1 ring-emerald-500/20">
            <div className="size-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="size-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-xs sm:text-sm text-foreground">
                  Install SyncVet App
                </span>
                <button
                  onClick={dismissBanner}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-md hover:bg-muted"
                  aria-label="Dismiss installation prompt"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Add to your home screen for quick offline access, real-time queue alerts, and a faster mobile experience.
              </p>

              <div className="flex items-center gap-2 mt-2.5">
                <Button
                  size="sm"
                  onClick={() => promptInstall()}
                  className="h-7.5 px-3 text-[11px] font-semibold gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                >
                  <Download className="size-3" />
                  <span>Install Now</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dismissBanner}
                  className="h-7.5 px-2.5 text-[11px] text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* iOS Safari Add to Home Screen Modal Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="size-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-foreground">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Safari doesn&apos;t support automatic install prompts. Follow these 2 steps to add SyncVet to your home screen:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/40">
                <div className="size-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  Tap the <strong className="text-foreground">Share</strong> icon{" "}
                  <Share className="size-3.5 inline mx-1 text-primary" /> in the Safari toolbar at the bottom of your screen.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/40">
                <div className="size-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong>.
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowIOSGuide(false)}
              className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}

