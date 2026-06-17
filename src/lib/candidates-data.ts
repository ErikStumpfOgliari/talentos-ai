import { prisma } from "@/lib/prisma";
import { defaultOrganizationSlug } from "@/lib/organization";

export type CandidatesPageApplication = {
  id: string;
  jobTitle: string;
  stage: string;
  status: string;
  matchScore: number;
};

export type CandidatesPageCandidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  source: string;
  currentTitle: string;
  summary: string;
  yearsExperience: string;
  availability: string;
  salaryExpectation: string;
  skills: string[];
  education: string;
  resumeStatus: string;
  resumeCount: number;
  applications: CandidatesPageApplication[];
  latestScore: number;
  createdAt: string;
};

export type CandidatesPageJob = {
  id: string;
  title: string;
  status: string;
  department: string;
};

export type CandidatesPageData = {
  organizationName: string;
  candidates: CandidatesPageCandidate[];
  jobs: CandidatesPageJob[];
  stats: {
    total: number;
    activeApplications: number;
    parsedResumes: number;
    avgScore: number;
  };
};

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatSalary(value?: number | null, currency = "USD") {
  if (!value) {
    return "Open";
  }

  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${Math.round(value / 1000)}k`;
}

function formatEducation(
  education: {
    institution: string;
    degree: string | null;
    field: string | null;
  }[],
) {
  const firstEducation = education[0];

  if (!firstEducation) {
    return "Not provided";
  }

  return [firstEducation.degree, firstEducation.field, firstEducation.institution].filter(Boolean).join(", ");
}

function formatCandidateSummary(summary?: string | null) {
  if (!summary) {
    return "No profile summary yet.";
  }

  if (/OPENAI_API_KEY|OpenAI parsing|waiting for OpenAI/i.test(summary)) {
    return "Resume saved for local review. Add readable resume text if this PDF is scanned or image-only.";
  }

  return summary;
}

export async function getCandidatesPageData(organizationId?: string): Promise<CandidatesPageData> {
  const organization = await prisma.organization.findUnique({
    where: organizationId ? { id: organizationId } : { slug: defaultOrganizationSlug },
    include: {
      candidates: {
        include: {
          applications: {
            include: {
              job: true,
              stage: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          education: true,
          resumes: {
            orderBy: {
              createdAt: "desc",
            },
          },
          skills: {
            include: {
              skill: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      jobs: {
        where: {
          status: {
            in: ["ACTIVE", "DRAFT", "PAUSED"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!organization) {
    return {
      organizationName: "No organization",
      candidates: [],
      jobs: [],
      stats: {
        total: 0,
        activeApplications: 0,
        parsedResumes: 0,
        avgScore: 0,
      },
    };
  }

  const candidates = organization.candidates.map((candidate) => {
    const applications = candidate.applications.map((application) => ({
      id: application.id,
      jobTitle: application.job.title,
      stage: application.stage?.name ?? "Unassigned",
      status: formatEnum(application.status),
      matchScore: application.matchScore ?? 0,
    }));
    const latestResume = candidate.resumes[0];
    const latestScore = applications[0]?.matchScore ?? 0;

    return {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email ?? "No email",
      phone: candidate.phone ?? "No phone",
      location: candidate.location ?? "Remote",
      source: formatEnum(candidate.source),
      currentTitle: candidate.currentTitle ?? "Candidate",
      summary: formatCandidateSummary(candidate.summary),
      yearsExperience: candidate.yearsExperience ? `${candidate.yearsExperience} years` : "Not provided",
      availability: candidate.availability ?? "Unknown",
      salaryExpectation: formatSalary(candidate.salaryExpectation, candidate.currency),
      skills: candidate.skills.map(({ skill }) => skill.name),
      education: formatEducation(candidate.education),
      resumeStatus: latestResume ? formatEnum(latestResume.parserStatus) : "No resume",
      resumeCount: candidate.resumes.length,
      applications,
      latestScore,
      createdAt: formatDate(candidate.createdAt),
    };
  });

  const scoredApplications = organization.candidates.flatMap((candidate) =>
    candidate.applications.filter((application) => application.matchScore !== null),
  );

  return {
    organizationName: organization.name,
    candidates,
    jobs: organization.jobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: formatEnum(job.status),
      department: job.department ?? "General",
    })),
    stats: {
      total: candidates.length,
      activeApplications: organization.candidates.reduce((total, candidate) => total + candidate.applications.length, 0),
      parsedResumes: organization.candidates.reduce(
        (total, candidate) => total + candidate.resumes.filter((resume) => resume.parserStatus === "PARSED").length,
        0,
      ),
      avgScore: scoredApplications.length
        ? Math.round(
            scoredApplications.reduce((total, application) => total + (application.matchScore ?? 0), 0) /
              scoredApplications.length,
          )
        : 0,
    },
  };
}
