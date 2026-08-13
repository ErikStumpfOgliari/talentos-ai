import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

const PUBLIC_FILE = /\.(.*)$/;

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/logout" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/signup" ||
    pathname === "/verify-login" ||
    pathname === "/candidate-status" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/careers") ||
    pathname.startsWith("/schedule") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
