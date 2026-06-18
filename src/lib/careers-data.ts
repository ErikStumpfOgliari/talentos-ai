import { ApplicationStatus, EmailTrigger, PipelineCategory } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PublicCareersJob = {
  applicationCount: number;
  department: string;
  description: string;
  employmentType: string;
  id: string;
  location: string;
  openings: number;
  organizationName: string;
  salaryRange: string;
  title: string;
  workMode: string;
};

export type PublicCareersData = {
  jobs: PublicCareersJob[];
  organizationName: string;
};

export type PublicJobApplicationData = {
  job: PublicCareersJob & {
    requirements: string[];
    responsibilities: string[];
  };
  organizationName: string;
};

export type PublicApplicationStatusData = {
  application: {
    appliedAt: string;
    candidateEmail: string;
    candidateName: string;
    confirmationEmail: {
      createdAt: string;
      provider: string;
      sentAt: string;
      status: string;
    } | null;
    jobDepartment: string;
    jobId: string;
    jobLocation: string;
    jobTitle: string;
    nextInterview: {
      meetingUrl: string | null;
      startsAt: string;
      title: string;
    } | null;
    resumeFileName: string;
    resumeStatus: string;
    stageName: string;
    statusDescription: string;
    statusLabel: string;
    statusTone: "emerald" | "rose" | "sky" | "slate" | "violet";
    timeline: {
      description: string;
      label: string;
      state: "complete" | "current" | "upcoming";
    }[];
    updatedAt: string;
  };
  organizationName: string;
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

function formatDate(date?: Date | null, timezone = "America/Sao_Paulo") {
  if (!date) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getStatusCopy({
  applicationStatus,
  stageCategory,
  stageName,
}: {
  applicationStatus: string;
  stageCategory?: string | null;
  stageName?: string | null;
}) {
  if (applicationStatus === ApplicationStatus.REJECTED || stageCategory === PipelineCategory.REJECTED) {
    return {
      description: "The recruiting team has closed this application.",
      label: "Application closed",
      tone: "rose" as const,
    };
  }

  if (applicationStatus === ApplicationStatus.HIRED || stageCategory === PipelineCategory.HIRED) {
    return {
      description: "The hiring team marked this process as hired.",
      label: "Hired",
      tone: "emerald" as const,
    };
  }

  if (stageCategory === PipelineCategory.OFFER) {
    return {
      description: "Your application reached offer review with the hiring team.",
      label: "Offer stage",
      tone: "violet" as const,
    };
  }

  if (stageCategory === PipelineCategory.INTERVIEW) {
    return {
      description: "The team is coordinating or reviewing interview steps.",
      label: "Interview stage",
      tone: "sky" as const,
    };
  }

  if (stageCategory === PipelineCategory.SCREENING) {
    return {
      description: "A recruiter is reviewing your profile against the role.",
      label: "Recruiter review",
      tone: "sky" as const,
    };
  }

  return {
    description: stageName ? `Your application is currently in ${stageName}.` : "Your application was received and is waiting for recruiter review.",
    label: "Application received",
    tone: "emerald" as const,
  };
}

function getTimelineState(index: number, currentIndex: number) {
  if (index < currentIndex) {
    return "complete" as const;
  }

  if (index === currentIndex) {
    return "current" as const;
  }

  return "upcoming" as const;
}

function getTimeline({
  applicationStatus,
  stageCategory,
}: {
  applicationStatus: string;
  stageCategory?: string | null;
}) {
  const currentIndex =
    applicationStatus === ApplicationStatus.REJECTED ||
    applicationStatus === ApplicationStatus.HIRED ||
    stageCategory === PipelineCategory.REJECTED ||
    stageCategory === PipelineCategory.HIRED ||
    stageCategory === PipelineCategory.OFFER
      ? 3
      : stageCategory === PipelineCategory.INTERVIEW
        ? 2
        : stageCategory === PipelineCategory.SCREENING
          ? 1
          : 0;

  return [
    {
      description: "Resume and profile received.",
      label: "Applied",
    },
    {
      description: "Recruiter reviews fit and requirements.",
      label: "Review",
    },
    {
      description: "Interviews or assessments are coordinated.",
      label: "Interview",
    },
    {
      description: "Final decision or offer step.",
      label: "Decision",
    },
  ].map((step, index) => ({
    ...step,
    state: getTimelineState(index, currentIndex),
  }));
}

function mapPublicJob(job: {
  _count: {
    applications: number;
  };
  currency: string;
  department: string | null;
  description: string;
  employmentType: string;
  id: string;
  location: string | null;
  openings: number;
  salaryMax: number | null;
  salaryMin: number | null;
  title: string;
  workMode: string;
  organization?: {
    name: string;
  };
}): PublicCareersJob {
  return {
    applicationCount: job._count.applications,
    department: job.department ?? "General",
    description: job.description,
    employmentType: formatEnum(job.employmentType),
    id: job.id,
    location: job.location ?? "Remote",
    openings: job.openings,
    organizationName: job.organization?.name ?? "Aptelys",
    salaryRange: formatSalary(job.salaryMin, job.salaryMax, job.currency),
    title: job.title,
    workMode: formatEnum(job.workMode),
  };
}

export async function getPublicCareersData(): Promise<PublicCareersData> {
  const jobs = await prisma.job.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  return {
    jobs: jobs.map(mapPublicJob),
    organizationName: "Aptelys Careers",
  };
}

export async function getPublicJobApplicationData(jobId: string): Promise<PublicJobApplicationData | null> {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      status: "ACTIVE",
    },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  return {
    job: {
      ...mapPublicJob(job),
      requirements: readStringArray(job.requirements),
      responsibilities: readStringArray(job.responsibilities),
    },
    organizationName: job.organization.name,
  };
}

export async function getPublicApplicationStatusData(publicToken: string): Promise<PublicApplicationStatusData | null> {
  if (!publicToken) {
    return null;
  }

  const application = await prisma.application.findFirst({
    where: {
      publicToken,
    },
    include: {
      candidate: {
        include: {
          resumes: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
      emailMessages: {
        where: {
          trigger: EmailTrigger.APPLICATION_RECEIVED,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      interviews: {
        where: {
          startsAt: {
            gte: new Date(),
          },
        },
        orderBy: {
          startsAt: "asc",
        },
        take: 1,
      },
      job: true,
      organization: true,
      stage: true,
    },
  });

  if (!application) {
    return null;
  }

  const latestResume = application.candidate.resumes[0];
  const confirmationEmail = application.emailMessages[0];
  const statusCopy = getStatusCopy({
    applicationStatus: application.status,
    stageCategory: application.stage?.category,
    stageName: application.stage?.name,
  });
  const nextInterview = application.interviews[0];

  return {
    application: {
      appliedAt: formatDate(application.appliedAt, application.organization.timezone),
      candidateEmail: application.candidate.email ?? "No email",
      candidateName: application.candidate.name,
      confirmationEmail: confirmationEmail
        ? {
            createdAt: formatDate(confirmationEmail.createdAt, application.organization.timezone),
            provider: confirmationEmail.provider ?? "local-outbox",
            sentAt: formatDate(confirmationEmail.sentAt, application.organization.timezone),
            status: formatEnum(confirmationEmail.status),
          }
        : null,
      jobDepartment: application.job.department ?? "General",
      jobId: application.jobId,
      jobLocation: application.job.location ?? "Remote",
      jobTitle: application.job.title,
      nextInterview: nextInterview
        ? {
            meetingUrl: nextInterview.meetingUrl,
            startsAt: formatDate(nextInterview.startsAt, nextInterview.timezone),
            title: nextInterview.title,
          }
        : null,
      resumeFileName: latestResume?.fileName ?? "Resume received",
      resumeStatus: latestResume ? formatEnum(latestResume.parserStatus) : "Pending",
      stageName: application.stage?.name ?? "Applied",
      statusDescription: statusCopy.description,
      statusLabel: statusCopy.label,
      statusTone: statusCopy.tone,
      timeline: getTimeline({
        applicationStatus: application.status,
        stageCategory: application.stage?.category,
      }),
      updatedAt: formatDate(application.updatedAt, application.organization.timezone),
    },
    organizationName: application.organization.name,
  };
}
