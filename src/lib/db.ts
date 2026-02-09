import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isProduction = process.env.NODE_ENV === "production";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (!isProduction) globalForPrisma.prisma = prisma;
