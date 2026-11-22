import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One Prisma client for the whole server, over a plain pg pool (Prisma 7
// connects through a driver adapter). The global keeps Next.js hot
// reloads from opening a new pool on every change in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Fail fast with a clear error instead of a cryptic Prisma auth
  // failure on the first query: without DATABASE_URL there is no
  // database to talk to at all.
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — the app cannot reach its database. Set it in .env (local) or Vercel → Settings → Environment Variables.",
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
