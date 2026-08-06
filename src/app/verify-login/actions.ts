"use server";

import { redirect } from "next/navigation";
import {
  AuthFactorMethod,
  BillingStatus,
  EmailTrigger,
  MembershipRole,
  MembershipStatus,
} from "@/generated/prisma/client";
import { setSessionCookie } from "@/lib/auth";
import { sendBillingEmail } from "@/lib/billing-notifications";
import { BILLING_TRIAL_DAYS, TRIAL_PLAN } from "@/lib/subscription";
import { verifyEmailCode } from "@/lib/auth-verification";
import { clearPendingAuthCookie, getPendingAuth } from "@/lib/pending-auth";
import {
  clearPendingSignupCookie,
  getPendingSignup,
  verifyPendingSignupCode,
  type PendingSignupPayload,
} from "@/lib/pending-signup";
import { prisma } from "@/lib/prisma";
import {
  checkSecurityRateLimit,
  isSecurityRateLimitError,
} from "@/lib/security-rate-limit";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getVerificationPath(next: string, error: string) {
  return `/verify-login?error=${encodeURIComponent(error)}&next=${encodeURIComponent(next)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function getUniqueOrganizationSlug(name: string) {
  const baseSlug = slugify(name) || "workspace";
  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.organization.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
}

async function createVerifiedWorkspaceSignup(payload: PendingSignupPayload) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      error: "email_exists" as const,
    };
  }

  const slug = await getUniqueOrganizationSlug(payload.organizationName);

  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + BILLING_TRIAL_DAYS);

  const { organization, user } = await prisma.$transaction(async (tx) => {
    const createdOrganization = await tx.organization.create({
      data: {
        name: payload.organizationName,
        slug,
        // Durante o trial o acesso é sempre do plano Intermediário (TRIAL_PLAN),
        // independentemente do plano que o cliente pretende assinar depois.
        plan: TRIAL_PLAN,
        selectedPlan: payload.plan ?? null,
        billingStatus: BillingStatus.TRIALING,
        trialStartedAt,
        trialEndsAt,
        billingRemindersSent: { welcome: true },
        timezone: "America/Sao_Paulo",
      },
    });

    const createdUser = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        passwordHash: payload.passwordHash,
        preferredAuthFactor: AuthFactorMethod.EMAIL_CODE,
        secondFactorEnabled: true,
      },
    });

    await tx.membership.create({
      data: {
        organizationId: createdOrganization.id,
        userId: createdUser.id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });

    await tx.userAvailability.create({
      data: {
        organizationId: createdOrganization.id,
        userId: createdUser.id,
        timezone: createdOrganization.timezone,
      },
    });

    await tx.emailTemplate.createMany({
      data: [
        {
          organizationId: createdOrganization.id,
          name: "Application received",
          subject: "We received your application for {{jobTitle}}",
          body: "Hi {{candidateName}}, thanks for applying to {{jobTitle}}. We received your resume and our team will review your profile soon.",
          trigger: EmailTrigger.APPLICATION_RECEIVED,
          active: true,
        },
        {
          organizationId: createdOrganization.id,
          name: "Interview confirmation",
          subject: "Interview confirmed for {{jobTitle}}",
          body: "Hi {{candidateName}}, your interview is confirmed for {{interviewTime}}. We are looking forward to speaking with you.",
          trigger: EmailTrigger.INTERVIEW_SCHEDULED,
          active: true,
        },
        {
          organizationId: createdOrganization.id,
          name: "Rejection update",
          subject: "Update about {{jobTitle}}",
          body: "Hi {{candidateName}}, thank you for your time in the {{jobTitle}} process. We will not be moving forward at this stage, but we appreciate your interest.",
          trigger: EmailTrigger.REJECTION_SENT,
          active: true,
        },
      ],
    });

    await tx.auditEvent.create({
      data: {
        organizationId: createdOrganization.id,
        actorId: createdUser.id,
        action: "workspace.created",
        entityType: "organization",
        entityId: createdOrganization.id,
        metadata: {
          verifiedBeforePersisting: true,
          signupAddress: {
            addressLine1: payload.addressLine1,
            addressLine2: payload.addressLine2,
            city: payload.city,
            country: payload.country,
            postalCode: payload.postalCode,
            region: payload.region,
          },
          signupRole: "owner_recruiter",
        },
      },
    });

    return {
      organization: createdOrganization,
      user: createdUser,
    };
  });

  return {
    organization,
    user,
  };
}

function getSafeNext(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function completeLoginVerification(formData: FormData) {
  const pendingAuth = await getPendingAuth();

  if (!pendingAuth) {
    redirect("/login?error=verification");
  }

  const nextPath = getSafeNext(pendingAuth.nextPath);
  const code = readString(formData, "code");

  try {
    await checkSecurityRateLimit({
      action: "auth.verification.login",
      identityParts: [pendingAuth.userId, pendingAuth.verificationChallengeId],
      limit: 12,
      metadata: {
        mode: "login",
      },
      organizationId: pendingAuth.organizationId,
      windowSeconds: 10 * 60,
    });
  } catch (error) {
    if (isSecurityRateLimitError(error)) {
      redirect(getVerificationPath(nextPath, "rate_limited"));
    }

    throw error;
  }

  const verification = await verifyEmailCode({
    challengeId: pendingAuth.verificationChallengeId ?? "",
    code,
    organizationId: pendingAuth.organizationId,
    userId: pendingAuth.userId,
  });

  if (!verification.ok) {
    redirect(getVerificationPath(nextPath, verification.reason));
  }

  try {
    await prisma.user.update({
      where: {
        id: pendingAuth.userId,
      },
      data: {
        lastLoginAt: new Date(),
        preferredAuthFactor: AuthFactorMethod.EMAIL_CODE,
        secondFactorEnabled: true,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  await setSessionCookie(pendingAuth.userId, pendingAuth.organizationId);
  await clearPendingAuthCookie();
  redirect(nextPath);
}

export async function completeSignupVerification(formData: FormData) {
  const nextPath = getSafeNext(readString(formData, "next"));
  const code = readString(formData, "code");

  const pendingSignup = await getPendingSignup();

  if (!pendingSignup) {
    redirect(getVerificationPath(nextPath, "expired"));
  }

  try {
    await checkSecurityRateLimit({
      action: "auth.verification.signup",
      identityParts: [pendingSignup.email, pendingSignup.organizationName],
      limit: 12,
      metadata: {
        mode: "signup",
      },
      windowSeconds: 10 * 60,
    });
  } catch (error) {
    if (isSecurityRateLimitError(error)) {
      redirect(getVerificationPath(nextPath, "rate_limited"));
    }

    throw error;
  }

  const verification = await verifyPendingSignupCode(code);

  if (!verification.ok) {
    redirect(getVerificationPath(nextPath, verification.reason));
  }

  const result = await createVerifiedWorkspaceSignup(verification.payload);

  if ("error" in result) {
    await clearPendingSignupCookie();
    redirect("/signup?error=email");
  }

  // Email de boas-vindas ao trial (best-effort, nunca bloqueia o login).
  await sendBillingEmail(result.organization.id, "welcome");

  await setSessionCookie(result.user.id, result.organization.id);
  await clearPendingSignupCookie();
  redirect(nextPath);
}
