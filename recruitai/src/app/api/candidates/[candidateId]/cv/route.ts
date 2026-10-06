import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/uploads";
import { cvContentType } from "@/lib/cvIntake";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { candidateId } = await params;

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, job: { companyId: session.user.companyId } },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readUpload(candidate.cvFileUrl);
  if (!buffer) {
    return NextResponse.json({ error: "CV file not found" }, { status: 404 });
  }

  const isDocx = candidate.cvFileUrl.toLowerCase().endsWith(".docx");
  // Header values must be ASCII — non-Latin names would make the response throw.
  const fileName = `${candidate.name.replace(/[^A-Za-z0-9 ._-]/g, "").trim() || "cv"}.${isDocx ? "docx" : "pdf"}`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": cvContentType(candidate.cvFileUrl),
      // Word files can't display in the browser, so they download.
      "Content-Disposition": `${isDocx ? "attachment" : "inline"}; filename="${fileName}"`,
      // CVs are personal data — never cache them in shared caches.
      "Cache-Control": "private, no-store",
    },
  });
}
