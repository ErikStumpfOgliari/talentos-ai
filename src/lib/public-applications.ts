import { Buffer } from "node:buffer";
import { randomBytes } from "node:crypto";
import {
  AutomationTrigger,
  CandidateSource,
  EmailStatus,
  EmailTrigger,
  ParserStatus,
  PipelineCategory,
  type Prisma,
} from "@/generated/prisma/client";
import { scoreCandidateForJob } from "@/lib/candidate-matching";
import { deliverEmailMessage, queueAutomationEmails } from "@/lib/email-automation";
import { prisma } from "@/lib/prisma";
import {
  canUseOpenAIResumeParser,
  extractTextFromPdfBuffer,
  hasUsefulLocalResumeParse,
  parseResumeLocally,
  parseResumeWithOpenAI,
  type ParsedResume,
} from "@/lib/resume-parser";
import { saveResumeFile } from "@/lib/resume-storage";
import { MAX_RESUME_FILE_SIZE_BYTES } from "@/lib/resume-upload-limits";
import { limitText } from "@/lib/text-limits";

export type PublicApplicationResult =
  | {
      error:
        | "job_unavailable"
        | "missing_candidate"
        | "missing_resume"
        | "resume_too_large";
      ok: false;
    }
  | {
      applicationId: string;
      applicationToken: string;
      candidateId: string;
      matchScore: number;
      ok: true;
      parserStatus: ParserStatus;
    };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readOptionalLongString(formData: FormData, key: string) {
  const value = limitText(readString(formData, key));
  return value.length > 0 ? value : null;
}

function readNumber(formData: FormData, key: string) {
  const rawValue = readString(formData, key);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

function readLines(formData: FormData, key: string) {
  return readString(formData, key)
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
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

function normalizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function generatePublicApplicationToken() {
  return randomBytes(24).toString("base64url");
}

async function generateUniquePublicApplicationToken() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicToken = generatePublicApplicationToken();
    const existingApplication = await prisma.application.findUnique({
      where: {
        publicToken,
      },
      select: {
        id: true,
      },
    });

    if (!existingApplication) {
      return publicToken;
    }
  }

  throw new Error("Could not generate a unique public application token.");
}

export function getPublicApplicationStatusPath(publicToken: string) {
  return `/careers/applications/${publicToken}`;
}

function getPublicApplicationBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (!configuredUrl) {
    return "http://127.0.0.1:3000";
  }

  const normalizedUrl = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`;

  return normalizedUrl.replace(/\/+$/, "");
}

export function getPublicApplicationStatusUrl(publicToken: string) {
  return `${getPublicApplicationBaseUrl()}${getPublicApplicationStatusPath(publicToken)}`;
}

async function syncCandidateSkills(organizationId: string, candidateId: string, skillNames: string[]) {
  for (const skillName of unique(skillNames)) {
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
        confidence: 88,
      },
      create: {
        organizationId,
        candidateId,
        skillId: skill.id,
        confidence: 88,
      },
    });
  }
}

function buildFallbackParsedResume({
  coverLetter,
  email,
  fileName,
  name,
  phone,
  skills,
}: {
  coverLetter: string | null;
  email: string;
  fileName: string;
  name: string;
  phone: string | null;
  skills: string[];
}): ParsedResume {
  return {
    availability: null,
    currency: "USD",
    currentTitle: null,
    education: [],
    email,
    experience: [],
    location: null,
    name: name || fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
    phone,
    salaryExpectation: null,
    skills,
    summary: coverLetter ?? "Public application submitted for recruiter review.",
    yearsExperience: null,
  };
}

async function parsePublicResume({
  coverLetter,
  email,
  fileName,
  mimeType,
  name,
  phone,
  rawText,
  resumeBytes,
  skills,
}: {
  coverLetter: string | null;
  email: string;
  fileName: string;
  mimeType: string;
  name: string;
  phone: string | null;
  rawText: string | null;
  resumeBytes: Buffer | null;
  skills: string[];
}) {
  const isPdf = mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  let parsed: ParsedResume | null = null;
  let parsedData: Prisma.InputJsonValue | null = null;
  let parserStatus: ParserStatus = ParserStatus.NEEDS_REVIEW;
  let localExtractionError: string | null = null;

  if (resumeBytes && isPdf && !rawText) {
    try {
      rawText = await extractTextFromPdfBuffer(resumeBytes);
    } catch (error) {
      localExtractionError = error instanceof Error ? error.message : "Local PDF text extraction failed.";
    }
  }

  try {
    if (canUseOpenAIResumeParser() && resumeBytes && isPdf) {
      parsed = await parseResumeWithOpenAI({
        kind: "file",
        fileName,
        mimeType,
        base64: resumeBytes.toString("base64"),
      });
      parsedData = parsed as Prisma.InputJsonValue;
      parserStatus = ParserStatus.PARSED;
    } else if (canUseOpenAIResumeParser() && rawText) {
      parsed = await parseResumeWithOpenAI({
        kind: "text",
        fileName,
        text: rawText,
      });
      parsedData = parsed as Prisma.InputJsonValue;
      parserStatus = ParserStatus.PARSED;
    }
  } catch (error) {
    parserStatus = ParserStatus.FAILED;
    parsedData = {
      error: error instanceof Error ? error.message : "Unknown parser error",
      source: "public-openai-resume-parser",
    };
  }

  if (!parsed && rawText) {
    parsed = parseResumeLocally(rawText, fileName);
    parsedData = {
      ...parsed,
      source: canUseOpenAIResumeParser() ? "public-local-fallback-after-ai-failure" : "public-smart-local-parser",
      ...(localExtractionError ? { localExtractionError } : {}),
    };
    parserStatus = hasUsefulLocalResumeParse(parsed)
      ? ParserStatus.PARSED
      : canUseOpenAIResumeParser() && parserStatus === ParserStatus.FAILED
      ? ParserStatus.FAILED
      : ParserStatus.NEEDS_REVIEW;
  }

  if (!parsed) {
    parsed = buildFallbackParsedResume({
      coverLetter,
      email,
      fileName,
      name,
      phone,
      skills,
    });
    parsedData =
      parsedData ??
      ({
        message: "Resume stored and waiting for recruiter review.",
        source: "public-application-fallback",
      } satisfies Prisma.InputJsonValue);
  }

  return {
    parsed,
    parsedData,
    parserStatus,
  };
}

async function createResumeSnapshot({
  candidateId,
  fileKey,
  fileName,
  fileUrl,
  mimeType,
  organizationId,
  parsedAt,
  parsedData,
  parserStatus,
  rawText,
  sizeBytes,
}: {
  candidateId: string;
  fileKey: string | null;
  fileName: string;
  fileUrl: string | null;
  mimeType: string;
  organizationId: string;
  parsedAt: Date | null;
  parsedData: Prisma.InputJsonValue | null;
  parserStatus: ParserStatus;
  rawText: string | null;
  sizeBytes: number | null;
}) {
  return prisma.resumeDocument.create({
    data: {
      candidateId,
      fileKey: fileKey ?? (rawText ? `public/${candidateId}/${normalizeFileName(fileName)}` : null),
      fileName,
      fileUrl,
      mimeType,
      organizationId,
      parsedAt,
      parsedData: parsedData ?? undefined,
      parserStatus,
      rawText,
      sizeBytes,
    },
  });
}

async function createParsedProfileDetails(candidateId: string, parsed: ParsedResume, existingCandidate: boolean) {
  if (existingCandidate) {
    return;
  }

  if (parsed.education.length > 0) {
    await prisma.candidateEducation.createMany({
      data: parsed.education.map((education) => ({
        candidateId,
        degree: education.degree,
        field: education.field,
        institution: education.institution,
      })),
    });
  }

  if (parsed.experience.length > 0) {
    await prisma.candidateExperience.createMany({
      data: parsed.experience.map((experience) => ({
        candidateId,
        company: experience.company,
        current: experience.current,
        description: experience.description,
        location: experience.location,
        title: experience.title,
      })),
    });
  }
}

async function sendApplicationReceivedEmail({
  applicationId,
  organizationId,
  publicToken,
}: {
  applicationId: string;
  organizationId: string;
  publicToken: string;
}) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId,
    },
    include: {
      candidate: true,
      job: true,
      organization: true,
    },
  });

  if (!application?.candidate.email) {
    return null;
  }

  const statusUrl = getPublicApplicationStatusUrl(publicToken);
  const message = await prisma.emailMessage.create({
    data: {
      applicationId: application.id,
      body: [
        `Hi ${application.candidate.name},`,
        `Thank you for applying to ${application.job.title} at ${application.organization.name}.`,
        "We received your resume and added your application to our hiring pipeline.",
        `You can check your application status here: ${statusUrl}`,
        "Best,",
        application.organization.name,
      ].join("\n\n"),
      candidateId: application.candidateId,
      organizationId,
      provider: "local-outbox",
      status: EmailStatus.QUEUED,
      subject: `Application received for ${application.job.title}`,
      toEmail: application.candidate.email,
      trigger: EmailTrigger.APPLICATION_RECEIVED,
    },
  });

  return deliverEmailMessage({
    messageId: message.id,
    organizationId,
  });
}

export async function submitPublicJobApplication({
  formData,
  jobId,
}: {
  formData: FormData;
  jobId: string;
}): Promise<PublicApplicationResult> {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      status: "ACTIVE",
    },
    include: {
      organization: true,
      pipelineStages: {
        orderBy: {
          position: "asc",
        },
        take: 1,
      },
    },
  });

  if (!job) {
    return {
      error: "job_unavailable",
      ok: false,
    };
  }

  const organization = job.organization;

  const submittedName = readString(formData, "name");
  const submittedEmail = readString(formData, "email").toLowerCase();
  const submittedPhone = readOptionalString(formData, "phone");
  const resumeFile = getFileFromFormData(formData, "resumeFile");
  const pastedResumeText = readOptionalLongString(formData, "resumeText");
  const coverLetter = readOptionalLongString(formData, "coverLetter");
  const submittedSkills = readLines(formData, "skills");
  const submittedResumeFileName = readOptionalString(formData, "resumeFileName");
  const submittedResumeSizeBytes = readNumber(formData, "resumeFileSizeBytes");
  const resumeUploadMode = readOptionalString(formData, "resumeUploadMode");
  const isDeferredLargeFile = resumeUploadMode === "deferred_large_file" && Boolean(submittedResumeFileName) && !resumeFile;

  if (!submittedName || !submittedEmail) {
    return {
      error: "missing_candidate",
      ok: false,
    };
  }

  if (!resumeFile && !pastedResumeText && !submittedResumeFileName) {
    return {
      error: "missing_resume",
      ok: false,
    };
  }

  if (resumeFile && resumeFile.size > MAX_RESUME_FILE_SIZE_BYTES) {
    return {
      error: "resume_too_large",
      ok: false,
    };
  }

  const fileName = resumeFile?.name ?? submittedResumeFileName ?? "pasted-resume.txt";
  const mimeType = inferMimeType(fileName, resumeFile?.type ?? "");
  const isTextFile = mimeType.startsWith("text/") || /\.(txt|md|csv)$/i.test(fileName);
  const resumeBytes = resumeFile ? Buffer.from(await resumeFile.arrayBuffer()) : null;
  const rawText = pastedResumeText ?? (resumeBytes && isTextFile ? resumeBytes.toString("utf8") : null);
  const { parsed, parserStatus, ...parseResult } = await parsePublicResume({
    coverLetter,
    email: submittedEmail,
    fileName,
    mimeType,
    name: submittedName,
    phone: submittedPhone,
    rawText,
    resumeBytes,
    skills: submittedSkills,
  });
  let parsedData = parseResult.parsedData;

  if (isDeferredLargeFile && !rawText) {
    parsedData = {
      fileName,
      message:
        "Large resume file recorded for recruiter review. The candidate should paste resume text or send a smaller readable attachment if structured parsing is required.",
      sizeBytes: submittedResumeSizeBytes,
      source: "public-application-deferred-large-file",
    } satisfies Prisma.InputJsonValue;
  }
  const existingCandidate = await prisma.candidate.findUnique({
    where: {
      organizationId_email: {
        email: submittedEmail,
        organizationId: organization.id,
      },
    },
  });
  const candidatePayload = {
    availability: readOptionalString(formData, "availability") ?? parsed.availability,
    currency: parsed.currency ?? "USD",
    currentTitle: readOptionalString(formData, "currentTitle") ?? parsed.currentTitle,
    email: submittedEmail,
    location: readOptionalString(formData, "location") ?? parsed.location,
    name: submittedName || parsed.name || "Unnamed candidate",
    phone: submittedPhone ?? parsed.phone,
    salaryExpectation: readNumber(formData, "salaryExpectation") ?? (parsed.salaryExpectation ? Math.round(parsed.salaryExpectation) : null),
    source: CandidateSource.CAREERS_PAGE,
    summary: coverLetter ? `${parsed.summary}\n\nCandidate note: ${coverLetter}` : parsed.summary,
    yearsExperience: readNumber(formData, "yearsExperience") ?? (parsed.yearsExperience ? Math.round(parsed.yearsExperience) : null),
  };
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

  await syncCandidateSkills(organization.id, candidate.id, unique([...parsed.skills, ...submittedSkills]));
  await createParsedProfileDetails(candidate.id, parsed, Boolean(existingCandidate));

  const shouldSaveResumeFile = Boolean(resumeBytes || (!isDeferredLargeFile && rawText));
  const storedFile =
    shouldSaveResumeFile
      ? await saveResumeFile({
          bytes: resumeBytes ?? Buffer.from(rawText ?? "", "utf8"),
          candidateId: candidate.id,
          fileName,
          mimeType: resumeBytes ? mimeType : "text/plain",
          organizationId: organization.id,
        })
      : null;

  const resume = await createResumeSnapshot({
    candidateId: candidate.id,
    fileKey: storedFile?.fileKey ?? null,
    fileName,
    fileUrl: storedFile?.fileUrl ?? null,
    mimeType,
    organizationId: organization.id,
    parsedAt: parserStatus === ParserStatus.PARSED ? new Date() : null,
    parsedData,
    parserStatus,
    rawText,
    sizeBytes: storedFile?.sizeBytes ?? (rawText ? Buffer.byteLength(rawText, "utf8") : submittedResumeSizeBytes),
  });
  const existingApplication = await prisma.application.findUnique({
    where: {
      jobId_candidateId: {
        candidateId: candidate.id,
        jobId: job.id,
      },
    },
  });
  const firstStage =
    job.pipelineStages[0] ??
    (await prisma.pipelineStage.create({
      data: {
        category: PipelineCategory.APPLIED,
        jobId: job.id,
        name: "Applied",
        organizationId: organization.id,
        position: 0,
      },
    }));
  const candidateForMatching = await prisma.candidate.findUniqueOrThrow({
    where: {
      id: candidate.id,
    },
    include: {
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
  const match = await scoreCandidateForJob(job, candidateForMatching);
  const applicationToken = existingApplication?.publicToken ?? (await generateUniquePublicApplicationToken());
  const application = await prisma.application.upsert({
    where: {
      jobId_candidateId: {
        candidateId: candidate.id,
        jobId: job.id,
      },
    },
    update: {
      matchExplanation: match.explanation,
      matchScore: match.score,
      publicToken: applicationToken,
      source: CandidateSource.CAREERS_PAGE,
      stageEnteredAt: existingApplication?.stageId ? undefined : new Date(),
      stageId: existingApplication?.stageId ?? firstStage.id,
      status: "ACTIVE",
    },
    create: {
      candidateId: candidate.id,
      jobId: job.id,
      matchExplanation: match.explanation,
      matchScore: match.score,
      organizationId: organization.id,
      publicToken: applicationToken,
      source: CandidateSource.CAREERS_PAGE,
      stageId: firstStage.id,
      status: "ACTIVE",
    },
  });

  if (coverLetter) {
    await prisma.candidateNote.create({
      data: {
        applicationId: application.id,
        body: coverLetter,
        candidateId: candidate.id,
        organizationId: organization.id,
        visibility: "TEAM",
      },
    });
  }

  await prisma.auditEvent.create({
    data: {
      action: "public_application.submitted",
      applicationId: application.id,
      candidateId: candidate.id,
      entityId: application.id,
      entityType: "application",
      jobId: job.id,
      metadata: {
        matchMode: match.explanation.mode,
        matchScore: match.score,
        parserStatus,
        resumeId: resume.id,
        resumeUploadMode,
        source: "careers_page",
        updatedExistingApplication: Boolean(existingApplication),
      },
      organizationId: organization.id,
    },
  });

  if (!existingCandidate) {
    await queueAutomationEmails({
      applicationId: application.id,
      organizationId: organization.id,
      trigger: AutomationTrigger.CANDIDATE_CREATED,
    });
  }

  await queueAutomationEmails({
    applicationId: application.id,
    organizationId: organization.id,
    trigger: AutomationTrigger.SCORE_UPDATED,
  });

  try {
    await sendApplicationReceivedEmail({
      applicationId: application.id,
      organizationId: organization.id,
      publicToken: applicationToken,
    });
  } catch (error) {
    await prisma.auditEvent.create({
      data: {
        action: "application_received_email.failed",
        applicationId: application.id,
        candidateId: candidate.id,
        entityId: application.id,
        entityType: "application",
        jobId: job.id,
        metadata: {
          error: error instanceof Error ? error.message : "Unknown application received email error.",
        },
        organizationId: organization.id,
      },
    });
  }

  return {
    applicationId: application.id,
    applicationToken,
    candidateId: candidate.id,
    matchScore: match.score,
    ok: true,
    parserStatus,
  };
}
