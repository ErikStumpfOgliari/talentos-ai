import {
  candidates as demoCandidates,
  emailTemplates as demoEmailTemplates,
  initialPipeline as demoInitialPipeline,
  interviews as demoInterviews,
  jobs as demoJobs,
  pipelineStages as demoPipelineStages,
} from "@/lib/demo-data";
import type { Candidate, DashboardData, EmailTemplate, Interview, Job, PipelineStage } from "@/lib/types";
import { getAnalyticsData } from "@/lib/analytics-data";

export const demoDashboardData: DashboardData = {
  pipelineStages: demoPipelineStages,
  candidates: demoCandidates,
  initialPipeline: demoInitialPipeline,
  jobs: demoJobs,
  interviews: demoInterviews,
  emailTemplates: demoEmailTemplates,
  analytics: {
    metrics: [
      { label: "Open roles", value: "3", detail: "3 total requisitions", tone: "text-sky-700" },
      { label: "Candidates", value: "5", detail: "5 active applications", tone: "text-emerald-700" },
      { label: "Avg. match score", value: "87%", detail: "5 scored applications", tone: "text-violet-700" },
      { label: "Pipeline time", value: "21d", detail: "Average active pipeline age", tone: "text-amber-700" },
    ],
    rates: [
      { label: "Screen rate", value: 60, color: "bg-sky-500" },
      { label: "Interview rate", value: 40, color: "bg-violet-500" },
      { label: "Offer rate", value: 20, color: "bg-emerald-500" },
    ],
    resumeParser: [
      { label: "Parsed", value: 5, color: "text-emerald-700" },
      { label: "Needs review", value: 0, color: "text-amber-700" },
      { label: "Failed extraction", value: 0, color: "text-rose-700" },
    ],
  },
};

const stageAccent: Record<string, string> = {
  APPLIED: "bg-sky-500",
  SCREENING: "bg-amber-500",
  INTERVIEW: "bg-violet-500",
  OFFER: "bg-emerald-500",
  HIRED: "bg-emerald-700",
  REJECTED: "bg-rose-500",
};

function formatSource(source: string) {
  return source
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSalary(value?: number | null, currency = "USD") {
  if (!value) {
    return "Open";
  }

  const symbol = currency === "USD" ? "$" : currency;
  return `${symbol}${Math.round(value / 1000)}k`;
}

function buildCandidate(candidate: {
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
  skills: { skill: { name: string } }[];
  education: { degree: string | null; field: string | null; institution: string }[];
}): Candidate {
  const education = candidate.education[0];
  const educationLabel = education
    ? [education.degree, education.field, education.institution].filter(Boolean).join(", ")
    : "Not provided";

  return {
    id: candidate.id,
    name: candidate.name,
    role: candidate.currentTitle ?? "Candidate",
    location: candidate.location ?? "Remote",
    email: candidate.email ?? "No email",
    phone: candidate.phone ?? "No phone",
    source: formatSource(candidate.source),
    score: 0,
    availability: candidate.availability ?? "Unknown",
    salary: formatSalary(candidate.salaryExpectation, candidate.currency),
    experience: candidate.yearsExperience ? `${candidate.yearsExperience} years` : "Not provided",
    education: educationLabel,
    summary: candidate.summary ?? "No summary extracted yet.",
    skills: candidate.skills.map(({ skill }) => skill.name),
    strengths: ["Structured profile parsed from database", "Ready for AI ranking workflow"],
    risks: ["Needs recruiter review before final decision"],
  };
}

function buildJob(job: {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  status: string;
  openings: number;
  applications: { matchScore: number | null }[];
  hiringManager: { name: string } | null;
}): Job {
  const scored = job.applications.filter((application) => application.matchScore !== null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((total, application) => total + (application.matchScore ?? 0), 0) / scored.length)
    : 0;

  return {
    id: job.id,
    title: job.title,
    department: job.department ?? "General",
    location: job.location ?? "Remote",
    status: job.status === "ACTIVE" ? "Active" : job.status === "DRAFT" ? "Draft" : "Paused",
    openings: job.openings,
    candidates: job.applications.length,
    avgScore,
    hiringManager: job.hiringManager?.name ?? "Unassigned",
  };
}

function formatInterviewTime(startsAt: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(startsAt);
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!process.env.DATABASE_URL) {
    return demoDashboardData;
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const organization = await prisma.organization.findUnique({
      where: { slug: process.env.DEFAULT_ORGANIZATION_SLUG ?? "northstar-recruiting" },
      include: {
        candidates: {
          include: {
            education: true,
            skills: {
              include: {
                skill: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        emailTemplates: {
          include: {
            messages: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        interviews: {
          include: {
            candidate: true,
            job: true,
          },
          orderBy: {
            startsAt: "asc",
          },
          take: 3,
        },
        jobs: {
          include: {
            applications: true,
            hiringManager: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!organization) {
      return demoDashboardData;
    }

    const analytics = await getAnalyticsData();

    const activeJob = await prisma.job.findFirst({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
      },
      include: {
        pipelineStages: {
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
                    },
                  },
                },
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
      orderBy: {
        createdAt: "asc",
      },
    });

    const pipelineStages: PipelineStage[] =
      activeJob?.pipelineStages.map((stage) => ({
        id: stage.id,
        title: stage.name,
        accent: stageAccent[stage.category] ?? "bg-slate-500",
      })) ?? demoPipelineStages;

    const initialPipeline =
      activeJob?.pipelineStages.reduce<Record<string, string[]>>((pipeline, stage) => {
        pipeline[stage.id] = stage.applications.map((application) => application.candidateId);
        return pipeline;
      }, {}) ?? demoInitialPipeline;

    const scoreByCandidate = new Map<string, number>();
    activeJob?.pipelineStages.forEach((stage) => {
      stage.applications.forEach((application) => {
        scoreByCandidate.set(application.candidateId, application.matchScore ?? 0);
      });
    });

    const candidates: Candidate[] = organization.candidates.map((candidate) => ({
      ...buildCandidate(candidate),
      score: scoreByCandidate.get(candidate.id) ?? 0,
    }));

    const jobs: Job[] = organization.jobs.map(buildJob);

    const interviews: Interview[] = organization.interviews.map((interview) => ({
      id: interview.id,
      candidate: interview.candidate.name,
      role: interview.job.title,
      time: formatInterviewTime(interview.startsAt),
      type: interview.type
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    }));

    const emailTemplates: EmailTemplate[] = organization.emailTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      trigger: template.trigger
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      sent: template.messages.length,
    }));

    return {
      pipelineStages,
      candidates,
      initialPipeline,
      jobs,
      interviews,
      emailTemplates,
      analytics: analytics.dashboard,
    };
  } catch {
    return demoDashboardData;
  }
}
