import { PrismaClient } from "@prisma/client";

// schema.prisma reads DATABASE_URL_UNPOOLED as directUrl. Neon sets it;
// Prisma Postgres only sets DATABASE_URL (already direct), so fall back.
process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
