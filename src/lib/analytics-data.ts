import { defaultOrganizationSlug } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import type { DashboardAnalytics } from "@/lib/types";

type PipelineCategory = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";

const stageOrder: PipelineCategory[] = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

const stageLabel: Record<PipelineCategory, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

const stageColor: Record<PipelineCategory, string> = {
  APPLIED: "bg-sky-500",
  SCREENING: "bg-amber-500",
  INTERVIEW: "bg-violet-500",
  OFFER: "bg-emerald-500",
  HIRED: "bg-emerald-700",
  REJECTED: "bg-rose-500",
};

export type AnalyticsFunnelStage = {
  category: PipelineCategory;
  label: string;
  count: number;
  share: number;
  avgDaysInStage: number;
  color: string;
};

export type AnalyticsJobPerformance = {
  id: string;
  title: string;
  department: string;
  status: string;
  openings: number;
  applications: number;
  interviews: number;
  offers: number;
  hired: number;
  rejected: number;
  avgScore: number;
  avgPipelineDays: number;
  conversionRate: number;
};

export type AnalyticsSourceMetric = {
  source: string;
  candidates: number;
  applications: number;
  avgScore: number;
};

export type AnalyticsPageData = {
  organizationName: string;
  summary: {
    openRoles: number;
    totalCandidates: number;
    activeApplications: number;
    avgMatchScore: number;
    interviewRate: number;
    offerRate: number;
    hireRate: number;
    avgPipelineDays: number;
    avgTimeToHireDays: number;
  };
  dashboard: DashboardAnalytics;
  funnel: AnalyticsFunnelStage[];
  jobPerformance: AnalyticsJobPerformance[];
  sourceMetrics: AnalyticsSourceMetric[];
  resumeParser: {
    parsed: number;
    needsReview: number;
    failed: number;
    total: number;
  };
};

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function daysBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / 86_400_000);
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percent(part: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function formatScore(value: number) {
  return `${Math.round(value)}%`;
}

function formatDays(value: number) {
  return `${Math.round(value)}d`;
}

function buildEmptyAnalytics(): AnalyticsPageData {
  return {
    organizationName: "No organization",
    summary: {
      openRoles: 0,
      totalCandidates: 0,
      activeApplications: 0,
      avgMatchScore: 0,
      interviewRate: 0,
      offerRate: 0,
      hireRate: 0,
      avgPipelineDays: 0,
      avgTimeToHireDays: 0,
    },
    dashboard: {
      metrics: [
        { label: "Open roles", value: "0", detail: "0 active requisitions", tone: "text-sky-700" },
        { label: "Candidates", value: "0", detail: "0 active applications", tone: "text-emerald-700" },
        { label: "Avg. match score", value: "0%", detail: "0 scored applications", tone: "text-violet-700" },
        { label: "Pipeline time", value: "0d", detail: "Average active pipeline age", tone: "text-amber-700" },
      ],
      rates: [
        { label: "Screen rate", value: 0, color: "bg-sky-500" },
        { label: "Interview rate", value: 0, color: "bg-violet-500" },
        { label: "Offer rate", value: 0, color: "bg-emerald-500" },
      ],
      resumeParser: [
        { label: "Parsed", value: 0, color: "text-emerald-700" },
        { label: "Needs review", value: 0, color: "text-amber-700" },
        { label: "Failed extraction", value: 0, color: "text-rose-700" },
      ],
    },
    funnel: stageOrder.map((category) => ({
      category,
      label: stageLabel[category],
      count: 0,
      share: 0,
      avgDaysInStage: 0,
      color: stageColor[category],
    })),
    jobPerformance: [],
    sourceMetrics: [],
    resumeParser: {
      parsed: 0,
      needsReview: 0,
      failed: 0,
      total: 0,
    },
  };
}

function getApplicationCategory(application: {
  status: string;
  stage: {
    category: string;
  } | null;
}): PipelineCategory {
  if (application.status === "HIRED") {
    return "HIRED";
  }

  if (application.status === "REJECTED") {
    return "REJECTED";
  }

  return (application.stage?.category as PipelineCategory | undefined) ?? "APPLIED";
}

export async function getAnalyticsData(): Promise<AnalyticsPageData> {
  const organization = await prisma.organization.findUnique({
    where: {
      slug: defaultOrganizationSlug,
    },
    include: {
      applications: {
        include: {
          candidate: true,
          interviews: true,
          job: true,
          stage: true,
        },
      },
      candidates: {
        include: {
          applications: true,
        },
      },
      jobs: {
        include: {
          applications: {
            include: {
              interviews: true,
              stage: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      resumes: true,
    },
  });

  if (!organization) {
    return buildEmptyAnalytics();
  }

  const now = new Date();
  const applications = organization.applications;
  const activeApplications = applications.filter((application) => application.status === "ACTIVE");
  const scoredApplications = applications.filter((application) => application.matchScore !== null);
  const totalApplications = applications.length;
  const avgMatchScore = Math.round(average(scoredApplications.map((application) => application.matchScore ?? 0)));
  const interviewApplications = applications.filter(
    (application) => application.interviews.length > 0 || getApplicationCategory(application) === "INTERVIEW",
  );
  const offerApplications = applications.filter((application) => getApplicationCategory(application) === "OFFER");
  const hiredApplications = applications.filter((application) => application.status === "HIRED" || application.hiredAt);
  const screenedApplications = applications.filter(
    (application) =>
      getApplicationCategory(application) === "SCREENING" ||
      getApplicationCategory(application) === "INTERVIEW" ||
      getApplicationCategory(application) === "OFFER" ||
      getApplicationCategory(application) === "HIRED",
  );
  const activePipelineDays = activeApplications.map((application) => daysBetween(application.appliedAt, now));
  const timeToHireDays = hiredApplications
    .filter((application) => application.hiredAt)
    .map((application) => daysBetween(application.appliedAt, application.hiredAt ?? now));
  const avgPipelineDays = Math.round(average(activePipelineDays));
  const avgTimeToHireDays = Math.round(average(timeToHireDays));

  const funnel = stageOrder.map((category) => {
    const stageApplications = applications.filter((application) => {
      return getApplicationCategory(application) === category;
    });

    return {
      category,
      label: stageLabel[category],
      count: stageApplications.length,
      share: percent(stageApplications.length, totalApplications),
      avgDaysInStage: Math.round(average(stageApplications.map((application) => daysBetween(application.stageEnteredAt, now)))),
      color: stageColor[category],
    };
  });

  const jobPerformance = organization.jobs.map((job) => {
    const jobApplications = job.applications;
    const jobScoredApplications = jobApplications.filter((application) => application.matchScore !== null);
    const jobInterviews = jobApplications.reduce((total, application) => total + application.interviews.length, 0);
    const jobOffers = jobApplications.filter((application) => getApplicationCategory(application) === "OFFER").length;
    const jobHired = jobApplications.filter((application) => application.status === "HIRED").length;
    const jobRejected = jobApplications.filter((application) => application.status === "REJECTED").length;

    return {
      id: job.id,
      title: job.title,
      department: job.department ?? "General",
      status: formatEnum(job.status),
      openings: job.openings,
      applications: jobApplications.length,
      interviews: jobInterviews,
      offers: jobOffers,
      hired: jobHired,
      rejected: jobRejected,
      avgScore: Math.round(average(jobScoredApplications.map((application) => application.matchScore ?? 0))),
      avgPipelineDays: Math.round(average(jobApplications.map((application) => daysBetween(application.appliedAt, now)))),
      conversionRate: percent(jobHired, jobApplications.length),
    };
  });

  const sourceMetrics = Object.entries(
    organization.candidates.reduce<
      Record<
        string,
        {
          applications: number;
          candidates: number;
          scores: number[];
        }
      >
    >((sources, candidate) => {
      const source = formatEnum(candidate.source);
      sources[source] ??= {
        applications: 0,
        candidates: 0,
        scores: [],
      };
      sources[source].candidates += 1;
      sources[source].applications += candidate.applications.length;
      sources[source].scores.push(
        ...candidate.applications
          .filter((application) => application.matchScore !== null)
          .map((application) => application.matchScore ?? 0),
      );
      return sources;
    }, {}),
  )
    .map(([source, value]) => ({
      source,
      candidates: value.candidates,
      applications: value.applications,
      avgScore: Math.round(average(value.scores)),
    }))
    .sort((left, right) => right.candidates - left.candidates);

  const resumeParser = {
    parsed: organization.resumes.filter((resume) => resume.parserStatus === "PARSED").length,
    needsReview: organization.resumes.filter((resume) => resume.parserStatus === "NEEDS_REVIEW").length,
    failed: organization.resumes.filter((resume) => resume.parserStatus === "FAILED").length,
    total: organization.resumes.length,
  };

  return {
    organizationName: organization.name,
    summary: {
      openRoles: organization.jobs.filter((job) => job.status === "ACTIVE").length,
      totalCandidates: organization.candidates.length,
      activeApplications: activeApplications.length,
      avgMatchScore,
      interviewRate: percent(interviewApplications.length, totalApplications),
      offerRate: percent(offerApplications.length, totalApplications),
      hireRate: percent(hiredApplications.length, totalApplications),
      avgPipelineDays,
      avgTimeToHireDays,
    },
    dashboard: {
      metrics: [
        {
          label: "Open roles",
          value: String(organization.jobs.filter((job) => job.status === "ACTIVE").length),
          detail: `${organization.jobs.length} total requisitions`,
          tone: "text-sky-700",
        },
        {
          label: "Candidates",
          value: String(organization.candidates.length),
          detail: `${activeApplications.length} active applications`,
          tone: "text-emerald-700",
        },
        {
          label: "Avg. match score",
          value: formatScore(avgMatchScore),
          detail: `${scoredApplications.length} scored applications`,
          tone: "text-violet-700",
        },
        {
          label: "Pipeline time",
          value: formatDays(avgPipelineDays),
          detail: avgTimeToHireDays ? `${formatDays(avgTimeToHireDays)} avg time to hire` : "Average active pipeline age",
          tone: "text-amber-700",
        },
      ],
      rates: [
        { label: "Screen rate", value: percent(screenedApplications.length, totalApplications), color: "bg-sky-500" },
        { label: "Interview rate", value: percent(interviewApplications.length, totalApplications), color: "bg-violet-500" },
        { label: "Offer rate", value: percent(offerApplications.length, totalApplications), color: "bg-emerald-500" },
      ],
      resumeParser: [
        { label: "Parsed", value: resumeParser.parsed, color: "text-emerald-700" },
        { label: "Needs review", value: resumeParser.needsReview, color: "text-amber-700" },
        { label: "Failed extraction", value: resumeParser.failed, color: "text-rose-700" },
      ],
    },
    funnel,
    jobPerformance,
    sourceMetrics,
    resumeParser,
  };
}
