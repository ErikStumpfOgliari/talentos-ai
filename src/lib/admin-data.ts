import { defaultOrganizationSlug } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

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

export type AdminPageData = {
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    timezone: string;
    createdAt: string;
  };
  members: AdminMember[];
  auditEvents: AdminAuditEvent[];
  permissions: AdminPermission[];
  stats: {
    activeUsers: number;
    invitedUsers: number;
    disabledUsers: number;
    ownersAndAdmins: number;
    jobs: number;
    candidates: number;
  };
};

export const permissionMatrix: AdminPermission[] = [
  {
    role: "Owner",
    scope: "Full workspace control",
    users: true,
    recruiting: true,
    automation: true,
    analytics: true,
    settings: true,
  },
  {
    role: "Admin",
    scope: "Operations and team management",
    users: true,
    recruiting: true,
    automation: true,
    analytics: true,
    settings: true,
  },
  {
    role: "Recruiter",
    scope: "Pipeline execution",
    users: false,
    recruiting: true,
    automation: true,
    analytics: true,
    settings: false,
  },
  {
    role: "Hiring Manager",
    scope: "Role and interview review",
    users: false,
    recruiting: true,
    automation: false,
    analytics: true,
    settings: false,
  },
  {
    role: "Viewer",
    scope: "Read-only visibility",
    users: false,
    recruiting: false,
    automation: false,
    analytics: true,
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

export async function getAdminPageData(): Promise<AdminPageData> {
  const organization = await prisma.organization.findUnique({
    where: {
      slug: defaultOrganizationSlug,
    },
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
    return {
      organization: {
        id: "",
        name: "No organization",
        slug: defaultOrganizationSlug,
        plan: "Free",
        timezone: "America/Sao_Paulo",
        createdAt: "Pending",
      },
      members: [],
      auditEvents: [],
      permissions: permissionMatrix,
      stats: {
        activeUsers: 0,
        invitedUsers: 0,
        disabledUsers: 0,
        ownersAndAdmins: 0,
        jobs: 0,
        candidates: 0,
      },
    };
  }

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
    members,
    auditEvents: organization.auditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      actor: event.actor?.name ?? "System",
      context: event.job?.title ?? event.candidate?.name ?? event.entityId,
      createdAt: formatDateTime(event.createdAt),
    })),
    permissions: permissionMatrix,
    stats: {
      activeUsers: organization.memberships.filter((membership) => membership.status === "ACTIVE").length,
      invitedUsers: organization.memberships.filter((membership) => membership.status === "INVITED").length,
      disabledUsers: organization.memberships.filter((membership) => membership.status === "DISABLED").length,
      ownersAndAdmins: organization.memberships.filter(
        (membership) =>
          membership.status === "ACTIVE" && (membership.role === "OWNER" || membership.role === "ADMIN"),
      ).length,
      jobs: organization._count.jobs,
      candidates: organization._count.candidates,
    },
  };
}
