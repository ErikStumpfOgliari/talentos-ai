"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthFactorMethod, AuthVerificationPurpose, MembershipStatus } from "@/generated/prisma/client";
import {
  LOGIN_ATTEMPTS_COOKIE_NAME,
  LOGIN_ATTEMPTS_MAX_AGE_SECONDS,
} from "@/lib/auth-constants";
import { createEmailVerificationChallenge } from "@/lib/auth-verification";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";
import { setPendingAuthCookie } from "@/lib/pending-auth";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string) {
  return email.toLowerCase();
}

function getSafeNext(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function readAuthFactorMethod(value: string) {
  if (value === AuthFactorMethod.SMS_CODE || value === AuthFactorMethod.AUTHENTICATOR_APP) {
    return value;
  }

  return AuthFactorMethod.EMAIL_CODE;
}

type LoginAttemptState = {
  count: number;
  email: string;
};

function encodeLoginAttemptState(state: LoginAttemptState) {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeLoginAttemptState(value?: string | null): LoginAttemptState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<LoginAttemptState>;

    if (!parsed.email || typeof parsed.count !== "number") {
      return null;
    }

    return {
      count: Math.max(0, Math.min(parsed.count, 5)),
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

async function clearFailedLoginAttempts() {
  const cookieStore = await cookies();

  cookieStore.set(LOGIN_ATTEMPTS_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

async function registerFailedLoginAttempt(email: string) {
  if (!email) {
    return 0;
  }

  const cookieStore = await cookies();
  const currentState = decodeLoginAttemptState(cookieStore.get(LOGIN_ATTEMPTS_COOKIE_NAME)?.value);
  const nextState: LoginAttemptState = {
    count: currentState?.email === email ? currentState.count + 1 : 1,
    email,
  };

  cookieStore.set(LOGIN_ATTEMPTS_COOKIE_NAME, encodeLoginAttemptState(nextState), {
    httpOnly: true,
    maxAge: LOGIN_ATTEMPTS_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return nextState.count;
}

async function redirectInvalid(next: string, email: string): Promise<never> {
  const attempts = await registerFailedLoginAttempt(email);

  if (attempts >= 5) {
    redirect(`/forgot-password?reason=attempts&email=${encodeURIComponent(email)}`);
  }

  redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
}

export async function login(formData: FormData) {
  const email = normalizeEmail(readString(formData, "email"));
  const password = readString(formData, "password");
  const selectedAuthFactor = readAuthFactorMethod(readString(formData, "method"));
  const preferredAuthFactor =
    selectedAuthFactor === AuthFactorMethod.EMAIL_CODE ? selectedAuthFactor : AuthFactorMethod.EMAIL_CODE;
  const next = getSafeNext(readString(formData, "next"));

  if (!email || !password) {
    return redirectInvalid(next, email);
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      memberships: {
        where: {
          status: MembershipStatus.ACTIVE,
        },
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    return redirectInvalid(next, email);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    return redirectInvalid(next, email);
  }

  await clearFailedLoginAttempts();
  const organization = user.memberships[0].organization;
  const challenge = await createEmailVerificationChallenge({
    organizationId: user.memberships[0].organizationId,
    organizationName: organization.name,
    purpose: AuthVerificationPurpose.LOGIN,
    userEmail: user.email,
    userId: user.id,
    userName: user.name,
  });
  await setPendingAuthCookie({
    mode: "login",
    nextPath: next,
    organizationId: user.memberships[0].organizationId,
    preferredAuthFactor,
    userId: user.id,
    verificationChallengeId: challenge.challengeId,
    verificationDebugCode: challenge.debugCode,
  });
  redirect(`/verify-login?mode=login&next=${encodeURIComponent(next)}`);
}
