import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scoreCandidate } from "@/lib/scoring";
import { isPdfFile, storeAndParseCv, evaluationCreateInput } from "@/lib/cvIntake";
import { extractEmail, guessNameFromText, nameFromFileName } from "@/lib/cvParse";
import { newStatusToken } from "@/lib/statusToken";
import { findLikelyDuplicate } from "@/lib/duplicateDetection";

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

  for (const file of files) {
    try {
      if (!isPdfFile(file)) {
        results.push({ fileName: file.name, status: "error", error: "Not a PDF file" });
        continue;
      }

      const { storedPath, extractedText } = await storeAndParseCv(jobId, file);

      const email = extractEmail(extractedText);
      const name = guessNameFromText(extractedText) ?? nameFromFileName(file.name);

      const evaluation = scoreCandidate(extractedText, job);
      const duplicate = await findLikelyDuplicate(job.companyId, extractedText);

      const candidate = await prisma.candidate.create({
        data: {
          jobId,
          statusToken: newStatusToken(),
          name,
          email,
          cvFileUrl: storedPath,
          extractedText,
          source: "RECRUITER_UPLOADED",
          duplicateOfId: duplicate?.candidateId ?? null,
          duplicateSimilarity: duplicate?.similarity ?? null,
          evaluation: { create: evaluationCreateInput(evaluation) },
        },
      });

      results.push({ fileName: file.name, status: "ok", candidateId: candidate.id });
    } catch (err) {
      results.push({
        fileName: file.name,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to process file",
      });
    }
  }

  return NextResponse.json({ results });
}
