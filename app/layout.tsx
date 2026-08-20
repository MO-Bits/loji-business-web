import type { Metadata } from "next";

import { GoogleAnalytics } from "@next/third-parties/google";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const baseUrl = "https://business.loji.co.tz";

const googleAnalyticsId =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

const organizationData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${baseUrl}/#organization`,
  name: "Loji Business",
  url: baseUrl,
  logo: {
    "@type": "ImageObject",
    url: `${baseUrl}/loji-business-wordmark.png`,
  },
};

const websiteData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${baseUrl}/#website`,
  name: "Loji Business",
  alternateName: "Loji",
  url: baseUrl,
  publisher: {
    "@id": `${baseUrl}/#organization`,
  },
  inLanguage: "en",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),

  applicationName: "Loji Business",

  title: {
    default: "Loji Business",
    template: "%s | Loji Business",
  },

  description:
    "Manage properties, rooms, bookings, guests and staff with Loji Business.",

  keywords: [
    "Loji Business",
    "property management software",
    "hotel management software",
    "booking management",
    "room management",
    "guest management",
    "hospitality management",
    "property management Tanzania",
  ],

  authors: [
    {
      name: "Loji Business",
      url: baseUrl,
    },
  ],

  creator: "Loji Business",
  publisher: "Loji Business",

  category: "Business software",

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },

  openGraph: {
    type: "website",
    locale: "en_TZ",
    url: baseUrl,
    siteName: "Loji Business",
    title: "Loji Business",
    description:
      "Manage properties, rooms, bookings, guests and staff from one workspace.",
    images: [
      {
        url: "/og.png",
        width: 1792,
        height: 936,
        alt: "Loji Business — Run your property with confidence",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Loji Business",
    description:
      "Manage properties, rooms, bookings, guests and staff from one workspace.",
    images: ["/og.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationData).replace(
              /</g,
              "\\u003c",
            ),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteData).replace(
              /</g,
              "\\u003c",
            ),
          }}
        />

        <AppProviders>{children}</AppProviders>
      </body>

      {googleAnalyticsId ? (
        <GoogleAnalytics gaId={googleAnalyticsId} />
      ) : null}
    </html>
  );
}