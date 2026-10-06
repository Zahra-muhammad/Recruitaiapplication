import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/", "/login", "/signup", "/apply-login", "/apply-signup", "/status"];
const APPLICANT_PREFIX = "/my";
const APPLICANT_COOKIE_BASE = "applicant-auth.session-token";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname === "/jobs" ||
    pathname.startsWith("/jobs/") ||
    pathname.startsWith("/applications/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/applicant-auth") ||
    pathname.startsWith("/api/signup") ||
    pathname.startsWith("/api/applicant-signup");

  if (isPublic) return NextResponse.next();

  // Applicant-protected zone — checked against the applicant cookie only,
  // never the recruiter session, so the two account types stay fully
  // separate even at the middleware layer.
  if (pathname === APPLICANT_PREFIX || pathname.startsWith(`${APPLICANT_PREFIX}/`)) {
    // applicantAuth.config.ts sets this exact cookie name (no "__Secure-"
    // prefix, even over HTTPS), so it must be read back under the same name.
    const applicantToken = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      cookieName: APPLICANT_COOKIE_BASE,
      secureCookie: req.nextUrl.protocol === "https:",
    });

    if (!applicantToken) {
      const loginUrl = new URL("/apply-login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
