import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCvFile, storeAndParseCv, CvReadError } from "@/lib/cvIntake";
import { extractEmail, guessNameFromText, nameFromFileName } from "@/lib/cvParse";
import { newStatusToken } from "@/lib/statusToken";
import { findLikelyDuplicate } from "@/lib/duplicateDetection";
import { scoreInBackground } from "@/lib/scoringRun";

// AI scoring runs after the response; give it room to finish a batch.
export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { jobId } = await params;

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: session.user.companyId },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const results: { fileName: string; status: "ok" | "error"; error?: string; candidateId?: string }[] = [];
  const toScore: string[] = [];

  for (const file of files) {
    try {
      if (!isCvFile(file)) {
        results.push({ fileName: file.name, status: "error", error: "Not a PDF or Word (.docx) file" });
        continue;
      }

      const { storedPath, extractedText } = await storeAndParseCv(jobId, file);
      const duplicate = await findLikelyDuplicate(job.companyId, extractedText);

      // Placeholder name/email until the AI reads them from the CV.
      const candidate = await prisma.candidate.create({
        data: {
          jobId,
          statusToken: newStatusToken(),
          name: guessNameFromText(extractedText) ?? nameFromFileName(file.name),
          email: extractEmail(extractedText),
          cvFileUrl: storedPath,
          extractedText,
          source: "RECRUITER_UPLOADED",
          duplicateOfId: duplicate?.candidateId ?? null,
          duplicateSimilarity: duplicate?.similarity ?? null,
        },
      });

      toScore.push(candidate.id);
      results.push({ fileName: file.name, status: "ok", candidateId: candidate.id });
    } catch (err) {
      console.error(`[upload] ${file.name} failed`, err);
      results.push({
        fileName: file.name,
        status: "error",
        error: err instanceof CvReadError ? err.message : "Failed to process file",
      });
    }
  }

  scoreInBackground(toScore);
  return NextResponse.json({ results });
}
