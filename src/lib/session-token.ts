import { createHash, createHmac, timingSafeEqual } from "crypto";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth-constants";

type SessionPayload = {
  exp: number;
  iat: number;
  organizationId?: string;
  sessionId?: string;
  userId: string;
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

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(userId: string, organizationId?: string, sessionId?: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId,
    organizationId,
    sessionId,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  try {
    const [encodedPayload, signature] = token.split(".");

    if (!encodedPayload || !signature || !timingSafeStringEqual(signature, sign(encodedPayload))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SessionPayload>;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.userId || !payload.exp || payload.exp <= now) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}
