import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

type Check = {
  detail: string;
  name: string;
  ok: boolean;
};

const root = process.cwd();
const appRoot = join(root, "src", "app");
const checks: Check[] = [];

function normalizePath(path: string) {
  return relative(root, path).split(sep).join("/");
}

async function walkFiles(directory: string, fileName: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return walkFiles(absolutePath, fileName);
      }

      if (entry.isFile() && entry.name === fileName) {
        return [absolutePath];
      }

      return [];
    }),
  );

  return files.flat();
}

async function readProjectFile(path: string) {
  return readFile(join(root, path), "utf8");
}

function addCheck(name: string, ok: boolean, detail: string) {
  checks.push({
    detail,
    name,
    ok,
  });
}

function containsAny(source: string, patterns: string[]) {
  return patterns.some((pattern) => source.includes(pattern));
}

async function auditServerActions() {
  const actionFiles = await walkFiles(appRoot, "actions.ts");
  const publicActionRules = new Map<string, string[]>([
    ["src/app/login/actions.ts", ["checkSecurityRateLimit"]],
    ["src/app/signup/actions.ts", ["checkSecurityRateLimit"]],
    ["src/app/verify-login/actions.ts", ["checkSecurityRateLimit"]],
    ["src/app/forgot-password/actions.ts", ["checkSecurityRateLimit"]],
    ["src/app/reset-password/actions.ts", ["checkSecurityRateLimit"]],
    ["src/app/careers/[jobId]/actions.ts", ["submitPublicJobApplication", "getRequestBaseUrl"]],
    ["src/app/schedule/[token]/actions.ts", ["checkSecurityRateLimit"]],
  ]);

  for (const file of actionFiles) {
    const path = normalizePath(file);
    const source = await readFile(file, "utf8");
    const publicGuards = publicActionRules.get(path);

    if (publicGuards) {
      addCheck(
        `${path} public guard`,
        publicGuards.every((guard) => source.includes(guard)),
        `Expected public action guard(s): ${publicGuards.join(", ")}`,
      );
      continue;
    }

    addCheck(
      `${path} protected action guard`,
      containsAny(source, ["requireRole(", "requireSession("]),
      "Private server actions should check session or role inside the action file.",
    );
  }
}

async function auditRouteHandlers() {
  const routeFiles = await walkFiles(appRoot, "route.ts");
  const routeRules = new Map<string, string[]>([
    ["src/app/api/careers/resume-upload/route.ts", ["checkSecurityRateLimitForRequest", "requestHasAllowedOrigin"]],
    ["src/app/api/integrations/google-calendar/callback/route.ts", ["getCurrentSession"]],
    ["src/app/api/integrations/google-calendar/connect/route.ts", ["getCurrentSession"]],
    ["src/app/api/applications/[applicationId]/analyze/route.ts", ["getCurrentSession", "recruitingRoles"]],
    ["src/app/api/pipeline/move/route.ts", ["movePipelineCandidate"]],
    ["src/app/api/webhooks/resend/route.ts", ["verifyResendWebhook"]],
    ["src/app/candidates/[candidateId]/resumes/[resumeId]/route.ts", ["getCurrentSession", "recruitingRoles"]],
    ["src/app/logout/route.ts", ["revokeSessionToken"]],
  ]);

  for (const file of routeFiles) {
    const path = normalizePath(file);
    const source = await readFile(file, "utf8");
    const guards = routeRules.get(path);

    addCheck(
      `${path} route guard`,
      Boolean(guards) && guards!.every((guard) => source.includes(guard)),
      guards ? `Expected route guard(s): ${guards.join(", ")}` : "No route guard rule registered.",
    );
  }
}

async function auditProxy() {
  const proxyPath = "src/proxy.ts";
  const proxyExists = await stat(join(root, proxyPath)).then(() => true).catch(() => false);

  addCheck("proxy file exists", proxyExists, proxyPath);

  if (!proxyExists) {
    return;
  }

  const source = await readProjectFile(proxyPath);

  addCheck("proxy checks session cookie", source.includes("SESSION_COOKIE_NAME") && source.includes("request.cookies.has"), proxyPath);
  addCheck("proxy redirects private pages to login", source.includes("NextResponse.redirect") && source.includes("/login"), proxyPath);
  addCheck("proxy keeps candidate/public routes public", containsAny(source, ['pathname.startsWith("/careers")', 'pathname.startsWith("/schedule")']), proxyPath);
}

async function auditSecurityHeaders() {
  const source = await readProjectFile("next.config.ts");
  const requiredHeaders = [
    "Content-Security-Policy",
    "Permissions-Policy",
    "Referrer-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
  ];

  for (const header of requiredHeaders) {
    addCheck(`security header ${header}`, source.includes(header), "next.config.ts");
  }

  addCheck("Next powered-by header disabled", source.includes("poweredByHeader: false"), "next.config.ts");
}

async function main() {
  await auditServerActions();
  await auditRouteHandlers();
  await auditProxy();
  await auditSecurityHeaders();

  const failed = checks.filter((check) => !check.ok);

  for (const check of checks) {
    const prefix = check.ok ? "PASS" : "FAIL";
    console.log(`${prefix} ${check.name} - ${check.detail}`);
  }

  if (failed.length > 0) {
    console.error(`\nSecurity audit failed: ${failed.length} issue(s) found.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nSecurity audit passed: ${checks.length} check(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
