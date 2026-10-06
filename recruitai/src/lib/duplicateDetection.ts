// "Possible duplicate application": a new CV whose text is near-identical to
// an earlier candidate's CV at the same company (same or different job).
// Informational only — never used to reject. Scoped to one company so it
// never reveals anything about applications to other companies.

import { prisma } from "@/lib/prisma";

// Share of overlapping 3-word sequences above which two CVs are treated as
// the same document. Calibrated on real data: different people's CVs overlap
// by under 10%, while a reformatted or lightly edited copy stays around
// 75-100% (each changed word breaks three shingles, so ~13% of words must
// change to fall below 60%).
export const DUPLICATE_THRESHOLD = 0.6;
// Very short texts share too few shingles to compare meaningfully.
const MIN_WORDS = 40;
const SHINGLE = 3;

export function shingles(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9@.+#-]+/g) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + SHINGLE <= words.length; i++) out.add(words.slice(i, i + SHINGLE).join(" "));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const s of small) if (large.has(s)) shared++;
  return shared / (a.size + b.size - shared);
}

function wordCount(text: string): number {
  return (text.match(/\S+/g) ?? []).length;
}

export interface DuplicateMatch {
  candidateId: string;
  similarity: number;
}

// Best near-identical earlier CV at this company, or null.
export function findDuplicateIn(
  text: string,
  earlier: { id: string; extractedText: string }[]
): DuplicateMatch | null {
  if (wordCount(text) < MIN_WORDS) return null;
  const mine = shingles(text);
  let best: DuplicateMatch | null = null;
  for (const other of earlier) {
    if (wordCount(other.extractedText) < MIN_WORDS) continue;
    const similarity = jaccard(mine, shingles(other.extractedText));
    if (similarity >= DUPLICATE_THRESHOLD && (!best || similarity > best.similarity)) {
      best = { candidateId: other.id, similarity: Math.round(similarity * 100) / 100 };
    }
  }
  return best;
}

export async function findLikelyDuplicate(companyId: string, text: string): Promise<DuplicateMatch | null> {
  const earlier = await prisma.candidate.findMany({
    where: { job: { companyId } },
    select: { id: true, extractedText: true },
  });
  return findDuplicateIn(text, earlier);
}
