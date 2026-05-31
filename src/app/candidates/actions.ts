"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CandidateSource,
  NoteVisibility,
  ParserStatus,
} from "@/generated/prisma/client";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canUseOpenAIResumeParser,
  parseResumeLocally,
  parseResumeWithOpenAI,
  type ParsedResume,
} from "@/lib/resume-parser";
import { saveResumeFile } from "@/lib/resume-storage";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) ? value : null;
}

function readLines(formData: FormData, key: string) {
  return readString(formData, key)
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function readEnum<T extends Record<string, string>>(enumObject: T, value: string, fallback: T[keyof T]) {
  return Object.values(enumObject).includes(value) ? (value as T[keyof T]) : fallback;
}

function readSelectedFields(formData: FormData) {
  return new Set(formData.getAll("fields").filter((value): value is string => typeof value === "string"));
}

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

function readParsedResumeData(value: unknown): ParsedResume | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = readParsedText(value.name);
  const summary = readParsedText(value.summary);

  if (!name && !summary) {
    return null;
  }

  const education = Array.isArray(value.education)
    ? value.education
        .filter(isRecord)
        .map((item) => ({
          institution: readParsedText(item.institution),
          degree: readParsedText(item.degree),
          field: readParsedText(item.field),
        }))
        .filter((item): item is ParsedResume["education"][number] => Boolean(item.institution))
    : [];
  const experience = Array.isArray(value.experience)
    ? value.experience
        .filter(isRecord)
        .map((item) => ({
          company: readParsedText(item.company),
          title: readParsedText(item.title),
          location: readParsedText(item.location),
          description: readParsedText(item.description),
          current: item.current === true,
        }))
        .filter((item): item is ParsedResume["experience"][number] => Boolean(item.company && item.title))
    : [];

  return {
    name: name ?? "",
    email: readParsedText(value.email),
    phone: readParsedText(value.phone),
    location: readParsedText(value.location),
    currentTitle: readParsedText(value.currentTitle),
    summary: summary ?? "",
    yearsExperience: readParsedNumber(value.yearsExperience),
    availability: readParsedText(value.availability),
    salaryExpectation: readParsedNumber(value.salaryExpectation),
    currency: readParsedText(value.currency),
    skills: readParsedStringArray(value.skills),
    education,
    experience,
  };
}

function normalizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function syncCandidateSkills(organizationId: string, candidateId: string, skillNames: string[]) {
  for (const skillName of skillNames) {
    const skill = await prisma.skill.upsert({
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

    await prisma.candidateSkill.upsert({
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

async function replaceCandidateSkills(organizationId: string, candidateId: string, skillNames: string[]) {
  await prisma.candidateSkill.deleteMany({
    where: {
      candidateId,
      organizationId,
    },
  });

  await syncCandidateSkills(organizationId, candidateId, skillNames);
}

async function createResumeSnapshot({
  candidateId,
  fileKey,
  fileUrl,
  mimeType,
  organizationId,
  resumeFileName,
  resumeText,
  sizeBytes,
  skills,
  parsedData,
  parserStatus,
}: {
  candidateId: string;
  fileKey?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  organizationId: string;
  resumeFileName: string | null;
  resumeText: string | null;
  sizeBytes?: number | null;
  skills: string[];
  parsedData?: unknown;
  parserStatus?: ParserStatus;
}) {
  if (!resumeFileName && !resumeText) {
    return;
  }

  const fileName = resumeFileName ?? "manual-profile.txt";
  const status = parserStatus ?? (resumeText ? ParserStatus.PARSED : ParserStatus.UPLOADED);

  await prisma.resumeDocument.create({
    data: {
      organizationId,
      candidateId,
      fileName,
      fileKey: fileKey ?? `manual/${candidateId}/${normalizeFileName(fileName)}`,
      fileUrl,
      mimeType: mimeType ?? (fileName.endsWith(".pdf") ? "application/pdf" : "text/plain"),
      sizeBytes,
      parserStatus: status,
      rawText: resumeText,
      parsedData: parsedData
        ? parsedData
        : resumeText
        ? {
            skills,
            summary: resumeText.slice(0, 500),
            source: "manual-entry",
          }
        : undefined,
      parsedAt: status === ParserStatus.PARSED ? new Date() : null,
    },
  });
}

async function revalidateCandidatePaths(candidateId: string) {
  revalidatePath("/");
  revalidatePath("/candidates");
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/matching");

  const applications = await prisma.application.findMany({
    where: {
      candidateId,
    },
    select: {
      jobId: true,
    },
  });

  for (const application of applications) {
    revalidatePath(`/jobs/${application.jobId}`);
  }
}

async function applyCandidateToJob({
  candidateId,
  jobId,
  organizationId,
  source,
}: {
  candidateId: string;
  jobId: string | null;
  organizationId: string;
  source: CandidateSource;
}) {
  if (!jobId) {
    return;
  }

  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      organizationId,
    },
    include: {
      pipelineStages: {
        orderBy: {
          position: "asc",
        },
        take: 1,
      },
    },
  });

  if (!job) {
    return;
  }

  const stageId = job.pipelineStages[0]?.id;

  await prisma.application.upsert({
    where: {
      jobId_candidateId: {
        jobId,
        candidateId,
      },
    },
    update: {
      stageId,
      source,
      status: "ACTIVE",
      stageEnteredAt: new Date(),
    },
    create: {
      organizationId,
      jobId,
      candidateId,
      stageId,
      source,
      status: "ACTIVE",
      matchScore: null,
    },
  });
}

export async function createCandidate(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const name = readString(formData, "name");
  const email = readOptionalString(formData, "email");
  const source = readEnum(CandidateSource, readString(formData, "source"), CandidateSource.MANUAL);

  if (!name) {
    throw new Error("Candidate name is required.");
  }

  const candidatePayload = {
    name,
    email,
    phone: readOptionalString(formData, "phone"),
    location: readOptionalString(formData, "location"),
    source,
    currentTitle: readOptionalString(formData, "currentTitle"),
    yearsExperience: readNumber(formData, "yearsExperience"),
    availability: readOptionalString(formData, "availability"),
    salaryExpectation: readNumber(formData, "salaryExpectation"),
    currency: readOptionalString(formData, "currency") ?? "USD",
    summary: readOptionalString(formData, "summary"),
  };

  const existingCandidate = email
    ? await prisma.candidate.findUnique({
        where: {
          organizationId_email: {
            organizationId: organization.id,
            email,
          },
        },
      })
    : null;

  const candidate = existingCandidate
    ? await prisma.candidate.update({
        where: {
          id: existingCandidate.id,
        },
        data: candidatePayload,
      })
    : await prisma.candidate.create({
        data: {
          organizationId: organization.id,
          ...candidatePayload,
        },
      });

  const skillNames = readLines(formData, "skills");
  await syncCandidateSkills(organization.id, candidate.id, skillNames);

  const institution = readOptionalString(formData, "institution");
  if (institution) {
    await prisma.candidateEducation.create({
      data: {
        candidateId: candidate.id,
        institution,
        degree: readOptionalString(formData, "degree"),
        field: readOptionalString(formData, "field"),
      },
    });
  }

  await createResumeSnapshot({
    candidateId: candidate.id,
    organizationId: organization.id,
    resumeFileName: readOptionalString(formData, "resumeFileName"),
    resumeText: readOptionalString(formData, "resumeText"),
    skills: skillNames,
  });

  await applyCandidateToJob({
    candidateId: candidate.id,
    organizationId: organization.id,
    jobId: readOptionalString(formData, "jobId"),
    source,
  });

  revalidatePath("/");
  revalidatePath("/candidates");
  revalidatePath("/jobs");
}

export async function updateCandidateProfile(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const candidateId = readString(formData, "candidateId");
  const name = readString(formData, "name");
  const source = readEnum(CandidateSource, readString(formData, "source"), CandidateSource.MANUAL);
  const skillNames = readLines(formData, "skills");

  if (!candidateId || !name) {
    throw new Error("Candidate id and name are required.");
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: organization.id,
    },
  });

  if (!candidate) {
    throw new Error("Candidate not found for this organization.");
  }

  await prisma.candidate.update({
    where: {
      id: candidate.id,
    },
    data: {
      name,
      email: readOptionalString(formData, "email"),
      phone: readOptionalString(formData, "phone"),
      location: readOptionalString(formData, "location"),
      source,
      currentTitle: readOptionalString(formData, "currentTitle"),
      yearsExperience: readNumber(formData, "yearsExperience"),
      availability: readOptionalString(formData, "availability"),
      salaryExpectation: readNumber(formData, "salaryExpectation"),
      currency: readOptionalString(formData, "currency") ?? "USD",
      summary: readOptionalString(formData, "summary"),
    },
  });

  await replaceCandidateSkills(organization.id, candidate.id, skillNames);

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      candidateId: candidate.id,
      action: "candidate.profile_updated",
      entityType: "candidate",
      entityId: candidate.id,
      metadata: {
        skillCount: skillNames.length,
        source,
      },
    },
  });

  await revalidateCandidatePaths(candidate.id);
  redirect(`/candidates/${candidate.id}?profile=1`);
}

function getFileFromFormData(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function inferMimeType(fileName: string, uploadedType: string) {
  if (uploadedType) {
    return uploadedType;
  }

  if (fileName.toLowerCase().endsWith(".pdf")) {
    return "application/pdf";
  }

  return "text/plain";
}

function getFallbackName(fileName: string) {
  return `Pending parse - ${fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")}`;
}

async function upsertParsedCandidate({
  organizationId,
  parsed,
  source,
}: {
  organizationId: string;
  parsed: ParsedResume;
  source: CandidateSource;
}) {
  const candidatePayload = {
    name: parsed.name || "Unnamed candidate",
    email: parsed.email,
    phone: parsed.phone,
    location: parsed.location,
    source,
    currentTitle: parsed.currentTitle,
    yearsExperience: parsed.yearsExperience ? Math.round(parsed.yearsExperience) : null,
    availability: parsed.availability,
    salaryExpectation: parsed.salaryExpectation ? Math.round(parsed.salaryExpectation) : null,
    currency: parsed.currency ?? "USD",
    summary: parsed.summary,
  };

  const existingCandidate = parsed.email
    ? await prisma.candidate.findUnique({
        where: {
          organizationId_email: {
            organizationId,
            email: parsed.email,
          },
        },
      })
    : null;

  const candidate = existingCandidate
    ? await prisma.candidate.update({
        where: {
          id: existingCandidate.id,
        },
        data: candidatePayload,
      })
    : await prisma.candidate.create({
        data: {
          organizationId,
          ...candidatePayload,
        },
      });

  await syncCandidateSkills(organizationId, candidate.id, parsed.skills);

  if (!existingCandidate) {
    await prisma.candidateEducation.createMany({
      data: parsed.education.map((education) => ({
        candidateId: candidate.id,
        institution: education.institution,
        degree: education.degree,
        field: education.field,
      })),
    });

    await prisma.candidateExperience.createMany({
      data: parsed.experience.map((experience) => ({
        candidateId: candidate.id,
        company: experience.company,
        title: experience.title,
        location: experience.location,
        description: experience.description,
        current: experience.current,
      })),
    });
  }

  return candidate;
}

export async function parseResumeUpload(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const resumeFile = getFileFromFormData(formData, "resumeFile");
  const pastedResumeText = readOptionalString(formData, "resumeText");
  const jobId = readOptionalString(formData, "jobId");
  const source = readEnum(CandidateSource, readString(formData, "source"), CandidateSource.MANUAL);

  if (!resumeFile && !pastedResumeText) {
    redirect("/candidates?resume=missing");
  }

  const fileName = resumeFile?.name ?? "pasted-resume.txt";
  const mimeType = inferMimeType(fileName, resumeFile?.type ?? "");
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const isText = mimeType.startsWith("text/") || /\.(txt|md|csv)$/i.test(fileName);

  if (resumeFile && resumeFile.size > 10 * 1024 * 1024) {
    redirect("/candidates?resume=too-large");
  }

  let parsed: ParsedResume | null = null;
  let rawText = pastedResumeText;
  let parserStatus: ParserStatus = ParserStatus.NEEDS_REVIEW;
  let parsedData: unknown = null;
  let storedResumeBytes: Buffer | null = null;

  try {
    if (resumeFile) {
      const bytes = Buffer.from(await resumeFile.arrayBuffer());
      storedResumeBytes = bytes;

      if (isText) {
        rawText = rawText ?? bytes.toString("utf8");
      }

      if (canUseOpenAIResumeParser() && (isPdf || rawText)) {
        parsed = await parseResumeWithOpenAI(
          isPdf
            ? {
                kind: "file",
                fileName,
                mimeType,
                base64: bytes.toString("base64"),
              }
            : {
                kind: "text",
                fileName,
                text: rawText ?? "",
              },
        );
        parserStatus = ParserStatus.PARSED;
        parsedData = parsed;
      }
    } else if (rawText && canUseOpenAIResumeParser()) {
      parsed = await parseResumeWithOpenAI({
        kind: "text",
        fileName,
        text: rawText,
      });
      parserStatus = ParserStatus.PARSED;
      parsedData = parsed;
    }
  } catch (error) {
    parserStatus = ParserStatus.FAILED;
    parsedData = {
      error: error instanceof Error ? error.message : "Unknown parser error",
      source: "openai-resume-parser",
    };
  }

  if (!parsed && rawText) {
    parsed = parseResumeLocally(rawText, fileName);
    parsedData = {
      ...parsed,
      source: canUseOpenAIResumeParser() ? "local-fallback-after-ai-failure" : "local-fallback-no-api-key",
    };
    parserStatus = canUseOpenAIResumeParser() ? parserStatus : ParserStatus.NEEDS_REVIEW;
  }

  if (!parsed) {
    parsed = {
      name: getFallbackName(fileName),
      email: null,
      phone: null,
      location: null,
      currentTitle: null,
      summary: "Resume uploaded and waiting for OpenAI parsing. Add OPENAI_API_KEY to enable AI extraction.",
      yearsExperience: null,
      availability: null,
      salaryExpectation: null,
      currency: "USD",
      skills: [],
      education: [],
      experience: [],
    };
    parsedData = {
      source: "pending-openai-parser",
      message: "OPENAI_API_KEY is required to parse PDF content.",
    };
    parserStatus = ParserStatus.NEEDS_REVIEW;
  }

  const candidate = await upsertParsedCandidate({
    organizationId: organization.id,
    parsed,
    source,
  });

  storedResumeBytes = storedResumeBytes ?? (rawText ? Buffer.from(rawText, "utf8") : null);
  const storedFile = storedResumeBytes
    ? await saveResumeFile({
        bytes: storedResumeBytes,
        candidateId: candidate.id,
        fileName,
        mimeType,
        organizationId: organization.id,
      })
    : null;

  await createResumeSnapshot({
    candidateId: candidate.id,
    fileKey: storedFile?.fileKey,
    fileUrl: storedFile?.fileUrl,
    organizationId: organization.id,
    resumeFileName: fileName,
    resumeText: rawText,
    mimeType,
    sizeBytes: storedFile?.sizeBytes ?? (rawText ? Buffer.byteLength(rawText, "utf8") : null),
    skills: parsed.skills,
    parsedData,
    parserStatus,
  });

  await applyCandidateToJob({
    candidateId: candidate.id,
    organizationId: organization.id,
    jobId,
    source,
  });

  revalidatePath("/");
  revalidatePath("/candidates");
  revalidatePath("/jobs");

  redirect(`/candidates?resume=${parserStatus === ParserStatus.PARSED ? "parsed" : "needs-review"}`);
}

export async function attachCandidateResume(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const candidateId = readString(formData, "candidateId");
  const resumeFile = getFileFromFormData(formData, "resumeFile");
  const pastedResumeText = readOptionalString(formData, "resumeText");

  if (!candidateId) {
    throw new Error("Candidate id is required.");
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: organization.id,
    },
  });

  if (!candidate) {
    throw new Error("Candidate not found for this organization.");
  }

  if (!resumeFile && !pastedResumeText) {
    redirect(`/candidates/${candidate.id}?resume=missing`);
  }

  if (resumeFile && resumeFile.size > 10 * 1024 * 1024) {
    redirect(`/candidates/${candidate.id}?resume=too-large`);
  }

  const fileName = resumeFile?.name ?? "pasted-resume.txt";
  const mimeType = inferMimeType(fileName, resumeFile?.type ?? "");
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const isText = mimeType.startsWith("text/") || /\.(txt|md|csv)$/i.test(fileName);

  let parsed: ParsedResume | null = null;
  let rawText = pastedResumeText;
  let parserStatus: ParserStatus = ParserStatus.NEEDS_REVIEW;
  let parsedData: unknown = null;
  let storedResumeBytes: Buffer | null = null;

  try {
    if (resumeFile) {
      const bytes = Buffer.from(await resumeFile.arrayBuffer());
      storedResumeBytes = bytes;

      if (isText) {
        rawText = rawText ?? bytes.toString("utf8");
      }

      if (canUseOpenAIResumeParser() && (isPdf || rawText)) {
        parsed = await parseResumeWithOpenAI(
          isPdf
            ? {
                kind: "file",
                fileName,
                mimeType,
                base64: bytes.toString("base64"),
              }
            : {
                kind: "text",
                fileName,
                text: rawText ?? "",
              },
        );
        parserStatus = ParserStatus.PARSED;
        parsedData = parsed;
      }
    } else if (rawText && canUseOpenAIResumeParser()) {
      parsed = await parseResumeWithOpenAI({
        kind: "text",
        fileName,
        text: rawText,
      });
      parserStatus = ParserStatus.PARSED;
      parsedData = parsed;
    }
  } catch (error) {
    parserStatus = ParserStatus.FAILED;
    parsedData = {
      error: error instanceof Error ? error.message : "Unknown parser error",
      source: "openai-resume-parser",
    };
  }

  if (!parsed && rawText) {
    parsed = parseResumeLocally(rawText, fileName);
    parsedData = {
      ...parsed,
      source: canUseOpenAIResumeParser() ? "local-fallback-after-ai-failure" : "local-fallback-no-api-key",
    };
    parserStatus = canUseOpenAIResumeParser() ? parserStatus : ParserStatus.NEEDS_REVIEW;
  }

  if (!parsed) {
    parsedData = {
      source: "pending-openai-parser",
      message: "OPENAI_API_KEY is required to parse PDF content.",
    };
    parserStatus = ParserStatus.NEEDS_REVIEW;
  }

  storedResumeBytes = storedResumeBytes ?? (rawText ? Buffer.from(rawText, "utf8") : null);
  const storedFile = storedResumeBytes
    ? await saveResumeFile({
        bytes: storedResumeBytes,
        candidateId: candidate.id,
        fileName,
        mimeType,
        organizationId: organization.id,
      })
    : null;

  await createResumeSnapshot({
    candidateId: candidate.id,
    fileKey: storedFile?.fileKey,
    fileUrl: storedFile?.fileUrl,
    organizationId: organization.id,
    resumeFileName: fileName,
    resumeText: rawText,
    mimeType,
    sizeBytes: storedFile?.sizeBytes ?? (rawText ? Buffer.byteLength(rawText, "utf8") : null),
    skills: parsed?.skills ?? [],
    parsedData,
    parserStatus,
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      candidateId: candidate.id,
      action: "candidate.resume_attached",
      entityType: "candidate",
      entityId: candidate.id,
      metadata: {
        fileName,
        parserStatus,
        profileUpdated: false,
        reviewAvailable: Boolean(parsed),
        storageProvider: storedFile?.storageProvider ?? "metadata",
      },
    },
  });

  await revalidateCandidatePaths(candidate.id);

  redirect(`/candidates/${candidate.id}?resume=${parsed ? "review-ready" : "needs-review"}`);
}

export async function applyResumeParsedData(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const candidateId = readString(formData, "candidateId");
  const resumeId = readString(formData, "resumeId");
  const selectedFields = readSelectedFields(formData);

  if (!candidateId || !resumeId) {
    throw new Error("Candidate and resume are required.");
  }

  if (selectedFields.size === 0) {
    redirect(`/candidates/${candidateId}?resume=no-selection`);
  }

  const resume = await prisma.resumeDocument.findFirst({
    where: {
      id: resumeId,
      candidateId,
      organizationId: organization.id,
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
    redirect(`/candidates/${candidateId}?resume=no-parsed-data`);
  }

  if (selectedFields.has("email") && parsed.email) {
    const existingCandidate = await prisma.candidate.findUnique({
      where: {
        organizationId_email: {
          organizationId: organization.id,
          email: parsed.email,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingCandidate && existingCandidate.id !== candidateId) {
      redirect(`/candidates/${candidateId}?resume=email-conflict`);
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

  if (Object.keys(candidateData).length > 0) {
    await prisma.candidate.update({
      where: {
        id: candidateId,
      },
      data: candidateData,
    });
  }

  if (selectedFields.has("skills") && parsed.skills.length > 0) {
    await replaceCandidateSkills(organization.id, candidateId, parsed.skills);
  }

  if (selectedFields.has("education") && parsed.education.length > 0) {
    await prisma.candidateEducation.deleteMany({
      where: {
        candidateId,
      },
    });
    await prisma.candidateEducation.createMany({
      data: parsed.education.map((education) => ({
        candidateId,
        institution: education.institution,
        degree: education.degree,
        field: education.field,
      })),
    });
  }

  if (selectedFields.has("experience") && parsed.experience.length > 0) {
    await prisma.candidateExperience.deleteMany({
      where: {
        candidateId,
      },
    });
    await prisma.candidateExperience.createMany({
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

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      candidateId,
      action: "candidate.resume_review_applied",
      entityType: "resume_document",
      entityId: resume.id,
      metadata: {
        fields: Array.from(selectedFields),
        fileName: resume.fileName,
      },
    },
  });

  await revalidateCandidatePaths(candidateId);
  redirect(`/candidates/${candidateId}?resume=applied`);
}

export async function addCandidateNote(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const candidateId = readString(formData, "candidateId");
  const applicationId = readOptionalString(formData, "applicationId");
  const body = readString(formData, "body");
  const visibility = readEnum(NoteVisibility, readString(formData, "visibility"), NoteVisibility.TEAM);

  if (!candidateId || !body) {
    throw new Error("Candidate and note body are required.");
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: organization.id,
    },
  });

  if (!candidate) {
    throw new Error("Candidate not found for this organization.");
  }

  if (applicationId) {
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        candidateId,
        organizationId: organization.id,
      },
    });

    if (!application) {
      throw new Error("Application not found for this candidate.");
    }
  }

  const note = await prisma.candidateNote.create({
    data: {
      organizationId: organization.id,
      candidateId,
      applicationId,
      authorId: session.user.id,
      body,
      visibility,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      candidateId,
      applicationId,
      action: "candidate.note_added",
      entityType: "candidate_note",
      entityId: note.id,
      metadata: {
        visibility,
      },
    },
  });

  await revalidateCandidatePaths(candidateId);
  redirect(`/candidates/${candidateId}?note=1`);
}
