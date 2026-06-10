import { prisma } from "@/lib/prisma";
import {
  recalculateCandidateApplicationMatches,
  type CandidateMatchRecalculationResult,
} from "@/lib/candidate-matching";
import type { ParsedResume } from "@/lib/resume-parser";

const scalarFieldLabels = {
  availability: "Availability",
  currency: "Currency",
  currentTitle: "Title",
  email: "Email",
  location: "Location",
  name: "Name",
  phone: "Phone",
  salaryExpectation: "Salary",
  summary: "Summary",
  yearsExperience: "Experience",
} as const;

export type ResumeScalarFieldKey = keyof typeof scalarFieldLabels;
export type ResumeReviewFieldKey = ResumeScalarFieldKey | "education" | "experience" | "skills";
export type ResumeApplyStatus = "applied" | "email-conflict" | "no-parsed-data" | "no-selection";

type CandidateSnapshot = {
  availability: string | null;
  currency: string;
  currentTitle: string | null;
  email: string | null;
  location: string | null;
  name: string;
  phone: string | null;
  salaryExpectation: number | null;
  summary: string | null;
  yearsExperience: number | null;
};

export type ResumeProfileUpdatePreview = {
  canApply: boolean;
  educationCount: number;
  experienceCount: number;
  fields: {
    currentValue: string;
    key: ResumeScalarFieldKey;
    label: string;
    parsedValue: string;
  }[];
  skills: string[];
};

const selectableResumeFields = new Set<ResumeReviewFieldKey>([
  ...Object.keys(scalarFieldLabels),
  "education",
  "experience",
  "skills",
] as ResumeReviewFieldKey[]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readParsedText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readParsedNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

function readParsedStringArray(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))]
    : [];
}

function readRecordArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  return isRecord(value) ? [value] : [];
}

function formatSalary(value?: number | null, currency = "USD") {
  if (!value) {
    return "Open";
  }

  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${Math.round(value / 1000)}k`;
}

function truncate(value: string) {
  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}

function hasMeaningfulValue(value: string | number | null) {
  return value !== null && String(value).trim().length > 0;
}

function getCandidateDisplayValue(candidate: CandidateSnapshot, key: ResumeScalarFieldKey) {
  if (key === "salaryExpectation") {
    return formatSalary(candidate.salaryExpectation, candidate.currency);
  }

  if (key === "yearsExperience") {
    return candidate.yearsExperience ? `${candidate.yearsExperience} years` : "Not provided";
  }

  return candidate[key] ?? "Not provided";
}

function getParsedDisplayValue(parsed: ParsedResume, key: ResumeScalarFieldKey, fallbackCurrency = "USD") {
  if (key === "salaryExpectation") {
    return parsed.salaryExpectation ? formatSalary(parsed.salaryExpectation, parsed.currency ?? fallbackCurrency) : null;
  }

  if (key === "yearsExperience") {
    return parsed.yearsExperience ? `${Math.round(parsed.yearsExperience)} years` : null;
  }

  return parsed[key] ?? null;
}

function addPreviewField({
  candidate,
  fields,
  key,
  parsed,
}: {
  candidate: CandidateSnapshot;
  fields: ResumeProfileUpdatePreview["fields"];
  key: ResumeScalarFieldKey;
  parsed: ParsedResume;
}) {
  const parsedValue = getParsedDisplayValue(parsed, key, candidate.currency);

  if (!hasMeaningfulValue(parsedValue)) {
    return;
  }

  const currentValue = getCandidateDisplayValue(candidate, key);

  if (String(parsedValue).trim() === currentValue.trim()) {
    return;
  }

  fields.push({
    currentValue: truncate(currentValue),
    key,
    label: scalarFieldLabels[key],
    parsedValue: truncate(String(parsedValue)),
  });
}

export function readResumeReviewSelectedFields(formData: FormData) {
  return new Set(
    formData
      .getAll("fields")
      .filter((value): value is ResumeReviewFieldKey => typeof value === "string" && selectableResumeFields.has(value as ResumeReviewFieldKey)),
  );
}

export function readParsedResumeData(value: unknown): ParsedResume | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = readParsedText(value.name);
  const summary = readParsedText(value.summary);

  if (!name && !summary) {
    return null;
  }

  const education = readRecordArray(value.education)
    .map((item) => ({
      institution: readParsedText(item.institution),
      degree: readParsedText(item.degree),
      field: readParsedText(item.field),
    }))
    .filter((item): item is ParsedResume["education"][number] => Boolean(item.institution));
  const experience = readRecordArray(value.experience)
    .map((item) => ({
      company: readParsedText(item.company),
      title: readParsedText(item.title),
      location: readParsedText(item.location),
      description: readParsedText(item.description),
      current: item.current === true,
    }))
    .filter((item): item is ParsedResume["experience"][number] => Boolean(item.company && item.title));

  return {
    name: name ?? "",
    email: readParsedText(value.email),
    phone: readParsedText(value.phone),
    location: readParsedText(value.location),
    currentTitle: readParsedText(value.currentTitle),
    summary: summary ?? "",
    yearsExperience: readParsedNumber(value.yearsExperience) ?? readParsedNumber(value.experienceYears),
    availability: readParsedText(value.availability),
    salaryExpectation: readParsedNumber(value.salaryExpectation),
    currency: readParsedText(value.currency),
    skills: readParsedStringArray(value.skills),
    education,
    experience,
  };
}

export function buildResumeProfileUpdatePreview({
  candidate,
  currentSkills,
  parsedData,
}: {
  candidate: CandidateSnapshot;
  currentSkills: string[];
  parsedData: unknown;
}): ResumeProfileUpdatePreview | null {
  const parsed = readParsedResumeData(parsedData);

  if (!parsed) {
    return null;
  }

  const fields: ResumeProfileUpdatePreview["fields"] = [];

  for (const key of Object.keys(scalarFieldLabels) as ResumeScalarFieldKey[]) {
    addPreviewField({
      candidate,
      fields,
      key,
      parsed,
    });
  }

  const currentSkillSet = new Set(currentSkills.map((skill) => skill.toLowerCase()));
  const parsedSkills = parsed.skills.filter((skill) => !currentSkillSet.has(skill.toLowerCase()));

  const preview = {
    canApply: fields.length > 0 || parsedSkills.length > 0 || parsed.education.length > 0 || parsed.experience.length > 0,
    educationCount: parsed.education.length,
    experienceCount: parsed.experience.length,
    fields,
    skills: parsedSkills,
  };

  return preview.canApply ? preview : null;
}

export async function applyParsedResumeDataToCandidate({
  actorId,
  applicationId,
  candidateId,
  organizationId,
  resumeId,
  selectedFields,
}: {
  actorId: string;
  applicationId?: string | null;
  candidateId: string;
  organizationId: string;
  resumeId: string;
  selectedFields: Set<ResumeReviewFieldKey>;
}): Promise<{
  appliedFields: ResumeReviewFieldKey[];
  candidateId: string;
  matchRecalculation: CandidateMatchRecalculationResult;
  resumeId: string;
  status: ResumeApplyStatus;
}> {
  if (selectedFields.size === 0) {
    return {
      appliedFields: [],
      candidateId,
      matchRecalculation: {
        applicationsUpdated: 0,
        scores: [],
      },
      resumeId,
      status: "no-selection",
    };
  }

  const resume = await prisma.resumeDocument.findFirst({
    where: {
      id: resumeId,
      candidateId,
      organizationId,
    },
    include: {
      candidate: true,
    },
  });

  if (!resume) {
    throw new Error("Resume not found for this candidate.");
  }

  const parsed = readParsedResumeData(resume.parsedData);

  if (!parsed) {
    return {
      appliedFields: [],
      candidateId,
      matchRecalculation: {
        applicationsUpdated: 0,
        scores: [],
      },
      resumeId,
      status: "no-parsed-data",
    };
  }

  if (selectedFields.has("email") && parsed.email) {
    const existingCandidate = await prisma.candidate.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: parsed.email,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingCandidate && existingCandidate.id !== candidateId) {
      return {
        appliedFields: [],
        candidateId,
        matchRecalculation: {
          applicationsUpdated: 0,
          scores: [],
        },
        resumeId,
        status: "email-conflict",
      };
    }
  }

  const candidateData: {
    availability?: string | null;
    currency?: string;
    currentTitle?: string | null;
    email?: string | null;
    location?: string | null;
    name?: string;
    phone?: string | null;
    salaryExpectation?: number | null;
    summary?: string | null;
    yearsExperience?: number | null;
  } = {};

  if (selectedFields.has("name") && parsed.name) {
    candidateData.name = parsed.name;
  }

  if (selectedFields.has("email")) {
    candidateData.email = parsed.email;
  }

  if (selectedFields.has("phone")) {
    candidateData.phone = parsed.phone;
  }

  if (selectedFields.has("location")) {
    candidateData.location = parsed.location;
  }

  if (selectedFields.has("currentTitle")) {
    candidateData.currentTitle = parsed.currentTitle;
  }

  if (selectedFields.has("yearsExperience")) {
    candidateData.yearsExperience = parsed.yearsExperience ? Math.round(parsed.yearsExperience) : null;
  }

  if (selectedFields.has("availability")) {
    candidateData.availability = parsed.availability;
  }

  if (selectedFields.has("salaryExpectation")) {
    candidateData.salaryExpectation = parsed.salaryExpectation ? Math.round(parsed.salaryExpectation) : null;
  }

  if (selectedFields.has("currency") && parsed.currency) {
    candidateData.currency = parsed.currency;
  }

  if (selectedFields.has("summary")) {
    candidateData.summary = parsed.summary || null;
  }

  const appliedFields = [...selectedFields];
  const reviewedAt = new Date();

  await prisma.$transaction(async (tx) => {
    if (Object.keys(candidateData).length > 0) {
      await tx.candidate.update({
        where: {
          id: candidateId,
        },
        data: candidateData,
      });
    }

    if (selectedFields.has("skills") && parsed.skills.length > 0) {
      await tx.candidateSkill.deleteMany({
        where: {
          candidateId,
          organizationId,
        },
      });

      for (const skillName of parsed.skills) {
        const skill = await tx.skill.upsert({
          where: {
            organizationId_name: {
              organizationId,
              name: skillName,
            },
          },
          update: {},
          create: {
            organizationId,
            name: skillName,
          },
        });

        await tx.candidateSkill.upsert({
          where: {
            candidateId_skillId: {
              candidateId,
              skillId: skill.id,
            },
          },
          update: {
            confidence: 90,
          },
          create: {
            organizationId,
            candidateId,
            skillId: skill.id,
            confidence: 90,
          },
        });
      }
    }

    if (selectedFields.has("education") && parsed.education.length > 0) {
      await tx.candidateEducation.deleteMany({
        where: {
          candidateId,
        },
      });
      await tx.candidateEducation.createMany({
        data: parsed.education.map((education) => ({
          candidateId,
          institution: education.institution,
          degree: education.degree,
          field: education.field,
        })),
      });
    }

    if (selectedFields.has("experience") && parsed.experience.length > 0) {
      await tx.candidateExperience.deleteMany({
        where: {
          candidateId,
        },
      });
      await tx.candidateExperience.createMany({
        data: parsed.experience.map((experience) => ({
          candidateId,
          company: experience.company,
          title: experience.title,
          location: experience.location,
          description: experience.description,
          current: experience.current,
        })),
      });
    }

    await tx.resumeDocument.update({
      where: {
        id: resume.id,
      },
      data: {
        reviewedAt,
        reviewedById: actorId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId,
        actorId,
        applicationId: applicationId ?? undefined,
        candidateId,
        action: "candidate.resume_review_applied",
        entityType: "resume_document",
        entityId: resume.id,
        metadata: {
          applicationId,
          fields: appliedFields,
          fileName: resume.fileName,
          reviewedAt: reviewedAt.toISOString(),
          source: "resume-review",
        },
      },
    });
  });

  const matchRecalculation = await recalculateCandidateApplicationMatches({
    candidateId,
    organizationId,
  });

  if (matchRecalculation.applicationsUpdated > 0) {
    await prisma.auditEvent.create({
      data: {
        organizationId,
        actorId,
        applicationId: applicationId ?? undefined,
        candidateId,
        action: "candidate.matching_recalculated_after_resume_review",
        entityType: "candidate",
        entityId: candidateId,
        metadata: {
          applicationsUpdated: matchRecalculation.applicationsUpdated,
          scores: matchRecalculation.scores.map((score) => ({
            applicationId: score.applicationId,
            jobId: score.jobId,
            jobTitle: score.jobTitle,
            previousScore: score.previousScore,
            score: score.score,
          })),
        },
      },
    });
  }

  return {
    appliedFields,
    candidateId,
    matchRecalculation,
    resumeId,
    status: "applied",
  };
}
