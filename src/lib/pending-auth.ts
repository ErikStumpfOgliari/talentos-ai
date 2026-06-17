import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  PENDING_AUTH_COOKIE_NAME,
  PENDING_AUTH_MAX_AGE_SECONDS,
} from "@/lib/auth-constants";

export type PendingAuthMode = "login" | "signup";

export type PendingAuthPayload = {
  exp: number;
  iat: number;
  mode: PendingAuthMode;
  nextPath: string;
  organizationId?: string;
  preferredAuthFactor?: string;
  userId: string;
  verificationDebugCode?: string;
  verificationChallengeId?: string;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }

  return secret ?? "aptelys-local-dev-session-secret";
}

function sign(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createPendingAuthToken(payload: Omit<PendingAuthPayload, "exp" | "iat">) {
  const now = Math.floor(Date.now() / 1000);
  const encodedPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + PENDING_AUTH_MAX_AGE_SECONDS,
    }),
  ).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyPendingAuthToken(token?: string | null) {
  if (!token) {
    return null;
  }

  try {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature || !timingSafeStringEqual(signature, sign(encodedPayload))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<PendingAuthPayload>;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.userId || !payload.mode || !payload.nextPath || !payload.exp || payload.exp <= now) {
      return null;
    }

    if (payload.mode !== "login" && payload.mode !== "signup") {
      return null;
    }

    return payload as PendingAuthPayload;
  } catch {
    return null;
  }
}

export async function setPendingAuthCookie(payload: Omit<PendingAuthPayload, "exp" | "iat">) {
  const cookieStore = await cookies();
  const token = createPendingAuthToken(payload);

  cookieStore.set(PENDING_AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: PENDING_AUTH_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getPendingAuth() {
  const cookieStore = await cookies();
  return verifyPendingAuthToken(cookieStore.get(PENDING_AUTH_COOKIE_NAME)?.value);
}

export async function clearPendingAuthCookie() {
  const cookieStore = await cookies();

  cookieStore.set(PENDING_AUTH_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
