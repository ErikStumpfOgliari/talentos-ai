import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  MembershipRole,
  MembershipStatus,
  Plan,
} from "@/generated/prisma/client";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth-constants";
import { defaultOrganizationSlug } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  verifySessionToken,
} from "@/lib/session-token";

export const adminRoles = [MembershipRole.OWNER, MembershipRole.ADMIN] as const;
export const recruitingRoles = [
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.RECRUITER,
] as const;
export const automationRoles = [
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.RECRUITER,
] as const;
export const analyticsRoles = [
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.RECRUITER,
] as const;

export type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
  };
  membership: {
    id: string;
    role: MembershipRole;
    status: MembershipStatus;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: Plan;
    timezone: string;
  };
};

export async function getCurrentSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(sessionToken);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
      memberships: {
        where: {
          status: MembershipStatus.ACTIVE,
          ...(payload.organizationId
            ? {
                organizationId: payload.organizationId,
              }
            : {
                organization: {
                  slug: defaultOrganizationSlug,
                },
              }),
        },
        select: {
          id: true,
          role: true,
          status: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              timezone: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  const membership = user?.memberships[0];

  if (!user || !membership) {
    return null;
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
    },
    membership: {
      id: membership.id,
      role: membership.role,
      status: membership.status,
    },
    organization: membership.organization,
  };
}

export async function setSessionCookie(userId: string, organizationId?: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(userId, organizationId), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(allowedRoles: readonly MembershipRole[]) {
  const session = await requireSession();

  if (!allowedRoles.includes(session.membership.role)) {
    redirect("/dashboard");
  }

  return session;
}
