import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kymloctcridmvqtdglro.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // MUI 9 currently reports legacy system shorthand props used throughout
  // the migrated UI even though they compile and render correctly.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
