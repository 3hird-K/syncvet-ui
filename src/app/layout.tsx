import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SyncVet — Smarter Pet Care, Connected | Veterinary Platform",
  description: "Keep your pet’s health information, appointments, vaccinations, and veterinary care organized in one simple and connected platform.",
  metadataBase: new URL("https://syncvet-ui.vercel.app"),
  keywords: [
    "veterinary care",
    "pet health records",
    "pet digital passport",
    "vaccination tracker",
    "veterinary appointments",
    "pet care management",
    "SyncVet",
  ],
  openGraph: {
    title: "SyncVet — Smarter Pet Care, Connected",
    description: "Keep your pet’s health information, appointments, vaccinations, and veterinary care organized in one simple and connected platform.",
    url: "https://syncvet-ui.vercel.app",
    siteName: "SyncVet",
    images: [
      {
        url: "https://syncvet-ui.vercel.app/og-syncvet.png",
        width: 1200,
        height: 630,
        alt: "SyncVet Veterinary Platform",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SyncVet — Smarter Pet Care, Connected",
    description: "Keep your pet’s health information, appointments, vaccinations, and veterinary care organized in one simple and connected platform.",
    images: ["https://syncvet-ui.vercel.app/og-syncvet.png"],
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.variable} font-sans antialiased`}
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            storageKey="syncvet-theme"
            disableTransitionOnChange
          >
            {children}
            <Toaster position="top-center" expand={true} richColors />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

