import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SyncVet — Smarter Pet Care, Connected",
    short_name: "SyncVet",
    description:
      "Keep your pet’s health information, appointments, vaccinations, and veterinary care organized in one simple and connected platform.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#059669",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Pet Owner Portal",
        short_name: "My Pets",
        description: "View pet health records, queue status, and appointments",
        url: "/pet-owner",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Live Clinic Queue",
        short_name: "Queue",
        description: "Check live clinic queue tickets and check-in",
        url: "/consultations",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Barangay Field Drives",
        short_name: "Outreach",
        description: "View upcoming barangay veterinary drives",
        url: "/field-operations",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
    categories: ["medical", "health", "lifestyle"],
  };
}

