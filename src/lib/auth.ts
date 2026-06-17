import { createHash, randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
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
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  hashSessionToken,
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

type AuthSessionDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  findFirst(args: {
    select: { expiresAt?: boolean; lastSeenAt: boolean; organizationId: boolean; revokedAt?: boolean };
    where: Record<string, unknown>;
  }): Promise<{
    expiresAt?: Date;
    lastSeenAt: Date;
    organizationId: string | null;
    revokedAt?: Date | null;
  } | null>;
  update(args: { data: Record<string, unknown>; where: Record<string, unknown> }): Promise<unknown>;
  updateMany(args: { data: Record<string, unknown>; where: Record<string, unknown> }): Promise<unknown>;
};

function getAuthSessionDelegate() {
  return (prisma as unknown as { authSession?: AuthSessionDelegate }).authSession;
}

function hashNullable(value?: string | null) {
  return value ? createHash("sha256").update(value).digest("hex") : null;
}

function getDeviceLabel(userAgent?: string | null) {
  if (!userAgent) {
    return "Trusted device";
  }

  const os = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Mac OS")
      ? "macOS"
      : userAgent.includes("iPhone")
        ? "iPhone"
        : userAgent.includes("Android")
          ? "Android"
          : "device";
  const browser = userAgent.includes("Edg/")
    ? "Edge"
    : userAgent.includes("Firefox/")
      ? "Firefox"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "browser";

  return `${browser} on ${os}`;
}

async function getRequestSessionContext() {
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent");
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip");
  const ip = forwardedFor || realIp;

  return {
    deviceLabel: getDeviceLabel(userAgent),
    ipHash: hashNullable(ip),
    userAgent: userAgent?.slice(0, 500) ?? null,
    userAgentHash: hashNullable(userAgent),
  };
}

async function validatePersistedSession({
  organizationId,
  sessionId,
  token,
  userId,
}: {
  organizationId?: string;
  sessionId?: string;
  token: string;
  userId: string;
}) {
  if (!sessionId) {
    return {
      organizationId,
    };
  }

  const authSessionDelegate = getAuthSessionDelegate();

  if (!authSessionDelegate) {
    return {
      organizationId,
    };
  }

  let authSession: {
    expiresAt?: Date;
    lastSeenAt: Date;
    organizationId: string | null;
    revokedAt?: Date | null;
  } | null = null;

  try {
    authSession = await authSessionDelegate.findFirst({
      where: {
        id: sessionId,
        userId,
        tokenHash: hashSessionToken(token),
      },
      select: {
        expiresAt: true,
        lastSeenAt: true,
        organizationId: true,
        revokedAt: true,
      },
    });
  } catch {
    return {
      organizationId,
    };
  }

  if (!authSession) {
    return {
      organizationId,
    };
  }

  if (authSession.revokedAt || (authSession.expiresAt && authSession.expiresAt <= new Date())) {
    return null;
  }

  const oneDayAgo = Date.now() - 1000 * 60 * 60 * 24;

  if (authSession.lastSeenAt.getTime() < oneDayAgo) {
    try {
      await authSessionDelegate.update({
        where: {
          id: sessionId,
        },
        data: {
          lastSeenAt: new Date(),
        },
      });
    } catch {
      return {
        organizationId: authSession.organizationId ?? organizationId,
      };
    }
  }

  return {
    organizationId: authSession.organizationId ?? organizationId,
  };
}

export async function getCurrentSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(sessionToken);

  if (!payload) {
    return null;
  }

  const persistedSession = await validatePersistedSession({
    organizationId: payload.organizationId,
    sessionId: payload.sessionId,
    token: sessionToken ?? "",
    userId: payload.userId,
  });

  if (!persistedSession) {
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
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          role: true,
          organizationId: true,
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

  const membership =
    user?.memberships.find((item) => item.organizationId === persistedSession.organizationId) ??
    user?.memberships[0];

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
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const requestContext = await getRequestSessionContext();
  const authSessionDelegate = getAuthSessionDelegate();

  if (authSessionDelegate) {
    const sessionId = randomUUID();
    const sessionToken = createSessionToken(userId, organizationId, sessionId);

    try {
      await authSessionDelegate.create({
        data: {
          id: sessionId,
          userId,
          organizationId,
          tokenHash: hashSessionToken(sessionToken),
          deviceLabel: requestContext.deviceLabel,
          userAgent: requestContext.userAgent,
          userAgentHash: requestContext.userAgentHash,
          ipHash: requestContext.ipHash,
          expiresAt: expires,
        },
      });

      cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
        expires,
        httpOnly: true,
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return;
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }

  const sessionToken = createSessionToken(userId, organizationId);

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    expires,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function revokeSessionToken(token?: string | null) {
  const payload = verifySessionToken(token);

  if (!payload?.sessionId || !token) {
    return;
  }

  const authSessionDelegate = getAuthSessionDelegate();

  if (!authSessionDelegate) {
    return;
  }

  await authSessionDelegate.updateMany({
    where: {
      id: payload.sessionId,
      userId: payload.userId,
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  await revokeSessionToken(sessionToken);

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
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
