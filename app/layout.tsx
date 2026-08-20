import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://business.loji.co.tz"),
  title: {
    default: "Loji Business",
    template: "%s | Loji Business",
  },
  description: "Manage properties, rooms, bookings and guests with Loji Business.",
  openGraph: {
    title: "Loji Business",
    description: "Run your property with confidence.",
    type: "website",
    images: [{ url: "/og.png", width: 1792, height: 936, alt: "Loji Business — Run your property with confidence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Loji Business",
    description: "Run your property with confidence.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
