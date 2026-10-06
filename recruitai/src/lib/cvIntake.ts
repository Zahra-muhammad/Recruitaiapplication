import { randomUUID } from "crypto";
// Must load before PDFParse so the pdf.js worker resolves on Vercel serverless.
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { saveUpload } from "@/lib/uploads";

// CVs are accepted as PDF or Word (.docx). Old binary .doc files can't be
// read reliably, so they're rejected with a message asking for PDF/.docx.
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type CvFormat = "pdf" | "docx";

export const CV_ACCEPT = {
  "application/pdf": [".pdf"],
  [DOCX_MIME]: [".docx"],
};

// Below this, the "text" is almost certainly a scanned image with no text
// layer, or a broken file — scoring it would produce a meaningless result.
const MIN_CV_CHARS = 200;

export class CvReadError extends Error {}

export function cvFormat(file: { name: string; type: string }): CvFormat | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (name.endsWith(".docx") || file.type === DOCX_MIME) return "docx";
  return null;
}

export function isCvFile(file: File): boolean {
  return cvFormat(file) !== null;
}

export function cvContentType(key: string): string {
  return key.toLowerCase().endsWith(".docx") ? DOCX_MIME : "application/pdf";
}

// Logs what was read, never the CV text itself (personal data) — set
// SCORING_DEBUG=1 to also log the full text while debugging.
function logExtraction(format: CvFormat, text: string, extra: Record<string, unknown> = {}) {
  const words = text.split(/\s+/).filter(Boolean).length;
  console.info("[cv] extracted", JSON.stringify({ format, chars: text.length, words, ...extra }));
  if (process.env.SCORING_DEBUG === "1") console.info("[cv] text:\n" + text);
}

async function readPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    const text = parsed.text.trim();
    // Pages with no text usually mean a scanned page inside an otherwise
    // text-based PDF — the CV would be silently cut off.
    const emptyPages = parsed.pages.filter((p) => p.text.trim().length < 20).map((p) => p.num);
    logExtraction("pdf", text, { pages: parsed.total, emptyPages });
    if (text.length >= MIN_CV_CHARS && emptyPages.length > 0) {
      console.warn(`[cv] PDF has ${emptyPages.length} page(s) without readable text: ${emptyPages.join(", ")}`);
    }
    return text;
  } finally {
    await parser.destroy();
  }
}

async function readDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  logExtraction("docx", text, { warnings: result.messages.length });
  return text;
}

export async function extractCvText(buffer: Buffer, format: CvFormat): Promise<string> {
  let text: string;
  try {
    text = format === "pdf" ? await readPdf(buffer) : await readDocx(buffer);
  } catch (err) {
    console.error("[cv] could not open file", err);
    throw new CvReadError(`We couldn't open this ${format === "pdf" ? "PDF" : "Word file"} — it may be damaged or password-protected.`);
  }
  if (text.length < MIN_CV_CHARS) {
    throw new CvReadError(
      "We couldn't read enough text from this CV — it may be a scanned image. Please upload a text-based PDF or a Word (.docx) file."
    );
  }
  return text;
}

function requireFormat(file: File): CvFormat {
  const format = cvFormat(file);
  if (!format) throw new CvReadError("CV must be a PDF or Word (.docx) file.");
  return format;
}

// In-memory only — no disk write, no DB write. For flows like the applicant
// fit-check that must never persist a Candidate record.
export async function parseCvText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return extractCvText(buffer, requireFormat(file));
}

async function storeAndParse(prefix: string, file: File) {
  const format = requireFormat(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  // Parse first: an unreadable file throws here, before anything is stored.
  const extractedText = await extractCvText(buffer, format);
  const key = `${prefix}/${randomUUID()}.${format}`;
  const storedPath = await saveUpload(key, buffer, cvContentType(key));
  return { storedPath, extractedText };
}

export async function storeAndParseCv(jobId: string, file: File) {
  return storeAndParse(jobId, file);
}

// A job seeker's saved profile CV — stored under applicants/{id}/,
// not tied to any single job, so it can be reused across applications.
export async function storeAndParseApplicantCv(applicantId: string, file: File) {
  return storeAndParse(`applicants/${applicantId}`, file);
}
