import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { applicantAuthConfig } from "@/applicantAuth.config";

export const {
  handlers: applicantAuthHandlers,
  signIn: applicantSignIn,
  signOut: applicantSignOut,
  auth: applicantAuth,
} = NextAuth({
  ...applicantAuthConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const applicant = await prisma.applicant.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!applicant) return null;

        const valid = await bcrypt.compare(password, applicant.passwordHash);
        if (!valid) return null;

        // The shared next-auth User type (src/types/next-auth.d.ts) declares
        // role/companyId for the recruiter auth instance. Applicant sessions
        // intentionally have neither — this instance uses its own cookie and
        // its own pages, and applicant-facing code never reads those fields.
        return {
          id: applicant.id,
          name: applicant.name,
          email: applicant.email,
        } as unknown as { id: string; name: string; email: string; role: string; companyId: string };
      },
    }),
  ],
});
