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
    const secureCookie = req.nextUrl.protocol === "https:";
    const cookieName = `${secureCookie ? "__Secure-" : ""}${APPLICANT_COOKIE_BASE}`;
    const applicantToken = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      cookieName,
      secureCookie,
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
