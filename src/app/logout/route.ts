import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth-constants";
import { revokeSessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  await revokeSessionToken(sessionToken);

  const response = NextResponse.redirect(new URL("/login", request.url));

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
