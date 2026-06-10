import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { recruitingRoles, getCurrentSession } from "@/lib/auth";
import { buildGoogleCalendarAuthUrl } from "@/lib/google-calendar";

export const runtime = "nodejs";

export const GOOGLE_CALENDAR_OAUTH_STATE_COOKIE = "talentos_google_calendar_oauth_state";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login?next=/interviews", request.url));
  }

  if (!(recruitingRoles as readonly string[]).includes(session.membership.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const state = randomBytes(24).toString("base64url");

  try {
    const authUrl = buildGoogleCalendarAuthUrl({
      origin: new URL(request.url).origin,
      state,
    });
    const response = NextResponse.redirect(authUrl);

    response.cookies.set(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/interviews?calendar=missing-config", request.url));
  }
}
