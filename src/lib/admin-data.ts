import { CalendarSyncStatus, EmailStatus, ParserStatus } from "@/generated/prisma/client";
import { canUseOpenAIProvider, getAIProviderMode } from "@/lib/ai-provider";
import { getEmailProviderStatus } from "@/lib/email-provider";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { defaultOrganizationSlug } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import { getResumeStorageStatus } from "@/lib/resume-storage";

export type AdminMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  invitedAt: string;
  joinedAt: string;
  updatedAt: string;
  managedJobs: number;
  interviews: number;
  sentEmails: number;
};

export type AdminAuditEvent = {
  id: string;
  action: string;
  entityType: string;
  actor: string;
  context: string;
  createdAt: string;
};

export type AdminPermission = {
  role: string;
  scope: string;
  users: boolean;
  recruiting: boolean;
  automation: boolean;
  analytics: boolean;
  settings: boolean;
};

export type AdminIntegration = {
  actionHref: string;
  detail: string;
  id: string;
  label: string;
  status: string;
  tone: string;
};

export type AdminReliabilityCheck = {
  detail: string;
  href: string;
  label: string;
  status: string;
  tone: string;
  value: string | number;
};

export type AdminPageData = {
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    timezone: string;
    createdAt: string;
  };
  auditEvents: AdminAuditEvent[];
  integrations: AdminIntegration[];
  members: AdminMember[];
  permissions: AdminPermission[];
  reliabilityChecks: AdminReliabilityCheck[];
  stats: {
    activeAutomations: number;
    activeUsers: number;
    calendarConnections: number;
    candidates: number;
    disabledUsers: number;
    failedEmails: number;
    invitedUsers: number;
    jobs: number;
    ownersAndAdmins: number;
    pendingResumeReview: number;
  };
};

export const permissionMatrix: AdminPermission[] = [
  {
    role: "Owner / Admin",
    scope: "Company workspace control",
    users: true,
    recruiting: true,
    automation: true,
    analytics: true,
    settings: true,
  },
  {
    role: "Recruiter",
    scope: "Jobs, candidates, pipeline, scheduling, and automation",
    users: false,
    recruiting: true,
    automation: true,
    analytics: true,
    settings: false,
  },
  {
    role: "Candidate",
    scope: "Public job applications and status pages only",
    users: false,
    recruiting: false,
    automation: false,
    analytics: false,
    settings: false,
  },
];

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date?: Date | null) {
  if (!date) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getConfiguredTone(configured: boolean) {
  return configured
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-amber-50 text-amber-700 ring-amber-200";
}

function getAttentionTone(hasIssue: boolean) {
  return hasIssue
    ? "bg-amber-50 text-amber-700 ring-amber-200"
    : "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function buildEmptyPageData(): AdminPageData {
  const emailProvider = getEmailProviderStatus();
  const googleConfigured = isGoogleCalendarConfigured(process.env.NEXT_PUBLIC_APP_URL);
  const resumeStorage = getResumeStorageStatus();
  const openAiConfigured = canUseOpenAIProvider();

  return {
    organization: {
      id: "",
      name: "No organization",
      slug: defaultOrganizationSlug,
      plan: "Free",
      timezone: "America/Sao_Paulo",
      createdAt: "Pending",
    },
    auditEvents: [],
    integrations: buildIntegrations({
      calendarConnections: 0,
      emailProvider,
      failedEmails: 0,
      googleConfigured,
      openAiConfigured,
      queuedEmails: 0,
      resumeStorage,
      syncedInterviews: 0,
    }),
    members: [],
    permissions: permissionMatrix,
    reliabilityChecks: buildReliabilityChecks({
      activeAutomations: 0,
      activeSchedulingLinks: 0,
      failedCalendarSync: 0,
      failedEmails: 0,
      parsedResumes: 0,
      pendingResumeReview: 0,
      publicApplications: 0,
      queuedEmails: 0,
      syncedInterviews: 0,
      totalResumes: 0,
    }),
    stats: {
      activeAutomations: 0,
      activeUsers: 0,
      calendarConnections: 0,
      candidates: 0,
      disabledUsers: 0,
      failedEmails: 0,
      invitedUsers: 0,
      jobs: 0,
      ownersAndAdmins: 0,
      pendingResumeReview: 0,
    },
  };
}

function buildIntegrations({
  calendarConnections,
  emailProvider,
  failedEmails,
  googleConfigured,
  openAiConfigured,
  queuedEmails,
  resumeStorage,
  syncedInterviews,
}: {
  calendarConnections: number;
  emailProvider: ReturnType<typeof getEmailProviderStatus>;
  failedEmails: number;
  googleConfigured: boolean;
  openAiConfigured: boolean;
  queuedEmails: number;
  resumeStorage: ReturnType<typeof getResumeStorageStatus>;
  syncedInterviews: number;
}): AdminIntegration[] {
  const emailLive = emailProvider.configured;
  const calendarReady = googleConfigured || calendarConnections > 0;
  const aiProviderMode = getAIProviderMode();
  const localAIEnabled = aiProviderMode === "local";

  return [
    {
      actionHref: "/applications",
      detail: localAIEnabled
        ? "Smart local parsing and matching are active without API spend."
        : openAiConfigured
        ? "OpenAI is available for structured resume parsing and candidate matching."
        : "Local parsing and matching fallback is active. Add OPENAI_API_KEY for live AI extraction.",
      id: "openai",
      label: localAIEnabled ? "Smart local AI" : "OpenAI resume AI",
      status: localAIEnabled ? "Local mode" : openAiConfigured ? "Configured" : "Fallback mode",
      tone: localAIEnabled ? "bg-sky-50 text-sky-700 ring-sky-200" : getConfiguredTone(openAiConfigured),
    },
    {
      actionHref: "/email-automation",
      detail: `${emailProvider.provider} from ${emailProvider.from}. ${queuedEmails} queued, ${failedEmails} failed or bounced.`,
      id: "email",
      label: "Email delivery",
      status: emailLive ? (emailProvider.webhookConfigured ? "Live + webhook" : "Live sending") : "Local outbox",
      tone: emailLive
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-sky-50 text-sky-700 ring-sky-200",
    },
    {
      actionHref: "/interviews",
      detail: `${calendarConnections} Google account connected. ${syncedInterviews} interview events synced.`,
      id: "calendar",
      label: "Google Calendar",
      status: calendarConnections > 0 ? "Connected" : googleConfigured ? "OAuth ready" : "Not configured",
      tone: getConfiguredTone(calendarReady),
    },
    {
      actionHref: "/candidates",
      detail: resumeStorage.detail,
      id: "resume-storage",
      label: resumeStorage.label,
      status: resumeStorage.status,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
  ];
}

function buildReliabilityChecks({
  activeAutomations,
  activeSchedulingLinks,
  failedCalendarSync,
  failedEmails,
  parsedResumes,
  pendingResumeReview,
  publicApplications,
  queuedEmails,
  syncedInterviews,
  totalResumes,
}: {
  activeAutomations: number;
  activeSchedulingLinks: number;
  failedCalendarSync: number;
  failedEmails: number;
  parsedResumes: number;
  pendingResumeReview: number;
  publicApplications: number;
  queuedEmails: number;
  syncedInterviews: number;
  totalResumes: number;
}): AdminReliabilityCheck[] {
  return [
    {
      detail: `${parsedResumes}/${totalResumes} resumes parsed. Review failed or low-confidence parses before matching.`,
      href: "/applications#resume-review",
      label: "Resume review",
      status: pendingResumeReview > 0 ? "Needs review" : "Clear",
      tone: getAttentionTone(pendingResumeReview > 0),
      value: pendingResumeReview,
    },
    {
      detail: `${queuedEmails} queued emails and ${failedEmails} failed or bounced deliveries.`,
      href: "/email-automation",
      label: "Email queue",
      status: failedEmails > 0 ? "Attention" : queuedEmails > 0 ? "Queued" : "Healthy",
      tone: failedEmails > 0
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : queuedEmails > 0
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : "bg-emerald-50 text-emerald-700 ring-emerald-200",
      value: queuedEmails + failedEmails,
    },
    {
      detail: `${syncedInterviews} events synced to Google Calendar. Failed syncs need reconnect or retry.`,
      href: "/interviews",
      label: "Calendar sync",
      status: failedCalendarSync > 0 ? "Attention" : syncedInterviews > 0 ? "Synced" : "Ready",
      tone: getAttentionTone(failedCalendarSync > 0),
      value: failedCalendarSync,
    },
    {
      detail: "Active rules send messages when candidates move stage, schedule interviews, or get rejected.",
      href: "/email-automation#rules",
      label: "Automations",
      status: activeAutomations > 0 ? "Active" : "Setup",
      tone: activeAutomations > 0
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : "bg-slate-100 text-slate-600 ring-slate-200",
      value: activeAutomations,
    },
    {
      detail: `${activeSchedulingLinks} active self-scheduling links. ${publicApplications} public applications received.`,
      href: "/careers",
      label: "Public intake",
      status: publicApplications > 0 ? "Receiving" : "Ready",
      tone: "bg-sky-50 text-sky-700 ring-sky-200",
      value: publicApplications,
    },
  ];
}

async function getReliabilityCounters(organizationId: string) {
  const [
    activeAutomations,
    activeSchedulingLinks,
    calendarConnections,
    failedCalendarSync,
    failedEmails,
    parsedResumes,
    pendingResumeReview,
    publicApplications,
    queuedEmails,
    syncedInterviews,
    totalResumes,
  ] = await Promise.all([
    prisma.automationRule.count({
      where: {
        active: true,
        organizationId,
      },
    }),
    prisma.schedulingLink.count({
      where: {
        active: true,
        organizationId,
      },
    }),
    prisma.calendarConnection.count({
      where: {
        organizationId,
      },
    }),
    prisma.interview.count({
      where: {
        calendarSyncStatus: CalendarSyncStatus.FAILED,
        organizationId,
      },
    }),
    prisma.emailMessage.count({
      where: {
        organizationId,
        status: {
          in: [EmailStatus.BOUNCED, EmailStatus.FAILED],
        },
      },
    }),
    prisma.resumeDocument.count({
      where: {
        organizationId,
        parserStatus: ParserStatus.PARSED,
      },
    }),
    prisma.resumeDocument.count({
      where: {
        organizationId,
        parserStatus: {
          in: [ParserStatus.NEEDS_REVIEW, ParserStatus.FAILED],
        },
        reviewedAt: null,
      },
    }),
    prisma.application.count({
      where: {
        organizationId,
        publicToken: {
          not: null,
        },
      },
    }),
    prisma.emailMessage.count({
      where: {
        organizationId,
        status: EmailStatus.QUEUED,
      },
    }),
    prisma.interview.count({
      where: {
        calendarSyncStatus: CalendarSyncStatus.SYNCED,
        organizationId,
      },
    }),
    prisma.resumeDocument.count({
      where: {
        organizationId,
      },
    }),
  ]);

  return {
    activeAutomations,
    activeSchedulingLinks,
    calendarConnections,
    failedCalendarSync,
    failedEmails,
    parsedResumes,
    pendingResumeReview,
    publicApplications,
    queuedEmails,
    syncedInterviews,
    totalResumes,
  };
}

export async function getAdminPageData(organizationId?: string): Promise<AdminPageData> {
  const organization = await prisma.organization.findUnique({
    where: organizationId ? { id: organizationId } : { slug: defaultOrganizationSlug },
    include: {
      auditEvents: {
        include: {
          actor: true,
          candidate: true,
          job: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
      memberships: {
        include: {
          user: {
            include: {
              _count: {
                select: {
                  managedJobs: true,
                  organizedInterviews: true,
                  sentEmails: true,
                },
              },
            },
          },
        },
        orderBy: [
          {
            role: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      },
      _count: {
        select: {
          candidates: true,
          jobs: true,
        },
      },
    },
  });

  if (!organization) {
    return buildEmptyPageData();
  }

  const counters = await getReliabilityCounters(organization.id);
  const emailProvider = getEmailProviderStatus();
  const googleConfigured = isGoogleCalendarConfigured(process.env.NEXT_PUBLIC_APP_URL);
  const openAiConfigured = canUseOpenAIProvider();
  const resumeStorage = getResumeStorageStatus();
  const members = organization.memberships.map((membership) => ({
    id: membership.id,
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: formatEnum(membership.role),
    status: formatEnum(membership.status),
    invitedAt: formatDate(membership.invitedAt),
    joinedAt: formatDate(membership.joinedAt),
    updatedAt: formatDate(membership.updatedAt),
    managedJobs: membership.user._count.managedJobs,
    interviews: membership.user._count.organizedInterviews,
    sentEmails: membership.user._count.sentEmails,
  }));

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: formatEnum(organization.plan),
      timezone: organization.timezone,
      createdAt: formatDate(organization.createdAt),
    },
    auditEvents: organization.auditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      actor: event.actor?.name ?? "System",
      context: event.job?.title ?? event.candidate?.name ?? event.entityId,
      createdAt: formatDateTime(event.createdAt),
    })),
    integrations: buildIntegrations({
      calendarConnections: counters.calendarConnections,
      emailProvider,
      failedEmails: counters.failedEmails,
      googleConfigured,
      openAiConfigured,
      queuedEmails: counters.queuedEmails,
      resumeStorage,
      syncedInterviews: counters.syncedInterviews,
    }),
    members,
    permissions: permissionMatrix,
    reliabilityChecks: buildReliabilityChecks(counters),
    stats: {
      activeAutomations: counters.activeAutomations,
      activeUsers: organization.memberships.filter((membership) => membership.status === "ACTIVE").length,
      calendarConnections: counters.calendarConnections,
      candidates: organization._count.candidates,
      disabledUsers: organization.memberships.filter((membership) => membership.status === "DISABLED").length,
      failedEmails: counters.failedEmails,
      invitedUsers: organization.memberships.filter((membership) => membership.status === "INVITED").length,
      jobs: organization._count.jobs,
      ownersAndAdmins: organization.memberships.filter(
        (membership) =>
          membership.status === "ACTIVE" && (membership.role === "OWNER" || membership.role === "ADMIN"),
      ).length,
      pendingResumeReview: counters.pendingResumeReview,
    },
  };
}
