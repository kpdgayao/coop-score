import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@anthropic-ai/sdk",
    "@prisma/adapter-pg",
    "@prisma/client",
    "pg",
    "@react-pdf/renderer",
  ],
};

export default nextConfig;
