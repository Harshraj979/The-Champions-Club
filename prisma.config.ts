import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 keeps connection config here instead of in the schema.
// DATABASE_URL is the one connection string for migrate, seed and the app.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
