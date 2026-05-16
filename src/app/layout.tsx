import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CDO City Veterinary Office",
  description: "Animal health management and predictive resource forecasting system for Cagayan de Oro City.",
  metadataBase: new URL("https://syncvet-ui.vercel.app"),
  openGraph: {
    title: "CDO City Veterinary Office",
    description: "Animal health management and predictive resource forecasting system for Cagayan de Oro City.",
    url: "https://syncvet-ui.vercel.app",
    siteName: "SyncVet",
    images: [
      {
        url: "https://syncvet-ui.vercel.app/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "SyncVet Dashboard Preview",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CDO City Veterinary Office",
    description: "Animal health management and predictive resource forecasting system for Cagayan de Oro City.",
    images: ["https://syncvet-ui.vercel.app/opengraph-image.png"],
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
        </ThemeProvider>
      </body>
    </html>
  );
}
