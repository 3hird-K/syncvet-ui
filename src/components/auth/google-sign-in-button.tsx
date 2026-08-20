"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface GoogleSignInButtonProps {
  mode?: "sign-in" | "sign-up";
  className?: string;
}

export function GoogleSignInButton({
  className = "",
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const clerk = useClerk();
  const signInHook = useSignIn() as unknown as { signIn?: { authenticateWithRedirect?: Function } };
  const signUpHook = useSignUp() as unknown as { signUp?: { authenticateWithRedirect?: Function } };
  const { isSignedIn, isLoaded: isUserLoaded, user } = useUser();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isUserLoaded && isSignedIn && user) {
      router.replace("/dashboard");
    }
  }, [isUserLoaded, isSignedIn, user, router]);

  if (isUserLoaded && isSignedIn && user) {
    return (
      <div className="w-full space-y-3">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-primary">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Redirecting to Dashboard...</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Signed in as {user.fullName || user.primaryEmailAddress?.emailAddress}
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary/90 active:scale-[0.985]"
        >
          <span>Go to Dashboard</span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const redirectParams = {
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      };

      const signIn = signInHook?.signIn;
      const signUp = signUpHook?.signUp;

      if (signIn && typeof signIn.authenticateWithRedirect === "function") {
        await signIn.authenticateWithRedirect(redirectParams);
        return;
      }

      if (signUp && typeof signUp.authenticateWithRedirect === "function") {
        await signUp.authenticateWithRedirect(redirectParams);
        return;
      }

      const clientSignIn = (clerk as unknown as { client?: { signIn?: { authenticateWithRedirect?: Function } } })?.client?.signIn;
      if (clientSignIn && typeof clientSignIn.authenticateWithRedirect === "function") {
        await clientSignIn.authenticateWithRedirect(redirectParams);
        return;
      }

      // Fallback: open Clerk sign-in modal/redirect
      if (clerk?.redirectToSignIn) {
        await clerk.redirectToSignIn({
          signInFallbackRedirectUrl: "/dashboard",
        });
      }
    } catch (err: unknown) {
      console.error("Clerk OAuth redirect error:", err);
      // If sign-in fails because user needs to sign-up first, try signUp redirect
      try {
        const signUp = signUpHook?.signUp;
        if (signUp && typeof signUp.authenticateWithRedirect === "function") {
          await signUp.authenticateWithRedirect({
            strategy: "oauth_google",
            redirectUrl: "/sso-callback",
            redirectUrlComplete: "/dashboard",
          });
          return;
        }
      } catch (signUpErr) {
        console.error("Clerk SignUp fallback error:", signUpErr);
      }

      const errorMsg =
        err instanceof Error
          ? err.message
          : "Could not connect with Google. Please try again.";
      toast.error("Authentication Error", { description: errorMsg });
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        id="google-oauth-btn"
        disabled={loading}
        onClick={handleGoogleSignIn}
        className={`group relative flex w-full items-center justify-center gap-3.5 rounded-2xl border border-border/80 bg-card px-5 py-3.5 text-sm font-semibold text-foreground shadow-xs transition-all duration-200 hover:border-primary/50 hover:bg-accent/40 hover:shadow-md hover:shadow-primary/5 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60 dark:bg-card/70 dark:hover:bg-card cursor-pointer ${className}`}
      >
        {/* Ambient subtle glow on hover */}
        <span className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />

        {loading ? (
          <>
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="font-semibold tracking-tight text-foreground">
              Connecting with Google...
            </span>
          </>
        ) : (
          <>
            {/* Google Brand SVG */}
            <svg
              className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-110"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span className="font-semibold tracking-tight text-foreground">
              Continue with Google
            </span>
          </>
        )}
      </button>

      {/* Official Government & Healthcare Trust Seal */}
      <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground/70">
        <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
        <span>One-click verified login • Direct access to Dashboard</span>
      </div>
    </div>
  );
}
