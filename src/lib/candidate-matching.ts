import { createHash } from "node:crypto";
import OpenAI from "openai";
import {
  ApplicationStatus,
  EmbeddingEntity,
  type Prisma,
} from "@/generated/prisma/client";
import { canUseOpenAIProvider } from "@/lib/ai-provider";
import { prisma } from "@/lib/prisma";

const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

const stopWords = new Set([
  "and",
  "are",
  "com",
  "das",
  "dos",
  "for",
  "from",
  "para",
  "por",
  "que",
  "the",
  "uma",
  "with",
]);

const knownSkills = [
  "React",
  "Next.js",
  "Node.js",
  "NestJS",
  "Express",
  "TypeScript",
  "JavaScript",
  "Python",
  "PostgreSQL",
  "Prisma",
  "Docker",
  "AWS",
  "Redis",
  "Queues",
  "OpenAI",
  "Embeddings",
  "Vector Search",
  "SaaS architecture",
  "Product engineering",
  "Tailwind",
  "Design Systems",
  "Accessibility",
  "Charts",
  "Testing",
  "Analytics",
  "Automation",
  "ATS Ops",
  "Process Design",
];

type JobForMatching = {
  id: string;
  organizationId: string;
  title: string;
  department: string | null;
  location: string | null;
  description: string;
  requirements: Prisma.JsonValue | null;
  responsibilities: Prisma.JsonValue | null;
};

type CandidateForMatching = {
  id: string;
  organizationId: string;
  name: string;
  currentTitle: string | null;
  summary: string | null;
  yearsExperience: number | null;
  source: string;
  skills: { skill: { name: string } }[];
  education: {
    degree: string | null;
    field: string | null;
    institution: string;
  }[];
  experience: {
    company: string;
    title: string;
    description: string | null;
  }[];
  resumes: {
    rawText: string | null;
    parsedData: Prisma.JsonValue | null;
  }[];
};

export type MatchMode = "local" | "openai-embeddings" | "local-fallback";

export type CandidateMatchExplanation = {
  mode: MatchMode;
  model?: string;
  generatedAt: string;
  strengths: string[];
  gaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
  signals: {
    skillCoverage: number;
    semanticSimilarity: number;
    experienceFit: number;
    titleFit: number;
    profileCompleteness: number;
    desiredYears: number;
  };
};

export type CandidateMatchResult = {
  score: number;
  explanation: CandidateMatchExplanation;
};

export type CandidateMatchRecalculationResult = {
  applicationsUpdated: number;
  scores: {
    applicationId: string;
    jobId: string;
    jobTitle: string;
    previousScore: number | null;
    score: number;
  }[];
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

function normalizeSkill(value: string) {
  return normalizeText(value).replace(/[.\s]+/g, " ").trim();
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractJsonStrings(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(extractJsonStrings);
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap(extractJsonStrings);
  }

  return [];
}

function toTokenSet(text: string) {
  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  );
}

function overlapScore(leftText: string, rightText: string) {
  const left = toTokenSet(leftText);
  const right = toTokenSet(rightText);

  if (!left.size || !right.size) {
    return 0;
  }

  const matches = [...left].filter((token) => right.has(token)).length;
  return clamp(matches / Math.min(left.size, right.size));
}

function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function buildJobText(job: JobForMatching) {
  return [
    job.title,
    job.department,
    job.location,
    job.description,
    ...extractJsonStrings(job.requirements),
    ...extractJsonStrings(job.responsibilities),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCandidateText(candidate: CandidateForMatching) {
  return [
    candidate.name,
    candidate.currentTitle,
    candidate.summary,
    candidate.yearsExperience ? `${candidate.yearsExperience} years experience` : null,
    ...candidate.skills.map(({ skill }) => skill.name),
    ...candidate.education.map((education) =>
      [education.degree, education.field, education.institution].filter(Boolean).join(" "),
    ),
    ...candidate.experience.map((experience) =>
      [experience.title, experience.company, experience.description].filter(Boolean).join(" "),
    ),
    ...candidate.resumes.flatMap((resume) => [resume.rawText, ...extractJsonStrings(resume.parsedData)]),
  ]
    .filter(Boolean)
    .join("\n");
}

function inferRequiredSkills(job: JobForMatching) {
  const jobText = buildJobText(job);
  const normalizedJobText = normalizeSkill(jobText);
  const explicitRequirements = extractJsonStrings(job.requirements).map(normalizeSkill);

  const inferredKnownSkills = knownSkills
    .filter((skill) => normalizedJobText.includes(normalizeSkill(skill)))
    .map(normalizeSkill);

  return unique([...explicitRequirements, ...inferredKnownSkills]);
}

function inferDesiredYears(jobText: string) {
  const match = normalizeText(jobText).match(/(\d+)\+?\s+(years|anos|yrs)/);

  if (match) {
    return Number(match[1]);
  }

  const normalized = normalizeText(jobText);

  if (/\b(principal|staff|lead)\b/.test(normalized)) {
    return 7;
  }

  if (/\bsenior\b/.test(normalized)) {
    return 5;
  }

  if (/\b(junior|jr)\b/.test(normalized)) {
    return 1;
  }

  return 3;
}

function getLocalSignals(job: JobForMatching, candidate: CandidateForMatching) {
  const jobText = buildJobText(job);
  const candidateText = buildCandidateText(candidate);
  const requiredSkills = inferRequiredSkills(job);
  const candidateSkills = candidate.skills.map(({ skill }) => normalizeSkill(skill.name));
  const matchedSkills = requiredSkills.filter((skill) =>
    candidateSkills.some((candidateSkill) => candidateSkill === skill || candidateSkill.includes(skill) || skill.includes(candidateSkill)),
  );
  const missingSkills = requiredSkills.filter((skill) => !matchedSkills.includes(skill));
  const skillCoverage = requiredSkills.length ? matchedSkills.length / requiredSkills.length : overlapScore(jobText, candidateText);
  const desiredYears = inferDesiredYears(jobText);
  const experienceFit = candidate.yearsExperience ? clamp(candidate.yearsExperience / desiredYears) : 0.35;
  const titleFit = candidate.currentTitle ? overlapScore(job.title, candidate.currentTitle) : 0;
  const semanticSimilarity = overlapScore(jobText, candidateText);
  const profileCompleteness = clamp(
    [
      candidate.summary,
      candidate.currentTitle,
      candidate.yearsExperience,
      candidate.skills.length,
      candidate.education.length,
      candidate.experience.length,
      candidate.resumes.length,
    ].filter(Boolean).length / 7,
  );

  return {
    candidateText,
    desiredYears,
    experienceFit,
    jobText,
    matchedSkills,
    missingSkills,
    profileCompleteness,
    semanticSimilarity,
    skillCoverage,
    titleFit,
  };
}

function formatSkill(skill: string) {
  const knownSkill = knownSkills.find((known) => normalizeSkill(known) === skill);
  return knownSkill ?? skill.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildStrengths({
  candidate,
  matchedSkills,
  experienceFit,
  semanticSimilarity,
  skillCoverage,
}: {
  candidate: CandidateForMatching;
  matchedSkills: string[];
  experienceFit: number;
  semanticSimilarity: number;
  skillCoverage: number;
}) {
  const strengths = [];

  if (matchedSkills.length) {
    strengths.push(`Skill overlap: ${matchedSkills.slice(0, 5).map(formatSkill).join(", ")}`);
  }

  if (candidate.yearsExperience && experienceFit >= 1) {
    strengths.push(`${candidate.yearsExperience} years of experience meets the role seniority`);
  }

  if (semanticSimilarity >= 0.3 || skillCoverage >= 0.5) {
    strengths.push("Profile language is aligned with the job description");
  }

  if (candidate.resumes.length) {
    strengths.push("Resume data is available for recruiter review");
  }

  return strengths.slice(0, 4);
}

function buildGaps({
  missingSkills,
  experienceFit,
  profileCompleteness,
}: {
  missingSkills: string[];
  experienceFit: number;
  profileCompleteness: number;
}) {
  const gaps = [];

  if (missingSkills.length) {
    gaps.push(`Validate missing requirements: ${missingSkills.slice(0, 4).map(formatSkill).join(", ")}`);
  }

  if (experienceFit < 0.75) {
    gaps.push("Experience level may need deeper screening");
  }

  if (profileCompleteness < 0.6) {
    gaps.push("Candidate profile needs more structured resume data");
  }

  return gaps.slice(0, 4);
}

function scoreFromSignals({
  experienceFit,
  profileCompleteness,
  semanticSimilarity,
  skillCoverage,
  titleFit,
}: {
  experienceFit: number;
  profileCompleteness: number;
  semanticSimilarity: number;
  skillCoverage: number;
  titleFit: number;
}) {
  return Math.round(
    100 *
      clamp(
        skillCoverage * 0.45 +
          semanticSimilarity * 0.25 +
          experienceFit * 0.15 +
          titleFit * 0.1 +
          profileCompleteness * 0.05,
      ),
  );
}

function buildLocalMatch(job: JobForMatching, candidate: CandidateForMatching, mode: MatchMode = "local"): CandidateMatchResult {
  const signals = getLocalSignals(job, candidate);
  const score = scoreFromSignals(signals);

  return {
    score,
    explanation: {
      mode,
      generatedAt: new Date().toISOString(),
      strengths: buildStrengths({
        candidate,
        matchedSkills: signals.matchedSkills,
        experienceFit: signals.experienceFit,
        semanticSimilarity: signals.semanticSimilarity,
        skillCoverage: signals.skillCoverage,
      }),
      gaps: buildGaps({
        missingSkills: signals.missingSkills,
        experienceFit: signals.experienceFit,
        profileCompleteness: signals.profileCompleteness,
      }),
      matchedSkills: signals.matchedSkills.map(formatSkill),
      missingSkills: signals.missingSkills.map(formatSkill),
      signals: {
        skillCoverage: Number(signals.skillCoverage.toFixed(2)),
        semanticSimilarity: Number(signals.semanticSimilarity.toFixed(2)),
        experienceFit: Number(signals.experienceFit.toFixed(2)),
        titleFit: Number(signals.titleFit.toFixed(2)),
        profileCompleteness: Number(signals.profileCompleteness.toFixed(2)),
        desiredYears: signals.desiredYears,
      },
    },
  };
}

function canUseOpenAIEmbeddings() {
  return canUseOpenAIProvider();
}

function contentHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function isVector(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

async function getOrCreateEmbedding({
  candidateId,
  content,
  entityType,
  jobId,
  organizationId,
}: {
  candidateId?: string;
  content: string;
  entityType: EmbeddingEntity;
  jobId?: string;
  organizationId: string;
}) {
  const hash = contentHash(content);
  const existing = await prisma.embedding.findFirst({
    where: {
      organizationId,
      entityType,
      candidateId,
      jobId,
      model: embeddingModel,
      contentHash: hash,
    },
  });

  if (existing && isVector(existing.vector)) {
    return existing.vector;
  }

  const client = new OpenAI();
  const response = await client.embeddings.create({
    model: embeddingModel,
    input: content.slice(0, 24000),
    encoding_format: "float",
  });
  const vector = response.data[0]?.embedding ?? [];

  await prisma.embedding.create({
    data: {
      organizationId,
      entityType,
      candidateId,
      jobId,
      model: embeddingModel,
      dimensions: vector.length,
      contentHash: hash,
      vector,
      metadata: {
        source: "candidate-matching",
        contentPreview: content.slice(0, 240),
      },
    },
  });

  return vector;
}

export function previewCandidateMatch(job: JobForMatching, candidate: CandidateForMatching) {
  return buildLocalMatch(job, candidate);
}

export async function scoreCandidateForJob(job: JobForMatching, candidate: CandidateForMatching): Promise<CandidateMatchResult> {
  const localMatch = buildLocalMatch(job, candidate);

  if (!canUseOpenAIEmbeddings()) {
    return localMatch;
  }

  const signals = getLocalSignals(job, candidate);

  try {
    const [jobVector, candidateVector] = await Promise.all([
      getOrCreateEmbedding({
        organizationId: job.organizationId,
        entityType: EmbeddingEntity.JOB_DESCRIPTION,
        jobId: job.id,
        content: signals.jobText,
      }),
      getOrCreateEmbedding({
        organizationId: candidate.organizationId,
        entityType: EmbeddingEntity.CANDIDATE_RESUME,
        candidateId: candidate.id,
        content: signals.candidateText,
      }),
    ]);

    const semanticSimilarity = clamp((cosineSimilarity(jobVector, candidateVector) + 1) / 2);
    const score = scoreFromSignals({
      ...signals,
      semanticSimilarity,
    });

    return {
      score,
      explanation: {
        ...localMatch.explanation,
        mode: "openai-embeddings",
        model: embeddingModel,
        signals: {
          ...localMatch.explanation.signals,
          semanticSimilarity: Number(semanticSimilarity.toFixed(2)),
        },
      },
    };
  } catch {
    return buildLocalMatch(job, candidate, "local-fallback");
  }
}

export async function recalculateCandidateApplicationMatches({
  candidateId,
  organizationId,
}: {
  candidateId: string;
  organizationId: string;
}): Promise<CandidateMatchRecalculationResult> {
  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId,
    },
    include: {
      applications: {
        where: {
          status: ApplicationStatus.ACTIVE,
        },
        include: {
          job: true,
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
  });

  if (!candidate) {
    throw new Error("Candidate not found for this organization.");
  }

  const scores: CandidateMatchRecalculationResult["scores"] = [];

  for (const application of candidate.applications) {
    const match = await scoreCandidateForJob(application.job, candidate);

    await prisma.application.update({
      where: {
        id: application.id,
      },
      data: {
        matchExplanation: match.explanation,
        matchScore: match.score,
      },
    });

    scores.push({
      applicationId: application.id,
      jobId: application.jobId,
      jobTitle: application.job.title,
      previousScore: application.matchScore,
      score: match.score,
    });
  }

  return {
    applicationsUpdated: scores.length,
    scores,
  };
}
