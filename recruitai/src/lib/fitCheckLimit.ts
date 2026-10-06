// Rate limit for the public "Check my fit": each new AI run costs money,
// so one visitor gets FIT_CHECKS_PER_HOUR fresh checks an hour. Re-checking
// a CV that's already been scored is free and isn't counted.

import { createHash } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const FIT_CHECKS_PER_HOUR = 6;

async function visitorHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  // Salted so the stored value can't be turned back into an IP address.
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:${ip}`).digest("hex");
}

// Records one AI-backed check, or returns false if the visitor is over the limit.
export async function takeFitCheck(): Promise<boolean> {
  const ipHash = await visitorHash();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.fitCheckLog.count({ where: { ipHash, createdAt: { gte: since } } });
  if (recent >= FIT_CHECKS_PER_HOUR) return false;
  await prisma.fitCheckLog.create({ data: { ipHash } });
  // Housekeeping: rows older than a day are never needed again.
  await prisma.fitCheckLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  return true;
}
