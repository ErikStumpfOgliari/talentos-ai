"use server";

import { redirect } from "next/navigation";
import {
  AuthFactorMethod,
} from "@/generated/prisma/client";
import { sendTransactionalEmail } from "@/lib/email-provider";
import { hashPassword } from "@/lib/passwords";
import {
  createPendingSignupCookie,
  PENDING_SIGNUP_MAX_ATTEMPTS,
  PENDING_SIGNUP_MAX_AGE_SECONDS,
} from "@/lib/pending-signup";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function redirectWithError(error: string): never {
  redirect(`/signup?error=${encodeURIComponent(error)}`);
}

export async function createWorkspaceSignup(formData: FormData) {
  const name = readString(formData, "name");
  const email = normalizeEmail(readString(formData, "email"));
  const phone = readString(formData, "phone");
  const password = readString(formData, "password");
  const organizationName = readString(formData, "organizationName");
  const addressLine1 = readString(formData, "addressLine1");
  const addressLine2 = readString(formData, "addressLine2");
  const city = readString(formData, "city");
  const region = readString(formData, "region");
  const postalCode = readString(formData, "postalCode");
  const country = readString(formData, "country");

  if (!name || !email || !phone || !password || !organizationName || !addressLine1 || !city || !region || !postalCode || !country) {
    redirectWithError("missing");
  }

  if (password.length < 8) {
    redirectWithError("password");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    redirectWithError("email");
  }

  const passwordHash = await hashPassword(password);
  const pendingSignup = await createPendingSignupCookie({
    addressLine1,
    addressLine2,
    city,
    country,
    email,
    name,
    organizationName,
    passwordHash,
    phone,
    postalCode,
    preferredAuthFactor: AuthFactorMethod.EMAIL_CODE,
    region,
  });

  const subject = "Verify your Aptelys workspace";
  const body = [
    `Hi ${name},`,
    "",
    `Use this code to finish creating your Aptelys workspace for ${organizationName}:`,
    "",
    pendingSignup.code,
    "",
    `This code expires in ${Math.floor(PENDING_SIGNUP_MAX_AGE_SECONDS / 60)} minutes and can be used only once.`,
    `After ${PENDING_SIGNUP_MAX_ATTEMPTS} incorrect attempts, you will need to start again.`,
    "",
    "If you did not request this, you can ignore this message.",
  ].join("\n");

  await sendTransactionalEmail({
    body,
    subject,
    toEmail: email,
  });

  redirect("/verify-login?mode=signup&next=%2Fdashboard");
}
