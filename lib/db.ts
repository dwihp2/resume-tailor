import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Prisma Postgres (the Vercel addon) exposes several URLs: POSTGRES_URL is the
 * direct TCP connection, while DATABASE_URL or PRISMA_DATABASE_URL may be the
 * Accelerate proxy. This app talks to Postgres through @prisma/adapter-pg,
 * which dials TCP, so the direct URL is preferred and a proxy URL is refused
 * with an explanation instead of a confusing connection error later.
 */
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No database URL is configured. Set DATABASE_URL (or POSTGRES_URL) — see .env.example.");
}

if (!/^postgres(ql)?:\/\//.test(connectionString)) {
  throw new Error(
    `The configured database URL is not a direct Postgres connection (it starts with "${connectionString.split(":")[0]}"). ` +
      "This app uses @prisma/adapter-pg, so it needs a postgres:// URL — on Vercel that value is POSTGRES_URL.",
  );
}

// Reused across hot reloads in development, otherwise every edit leaks a pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
