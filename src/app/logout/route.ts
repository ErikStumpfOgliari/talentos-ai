import { NextResponse, type NextRequest } from "next/server";
import {
  getSharedCookieDomain,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-constants";
import { revokeSessionToken } from "@/lib/auth";

function clearSessionCookie(response: NextResponse, hostname: string) {
  const expiredCookie = {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  response.cookies.set(SESSION_COOKIE_NAME, "", expiredCookie);

  const sharedDomain = getSharedCookieDomain(hostname);

  if (sharedDomain) {
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...expiredCookie,
      domain: sharedDomain,
    });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function POST(request: NextRequest) {
  const sessionTokens = request.cookies.getAll(SESSION_COOKIE_NAME).map((cookie) => cookie.value);

  for (const sessionToken of sessionTokens) {
    await revokeSessionToken(sessionToken);
  }

  const response = NextResponse.redirect(new URL("/login", request.url), 303);

  clearSessionCookie(response, request.nextUrl.hostname);

  return response;
}
