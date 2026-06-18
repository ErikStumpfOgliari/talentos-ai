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

const MAX_FAILED_LOGIN_ATTEMPTS = 5;

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

  if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    redirect(`/forgot-password?reason=attempts&email=${encodeURIComponent(email)}`);
  }

  redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
}

function getLoginAttemptWindowStart() {
  return new Date(Date.now() - LOGIN_ATTEMPTS_MAX_AGE_SECONDS * 1000);
}

async function countRecentFailedLoginAttempts({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  return prisma.auditEvent.count({
    where: {
      action: "auth.login_failed",
      actorId: userId,
      entityId: userId,
      entityType: "user",
      organizationId,
      createdAt: {
        gte: getLoginAttemptWindowStart(),
      },
    },
  });
}

async function recordFailedLoginAttempt({
  organizationId,
  reason,
  userId,
}: {
  organizationId: string;
  reason: "invalid_password";
  userId: string;
}) {
  await prisma.auditEvent.create({
    data: {
      action: "auth.login_failed",
      actorId: userId,
      entityId: userId,
      entityType: "user",
      metadata: {
        reason,
        source: "login_form",
      },
      organizationId,
    },
  });
}

async function redirectBlocked(next: string, email: string): Promise<never> {
  await registerFailedLoginAttempt(email);
  redirect(`/forgot-password?reason=attempts&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function login(formData: FormData) {
  const email = normalizeEmail(readString(formData, "email"));
  const password = readString(formData, "password");
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

  const membership = user.memberships[0];
  const recentFailedAttempts = await countRecentFailedLoginAttempts({
    organizationId: membership.organizationId,
    userId: user.id,
  });

  if (recentFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return redirectBlocked(next, email);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    await recordFailedLoginAttempt({
      organizationId: membership.organizationId,
      reason: "invalid_password",
      userId: user.id,
    });

    if (recentFailedAttempts + 1 >= MAX_FAILED_LOGIN_ATTEMPTS) {
      return redirectBlocked(next, email);
    }

    return redirectInvalid(next, email);
  }

  await clearFailedLoginAttempts();
  const organization = membership.organization;
  const challenge = await createEmailVerificationChallenge({
    organizationId: membership.organizationId,
    organizationName: organization.name,
    purpose: AuthVerificationPurpose.LOGIN,
    userEmail: user.email,
    userId: user.id,
    userName: user.name,
  });
  await setPendingAuthCookie({
    mode: "login",
    nextPath: next,
    organizationId: membership.organizationId,
    preferredAuthFactor: AuthFactorMethod.EMAIL_CODE,
    userId: user.id,
    verificationChallengeId: challenge.challengeId,
    verificationDebugCode: challenge.debugCode,
  });
  redirect(`/verify-login?mode=login&next=${encodeURIComponent(next)}`);
}
