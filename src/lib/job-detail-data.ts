import type { Candidate, PipelineStage } from "@/lib/types";
import { prisma } from "@/lib/prisma";

const stageAccent: Record<string, string> = {
  APPLIED: "bg-sky-500",
  SCREENING: "bg-amber-500",
  INTERVIEW: "bg-violet-500",
  OFFER: "bg-emerald-500",
  HIRED: "bg-emerald-700",
  REJECTED: "bg-rose-500",
};

type MatchExplanation = {
  gaps?: unknown;
  strengths?: unknown;
};

export type JobDetailData = {
  organizationName: string;
  job: {
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
    requirements: string[];
    responsibilities: string[];
    hiringManager: string;
    createdBy: string;
    publishedAt: string;
  };
  stats: {
    candidates: number;
    avgScore: number;
    interviews: number;
    queuedEmails: number;
    activeApplications: number;
  };
  pipelineStages: PipelineStage[];
  initialPipeline: Record<string, string[]>;
  candidates: Candidate[];
  activity: {
    id: string;
    action: string;
    context: string;
    createdAt: string;
    actor: string;
  }[];
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

function formatDate(date?: Date | null) {
  if (!date) {
    return "Not published";
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

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readMatchExplanation(value: unknown): MatchExplanation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as MatchExplanation;
}

function formatCandidate(application: {
  candidate: {
    id: string;
    name: string;
    currentTitle: string | null;
    location: string | null;
    email: string | null;
    phone: string | null;
    source: string;
    yearsExperience: number | null;
    availability: string | null;
    salaryExpectation: number | null;
    currency: string;
    summary: string | null;
    education: { degree: string | null; field: string | null; institution: string }[];
    skills: { skill: { name: string } }[];
  };
  matchExplanation: unknown;
  matchScore: number | null;
  source: string;
}): Candidate {
  const { candidate } = application;
  const education = candidate.education[0];
  const educationLabel = education
    ? [education.degree, education.field, education.institution].filter(Boolean).join(", ")
    : "Not provided";
  const explanation = readMatchExplanation(application.matchExplanation);
  const strengths = readStringArray(explanation.strengths);
  const gaps = readStringArray(explanation.gaps);

  return {
    id: candidate.id,
    name: candidate.name,
    role: candidate.currentTitle ?? "Candidate",
    location: candidate.location ?? "Remote",
    email: candidate.email ?? "No email",
    phone: candidate.phone ?? "No phone",
    source: formatEnum(application.source || candidate.source),
    score: application.matchScore ?? 0,
    availability: candidate.availability ?? "Unknown",
    salary: formatSalary(candidate.salaryExpectation, null, candidate.currency),
    experience: candidate.yearsExperience ? `${candidate.yearsExperience} years` : "Not provided",
    education: educationLabel,
    summary: candidate.summary ?? "No summary extracted yet.",
    skills: candidate.skills.map(({ skill }) => skill.name),
    strengths: strengths.length ? strengths : ["Application is available for recruiter review"],
    risks: gaps.length ? gaps : ["No major gaps detected for this role"],
  };
}

export async function getJobDetailData({
  jobId,
  organizationId,
}: {
  jobId: string;
  organizationId: string;
}): Promise<JobDetailData | null> {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      organizationId,
    },
    include: {
      applications: {
        include: {
          candidate: {
            include: {
              education: true,
              skills: {
                include: {
                  skill: true,
                },
                orderBy: {
                  createdAt: "asc",
                },
              },
            },
          },
          emailMessages: true,
          interviews: true,
        },
        orderBy: [
          {
            pipelinePosition: "asc",
          },
          {
            stageEnteredAt: "asc",
          },
        ],
      },
      auditEvents: {
        include: {
          actor: true,
          candidate: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      },
      createdBy: true,
      hiringManager: true,
      organization: true,
      pipelineStages: {
        include: {
          applications: {
            include: {
              candidate: true,
            },
            orderBy: [
              {
                pipelinePosition: "asc",
              },
              {
                stageEnteredAt: "asc",
              },
            ],
          },
        },
        orderBy: {
          position: "asc",
        },
      },
    },
  });

  if (!job) {
    return null;
  }

  const scoredApplications = job.applications.filter((application) => application.matchScore !== null);
  const avgScore = scoredApplications.length
    ? Math.round(
        scoredApplications.reduce((total, application) => total + (application.matchScore ?? 0), 0) /
          scoredApplications.length,
      )
    : 0;

  const pipelineStages = job.pipelineStages.map((stage) => ({
    id: stage.id,
    title: stage.name,
    accent: stageAccent[stage.category] ?? "bg-slate-500",
  }));

  const initialPipeline = job.pipelineStages.reduce<Record<string, string[]>>((pipeline, stage) => {
    pipeline[stage.id] = stage.applications.map((application) => application.candidateId);
    return pipeline;
  }, {});

  return {
    organizationName: job.organization.name,
    job: {
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
      requirements: readStringArray(job.requirements),
      responsibilities: readStringArray(job.responsibilities),
      hiringManager: job.hiringManager?.name ?? "Unassigned",
      createdBy: job.createdBy?.name ?? "System",
      publishedAt: formatDate(job.publishedAt),
    },
    stats: {
      candidates: job.applications.length,
      avgScore,
      interviews: job.applications.reduce((total, application) => total + application.interviews.length, 0),
      queuedEmails: job.applications.reduce(
        (total, application) =>
          total + application.emailMessages.filter((message) => message.status === "QUEUED").length,
        0,
      ),
      activeApplications: job.applications.filter((application) => application.status === "ACTIVE").length,
    },
    pipelineStages,
    initialPipeline,
    candidates: job.applications.map(formatCandidate),
    activity: job.auditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      context: event.candidate?.name ?? event.entityId,
      createdAt: formatDateTime(event.createdAt),
      actor: event.actor?.name ?? "System",
    })),
  };
}
