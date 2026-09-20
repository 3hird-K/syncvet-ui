import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { AuthLoadingScreen } from "@/components/auth/auth-loading-screen";

export default function SSOCallbackPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center bg-background">
      {/* Visual professional full-screen loading UI */}
      <AuthLoadingScreen
        title="Finalizing Municipal Login..."
        subtitle="Verifying your Google session with the City Veterinary Registry..."
      />

      {/* Clerk's redirect handler runs seamlessly in the background */}
      <div className="opacity-0 pointer-events-none absolute inset-0">
        <AuthenticateWithRedirectCallback
          signInForceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
          continueSignUpUrl="/dashboard"
        />
      </div>
    </main>
  );
}

