"use server";

import { redirect } from "next/navigation";
import { EmailTrigger, MembershipRole, MembershipStatus, Plan } from "@/generated/prisma/client";
import { setSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
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

function redirectWithError(error: string): never {
  redirect(`/signup?error=${encodeURIComponent(error)}`);
}

export async function createWorkspaceSignup(formData: FormData) {
  const name = readString(formData, "name");
  const email = normalizeEmail(readString(formData, "email"));
  const password = readString(formData, "password");
  const organizationName = readString(formData, "organizationName");

  if (!name || !email || !password || !organizationName) {
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

  const slug = await getUniqueOrganizationSlug(organizationName);
  const passwordHash = await hashPassword(password);

  const { organization, user } = await prisma.$transaction(async (tx) => {
    const createdOrganization = await tx.organization.create({
      data: {
        name: organizationName,
        slug,
        plan: Plan.PRO,
        timezone: "America/Sao_Paulo",
      },
    });

    const createdUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
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
          signupRole: "owner_recruiter",
        },
      },
    });

    return {
      organization: createdOrganization,
      user: createdUser,
    };
  });

  await setSessionCookie(user.id, organization.id);
  redirect("/dashboard");
}
