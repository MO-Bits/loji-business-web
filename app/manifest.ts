import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Loji Business",
    short_name: "Loji",
    description: "Simamia vyumba, uhifadhi, wageni na wafanyakazi kutoka eneo moja la kazi.",
    lang: "sw-TZ",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F5F5F7",
    theme_color: "#007AFF",
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
