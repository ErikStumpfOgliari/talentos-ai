import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { AuthFactorMethod, Plan } from "@/generated/prisma/client";
import {
  PENDING_SIGNUP_COOKIE_NAME,
  PENDING_SIGNUP_MAX_AGE_SECONDS,
} from "@/lib/auth-constants";

export const PENDING_SIGNUP_CODE_LENGTH = 6;
export const PENDING_SIGNUP_MAX_ATTEMPTS = 5;
export { PENDING_SIGNUP_MAX_AGE_SECONDS };

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export type PendingSignupPayload = {
  addressLine1: string;
  addressLine2: string;
  attempts: number;
  challengeId: string;
  city: string;
  codeHash: string;
  country: string;
  email: string;
  exp: number;
  iat: number;
  verificationDebugCode?: string;
  name: string;
  organizationName: string;
  passwordHash: string;
  phone: string;
  plan?: Plan;
  postalCode: string;
  preferredAuthFactor: AuthFactorMethod;
  region: string;
};

type PendingSignupInput = Omit<
  PendingSignupPayload,
  "attempts" | "challengeId" | "codeHash" | "exp" | "iat"
>;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }

  return secret ?? "aptelys-local-dev-session-secret";
}

function getEncryptionKey() {
  return createHash("sha256").update(getAuthSecret()).digest();
}

function encryptPayload(payload: PendingSignupPayload) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

function decryptPayload(token?: string | null) {
  if (!token) {
    return null;
  }

  try {
    const [ivValue, tagValue, ciphertextValue] = token.split(".");

    if (!ivValue || !tagValue || !ciphertextValue) {
      return null;
    }

    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      getEncryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );

    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plaintext) as Partial<PendingSignupPayload>;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.email || !payload.name || !payload.organizationName || !payload.passwordHash || !payload.exp || payload.exp <= now) {
      return null;
    }

    if (!payload.challengeId || !payload.codeHash) {
      return null;
    }

    return payload as PendingSignupPayload;
  } catch {
    return null;
  }
}

function hashSignupCode(challengeId: string, code: string) {
  return createHmac("sha256", getAuthSecret()).update(`${challengeId}:${code}`).digest("hex");
}

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createPendingSignupCode() {
  const min = 10 ** (PENDING_SIGNUP_CODE_LENGTH - 1);
  const max = 10 ** PENDING_SIGNUP_CODE_LENGTH;

  return randomInt(min, max).toString();
}

export function normalizeSignupCode(value: string) {
  return value.replace(/\D/g, "").slice(0, PENDING_SIGNUP_CODE_LENGTH);
}

async function setPendingSignupPayload(payload: PendingSignupPayload) {
  const cookieStore = await cookies();

  cookieStore.set(PENDING_SIGNUP_COOKIE_NAME, encryptPayload(payload), {
    httpOnly: true,
    maxAge: PENDING_SIGNUP_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function createPendingSignupCookie(input: PendingSignupInput) {
  const now = Math.floor(Date.now() / 1000);
  const challengeId = randomUUID();
  const code = createPendingSignupCode();

  await setPendingSignupPayload({
    ...input,
    attempts: 0,
    challengeId,
    codeHash: hashSignupCode(challengeId, code),
    iat: now,
    exp: now + PENDING_SIGNUP_MAX_AGE_SECONDS,
    verificationDebugCode: process.env.NODE_ENV !== "production" ? code : undefined,
  });

  return {
    challengeId,
    code,
  };
}

export async function getPendingSignup() {
  const cookieStore = await cookies();

  return decryptPayload(cookieStore.get(PENDING_SIGNUP_COOKIE_NAME)?.value);
}

export async function clearPendingSignupCookie() {
  const cookieStore = await cookies();

  cookieStore.set(PENDING_SIGNUP_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function verifyPendingSignupCode(code: string) {
  const payload = await getPendingSignup();
  const normalizedCode = normalizeSignupCode(code);

  if (!payload) {
    return {
      ok: false as const,
      reason: "expired" as const,
    };
  }

  if (payload.attempts >= PENDING_SIGNUP_MAX_ATTEMPTS) {
    return {
      ok: false as const,
      reason: "locked" as const,
    };
  }

  if (normalizedCode.length !== PENDING_SIGNUP_CODE_LENGTH) {
    return {
      ok: false as const,
      reason: "missing" as const,
    };
  }

  const codeMatches = timingSafeStringEqual(
    payload.codeHash,
    hashSignupCode(payload.challengeId, normalizedCode),
  );

  if (!codeMatches) {
    const nextPayload = {
      ...payload,
      attempts: payload.attempts + 1,
    };

    await setPendingSignupPayload(nextPayload);

    return {
      ok: false as const,
      reason: nextPayload.attempts >= PENDING_SIGNUP_MAX_ATTEMPTS ? "locked" as const : "invalid" as const,
    };
  }

  return {
    ok: true as const,
    payload,
  };
}
