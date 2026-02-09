import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL!;
const needsSsl =
  connectionString.includes("sslmode=require") ||
  (!connectionString.includes(".railway.internal") &&
    !connectionString.includes("localhost") &&
    process.env.NODE_ENV === "production");

const adapter = new PrismaPg({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
