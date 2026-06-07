import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  // Allow requests from your phone on the local network
  // This suppresses the "allowedDevOrigins" warning too
  allowedDevOrigins: ["*"],
};

export default nextConfig;
