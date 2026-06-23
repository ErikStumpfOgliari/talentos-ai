import {
  CandidateSource,
  EmailStatus,
  ParserStatus,
  PipelineCategory,
  type Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildResumeProfileUpdatePreview,
  type ResumeProfileUpdatePreview,
} from "@/lib/resume-review";
import { canDownloadStoredResume } from "@/lib/resume-storage";

export type ApplicationsInboxFilters = {
  jobId?: string;
  parserStatus?: string;
  score?: string;
  source?: string;
  stageId?: string;
};

export type ApplicationsInboxItem = {
  id: string;
  appliedAt: string;
  candidate: {
    email: string;
    id: string;
    name: string;
    phone: string;
    title: string;
  };
  confirmationEmail: {
    provider: string;
    status: string;
  } | null;
  hasActiveSchedulingLink: boolean;
  interviewCount: number;
  job: {
    id: string;
    title: string;
  };
  latestResume: {
    downloadUrl: string | null;
    fileName: string;
    id: string;
    needsManualReview: boolean;
    parsedAt: string;
    preview: {
      educationCount: number;
      experienceCount: number;
      parserSource: string;
      skills: string[];
      summary: string;
      yearsExperience: number | null;
    };
    reviewedAt: string | null;
    reviewedBy: string | null;
    profileUpdate: ResumeProfileUpdatePreview | null;
    status: string;
    tone: string;
  } | null;
  matchScore: number;
  publicStatusPath: string | null;
  schedulingPath: string | null;
  source: string;
  stage: {
    category: string;
    id: string;
    name: string;
    tone: string;
  };
  summary: string;
  topSkills: string[];
  updatedAt: string;
};

export type ApplicationsInboxData = {
  applications: ApplicationsInboxItem[];
  filters: ApplicationsInboxFilters;
  jobs: {
    id: string;
    title: string;
  }[];
  manualReviewQueue: {
    applicationId: string;
    candidateId: string;
    candidateName: string;
    jobTitle: string;
    resumeFileName: string;
    status: string;
  }[];
  organizationName: string;
  rejectionTemplates: {
    id: string;
    name: string;
  }[];
  stages: {
    id: string;
    label: string;
  }[];
  stats: {
    averageScore: number;
    failedParsing: number;
    highScore: number;
    needsReview: number;
    newToday: number;
    queuedConfirmations: number;
    reviewedResumes: number;
    total: number;
  };
};

const stageTone: Record<string, string> = {
  APPLIED: "bg-sky-50 text-sky-700 ring-sky-200",
  SCREENING: "bg-amber-50 text-amber-700 ring-amber-200",
  INTERVIEW: "bg-violet-50 text-violet-700 ring-violet-200",
  OFFER: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  HIRED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const manualReviewStatuses = new Set<ParserStatus>([ParserStatus.NEEDS_REVIEW, ParserStatus.FAILED]);

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(date: Date, timezone = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function formatOptionalDateTime(date?: Date | null, timezone = "America/Sao_Paulo") {
  return date ? formatDateTime(date, timezone) : "Pending";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function countStructuredItems(value: unknown) {
  if (Array.isArray(value)) {
    return value.length;
  }

  return isRecord(value) ? 1 : 0;
}

function getParserTone(status: ParserStatus, reviewedAt?: Date | null) {
  if (reviewedAt) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === ParserStatus.PARSED) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === ParserStatus.FAILED) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (status === ParserStatus.NEEDS_REVIEW) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === ParserStatus.PARSING || status === ParserStatus.QUEUED) {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function needsManualReview(resume?: { parserStatus: ParserStatus; reviewedAt: Date | null } | null) {
  return Boolean(resume && manualReviewStatuses.has(resume.parserStatus) && !resume.reviewedAt);
}

function getResumePreview({
  parsedData,
  parserStatus,
  rawText,
}: {
  parsedData: unknown;
  parserStatus: ParserStatus;
  rawText: string | null;
}) {
  const parsed = isRecord(parsedData) ? parsedData : {};
  const summary =
    readText(parsed.summary) ??
    readText(parsed.message) ??
    (rawText ? rawText.slice(0, 260) : null) ??
    (parserStatus === ParserStatus.FAILED ? "Parsing failed and needs recruiter review." : "No parsed summary available yet.");
  const parserSource =
    readText(parsed.source) ??
    (parserStatus === ParserStatus.PARSED ? "resume-parser" : parserStatus === ParserStatus.FAILED ? "parser-error" : "manual-review");

  return {
    educationCount: countStructuredItems(parsed.education),
    experienceCount: countStructuredItems(parsed.experience),
    parserSource,
    skills: readStringArray(parsed.skills),
    summary,
    yearsExperience: readNumber(parsed.yearsExperience) ?? readNumber(parsed.experienceYears),
  };
}

function isEnumValue<T extends Record<string, string>>(enumObject: T, value?: string) {
  return Boolean(value && Object.values(enumObject).includes(value));
}

function getScoreWhere(score?: string): Prisma.ApplicationWhereInput {
  if (score === "high") {
    return {
      matchScore: {
        gte: 85,
      },
    };
  }

  if (score === "mid") {
    return {
      matchScore: {
        gte: 70,
        lt: 85,
      },
    };
  }

  if (score === "low") {
    return {
      OR: [
        {
          matchScore: {
            lt: 70,
          },
        },
        {
          matchScore: null,
        },
      ],
    };
  }

  return {};
}

function normalizeFilters(filters: ApplicationsInboxFilters): ApplicationsInboxFilters {
  return {
    jobId: filters.jobId || undefined,
    parserStatus: isEnumValue(ParserStatus, filters.parserStatus) ? filters.parserStatus : undefined,
    score: ["high", "mid", "low"].includes(filters.score ?? "") ? filters.score : undefined,
    source: isEnumValue(CandidateSource, filters.source) ? filters.source : undefined,
    stageId: filters.stageId || undefined,
  };
}

function getStartOfToday() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
}

export async function getApplicationsInboxData({
  filters,
  organizationId,
}: {
  filters: ApplicationsInboxFilters;
  organizationId: string;
}): Promise<ApplicationsInboxData> {
  const normalizedFilters = normalizeFilters(filters);
  const where: Prisma.ApplicationWhereInput = {
    organizationId,
    status: "ACTIVE",
    ...(normalizedFilters.jobId ? { jobId: normalizedFilters.jobId } : {}),
    ...(normalizedFilters.stageId ? { stageId: normalizedFilters.stageId } : {}),
    ...(normalizedFilters.source ? { source: normalizedFilters.source as CandidateSource } : {}),
    ...(normalizedFilters.parserStatus
      ? {
          candidate: {
            resumes: {
              some: {
                parserStatus: normalizedFilters.parserStatus as ParserStatus,
              },
            },
          },
        }
      : {}),
    ...getScoreWhere(normalizedFilters.score),
  };

  const [organization, applications, statsApplications] = await Promise.all([
    prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      include: {
        emailTemplates: {
          where: {
            active: true,
            trigger: "REJECTION_SENT",
          },
          orderBy: {
            name: "asc",
          },
        },
        jobs: {
          orderBy: {
            title: "asc",
          },
          select: {
            id: true,
            title: true,
          },
        },
        pipelineStages: {
          include: {
            job: {
              select: {
                title: true,
              },
            },
          },
          orderBy: [
            {
              job: {
                title: "asc",
              },
            },
            {
              position: "asc",
            },
          ],
        },
      },
    }),
    prisma.application.findMany({
      where,
      include: {
        candidate: {
          include: {
            resumes: {
              include: {
                reviewedBy: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
            skills: {
              include: {
                skill: true,
              },
              orderBy: {
                createdAt: "asc",
              },
              take: 6,
            },
          },
        },
        emailMessages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
        },
        interviews: true,
        job: true,
        schedulingLinks: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        stage: true,
      },
      orderBy: [
        {
          appliedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      take: 80,
    }),
    prisma.application.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
      },
      include: {
        candidate: {
          include: {
            resumes: {
              include: {
                reviewedBy: {
                  select: {
                    name: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        },
        emailMessages: {
          where: {
            trigger: "APPLICATION_RECEIVED",
          },
        },
      },
    }),
  ]);

  const timezone = organization?.timezone ?? "America/Sao_Paulo";
  const today = getStartOfToday();
  const scoredApplications = statsApplications.filter((application) => application.matchScore !== null);
  const averageScore = scoredApplications.length
    ? Math.round(scoredApplications.reduce((total, application) => total + (application.matchScore ?? 0), 0) / scoredApplications.length)
    : 0;

  const mappedApplications: ApplicationsInboxItem[] = applications.map((application) => {
    const latestResume = application.candidate.resumes[0];
    const latestSchedulingLink = application.schedulingLinks[0];
    const confirmationEmail =
      application.emailMessages.find((message) => message.trigger === "APPLICATION_RECEIVED") ?? null;
    const currentSkills = application.candidate.skills.map(({ skill }) => skill.name);
    const preview = latestResume
      ? getResumePreview({
          parsedData: latestResume.parsedData,
          parserStatus: latestResume.parserStatus,
          rawText: latestResume.rawText,
        })
      : null;

    return {
      id: application.id,
      appliedAt: formatDateTime(application.appliedAt, timezone),
      candidate: {
        email: application.candidate.email ?? "No email",
        id: application.candidateId,
        name: application.candidate.name,
        phone: application.candidate.phone ?? "No phone",
        title: application.candidate.currentTitle ?? "Candidate",
      },
      confirmationEmail: confirmationEmail
        ? {
            provider: confirmationEmail.provider ?? "local-outbox",
            status: formatEnum(confirmationEmail.status),
          }
        : null,
      hasActiveSchedulingLink: Boolean(latestSchedulingLink?.active),
      interviewCount: application.interviews.length,
      job: {
        id: application.jobId,
        title: application.job.title,
      },
      latestResume:
        latestResume && preview
          ? {
              downloadUrl: canDownloadStoredResume(latestResume.fileKey, latestResume.fileUrl)
                ? `/candidates/${application.candidateId}/resumes/${latestResume.id}`
                : null,
              fileName: latestResume.fileName,
              id: latestResume.id,
              needsManualReview: needsManualReview(latestResume),
              parsedAt: formatOptionalDateTime(latestResume.parsedAt, timezone),
              preview,
              profileUpdate: buildResumeProfileUpdatePreview({
                candidate: application.candidate,
                currentSkills,
                parsedData: latestResume.parsedData,
              }),
              reviewedAt: latestResume.reviewedAt ? formatDateTime(latestResume.reviewedAt, timezone) : null,
              reviewedBy: latestResume.reviewedBy?.name ?? null,
              status: formatEnum(latestResume.parserStatus),
              tone: getParserTone(latestResume.parserStatus, latestResume.reviewedAt),
            }
          : null,
      matchScore: application.matchScore ?? 0,
      publicStatusPath: application.publicToken ? `/careers/applications/${application.publicToken}` : null,
      schedulingPath: latestSchedulingLink ? `/schedule/${latestSchedulingLink.token}` : null,
      source: formatEnum(application.source),
      stage: {
        category: application.stage?.category ?? PipelineCategory.APPLIED,
        id: application.stageId ?? "",
        name: application.stage?.name ?? "Applied",
        tone: stageTone[application.stage?.category ?? "APPLIED"] ?? "bg-slate-100 text-slate-700 ring-slate-200",
      },
      summary: application.candidate.summary ?? "No profile summary extracted yet.",
      topSkills: currentSkills,
      updatedAt: formatDateTime(application.updatedAt, timezone),
    };
  });
  const manualReviewQueue = mappedApplications
    .filter((application) => application.latestResume?.needsManualReview)
    .slice(0, 6)
    .map((application) => ({
      applicationId: application.id,
      candidateId: application.candidate.id,
      candidateName: application.candidate.name,
      jobTitle: application.job.title,
      resumeFileName: application.latestResume?.fileName ?? "Resume",
      status: application.latestResume?.status ?? "Needs review",
    }));

  return {
    applications: mappedApplications,
    filters: normalizedFilters,
    jobs: organization?.jobs ?? [],
    manualReviewQueue,
    organizationName: organization?.name ?? "No organization",
    rejectionTemplates:
      organization?.emailTemplates.map((template) => ({
        id: template.id,
        name: template.name,
      })) ?? [],
    stages:
      organization?.pipelineStages.map((stage) => ({
        id: stage.id,
        label: `${stage.job.title} - ${stage.name}`,
      })) ?? [],
    stats: {
      averageScore,
      failedParsing: statsApplications.filter((application) => application.candidate.resumes[0]?.parserStatus === ParserStatus.FAILED).length,
      highScore: statsApplications.filter((application) => (application.matchScore ?? 0) >= 85).length,
      needsReview: statsApplications.filter((application) => needsManualReview(application.candidate.resumes[0])).length,
      newToday: statsApplications.filter((application) => application.appliedAt >= today).length,
      queuedConfirmations: statsApplications.filter((application) =>
        application.emailMessages.some((message) => message.status === EmailStatus.QUEUED),
      ).length,
      reviewedResumes: statsApplications.filter((application) => Boolean(application.candidate.resumes[0]?.reviewedAt)).length,
      total: statsApplications.length,
    },
  };
}
