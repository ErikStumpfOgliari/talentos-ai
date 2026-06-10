import "dotenv/config";
import { createSessionToken } from "../src/lib/session-token";
import { SESSION_COOKIE_NAME } from "../src/lib/auth-constants";
import { defaultOrganizationSlug } from "../src/lib/organization";
import { prisma } from "../src/lib/prisma";

type SmokeCheck = {
  cookie?: string;
  expectedText: string;
  label: string;
  optional?: boolean;
  path: string;
};

type SmokeResult = {
  error?: string;
  label: string;
  optional: boolean;
  path: string;
  status?: number;
};

const appUrl = (process.env.SMOKE_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

function formatCookie(userId: string) {
  return `${SESSION_COOKIE_NAME}=${createSessionToken(userId)}`;
}

async function fetchText(path: string, cookie?: string) {
  const response = await fetch(`${appUrl}${path}`, {
    headers: cookie
      ? {
          cookie,
        }
      : undefined,
    redirect: "manual",
  });

  return {
    response,
    text: await response.text(),
  };
}

async function getSmokeFixtures() {
  const organization = await prisma.organization.findUnique({
    where: {
      slug: defaultOrganizationSlug,
    },
    include: {
      applications: {
        where: {
          publicToken: {
            not: null,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          publicToken: true,
        },
        take: 1,
      },
      jobs: {
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          publishedAt: "desc",
        },
        select: {
          id: true,
        },
        take: 1,
      },
      memberships: {
        where: {
          role: {
            in: ["OWNER", "ADMIN"],
          },
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          userId: true,
        },
        take: 1,
      },
      schedulingLinks: {
        where: {
          active: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          token: true,
        },
        take: 1,
      },
    },
  });

  if (!organization) {
    throw new Error(`Organization "${defaultOrganizationSlug}" was not found.`);
  }

  const adminUserId = organization.memberships[0]?.userId;

  if (!adminUserId) {
    throw new Error("No active owner/admin membership was found for smoke tests.");
  }

  return {
    adminCookie: formatCookie(adminUserId),
    applicationToken: organization.applications[0]?.publicToken ?? null,
    jobId: organization.jobs[0]?.id ?? null,
    schedulingToken: organization.schedulingLinks[0]?.token ?? null,
  };
}

async function runCheck(check: SmokeCheck): Promise<SmokeResult> {
  try {
    const { response, text } = await fetchText(check.path, check.cookie);

    if (response.status !== 200) {
      return {
        error: `Expected HTTP 200, received ${response.status}.`,
        label: check.label,
        optional: Boolean(check.optional),
        path: check.path,
        status: response.status,
      };
    }

    if (!text.includes(check.expectedText)) {
      return {
        error: `Expected rendered text "${check.expectedText}" was not found.`,
        label: check.label,
        optional: Boolean(check.optional),
        path: check.path,
        status: response.status,
      };
    }

    return {
      label: check.label,
      optional: Boolean(check.optional),
      path: check.path,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown smoke test error.",
      label: check.label,
      optional: Boolean(check.optional),
      path: check.path,
    };
  }
}

async function main() {
  const fixtures = await getSmokeFixtures();
  const checks: SmokeCheck[] = [
    { cookie: fixtures.adminCookie, expectedText: "TalentOS AI", label: "Dashboard", path: "/" },
    { cookie: fixtures.adminCookie, expectedText: "Jobs", label: "Jobs", path: "/jobs" },
    { cookie: fixtures.adminCookie, expectedText: "Candidates", label: "Candidates", path: "/candidates" },
    { cookie: fixtures.adminCookie, expectedText: "Applications Inbox", label: "Applications inbox", path: "/applications" },
    { cookie: fixtures.adminCookie, expectedText: "AI Matching", label: "AI matching", path: "/matching" },
    { cookie: fixtures.adminCookie, expectedText: "Interviews", label: "Interviews", path: "/interviews" },
    { cookie: fixtures.adminCookie, expectedText: "Email Automation", label: "Email automation", path: "/email-automation" },
    { cookie: fixtures.adminCookie, expectedText: "Hiring Analytics", label: "Analytics", path: "/analytics" },
    { cookie: fixtures.adminCookie, expectedText: "Workspace readiness", label: "Admin readiness", path: "/admin" },
    { expectedText: "Open roles", label: "Careers", path: "/careers" },
  ];

  if (fixtures.jobId) {
    checks.push({
      expectedText: "Apply for this role",
      label: "Public job application",
      path: `/careers/${fixtures.jobId}`,
    });
  }

  if (fixtures.applicationToken) {
    checks.push({
      expectedText: "Application status",
      label: "Public application status",
      optional: true,
      path: `/careers/applications/${fixtures.applicationToken}`,
    });
  }

  if (fixtures.schedulingToken) {
    checks.push({
      expectedText: "Choose your interview time",
      label: "Self-scheduling",
      optional: true,
      path: `/schedule/${fixtures.schedulingToken}`,
    });
  }

  const results = await Promise.all(checks.map(runCheck));
  const failures = results.filter((result) => result.error && !result.optional);
  const optionalFailures = results.filter((result) => result.error && result.optional);

  for (const result of results) {
    const status = result.error ? (result.optional ? "SKIP" : "FAIL") : "PASS";
    const detail = result.error ? ` - ${result.error}` : "";

    console.log(`${status} ${result.label} ${result.path}${detail}`);
  }

  if (optionalFailures.length > 0) {
    console.log(`Optional checks skipped: ${optionalFailures.length}`);
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
