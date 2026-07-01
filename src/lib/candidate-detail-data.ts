import { prisma } from "@/lib/prisma";
import { canDownloadStoredResume } from "@/lib/resume-storage";

type MatchExplanation = {
  gaps?: unknown;
  notes?: unknown;
  score?: unknown;
  strengths?: unknown;
};

type ParsedResumeData = {
  availability: string | null;
  currency: string | null;
  currentTitle: string | null;
  education: unknown[];
  email: string | null;
  experience: unknown[];
  location: string | null;
  name: string | null;
  phone: string | null;
  salaryExpectation: number | null;
  skills: string[];
  summary: string | null;
  yearsExperience: number | null;
};

type ResumeReview = {
  canApply: boolean;
  educationCount: number;
  experienceCount: number;
  fields: {
    currentValue: string;
    key: string;
    label: string;
    parsedValue: string;
  }[];
  skills: string[];
};

export type CandidateDetailData = {
  organizationName: string;
  candidate: {
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
    createdAt: string;
    editable: {
      availability: string;
      currency: string;
      currentTitle: string;
      email: string;
      location: string;
      name: string;
      phone: string;
      salaryExpectation: number | null;
      source: string;
      summary: string;
      yearsExperience: number | null;
    };
  };
  stats: {
    applications: number;
    interviews: number;
    emails: number;
    resumes: number;
    avgScore: number;
  };
  skills: string[];
  education: {
    id: string;
    label: string;
  }[];
  experience: {
    id: string;
    company: string;
    title: string;
    period: string;
    description: string;
  }[];
  applications: {
    id: string;
    jobId: string;
    jobTitle: string;
    jobStatus: string;
    stage: string;
    status: string;
    source: string;
    matchScore: number;
    strengths: string[];
    gaps: string[];
    notes: string[];
    appliedAt: string;
    stageEnteredAt: string;
    aiAnalysisStatus: string;
  }[];
  resumes: {
    downloadUrl: string | null;
    id: string;
    fileName: string;
    viewerUrl: string;
    parserStatus: string;
    mimeType: string;
    size: string;
    parsedAt: string;
    parsedSummary: string;
    rawPreview: string;
    review: ResumeReview | null;
    storageLabel: string;
  }[];
  notes: {
    id: string;
    author: string;
    body: string;
    visibility: string;
    context: string;
    createdAt: string;
  }[];
  emails: {
    id: string;
    subject: string;
    status: string;
    trigger: string;
    jobTitle: string;
    template: string;
    sentAt: string;
    bodyPreview: string;
  }[];
  interviews: {
    id: string;
    title: string;
    jobTitle: string;
    type: string;
    status: string;
    organizer: string;
    startsAt: string;
    meetingUrl: string;
  }[];
};

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date?: Date | null) {
  if (!date) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date?: Date | null, timezone = "America/Sao_Paulo") {
  if (!date) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

function formatSalary(value?: number | null, currency = "USD") {
  if (!value) {
    return "Open";
  }

  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${Math.round(value / 1000)}k`;
}

function formatBytes(value?: number | null) {
  if (!value) {
    return "Unknown";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatStorageLabel(fileKey?: string | null, fileUrl?: string | null) {
  if (fileKey?.startsWith("s3:")) {
    return "S3/R2 storage";
  }

  if (fileKey?.startsWith("local:")) {
    return "Local storage";
  }

  if (fileUrl) {
    return "External storage";
  }

  return "Metadata only";
}

function formatPeriod(startDate?: Date | null, endDate?: Date | null, current?: boolean) {
  const start = startDate ? formatDate(startDate) : "Unknown";
  const end = current ? "Present" : endDate ? formatDate(endDate) : "Unknown";

  return `${start} - ${end}`;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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

function readParsedResumeData(value: unknown): ParsedResumeData | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = readParsedText(value.name);
  const summary = readParsedText(value.summary);

  if (!name && !summary) {
    return null;
  }

  return {
    availability: readParsedText(value.availability),
    currency: readParsedText(value.currency),
    currentTitle: readParsedText(value.currentTitle),
    education: Array.isArray(value.education) ? value.education.filter(isRecord) : [],
    email: readParsedText(value.email),
    experience: Array.isArray(value.experience) ? value.experience.filter(isRecord) : [],
    location: readParsedText(value.location),
    name,
    phone: readParsedText(value.phone),
    salaryExpectation: readParsedNumber(value.salaryExpectation),
    skills: readStringArray(value.skills).map((skill) => skill.trim()).filter(Boolean),
    summary,
    yearsExperience: readParsedNumber(value.yearsExperience),
  };
}

function readMatchExplanation(value: unknown): MatchExplanation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as MatchExplanation;
}

function addReviewField({
  currentValue,
  fields,
  key,
  label,
  parsedValue,
}: {
  currentValue: string;
  fields: ResumeReview["fields"];
  key: string;
  label: string;
  parsedValue: string | null;
}) {
  if (!parsedValue || parsedValue.trim() === currentValue.trim()) {
    return;
  }

  const displayCurrentValue = currentValue.length > 220 ? `${currentValue.slice(0, 217)}...` : currentValue;
  const displayParsedValue = parsedValue.length > 220 ? `${parsedValue.slice(0, 217)}...` : parsedValue;

  fields.push({
    currentValue: displayCurrentValue,
    key,
    label,
    parsedValue: displayParsedValue,
  });
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

function formatEditableCandidateSummary(summary?: string | null) {
  if (!summary) {
    return "";
  }

  if (/OPENAI_API_KEY|OpenAI parsing|waiting for OpenAI/i.test(summary)) {
    return "Resume saved for local review. Add readable resume text if this PDF is scanned or image-only.";
  }

  return summary;
}

function buildResumeReview({
  candidate,
  currentSkills,
  parsedData,
}: {
  candidate: {
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
  currentSkills: string[];
  parsedData: unknown;
}): ResumeReview | null {
  const parsed = readParsedResumeData(parsedData);

  if (!parsed) {
    return null;
  }

  const fields: ResumeReview["fields"] = [];

  addReviewField({
    currentValue: candidate.name,
    fields,
    key: "name",
    label: "Name",
    parsedValue: parsed.name,
  });
  addReviewField({
    currentValue: candidate.email ?? "No email",
    fields,
    key: "email",
    label: "Email",
    parsedValue: parsed.email,
  });
  addReviewField({
    currentValue: candidate.phone ?? "No phone",
    fields,
    key: "phone",
    label: "Phone",
    parsedValue: parsed.phone,
  });
  addReviewField({
    currentValue: candidate.location ?? "Remote",
    fields,
    key: "location",
    label: "Location",
    parsedValue: parsed.location,
  });
  addReviewField({
    currentValue: candidate.currentTitle ?? "Candidate",
    fields,
    key: "currentTitle",
    label: "Title",
    parsedValue: parsed.currentTitle,
  });
  addReviewField({
    currentValue: candidate.yearsExperience ? `${candidate.yearsExperience} years` : "Not provided",
    fields,
    key: "yearsExperience",
    label: "Experience",
    parsedValue: parsed.yearsExperience ? `${Math.round(parsed.yearsExperience)} years` : null,
  });
  addReviewField({
    currentValue: candidate.availability ?? "Unknown",
    fields,
    key: "availability",
    label: "Availability",
    parsedValue: parsed.availability,
  });
  addReviewField({
    currentValue: formatSalary(candidate.salaryExpectation, candidate.currency),
    fields,
    key: "salaryExpectation",
    label: "Target salary",
    parsedValue: parsed.salaryExpectation ? formatSalary(parsed.salaryExpectation, parsed.currency ?? candidate.currency) : null,
  });
  addReviewField({
    currentValue: candidate.currency,
    fields,
    key: "currency",
    label: "Currency",
    parsedValue: parsed.currency,
  });
  addReviewField({
    currentValue: candidate.summary ?? "No profile summary yet.",
    fields,
    key: "summary",
    label: "Summary",
    parsedValue: parsed.summary,
  });

  const currentSkillSet = new Set(currentSkills.map((skill) => skill.toLowerCase()));
  const parsedSkillSet = new Set(parsed.skills.map((skill) => skill.toLowerCase()));
  const skillsChanged =
    parsed.skills.length > 0 &&
    (parsedSkillSet.size !== currentSkillSet.size || parsed.skills.some((skill) => !currentSkillSet.has(skill.toLowerCase())));
  const skills = skillsChanged ? parsed.skills : [];
  const review = {
    canApply: fields.length > 0 || skills.length > 0 || parsed.education.length > 0 || parsed.experience.length > 0,
    educationCount: parsed.education.length,
    experienceCount: parsed.experience.length,
    fields,
    skills,
  };

  return review.canApply ? review : null;
}

function stringifyPreview(value: unknown, fallback: string) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    return value.slice(0, 360);
  }

  if (typeof value === "object") {
    const parsed = value as Record<string, unknown>;
    const summary = typeof parsed.summary === "string" ? parsed.summary : null;
    const source = typeof parsed.source === "string" ? parsed.source : null;
    const skills = readStringArray(parsed.skills);

    return [summary, source ? `Source: ${source}` : null, skills.length ? `Skills: ${skills.slice(0, 8).join(", ")}` : null]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 360) || fallback;
  }

  return fallback;
}

export async function getCandidateDetailData({
  candidateId,
  organizationId,
}: {
  candidateId: string;
  organizationId: string;
}): Promise<CandidateDetailData | null> {
  const candidate = await prisma.candidate.findFirst({
    where: {
      id: candidateId,
      organizationId,
    },
    include: {
      applications: {
        include: {
          job: true,
          stage: true,
        },
        orderBy: {
          appliedAt: "desc",
        },
      },
      education: {
        orderBy: {
          institution: "asc",
        },
      },
      emailMessages: {
        include: {
          application: {
            include: {
              job: true,
            },
          },
          template: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      experience: {
        orderBy: [
          {
            current: "desc",
          },
          {
            startDate: "desc",
          },
        ],
      },
      interviews: {
        include: {
          job: true,
          organizer: true,
        },
        orderBy: {
          startsAt: "desc",
        },
      },
      notes: {
        include: {
          application: {
            include: {
              job: true,
            },
          },
          author: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      organization: true,
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
  });

  if (!candidate) {
    return null;
  }

  const scoredApplications = candidate.applications.filter((application) => application.matchScore !== null);
  const avgScore = scoredApplications.length
    ? Math.round(
        scoredApplications.reduce((total, application) => total + (application.matchScore ?? 0), 0) /
          scoredApplications.length,
      )
    : 0;
  const currentSkills = candidate.skills.map(({ skill }) => skill.name);

  return {
    organizationName: candidate.organization.name,
    candidate: {
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
      createdAt: formatDate(candidate.createdAt),
      editable: {
        availability: candidate.availability ?? "",
        currency: candidate.currency,
        currentTitle: candidate.currentTitle ?? "",
        email: candidate.email ?? "",
        location: candidate.location ?? "",
        name: candidate.name,
        phone: candidate.phone ?? "",
        salaryExpectation: candidate.salaryExpectation,
        source: candidate.source,
        summary: formatEditableCandidateSummary(candidate.summary),
        yearsExperience: candidate.yearsExperience,
      },
    },
    stats: {
      applications: candidate.applications.length,
      interviews: candidate.interviews.length,
      emails: candidate.emailMessages.length,
      resumes: candidate.resumes.length,
      avgScore,
    },
    skills: currentSkills,
    education: candidate.education.map((education) => ({
      id: education.id,
      label: [education.degree, education.field, education.institution].filter(Boolean).join(", "),
    })),
    experience: candidate.experience.map((experience) => ({
      id: experience.id,
      company: experience.company,
      title: experience.title,
      period: formatPeriod(experience.startDate, experience.endDate, experience.current),
      description: experience.description ?? "No description provided.",
    })),
    applications: candidate.applications.map((application) => {
      const explanation = readMatchExplanation(application.matchExplanation);

      return {
        id: application.id,
        jobId: application.jobId,
        jobTitle: application.job.title,
        jobStatus: formatEnum(application.job.status),
        stage: application.stage?.name ?? "Unassigned",
        status: formatEnum(application.status),
        source: formatEnum(application.source),
        matchScore: application.matchScore ?? 0,
        strengths: readStringArray(explanation.strengths),
        gaps: readStringArray(explanation.gaps),
        notes: readStringArray(explanation.notes),
        appliedAt: formatDate(application.appliedAt),
        stageEnteredAt: formatDate(application.stageEnteredAt),
        aiAnalysisStatus: application.aiAnalysisStatus,
      };
    }),
    resumes: candidate.resumes.map((resume) => ({
      downloadUrl: canDownloadStoredResume(resume.fileKey, resume.fileUrl)
        ? `/candidates/${candidate.id}/resumes/${resume.id}`
        : null,
      id: resume.id,
      fileName: resume.fileName,
      viewerUrl: `/candidates/${candidate.id}/resumes/${resume.id}/viewer`,
      parserStatus: formatEnum(resume.parserStatus),
      mimeType: resume.mimeType ?? "Unknown",
      size: formatBytes(resume.sizeBytes),
      parsedAt: formatDateTime(resume.parsedAt, candidate.organization.timezone),
      parsedSummary: stringifyPreview(resume.parsedData, "No parsed data available."),
      rawPreview: resume.rawText?.slice(0, 360) ?? "No raw text stored for this resume.",
      review: buildResumeReview({
        candidate,
        currentSkills,
        parsedData: resume.parsedData,
      }),
      storageLabel: formatStorageLabel(resume.fileKey, resume.fileUrl),
    })),
    notes: candidate.notes.map((note) => ({
      id: note.id,
      author: note.author?.name ?? "System",
      body: note.body,
      visibility: formatEnum(note.visibility),
      context: note.application?.job.title ?? "Candidate profile",
      createdAt: formatDateTime(note.createdAt, candidate.organization.timezone),
    })),
    emails: candidate.emailMessages.map((email) => ({
      id: email.id,
      subject: email.subject,
      status: formatEnum(email.status),
      trigger: formatEnum(email.trigger),
      jobTitle: email.application?.job.title ?? "No job linked",
      template: email.template?.name ?? "Manual",
      sentAt: formatDateTime(email.sentAt ?? email.createdAt, candidate.organization.timezone),
      bodyPreview: email.body.slice(0, 220),
    })),
    interviews: candidate.interviews.map((interview) => ({
      id: interview.id,
      title: interview.title,
      jobTitle: interview.job.title,
      type: formatEnum(interview.type),
      status: formatEnum(interview.status),
      organizer: interview.organizer?.name ?? "Unassigned",
      startsAt: formatDateTime(interview.startsAt, interview.timezone),
      meetingUrl: interview.meetingUrl ?? "",
    })),
  };
}
