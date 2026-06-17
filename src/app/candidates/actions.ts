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
  extractTextFromPdfBuffer,
  hasUsefulLocalResumeParse,
  parseResumeLocally,
  type ParsedResume,
} from "@/lib/resume-parser";
import {
  applyParsedResumeDataToCandidate,
  readResumeReviewSelectedFields,
} from "@/lib/resume-review";
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
  revalidatePath("/dashboard");
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

  revalidatePath("/dashboard");
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
  return `Review pending - ${fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")}`;
}

function buildManualReviewResume(fileName: string, detail?: string | null): ParsedResume {
  return {
    name: getFallbackName(fileName),
    email: null,
    phone: null,
    location: null,
    currentTitle: null,
    summary:
      detail ??
      "Resume saved for recruiter review. If this PDF is scanned or image-only, paste the resume text to run the local review.",
    yearsExperience: null,
    availability: null,
    salaryExpectation: null,
    currency: "USD",
    skills: [],
    education: [],
    experience: [],
  };
}

async function buildLocalResumeReview({
  fileName,
  isPdf,
  isText,
  mimeType,
  pastedResumeText,
  resumeFile,
}: {
  fileName: string;
  isPdf: boolean;
  isText: boolean;
  mimeType: string;
  pastedResumeText: string | null;
  resumeFile: File | null;
}) {
  let rawText = pastedResumeText;
  let storedResumeBytes: Buffer | null = null;
  let localExtractionError: string | null = null;

  if (resumeFile) {
    storedResumeBytes = Buffer.from(await resumeFile.arrayBuffer());

    if (isText) {
      rawText = rawText ?? storedResumeBytes.toString("utf8");
    }

    if (isPdf && !rawText) {
      try {
        rawText = await extractTextFromPdfBuffer(storedResumeBytes);
      } catch (error) {
        localExtractionError = error instanceof Error ? error.message : "Local PDF text extraction failed.";
      }
    }
  }

  if (rawText) {
    const parsed = parseResumeLocally(rawText, fileName);
    const usefulLocalParse = hasUsefulLocalResumeParse(parsed);

    return {
      localExtractionError,
      parsed,
      parsedData: {
        ...parsed,
        engine: "local-resume-review",
        source: usefulLocalParse ? "smart-local-parser" : "local-parser-low-confidence",
        ...(localExtractionError ? { localExtractionError } : {}),
      },
      parserStatus: usefulLocalParse ? ParserStatus.PARSED : ParserStatus.NEEDS_REVIEW,
      rawText,
      storedResumeBytes,
    };
  }

  const parsed = buildManualReviewResume(
    fileName,
    localExtractionError
      ? "Resume saved for recruiter review. The local PDF reader could not extract text from this file."
      : "Resume saved for recruiter review. No readable text was found in the uploaded file.",
  );

  return {
    localExtractionError,
    parsed,
    parsedData: {
      fileName,
      message: parsed.summary,
      mimeType,
      source: "local-review-needs-readable-text",
      ...(localExtractionError ? { localExtractionError } : {}),
    },
    parserStatus: ParserStatus.NEEDS_REVIEW,
    rawText,
    storedResumeBytes,
  };
}

async function trySaveResumeFile({
  bytes,
  candidateId,
  fileName,
  mimeType,
  organizationId,
}: {
  bytes: Buffer | null;
  candidateId: string;
  fileName: string;
  mimeType: string;
  organizationId: string;
}) {
  if (!bytes) {
    return {
      storedFile: null,
      storageError: null,
    };
  }

  try {
    return {
      storedFile: await saveResumeFile({
        bytes,
        candidateId,
        fileName,
        mimeType,
        organizationId,
      }),
      storageError: null,
    };
  } catch (error) {
    return {
      storedFile: null,
      storageError: error instanceof Error ? error.message : "Resume file storage failed.",
    };
  }
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

  const { parsed, parsedData, parserStatus, rawText, storedResumeBytes } = await buildLocalResumeReview({
    fileName,
    isPdf,
    isText,
    mimeType,
    pastedResumeText,
    resumeFile,
  });

  const candidate = await upsertParsedCandidate({
    organizationId: organization.id,
    parsed,
    source,
  });

  const { storedFile, storageError } = await trySaveResumeFile({
    bytes: storedResumeBytes ?? (rawText ? Buffer.from(rawText, "utf8") : null),
    candidateId: candidate.id,
    fileName,
    mimeType,
    organizationId: organization.id,
  });

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
    parsedData: storageError ? { ...(parsedData as Record<string, unknown>), storageError } : parsedData,
    parserStatus,
  });

  await applyCandidateToJob({
    candidateId: candidate.id,
    organizationId: organization.id,
    jobId,
    source,
  });

  revalidatePath("/dashboard");
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

  const { parsed, parsedData, parserStatus, rawText, storedResumeBytes } = await buildLocalResumeReview({
    fileName,
    isPdf,
    isText,
    mimeType,
    pastedResumeText,
    resumeFile,
  });

  const { storedFile, storageError } = await trySaveResumeFile({
    bytes: storedResumeBytes ?? (rawText ? Buffer.from(rawText, "utf8") : null),
    candidateId: candidate.id,
    fileName,
    mimeType,
    organizationId: organization.id,
  });

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
    parsedData: storageError ? { ...(parsedData as Record<string, unknown>), storageError } : parsedData,
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
        reviewAvailable: parserStatus === ParserStatus.PARSED,
        storageProvider: storedFile?.storageProvider ?? "metadata",
      },
    },
  });

  await revalidateCandidatePaths(candidate.id);

  redirect(`/candidates/${candidate.id}?resume=${parserStatus === ParserStatus.PARSED ? "review-ready" : "needs-review"}`);
}

export async function applyResumeParsedData(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const candidateId = readString(formData, "candidateId");
  const resumeId = readString(formData, "resumeId");
  const selectedFields = readResumeReviewSelectedFields(formData);

  if (!candidateId || !resumeId) {
    throw new Error("Candidate and resume are required.");
  }

  const result = await applyParsedResumeDataToCandidate({
    actorId: session.user.id,
    candidateId,
    organizationId: organization.id,
    resumeId,
    selectedFields,
  });

  if (result.status === "no-selection") {
    redirect(`/candidates/${candidateId}?resume=no-selection`);
  }

  if (result.status === "no-parsed-data") {
    redirect(`/candidates/${candidateId}?resume=no-parsed-data`);
  }

  if (result.status === "email-conflict") {
    redirect(`/candidates/${candidateId}?resume=email-conflict`);
  }

  await revalidateCandidatePaths(candidateId);
  redirect(`/candidates/${candidateId}?resume=applied`);
}

export async function deleteCandidate(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const candidateId = readString(formData, "candidateId");

  if (!candidateId) {
    throw new Error("Candidate id is required.");
  }

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!candidate) {
    redirect("/candidates?candidate=missing");
  }

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      candidateId: candidate.id,
      action: "candidate.deleted",
      entityType: "candidate",
      entityId: candidate.id,
      metadata: {
        email: candidate.email,
        name: candidate.name,
      },
    },
  });

  await prisma.candidate.delete({
    where: {
      id: candidate.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/candidates");
  revalidatePath("/matching");
  revalidatePath("/applications");
  revalidatePath("/analytics");
  redirect("/candidates?candidate=deleted");
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
