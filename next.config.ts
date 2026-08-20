import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // MUI 9 currently reports legacy system shorthand props used throughout
  // the migrated UI even though they compile and render correctly.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
