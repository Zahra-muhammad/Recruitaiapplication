import { randomUUID } from "crypto";
import { PDFParse } from "pdf-parse";
import { saveUpload } from "@/lib/uploads";
import type { Evaluation } from "@/lib/scoring";

export function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  return parsed.text.trim();
}

// In-memory only — no disk write, no DB write. For flows like the applicant
// fit-check that must never persist a Candidate record.
export async function parseCvText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return parsePdfBuffer(buffer);
}

export async function storeAndParseCv(
  jobId: string,
  file: File
): Promise<{ storedPath: string; extractedText: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  // Parse first: an unreadable PDF throws here, before anything is stored.
  const extractedText = await parsePdfBuffer(buffer);
  const storedPath = await saveUpload(`${jobId}/${randomUUID()}.pdf`, buffer);
  return { storedPath, extractedText };
}

// A job seeker's saved profile CV — stored under applicants/{id}/,
// not tied to any single job, so it can be reused across applications.
export async function storeAndParseApplicantCv(
  applicantId: string,
  file: File
): Promise<{ storedPath: string; extractedText: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extractedText = await parsePdfBuffer(buffer);
  const storedPath = await saveUpload(`applicants/${applicantId}/${randomUUID()}.pdf`, buffer);
  return { storedPath, extractedText };
}

export function evaluationCreateInput(evaluation: Evaluation) {
  return {
    totalScore: evaluation.totalScore,
    verdict: evaluation.verdict,
    skillsMatchScore: evaluation.skillsMatchScore,
    buildingScore: evaluation.buildingScore,
    startupToleranceScore: evaluation.startupToleranceScore,
    trackRecordScore: evaluation.trackRecordScore,
    redFlagScore: evaluation.redFlagScore,
    summary: evaluation.summary,
    strengths: JSON.stringify(evaluation.strengths),
    concerns: JSON.stringify(evaluation.concerns),
    potential: JSON.stringify(evaluation.potential),
    genericFlag: evaluation.generic.flagged,
    genericReasons: JSON.stringify(evaluation.generic.reasons),
  };
}
