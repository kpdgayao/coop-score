import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@anthropic-ai/sdk",
    "@prisma/adapter-pg",
    "@prisma/client",
    "pg",
  ],
};

export default nextConfig;
