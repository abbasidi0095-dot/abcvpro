import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,

  devIndicators: false,

  serverExternalPackages: ["puppeteer", "sharp"],

  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  allowedDevOrigins: [
    "*.trycloudflare.com",
    "statutes-him-universal-mode.trycloudflare.com",
    "abcv.site",
    "www.abcv.site",
    "localhost"
  ],
};

export default nextConfig;
