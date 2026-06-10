import { NextResponse } from "next/server";
import { recruitingRoles, getCurrentSession } from "@/lib/auth";
import { exchangeGoogleCalendarCode } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { GOOGLE_CALENDAR_OAUTH_STATE_COOKIE } from "../connect/route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login?next=/interviews", request.url));
  }

  if (!(recruitingRoles as readonly string[]).includes(session.membership.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/interviews?calendar=denied&reason=${encodeURIComponent(error)}`, request.url));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim().split("="))
    .find(([name]) => name === GOOGLE_CALENDAR_OAUTH_STATE_COOKIE)?.[1];

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/interviews?calendar=state-mismatch", request.url));
  }

  try {
    const connection = await exchangeGoogleCalendarCode({
      code,
      organizationId: session.organization.id,
      origin: url.origin,
      userId: session.user.id,
    });

    await prisma.auditEvent.create({
      data: {
        organizationId: session.organization.id,
        actorId: session.user.id,
        action: "calendar.google_connected",
        entityType: "calendar_connection",
        entityId: connection.id,
        metadata: {
          connectedEmail: connection.connectedEmail,
          provider: connection.provider,
        },
      },
    });

    const response = NextResponse.redirect(new URL("/interviews?calendar=connected", request.url));
    response.cookies.set(GOOGLE_CALENDAR_OAUTH_STATE_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/interviews?calendar=failed", request.url));
  }
}
