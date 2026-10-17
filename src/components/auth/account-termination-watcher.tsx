"use client";

import { useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function AccountTerminationWatcher() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const isTerminating = useRef(false);
  const currentUserId = user?.id;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !currentUserId) return;

    const supabase = getPublicSupabaseClient();

    const terminateSession = async () => {
      if (isTerminating.current) return;
      isTerminating.current = true;

      // Mark session storage so no background sync tries to restore the user
      try {
        sessionStorage.setItem("syncvet_account_deleted", "true");
      } catch {
        // Ignore session storage errors
      }

      toast.error("Account Terminated", {
        description: "Your account has been deleted by an administrator. Logging you out...",
        duration: 4500,
      });

      try {
        await signOut({ redirectUrl: "/sign-in" });
      } catch (err) {
        console.warn("Sign-out fallback redirection:", err);
        window.location.href = "/sign-in";
      }
    };

    // 1. Realtime Broadcast & Postgres Changes Listeners
    const watchChannel = supabase
      .channel(`account-watch-${currentUserId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "broadcast",
        { event: "account-deleted" },
        (msg) => {
          if (msg?.payload?.userId === currentUserId) {
            terminateSession();
          }
        }
      )
      .subscribe();

    const globalRealtimeChannel = supabase
      .channel(`syncvet-users-realtime-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "broadcast",
        { event: "account-deleted" },
        (msg) => {
          if (msg?.payload?.userId === currentUserId) {
            terminateSession();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "users",
        },
        (payload) => {
          const deletedId = (payload?.old as { id?: string })?.id;
          if (deletedId === currentUserId) {
            terminateSession();
          }
        }
      )
      .subscribe();

    // 2. Periodic poll verification (every 3 seconds) + on window focus/tab active
    let hasVerifiedInitialExistence = false;

    const checkAccountActive = async () => {
      if (isTerminating.current) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id")
          .eq("id", currentUserId)
          .maybeSingle();

        // If the query was successful and returned null after the account was already in the system
        if (!error && !data) {
          if (hasVerifiedInitialExistence) {
            terminateSession();
          }
        } else if (data) {
          hasVerifiedInitialExistence = true;
        }
      } catch (err) {
        console.warn("Account status check error:", err);
      }
    };

    // Initial check after 2 seconds to allow new user sync to finish
    const initialTimer = setTimeout(() => {
      checkAccountActive();
    }, 2000);

    const intervalTimer = setInterval(checkAccountActive, 3000);

    const handleWindowFocus = () => {
      checkAccountActive();
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleWindowFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleWindowFocus);
      supabase.removeChannel(watchChannel);
      supabase.removeChannel(globalRealtimeChannel);
    };
  }, [isLoaded, isSignedIn, currentUserId, signOut]);

  return null;
}
