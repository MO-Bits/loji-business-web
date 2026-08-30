import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Loji Business",
    short_name: "Loji",
    description: "Manage properties, rooms, bookings, guests and staff from one workspace.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F6F9",
    theme_color: "#155EEF",
    icons: [
      {
        src: "/loji-symbol.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
