import { AuthHeroVisual } from "@/components/auth/auth-hero-visual";
import { AuthCard } from "@/components/auth/auth-card";
import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign In — SyncVet | City Veterinary Office",
  description:
    "Secure Google Sign-In for SyncVet animal health management, QR digital pet passports, and predictive veterinary forecasting.",
};

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen w-full bg-background flex overflow-hidden">
      <div className="grid min-h-screen w-full lg:grid-cols-12 overflow-hidden">
        {/* Left Section: Hero Visual Showcase (expanded space) */}
        <AuthHeroVisual />

        {/* Right Section: Authentication Card */}
        <AuthCard />
      </div>
    </main>
  );
}
