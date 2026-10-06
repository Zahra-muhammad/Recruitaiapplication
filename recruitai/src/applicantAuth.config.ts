import type { NextAuthConfig } from "next-auth";

// Edge-safe config for the APPLICANT auth instance — fully separate from the
// recruiter auth in auth.config.ts/auth.ts, with its own session cookie, so
// an applicant session can never be mistaken for a recruiter session (which
// would make company-scoped queries silently drop their companyId filter).
export const applicantAuthConfig: NextAuthConfig = {
  trustHost: true,
  basePath: "/api/applicant-auth",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/apply-login",
  },
  cookies: {
    sessionToken: {
      name: "applicant-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
