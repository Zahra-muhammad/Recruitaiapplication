import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/uploads";

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

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${candidate.name.replace(/"/g, "")}.pdf"`,
      // CVs are personal data — never cache them in shared caches.
      "Cache-Control": "private, no-store",
    },
  });
}
