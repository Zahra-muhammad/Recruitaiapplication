import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { CompanySize } from "@prisma/client";

const VALID_SIZES: CompanySize[] = [
  "SIZE_1_10",
  "SIZE_11_50",
  "SIZE_51_200",
  "SIZE_201_1000",
  "SIZE_1000_PLUS",
];

const signupSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  industry: z.string().optional(),
  website: z.string().optional(),
  size: z.string().optional(),
  about: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { companyName, name, email, password, industry, website, size, about } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const companySize = VALID_SIZES.includes(size as CompanySize) ? (size as CompanySize) : null;

  const user = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        industry: industry || null,
        website: website || null,
        size: companySize,
        about: about || null,
      },
    });

    return tx.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: "admin",
        companyId: company.id,
      },
    });
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
