import { AuthHeroVisual } from "@/components/auth/auth-hero-visual";
import { AuthCard } from "@/components/auth/auth-card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — SyncVet | City Veterinary Office",
  description:
    "Secure Google Sign-In for SyncVet animal health management, QR digital pet passports, and predictive veterinary forecasting.",
};

export default function SignInPage() {
  return (
    <main className="min-h-screen w-full bg-background flex">
      <div className="grid min-h-screen w-full lg:grid-cols-2">
        {/* Left Section: Hero Visual Showcase */}
        <AuthHeroVisual />

        {/* Right Section: Authentication Card */}
        <AuthCard />
      </div>
    </main>
  );
}
