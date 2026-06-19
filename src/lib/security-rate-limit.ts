import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { defaultOrganizationSlug } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

type HeaderGetter = (name: string) => string | null;

type SecurityRateLimitInput = {
  action: string;
  identityParts?: Array<number | string | null | undefined>;
  limit: number;
  metadata?: Prisma.InputJsonObject;
  organizationId?: string | null;
  windowSeconds: number;
};

type SecurityRateLimitResult = {
  identityHash: string;
  organizationId: string | null;
  remaining: number;
  retryAfterSeconds: number;
};

const RATE_LIMIT_ENTITY_TYPE = "security_rate_limit";
const RATE_LIMIT_ACTION_PREFIX = "rate_limit.";

export class SecurityRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests.");
    this.name = "SecurityRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isSecurityRateLimitError(error: unknown): error is SecurityRateLimitError {
  return error instanceof SecurityRateLimitError;
}

function getRateLimitSecret() {
  return process.env.AUTH_SECRET ?? "aptelys-local-dev-rate-limit-secret";
}

function hashValue(value: string) {
  return createHash("sha256").update(`${getRateLimitSecret()}:${value}`).digest("hex");
}

function normalizeIdentityPart(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase().slice(0, 240);
}

function sanitizeAction(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .slice(0, 120);
}

function readClientIp(getHeader: HeaderGetter) {
  const forwardedFor = getHeader("x-forwarded-for")?.split(",")[0]?.trim();
  const cloudflareIp = getHeader("cf-connecting-ip")?.trim();
  const vercelIp = getHeader("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const realIp = getHeader("x-real-ip")?.trim();

  return cloudflareIp || forwardedFor || vercelIp || realIp || "unknown";
}

function readRequestHost(getHeader: HeaderGetter) {
  return getHeader("x-forwarded-host") ?? getHeader("host") ?? null;
}

function buildRateLimitMetadata({
  action,
  getHeader,
  identityHash,
  ipHash,
  limit,
  metadata,
  windowSeconds,
}: {
  action: string;
  getHeader: HeaderGetter;
  identityHash: string;
  ipHash: string;
  limit: number;
  metadata?: Prisma.InputJsonObject;
  windowSeconds: number;
}) {
  return {
    action,
    host: readRequestHost(getHeader),
    identityHash,
    ipHash,
    limit,
    ...(metadata ? { metadata } : {}),
    windowSeconds,
  } satisfies Prisma.InputJsonObject;
}

async function resolveRateLimitOrganizationId(organizationId?: string | null): Promise<string | null> {
  if (organizationId) {
    return organizationId;
  }

  const organization =
    (await prisma.organization.findUnique({
      where: {
        slug: defaultOrganizationSlug,
      },
      select: {
        id: true,
      },
    })) ??
    (await prisma.organization.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    }));

  if (!organization) {
    return null;
  }

  return organization.id;
}

async function checkRateLimitWithHeaders(
  getHeader: HeaderGetter,
  {
    action,
    identityParts = [],
    limit,
    metadata,
    organizationId,
    windowSeconds,
  }: SecurityRateLimitInput,
): Promise<SecurityRateLimitResult> {
  const safeAction = sanitizeAction(action);
  const resolvedOrganizationId = await resolveRateLimitOrganizationId(organizationId);
  const clientIp = readClientIp(getHeader);
  const ipHash = hashValue(clientIp);
  const identityHash = hashValue(
    [
      safeAction,
      ipHash,
      ...identityParts.map(normalizeIdentityPart),
    ].join("|"),
  );
  const windowStart = new Date(Date.now() - windowSeconds * 1000);
  const rateLimitAction = `${RATE_LIMIT_ACTION_PREFIX}${safeAction}`;

  if (!resolvedOrganizationId) {
    return {
      identityHash,
      organizationId: null,
      remaining: limit,
      retryAfterSeconds: windowSeconds,
    };
  }

  const currentCount = await prisma.auditEvent.count({
    where: {
      action: rateLimitAction,
      createdAt: {
        gte: windowStart,
      },
      entityId: identityHash,
      entityType: RATE_LIMIT_ENTITY_TYPE,
      organizationId: resolvedOrganizationId,
    },
  });

  if (currentCount >= limit) {
    const eventMetadata = buildRateLimitMetadata({
      action: safeAction,
      getHeader,
      identityHash,
      ipHash,
      limit,
      metadata,
      windowSeconds,
    });

    await prisma.auditEvent.create({
      data: {
        action: "security.rate_limited",
        entityId: identityHash,
        entityType: RATE_LIMIT_ENTITY_TYPE,
        metadata: eventMetadata,
        organizationId: resolvedOrganizationId,
      },
    });

    throw new SecurityRateLimitError(windowSeconds);
  }

  const eventMetadata = buildRateLimitMetadata({
    action: safeAction,
    getHeader,
    identityHash,
    ipHash,
    limit,
    metadata,
    windowSeconds,
  });

  await prisma.auditEvent.create({
    data: {
      action: rateLimitAction,
      entityId: identityHash,
      entityType: RATE_LIMIT_ENTITY_TYPE,
      metadata: eventMetadata,
      organizationId: resolvedOrganizationId,
    },
  });

  return {
    identityHash,
    organizationId: resolvedOrganizationId,
    remaining: Math.max(0, limit - currentCount - 1),
    retryAfterSeconds: windowSeconds,
  };
}

export async function checkSecurityRateLimit(input: SecurityRateLimitInput) {
  const headersList = await headers();

  return checkRateLimitWithHeaders((name) => headersList.get(name), input);
}

export async function checkSecurityRateLimitForRequest(request: Request, input: SecurityRateLimitInput) {
  return checkRateLimitWithHeaders((name) => request.headers.get(name), input);
}
