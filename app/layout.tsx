import type { Metadata, Viewport } from "next";

import { GoogleAnalytics } from "@next/third-parties/google";

import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { PublicNavigation } from "@/components/content/public-navigation";
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
    url: `${baseUrl}/loji-symbol.svg`,
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
  inLanguage: "sw",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0D10" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),

  applicationName: "Loji Business",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Loji Business",
    statusBarStyle: "default",
  },

  title: {
    default: "Loji Business",
    template: "%s | Loji Business",
  },

  description:
    "Simamia biashara ya malazi, vyumba, uhifadhi, wageni na wafanyakazi kwa Loji Business.",

  keywords: [
    "Loji Business",
    "mfumo wa kusimamia hoteli",
    "mfumo wa kusimamia loji",
    "usimamizi wa uhifadhi",
    "usimamizi wa vyumba",
    "usimamizi wa wageni",
    "programu ya biashara za malazi Tanzania",
  ],

  authors: [
    {
      name: "Loji Business",
      url: baseUrl,
    },
  ],

  creator: "Loji Business",
  publisher: "Loji Business",

  category: "Programu ya biashara",

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      {
        url: "/loji-symbol.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/loji-symbol.svg",
    apple: "/loji-symbol.svg",
  },

  openGraph: {
    type: "website",
    locale: "sw_TZ",
    alternateLocale: ["en_TZ"],
    url: baseUrl,
    siteName: "Loji Business",
    title: "Loji Business",
    description:
      "Simamia vyumba, uhifadhi, wageni na wafanyakazi kutoka eneo moja la kazi.",
    images: [
      {
        url: "/og.png",
        width: 1792,
        height: 936,
        alt: "Loji Business — Simamia biashara yako ya malazi kwa uhakika",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Loji Business",
    description:
      "Simamia vyumba, uhifadhi, wageni na wafanyakazi kutoka eneo moja la kazi.",
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
    <html lang="sw">
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

        <AppProviders>
          <PublicNavigation />
          {children}
        </AppProviders>

        {googleAnalyticsId ? (
          <GoogleAnalytics gaId={googleAnalyticsId} />
        ) : null}
      </body>
    </html>
  );
}
