"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EmailStatus, EmailTrigger, MembershipStatus } from "@/generated/prisma/client";
import { LOGIN_ATTEMPTS_COOKIE_NAME } from "@/lib/auth-constants";
import { sendTransactionalEmail } from "@/lib/email-provider";
import {
  createPasswordResetToken,
  getPasswordResetUrl,
  PASSWORD_RESET_MAX_AGE_MINUTES,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import {
  checkSecurityRateLimit,
  isSecurityRateLimitError,
} from "@/lib/security-rate-limit";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
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

export async function requestPasswordRecovery(formData: FormData) {
  const email = normalizeEmail(readString(formData, "email"));

  if (!email) {
    redirect("/forgot-password?error=missing");
  }

  try {
    await checkSecurityRateLimit({
      action: "password_recovery.request",
      identityParts: [email],
      limit: 5,
      metadata: {
        emailPresent: true,
      },
      windowSeconds: 60 * 60,
    });
  } catch (error) {
    if (isSecurityRateLimitError(error)) {
      redirect(`/forgot-password?error=rate_limited&email=${encodeURIComponent(email)}`);
    }

    throw error;
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      name: true,
      memberships: {
        where: {
          status: MembershipStatus.ACTIVE,
        },
        select: {
          organizationId: true,
          organization: {
            select: {
              name: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  const membership = user?.memberships[0];
  const organizationId = membership?.organizationId;

  if (user && organizationId) {
    const resetToken = await createPasswordResetToken({
      organizationId,
      userId: user.id,
    });
    const resetUrl = getPasswordResetUrl(resetToken.token);
    const subject = "Reset your Aptelys password";
    const body = [
      `Hi ${user.name},`,
      "",
      `Use this secure link to reset your Aptelys password for ${membership.organization.name}:`,
      resetUrl,
      "",
      `This link expires in ${PASSWORD_RESET_MAX_AGE_MINUTES} minutes and can be used only once.`,
      "If you did not request this, you can ignore this message.",
    ].join("\n");
    const delivery = await sendTransactionalEmail({
      body,
      subject,
      toEmail: user.email,
    });
    const sentAt = delivery.status === EmailStatus.SENT ? new Date() : null;

    await prisma.emailMessage.create({
      data: {
        organizationId,
        toEmail: user.email,
        subject,
        body,
        status: delivery.status,
        trigger: EmailTrigger.MANUAL,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        sentAt,
      },
    });

    await prisma.auditEvent.create({
      data: {
        organizationId,
        actorId: user.id,
        action: "password_recovery.requested",
        entityType: "user",
        entityId: user.id,
        metadata: {
          email,
          expiresAt: resetToken.expiresAt.toISOString(),
          provider: delivery.provider,
          status: delivery.status,
          tokenId: resetToken.id,
          source: "public_forgot_password",
        },
      },
    });
  }

  await clearFailedLoginAttempts();
  redirect(`/forgot-password?requested=1&email=${encodeURIComponent(email)}`);
}
