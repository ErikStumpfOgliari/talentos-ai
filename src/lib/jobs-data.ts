import { prisma } from "@/lib/prisma";
import { defaultOrganizationSlug } from "@/lib/organization";

export type JobsPageJob = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
  workMode: string;
  employmentType: string;
  openings: number;
  salaryRange: string;
  description: string;
  hiringManager: string;
  candidateCount: number;
  avgScore: number;
  stageCount: number;
  createdAt: string;
};

export type JobsPageManager = {
  id: string;
  name: string;
  email: string;
};

export type JobsPageData = {
  organizationName: string;
  jobs: JobsPageJob[];
  managers: JobsPageManager[];
  stats: {
    total: number;
    active: number;
    draft: number;
    paused: number;
    closed: number;
  };
};

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSalary(min?: number | null, max?: number | null, currency = "USD") {
  if (!min && !max) {
    return "Open range";
  }

  const symbol = currency === "USD" ? "$" : `${currency} `;
  const formatValue = (value: number) => `${symbol}${Math.round(value / 1000)}k`;

  if (min && max) {
    return `${formatValue(min)}-${formatValue(max)}`;
  }

  return min ? `From ${formatValue(min)}` : `Up to ${formatValue(max ?? 0)}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export async function getJobsPageData(): Promise<JobsPageData> {
  const organization = await prisma.organization.findUnique({
    where: {
      slug: defaultOrganizationSlug,
    },
    include: {
      jobs: {
        include: {
          applications: true,
          hiringManager: true,
          pipelineStages: true,
        },
        orderBy: [
          {
            status: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
      },
      memberships: {
        include: {
          user: true,
        },
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!organization) {
    return {
      organizationName: "No organization",
      jobs: [],
      managers: [],
      stats: {
        total: 0,
        active: 0,
        draft: 0,
        paused: 0,
        closed: 0,
      },
    };
  }

  const jobs = organization.jobs.map((job) => {
    const scoredApplications = job.applications.filter((application) => application.matchScore !== null);
    const avgScore = scoredApplications.length
      ? Math.round(
          scoredApplications.reduce((total, application) => total + (application.matchScore ?? 0), 0) /
            scoredApplications.length,
        )
      : 0;

    return {
      id: job.id,
      title: job.title,
      department: job.department ?? "General",
      location: job.location ?? "Remote",
      status: formatEnum(job.status),
      workMode: formatEnum(job.workMode),
      employmentType: formatEnum(job.employmentType),
      openings: job.openings,
      salaryRange: formatSalary(job.salaryMin, job.salaryMax, job.currency),
      description: job.description,
      hiringManager: job.hiringManager?.name ?? "Unassigned",
      candidateCount: job.applications.length,
      avgScore,
      stageCount: job.pipelineStages.length,
      createdAt: formatDate(job.createdAt),
    };
  });

  return {
    organizationName: organization.name,
    jobs,
    managers: organization.memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
    })),
    stats: {
      total: jobs.length,
      active: organization.jobs.filter((job) => job.status === "ACTIVE").length,
      draft: organization.jobs.filter((job) => job.status === "DRAFT").length,
      paused: organization.jobs.filter((job) => job.status === "PAUSED").length,
      closed: organization.jobs.filter((job) => job.status === "CLOSED").length,
    },
  };
}
