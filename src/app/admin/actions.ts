"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  MembershipRole,
  MembershipStatus,
  Plan,
} from "@/generated/prisma/client";
import { adminRoles, requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readEnum<T extends Record<string, string>>(enumObject: T, value: string, fallback: T[keyof T]) {
  return Object.values(enumObject).includes(value) ? (value as T[keyof T]) : fallback;
}

function readWorkspaceRole(formData: FormData) {
  const role = readEnum(MembershipRole, readString(formData, "role"), MembershipRole.RECRUITER);

  switch (role) {
    case MembershipRole.OWNER:
    case MembershipRole.ADMIN:
    case MembershipRole.RECRUITER:
      return role;
    default:
      return MembershipRole.RECRUITER;
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getSafeRedirect(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function revalidateAdmin() {
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/settings");
  revalidatePath("/jobs");
  revalidatePath("/interviews");
  revalidatePath("/email-automation");
}

function assertCanAssignRole(currentRole: MembershipRole, nextRole: MembershipRole) {
  if (nextRole === MembershipRole.OWNER && currentRole !== MembershipRole.OWNER) {
    throw new Error("Only workspace owners can assign the owner role.");
  }
}

async function assertOwnerCoverage({
  membershipId,
  nextRole,
  nextStatus,
  organizationId,
}: {
  membershipId: string;
  nextRole: MembershipRole;
  nextStatus: MembershipStatus;
  organizationId: string;
}) {
  const current = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId,
    },
  });

  if (!current || current.role !== MembershipRole.OWNER || (nextRole === MembershipRole.OWNER && nextStatus === MembershipStatus.ACTIVE)) {
    return;
  }

  const otherActiveOwners = await prisma.membership.count({
    where: {
      organizationId,
      id: {
        not: membershipId,
      },
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
    },
  });

  if (otherActiveOwners === 0) {
    throw new Error("At least one active owner must remain in the workspace.");
  }
}

async function requireWorkspaceMembership(membershipId: string, organizationId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId,
    },
  });

  if (!membership) {
    throw new Error("Membership not found for this organization.");
  }

  return membership;
}

export async function updateOrganizationSettings(formData: FormData) {
  const session = await requireRole(adminRoles);
  const organization = session.organization;
  const name = readString(formData, "name");
  const timezone = readString(formData, "timezone");
  const requestedPlan = readEnum(Plan, readString(formData, "plan"), organization.plan);
  const plan = session.membership.role === MembershipRole.OWNER ? requestedPlan : organization.plan;
  const redirectTo = getSafeRedirect(readOptionalString(formData, "redirectTo"), "/admin?settings=1");

  if (!name || !timezone) {
    throw new Error("Organization name and timezone are required.");
  }

  await prisma.organization.update({
    where: {
      id: organization.id,
    },
    data: {
      name,
      plan,
      timezone,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      action: "organization.settings_updated",
      entityType: "organization",
      entityId: organization.id,
      metadata: {
        name,
        plan,
        requestedPlan,
        timezone,
      },
    },
  });

  revalidateAdmin();
  redirect(redirectTo);
}

export async function upsertWorkspaceMember(formData: FormData) {
  const session = await requireRole(adminRoles);
  const organization = session.organization;
  const name = readString(formData, "name");
  const email = normalizeEmail(readString(formData, "email"));
  const password = readString(formData, "password");
  const role = readWorkspaceRole(formData);
  const status = readEnum(MembershipStatus, readString(formData, "status"), MembershipStatus.INVITED);

  if (!name || !email) {
    throw new Error("Name and email are required.");
  }

  assertCanAssignRole(session.membership.role, role);

  const passwordHash = password ? await hashPassword(password) : undefined;
  const imageUrl = readOptionalString(formData, "imageUrl");
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  const createdUser = existingUser
    ? null
    : await prisma.user.create({
        data: {
          name,
          email,
          imageUrl,
          passwordHash,
        },
      });
  const userId = existingUser?.id ?? createdUser?.id;

  if (!userId) {
    throw new Error("Unable to resolve workspace user.");
  }

  const membership = await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId,
      },
    },
    update: {
      role,
      status,
      invitedAt: status === MembershipStatus.INVITED ? new Date() : undefined,
      joinedAt: status === MembershipStatus.ACTIVE ? new Date() : undefined,
    },
    create: {
      organizationId: organization.id,
      userId,
      role,
      status,
      invitedAt: status === MembershipStatus.INVITED ? new Date() : null,
      joinedAt: status === MembershipStatus.ACTIVE ? new Date() : null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      action: "membership.upserted",
      entityType: "membership",
      entityId: membership.id,
      metadata: {
        email,
        existingUser: Boolean(existingUser),
        role,
        status,
      },
    },
  });

  revalidateAdmin();
  redirect("/admin?member=1");
}

export async function updateWorkspaceMember(formData: FormData) {
  const session = await requireRole(adminRoles);
  const organization = session.organization;
  const membershipId = readString(formData, "membershipId");
  const role = readWorkspaceRole(formData);
  const status = readEnum(MembershipStatus, readString(formData, "status"), MembershipStatus.ACTIVE);

  if (!membershipId) {
    throw new Error("Membership id is required.");
  }

  const currentMembership = await requireWorkspaceMembership(membershipId, organization.id);

  assertCanAssignRole(session.membership.role, role);

  if (currentMembership.role === MembershipRole.OWNER && session.membership.role !== MembershipRole.OWNER) {
    throw new Error("Only workspace owners can change another owner.");
  }

  await assertOwnerCoverage({
    organizationId: organization.id,
    membershipId,
    nextRole: role,
    nextStatus: status,
  });

  const membership = await prisma.membership.update({
    where: {
      id: membershipId,
    },
    data: {
      role,
      status,
      invitedAt: status === MembershipStatus.INVITED ? new Date() : undefined,
      joinedAt: status === MembershipStatus.ACTIVE ? new Date() : undefined,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      action: "membership.updated",
      entityType: "membership",
      entityId: membership.id,
      metadata: {
        role,
        status,
      },
    },
  });

  revalidateAdmin();
  redirect("/admin?member=1");
}

export async function resendWorkspaceInvite(formData: FormData) {
  const session = await requireRole(adminRoles);
  const organization = session.organization;
  const membershipId = readString(formData, "membershipId");

  if (!membershipId) {
    throw new Error("Membership id is required.");
  }

  await requireWorkspaceMembership(membershipId, organization.id);

  const membership = await prisma.membership.update({
    where: {
      id: membershipId,
    },
    data: {
      status: MembershipStatus.INVITED,
      invitedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      action: "membership.invite_resent",
      entityType: "membership",
      entityId: membership.id,
      metadata: {
        status: MembershipStatus.INVITED,
      },
    },
  });

  revalidateAdmin();
  redirect("/admin?invite=1");
}
