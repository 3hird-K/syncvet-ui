import { AuthHeroVisual } from "@/components/auth/auth-hero-visual";
import { AuthCard } from "@/components/auth/auth-card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account — SyncVet | City Veterinary Office",
  description:
    "Register for SyncVet to manage your pet's vaccination records, receive booster alerts, and get a digital QR pet passport.",
};

export default function SignUpPage() {
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
