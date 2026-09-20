"use client";

import Image from "next/image";
import Link from "next/link";
import Logo from "@/assets/logo-dark.png";
import { GoogleSignInButton } from "./google-sign-in-button";

export function AuthCard() {
  return (
    <div className="relative flex w-full lg:col-span-5 xl:col-span-5 2xl:col-span-4 flex-col justify-center items-center bg-background p-6 sm:p-10 xl:p-14 min-h-screen">
      <div className="w-full max-w-md space-y-6 text-left">
        {/* Brand Lockup linked to Landing Page */}
        <Link
          href="/"
          className="group inline-flex items-center gap-3 transition-opacity duration-150 hover:opacity-85 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
          title="Return to Home"
        >
          <Image
            src={Logo}
            alt="SyncVet Logo"
            className="size-9 sm:size-10 object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
            priority
          />
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-foreground leading-none">
                SYNCVET
              </span>
              <span className="rounded-[4px] bg-primary/15 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                Official
              </span>
            </div>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none">
              CITY VETERINARY OFFICE · CDO
            </span>
          </div>
        </Link>

        {/* Title & Description */}
        <div className="space-y-3 text-left pt-1">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-primary" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-primary">
              MUNICIPAL PORTAL ACCESS
            </span>
          </div>

          <h1 className="text-3xl xl:text-4xl 2xl:text-[2.65rem] font-semibold tracking-tight text-foreground leading-[1.16]">
            Welcome to <em className="font-serif font-medium text-primary italic">SyncVet</em>
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-normal">
            Continue with your Google account to access your pet&apos;s digital health passport and verified rabies immunization records.
          </p>
        </div>

        {/* Google SSO Button */}
        <div className="pt-1">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
