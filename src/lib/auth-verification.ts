import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import {
  AuthFactorMethod,
  AuthVerificationPurpose,
  EmailStatus,
  EmailTrigger,
} from "@/generated/prisma/client";
import { sendTransactionalEmail } from "@/lib/email-provider";
import { prisma } from "@/lib/prisma";

export const AUTH_VERIFICATION_CODE_LENGTH = 6;
export const AUTH_VERIFICATION_MAX_AGE_MINUTES = 10;
export const AUTH_VERIFICATION_MAX_ATTEMPTS = 5;

type CreateEmailVerificationChallengeInput = {
  organizationId: string;
  organizationName: string;
  purpose: AuthVerificationPurpose;
  userEmail: string;
  userId: string;
  userName: string;
};

type VerifyEmailCodeInput = {
  challengeId: string;
  code: string;
  organizationId?: string;
  userId: string;
};

type VerifyEmailCodeResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "invalid" | "locked" | "missing" };

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }

  return secret ?? "aptelys-local-dev-session-secret";
}

function createVerificationCode() {
  const min = 10 ** (AUTH_VERIFICATION_CODE_LENGTH - 1);
  const max = 10 ** AUTH_VERIFICATION_CODE_LENGTH;

  return randomInt(min, max).toString();
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, AUTH_VERIFICATION_CODE_LENGTH);
}

function hashVerificationCode(challengeId: string, code: string) {
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

function getVerificationSubject(purpose: AuthVerificationPurpose) {
  return purpose === AuthVerificationPurpose.SIGNUP
    ? "Verify your Aptelys workspace"
    : "Your Aptelys sign-in code";
}

function getVerificationBody({
  code,
  organizationName,
  purpose,
  userName,
}: {
  code: string;
  organizationName: string;
  purpose: AuthVerificationPurpose;
  userName: string;
}) {
  const intro =
    purpose === AuthVerificationPurpose.SIGNUP
      ? `Use this code to finish protecting your new Aptelys workspace for ${organizationName}.`
      : `Use this code to confirm your Aptelys sign-in for ${organizationName}.`;

  return [
    `Hi ${userName},`,
    "",
    intro,
    "",
    code,
    "",
    `This code expires in ${AUTH_VERIFICATION_MAX_AGE_MINUTES} minutes and can be used only once.`,
    "If you did not request this, you can ignore this message.",
  ].join("\n");
}

export async function createEmailVerificationChallenge({
  organizationId,
  organizationName,
  purpose,
  userEmail,
  userId,
  userName,
}: CreateEmailVerificationChallengeInput) {
  const now = new Date();
  const challengeId = randomUUID();
  const code = createVerificationCode();
  const expiresAt = new Date(now.getTime() + AUTH_VERIFICATION_MAX_AGE_MINUTES * 60 * 1000);

  await prisma.authVerificationCode.updateMany({
    where: {
      organizationId,
      userId,
      purpose,
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      consumedAt: now,
    },
  });

  await prisma.authVerificationCode.create({
    data: {
      id: challengeId,
      organizationId,
      userId,
      method: AuthFactorMethod.EMAIL_CODE,
      purpose,
      codeHash: hashVerificationCode(challengeId, code),
      sentTo: userEmail,
      expiresAt,
    },
  });

  const subject = getVerificationSubject(purpose);
  const body = getVerificationBody({
    code,
    organizationName,
    purpose,
    userName,
  });
  const delivery = await sendTransactionalEmail({
    body,
    subject,
    toEmail: userEmail,
  });

  await prisma.emailMessage.create({
    data: {
      organizationId,
      toEmail: userEmail,
      subject,
      body,
      status: delivery.status,
      trigger: EmailTrigger.MANUAL,
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId,
      sentAt: delivery.status === EmailStatus.SENT ? new Date() : null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId,
      actorId: userId,
      action: "auth_verification_code.sent",
      entityType: "user",
      entityId: userId,
      metadata: {
        challengeId,
        method: AuthFactorMethod.EMAIL_CODE,
        provider: delivery.provider,
        purpose,
        status: delivery.status,
      },
    },
  });

  return {
    challengeId,
    debugCode: process.env.NODE_ENV !== "production" ? code : undefined,
    expiresAt,
  };
}

export async function verifyEmailCode({
  challengeId,
  code,
  organizationId,
  userId,
}: VerifyEmailCodeInput): Promise<VerifyEmailCodeResult> {
  const normalizedCode = normalizeCode(code);

  if (!challengeId || normalizedCode.length !== AUTH_VERIFICATION_CODE_LENGTH) {
    return {
      ok: false,
      reason: "missing",
    };
  }

  const challenge = await prisma.authVerificationCode.findFirst({
    where: {
      id: challengeId,
      userId,
      method: AuthFactorMethod.EMAIL_CODE,
      ...(organizationId ? { organizationId } : {}),
    },
    select: {
      attempts: true,
      codeHash: true,
      consumedAt: true,
      expiresAt: true,
      id: true,
      organizationId: true,
    },
  });

  const now = new Date();

  if (!challenge || challenge.consumedAt || challenge.expiresAt <= now) {
    return {
      ok: false,
      reason: "expired",
    };
  }

  if (challenge.attempts >= AUTH_VERIFICATION_MAX_ATTEMPTS) {
    return {
      ok: false,
      reason: "locked",
    };
  }

  const expectedHash = hashVerificationCode(challengeId, normalizedCode);

  if (!timingSafeStringEqual(challenge.codeHash, expectedHash)) {
    const attempts = challenge.attempts + 1;

    await prisma.authVerificationCode.update({
      where: {
        id: challenge.id,
      },
      data: {
        attempts,
        consumedAt: attempts >= AUTH_VERIFICATION_MAX_ATTEMPTS ? now : null,
      },
    });

    return {
      ok: false,
      reason: attempts >= AUTH_VERIFICATION_MAX_ATTEMPTS ? "locked" : "invalid",
    };
  }

  await prisma.authVerificationCode.update({
    where: {
      id: challenge.id,
    },
    data: {
      consumedAt: now,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: challenge.organizationId,
      actorId: userId,
      action: "auth_verification_code.verified",
      entityType: "user",
      entityId: userId,
      metadata: {
        challengeId,
        method: AuthFactorMethod.EMAIL_CODE,
      },
    },
  });

  return {
    ok: true,
  };
}
