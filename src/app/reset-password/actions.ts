"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOGIN_ATTEMPTS_COOKIE_NAME } from "@/lib/auth-constants";
import { hashPassword } from "@/lib/passwords";
import {
  findValidPasswordResetToken,
  hashPasswordResetToken,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getResetPath(token: string, error: string) {
  return `/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(error)}`;
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

export async function resetPassword(formData: FormData) {
  const token = readString(formData, "token");
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");

  if (!token) {
    redirect("/reset-password?error=invalid");
  }

  if (password.length < 8) {
    redirect(getResetPath(token, "password"));
  }

  if (password !== confirmPassword) {
    redirect(getResetPath(token, "mismatch"));
  }

  const resetToken = await findValidPasswordResetToken(token);

  if (!resetToken || !resetToken.organizationId) {
    redirect("/reset-password?error=expired");
  }

  const organizationId = resetToken.organizationId;
  const passwordHash = await hashPassword(password);
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        tokenHash: hashPasswordResetToken(token),
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        usedAt: now,
      },
    });

    if (consumed.count !== 1) {
      return "invalid" as const;
    }

    await tx.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        passwordHash,
      },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    await tx.authSession.updateMany({
      where: {
        userId: resetToken.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId,
        actorId: resetToken.userId,
        action: "password_recovery.completed",
        entityType: "user",
        entityId: resetToken.userId,
        metadata: {
          source: "public_reset_password",
          tokenId: resetToken.id,
        },
      },
    });

    return "ok" as const;
  });

  if (result !== "ok") {
    redirect("/reset-password?error=expired");
  }

  await clearFailedLoginAttempts();
  redirect("/login?reset=success");
}
