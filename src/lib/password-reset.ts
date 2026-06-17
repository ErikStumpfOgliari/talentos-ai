import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const PASSWORD_RESET_MAX_AGE_MINUTES = 30;

const TOKEN_BYTES = 32;
const MAX_TOKEN_LENGTH = 200;

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createRawPasswordResetToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function getAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (!configuredUrl) {
    return "http://127.0.0.1:3000";
  }

  const normalizedUrl = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`;

  return normalizedUrl.replace(/\/+$/, "");
}

export function getPasswordResetUrl(token: string) {
  return `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function createPasswordResetToken({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const now = new Date();
  const token = createRawPasswordResetToken();
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_MAX_AGE_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.updateMany({
    where: {
      userId,
      usedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      usedAt: now,
    },
  });

  const record = await prisma.passwordResetToken.create({
    data: {
      userId,
      organizationId,
      tokenHash: hashPasswordResetToken(token),
      expiresAt,
    },
    select: {
      id: true,
      expiresAt: true,
    },
  });

  return {
    expiresAt: record.expiresAt,
    id: record.id,
    token,
  };
}

export async function findValidPasswordResetToken(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken || normalizedToken.length > MAX_TOKEN_LENGTH) {
    return null;
  }

  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashPasswordResetToken(normalizedToken),
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      expiresAt: true,
      organizationId: true,
      user: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
      userId: true,
    },
  });
}
