import { defaultOrganizationSlug } from "@/lib/organization";
import { previewCandidateMatch, type CandidateMatchExplanation } from "@/lib/candidate-matching";
import { prisma } from "@/lib/prisma";

export type MatchingPageJob = {
  id: string;
  title: string;
  department: string;
  status: string;
  location: string;
  candidateCount: number;
  avgScore: number;
};

export type MatchingPageCandidate = {
  id: string;
  name: string;
  currentTitle: string;
  location: string;
  source: string;
  yearsExperience: string;
  skills: string[];
  summary: string;
  score: number;
  stage: string;
  status: string;
  mode: string;
  isSaved: boolean;
  strengths: string[];
  gaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
};

export type MatchingPageData = {
  organizationName: string;
  selectedJob: MatchingPageJob | null;
  jobs: MatchingPageJob[];
  candidates: MatchingPageCandidate[];
  stats: {
    candidates: number;
    ranked: number;
    avgScore: number;
    topScore: number;
  };
};

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isMatchExplanation(value: unknown): value is CandidateMatchExplanation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const explanation = value as Partial<CandidateMatchExplanation>;
  return Array.isArray(explanation.strengths) && Array.isArray(explanation.gaps);
}

function mapJob(job: {
  id: string;
  title: string;
  department: string | null;
  status: string;
  location: string | null;
  applications: { matchScore: number | null }[];
}): MatchingPageJob {
  const scored = job.applications.filter((application) => application.matchScore !== null);

  return {
    id: job.id,
    title: job.title,
    department: job.department ?? "General",
    status: formatEnum(job.status),
    location: job.location ?? "Remote",
    candidateCount: job.applications.length,
    avgScore: scored.length
      ? Math.round(scored.reduce((total, application) => total + (application.matchScore ?? 0), 0) / scored.length)
      : 0,
  };
}

export async function getMatchingPageData(jobId?: string): Promise<MatchingPageData> {
  const organization = await prisma.organization.findUnique({
    where: {
      slug: defaultOrganizationSlug,
    },
    include: {
      jobs: {
        where: {
          status: {
            in: ["ACTIVE", "DRAFT", "PAUSED"],
          },
        },
        include: {
          applications: true,
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
    },
  });

  if (!organization) {
    return {
      organizationName: "No organization",
      selectedJob: null,
      jobs: [],
      candidates: [],
      stats: {
        candidates: 0,
        ranked: 0,
        avgScore: 0,
        topScore: 0,
      },
    };
  }

  const selectedJob =
    organization.jobs.find((job) => job.id === jobId) ??
    organization.jobs.find((job) => job.status === "ACTIVE") ??
    organization.jobs[0] ??
    null;

  if (!selectedJob) {
    return {
      organizationName: organization.name,
      selectedJob: null,
      jobs: [],
      candidates: [],
      stats: {
        candidates: 0,
        ranked: 0,
        avgScore: 0,
        topScore: 0,
      },
    };
  }

  const [job, candidates] = await Promise.all([
    prisma.job.findFirstOrThrow({
      where: {
        id: selectedJob.id,
        organizationId: organization.id,
      },
      include: {
        applications: true,
      },
    }),
    prisma.candidate.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        applications: {
          where: {
            jobId: selectedJob.id,
          },
          include: {
            stage: true,
          },
        },
        education: true,
        experience: true,
        resumes: {
          orderBy: {
            createdAt: "desc",
          },
          take: 2,
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
    }),
  ]);

  const mappedCandidates = candidates
    .map((candidate) => {
      const application = candidate.applications[0];
      const preview = previewCandidateMatch(job, candidate);
      const savedExplanation = isMatchExplanation(application?.matchExplanation) ? application.matchExplanation : null;
      const explanation = savedExplanation ?? preview.explanation;
      const score = application?.matchScore ?? preview.score;

      return {
        id: candidate.id,
        name: candidate.name,
        currentTitle: candidate.currentTitle ?? "Candidate",
        location: candidate.location ?? "Remote",
        source: formatEnum(candidate.source),
        yearsExperience: candidate.yearsExperience ? `${candidate.yearsExperience} years` : "Not provided",
        skills: candidate.skills.map(({ skill }) => skill.name),
        summary: candidate.summary ?? "No profile summary yet.",
        score,
        stage: application?.stage?.name ?? "Talent pool",
        status: application ? formatEnum(application.status) : "Not applied",
        mode: formatEnum(explanation.mode),
        isSaved: Boolean(application?.matchScore),
        strengths: explanation.strengths,
        gaps: explanation.gaps,
        matchedSkills: explanation.matchedSkills,
        missingSkills: explanation.missingSkills,
      };
    })
    .sort((left, right) => right.score - left.score);

  const savedScores = mappedCandidates.filter((candidate) => candidate.isSaved);

  return {
    organizationName: organization.name,
    selectedJob: mapJob(job),
    jobs: organization.jobs.map(mapJob),
    candidates: mappedCandidates,
    stats: {
      candidates: mappedCandidates.length,
      ranked: savedScores.length,
      avgScore: savedScores.length
        ? Math.round(savedScores.reduce((total, candidate) => total + candidate.score, 0) / savedScores.length)
        : 0,
      topScore: mappedCandidates[0]?.score ?? 0,
    },
  };
}
