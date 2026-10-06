// Vercel build entry (package.json "vercel-build"). Applies pending database
// migrations only for PRODUCTION deploys — preview deployments must never
// change the live database schema — then builds the app.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

// Prisma Postgres only provides DATABASE_URL (already a direct connection);
// Neon also provides DATABASE_URL_UNPOOLED. Fall back so migrations work with either.
process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL;

run("npx prisma generate");

if (process.env.VERCEL_ENV === "production") {
  run("npx prisma migrate deploy");
} else {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`);
}

run("npx next build");
