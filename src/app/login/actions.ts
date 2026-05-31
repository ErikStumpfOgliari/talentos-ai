"use server";

import { redirect } from "next/navigation";
import { MembershipStatus } from "@/generated/prisma/client";
import { defaultOrganizationSlug } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/passwords";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string) {
  return email.toLowerCase();
}

function getSafeNext(value: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function redirectInvalid(next: string): never {
  redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
}

export async function login(formData: FormData) {
  const email = normalizeEmail(readString(formData, "email"));
  const password = readString(formData, "password");
  const next = getSafeNext(readString(formData, "next"));

  if (!email || !password) {
    redirectInvalid(next);
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      memberships: {
        where: {
          status: MembershipStatus.ACTIVE,
          organization: {
            slug: defaultOrganizationSlug,
          },
        },
        take: 1,
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    redirectInvalid(next);
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    redirectInvalid(next);
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  await setSessionCookie(user.id);
  redirect(next);
}
