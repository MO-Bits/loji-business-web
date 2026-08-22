import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Loji Business",
    short_name: "Loji",
    description: "Manage properties, rooms, bookings, guests and staff from one workspace.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F4F6F9",
    theme_color: "#1367D1",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/loji-symbol.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}
