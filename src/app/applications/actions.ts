"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApplicationStatus,
  AutomationTrigger,
  EmailTrigger,
  InterviewType,
  PipelineCategory,
} from "@/generated/prisma/client";
import { buildAvailabilitySettings } from "@/lib/availability";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { queueAutomationEmails, queueTemplateEmail } from "@/lib/email-automation";
import { prisma } from "@/lib/prisma";
import {
  applyParsedResumeDataToCandidate,
  readResumeReviewSelectedFields,
} from "@/lib/resume-review";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length > 0 ? value : null;
}

function readApplicationIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("applicationIds")
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  ];
}

async function getApplicationForAction(applicationId: string, organizationId: string) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId,
    },
    include: {
      candidate: true,
      job: true,
      stage: true,
    },
  });

  if (!application) {
    throw new Error("Application not found for this organization.");
  }

  return application;
}

async function getOrCreateStage({
  category,
  jobId,
  name,
  organizationId,
}: {
  category: PipelineCategory;
  jobId: string;
  name: string;
  organizationId: string;
}) {
  const existingStage = await prisma.pipelineStage.findFirst({
    where: {
      category,
      jobId,
      organizationId,
    },
    orderBy: {
      position: "asc",
    },
  });

  if (existingStage) {
    return existingStage;
  }

  const stageCount = await prisma.pipelineStage.count({
    where: {
      jobId,
      organizationId,
    },
  });

  return prisma.pipelineStage.create({
    data: {
      category,
      jobId,
      name,
      organizationId,
      position: stageCount,
    },
  });
}

async function getNextPipelinePosition(stageId: string, organizationId: string) {
  return prisma.application.count({
    where: {
      organizationId,
      stageId,
    },
  });
}

function revalidateApplicantIntake(jobId?: string, candidateId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  revalidatePath("/analytics");
  revalidatePath("/candidates");
  revalidatePath("/email-automation");
  revalidatePath("/interviews");
  revalidatePath("/jobs");

  if (jobId) {
    revalidatePath(`/jobs/${jobId}`);
  }

  if (candidateId) {
    revalidatePath(`/candidates/${candidateId}`);
  }
}

async function advanceApplicationToScreeningById({
  actorId,
  applicationId,
  organizationId,
}: {
  actorId: string;
  applicationId: string;
  organizationId: string;
}) {
  const application = await getApplicationForAction(applicationId, organizationId);
  const screeningStage = await getOrCreateStage({
    category: PipelineCategory.SCREENING,
    jobId: application.jobId,
    name: "Screening",
    organizationId,
  });
  const stageChanged = application.stageId !== screeningStage.id;

  await prisma.application.update({
    where: {
      id: application.id,
    },
    data: {
      pipelinePosition: await getNextPipelinePosition(screeningStage.id, organizationId),
      stageEnteredAt: stageChanged ? new Date() : application.stageEnteredAt,
      stageId: screeningStage.id,
      status: ApplicationStatus.ACTIVE,
    },
  });

  const queuedMessages = stageChanged
    ? await queueAutomationEmails({
        applicationId: application.id,
        organizationId,
        stageId: screeningStage.id,
        trigger: AutomationTrigger.STAGE_CHANGED,
      })
    : [];

  await prisma.auditEvent.create({
    data: {
      action: "application.intake_advanced",
      actorId,
      applicationId: application.id,
      candidateId: application.candidateId,
      entityId: application.id,
      entityType: "application",
      jobId: application.jobId,
      metadata: {
        automationMessagesQueued: queuedMessages.length,
        candidateName: application.candidate.name,
        fromStage: application.stage?.name ?? "Unassigned",
        toStage: screeningStage.name,
      },
      organizationId,
    },
  });

  return {
    applicationId: application.id,
    candidateId: application.candidateId,
    jobId: application.jobId,
    queuedMessages: queuedMessages.length,
  };
}

async function rejectApplicationById({
  actorId,
  applicationId,
  organizationId,
  templateId,
}: {
  actorId: string;
  applicationId: string;
  organizationId: string;
  templateId: string | null;
}) {
  const application = await getApplicationForAction(applicationId, organizationId);
  const rejectedStage = await getOrCreateStage({
    category: PipelineCategory.REJECTED,
    jobId: application.jobId,
    name: "Rejected",
    organizationId,
  });

  await prisma.application.update({
    where: {
      id: application.id,
    },
    data: {
      pipelinePosition: await getNextPipelinePosition(rejectedStage.id, organizationId),
      rejectedAt: new Date(),
      stageEnteredAt: new Date(),
      stageId: rejectedStage.id,
      status: ApplicationStatus.REJECTED,
    },
  });

  const message = templateId
    ? await queueTemplateEmail({
        applicationId: application.id,
        organizationId,
        senderId: actorId,
        templateId,
        trigger: EmailTrigger.REJECTION_SENT,
      })
    : null;

  await prisma.auditEvent.create({
    data: {
      action: "application.intake_rejected",
      actorId,
      applicationId: application.id,
      candidateId: application.candidateId,
      entityId: application.id,
      entityType: "application",
      jobId: application.jobId,
      metadata: {
        emailStatus: message?.status ?? "not_sent",
        templateId,
      },
      organizationId,
    },
  });

  return {
    applicationId: application.id,
    candidateId: application.candidateId,
    emailStatus: message?.status ?? null,
    jobId: application.jobId,
  };
}

async function createSchedulingLinkForApplication({
  actorId,
  applicationId,
  organizationId,
  timezone,
}: {
  actorId: string;
  applicationId: string;
  organizationId: string;
  timezone: string;
}) {
  const application = await getApplicationForAction(applicationId, organizationId);
  const organizerAvailability = await prisma.userAvailability.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: actorId,
      },
    },
  });
  const defaults = buildAvailabilitySettings(organizerAvailability, timezone);
  const existingActiveLink = await prisma.schedulingLink.findFirst({
    where: {
      active: true,
      applicationId: application.id,
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const schedulingLink =
    existingActiveLink ??
    (await prisma.schedulingLink.create({
      data: {
        applicationId: application.id,
        bufferAfterMinutes: defaults.bufferAfterMinutes,
        bufferBeforeMinutes: defaults.bufferBeforeMinutes,
        durationMinutes: defaults.defaultDurationMinutes,
        expiresAt: new Date(Date.now() + (defaults.maxDaysAhead + 2) * 86400000),
        maxDaysAhead: defaults.maxDaysAhead,
        organizationId,
        organizerId: actorId,
        slotIntervalMinutes: defaults.slotIntervalMinutes,
        timezone: defaults.timezone,
        title: `Intro call with ${application.candidate.name}`,
        token: randomBytes(24).toString("base64url"),
        type: InterviewType.PHONE_SCREEN,
        workingDays: defaults.workingDays,
        workdayEndHour: defaults.workdayEndHour,
        workdayStartHour: defaults.workdayStartHour,
      },
    }));

  await prisma.auditEvent.create({
    data: {
      action: existingActiveLink ? "scheduling_link.reused_from_intake" : "scheduling_link.created_from_intake",
      actorId,
      applicationId: application.id,
      candidateId: application.candidateId,
      entityId: schedulingLink.id,
      entityType: "scheduling_link",
      jobId: application.jobId,
      metadata: {
        durationMinutes: schedulingLink.durationMinutes,
        token: schedulingLink.token,
      },
      organizationId,
    },
  });

  return {
    applicationId: application.id,
    candidateId: application.candidateId,
    jobId: application.jobId,
    reused: Boolean(existingActiveLink),
    schedulingLinkId: schedulingLink.id,
  };
}

async function markLatestResumeReviewedByApplicationId({
  actorId,
  applicationId,
  organizationId,
}: {
  actorId: string;
  applicationId: string;
  organizationId: string;
}) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId,
    },
    include: {
      candidate: {
        include: {
          resumes: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
      job: true,
    },
  });

  if (!application) {
    throw new Error("Application not found for this organization.");
  }

  const latestResume = application.candidate.resumes[0];

  if (!latestResume) {
    return null;
  }

  const reviewedAt = new Date();

  await prisma.resumeDocument.update({
    where: {
      id: latestResume.id,
    },
    data: {
      reviewedAt,
      reviewedById: actorId,
    },
  });

  await prisma.auditEvent.create({
    data: {
      action: "resume.reviewed_from_intake",
      actorId,
      applicationId: application.id,
      candidateId: application.candidateId,
      entityId: latestResume.id,
      entityType: "resume_document",
      jobId: application.jobId,
      metadata: {
        candidateName: application.candidate.name,
        fileName: latestResume.fileName,
        parserStatus: latestResume.parserStatus,
        reviewedAt: reviewedAt.toISOString(),
      },
      organizationId,
    },
  });

  return {
    applicationId: application.id,
    candidateId: application.candidateId,
    jobId: application.jobId,
    resumeId: latestResume.id,
  };
}

export async function advanceApplicationToScreening(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const applicationId = readString(formData, "applicationId");

  if (!applicationId) {
    throw new Error("Application id is required.");
  }

  const result = await advanceApplicationToScreeningById({
    actorId: session.user.id,
    applicationId,
    organizationId: session.organization.id,
  });

  revalidateApplicantIntake(result.jobId, result.candidateId);
  redirect("/applications?advanced=1");
}

export async function rejectApplicationFromInbox(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const applicationId = readString(formData, "applicationId");
  const templateId = readOptionalString(formData, "templateId");

  if (!applicationId) {
    throw new Error("Application id is required.");
  }

  const result = await rejectApplicationById({
    actorId: session.user.id,
    applicationId,
    organizationId: session.organization.id,
    templateId,
  });

  revalidateApplicantIntake(result.jobId, result.candidateId);
  redirect(
    `/applications?rejected=${
      !templateId ? "closed" : result.emailStatus === "SENT" ? "sent" : result.emailStatus === "FAILED" ? "failed" : "queued"
    }`,
  );
}

export async function createSchedulingLinkFromInbox(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const applicationId = readString(formData, "applicationId");

  if (!applicationId) {
    throw new Error("Application id is required.");
  }

  const result = await createSchedulingLinkForApplication({
    actorId: session.user.id,
    applicationId,
    organizationId: session.organization.id,
    timezone: session.organization.timezone,
  });

  revalidateApplicantIntake(result.jobId, result.candidateId);
  redirect("/applications?scheduling=created");
}

export async function markResumeReviewedFromInbox(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const applicationId = readString(formData, "applicationId");

  if (!applicationId) {
    throw new Error("Application id is required.");
  }

  const result = await markLatestResumeReviewedByApplicationId({
    actorId: session.user.id,
    applicationId,
    organizationId: session.organization.id,
  });

  if (!result) {
    redirect("/applications?resume=missing");
  }

  revalidateApplicantIntake(result.jobId, result.candidateId);
  redirect("/applications?resume=reviewed");
}

export async function applyResumeParsedDataFromInbox(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const applicationId = readString(formData, "applicationId");
  const resumeId = readString(formData, "resumeId");
  const selectedFields = readResumeReviewSelectedFields(formData);

  if (!applicationId || !resumeId) {
    throw new Error("Application and resume are required.");
  }

  const application = await getApplicationForAction(applicationId, session.organization.id);
  const result = await applyParsedResumeDataToCandidate({
    actorId: session.user.id,
    applicationId: application.id,
    candidateId: application.candidateId,
    organizationId: session.organization.id,
    resumeId,
    selectedFields,
  });

  if (result.status === "no-selection") {
    redirect("/applications?resume=no-selection");
  }

  if (result.status === "no-parsed-data") {
    redirect("/applications?resume=no-parsed-data");
  }

  if (result.status === "email-conflict") {
    redirect("/applications?resume=email-conflict");
  }

  revalidateApplicantIntake(application.jobId, application.candidateId);
  redirect(
    `/applications?resume=applied&fields=${result.appliedFields.length}&matches=${result.matchRecalculation.applicationsUpdated}`,
  );
}

export async function runBulkApplicationsAction(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const applicationIds = readApplicationIds(formData);
  const bulkAction = readString(formData, "bulkAction");
  const templateId = readOptionalString(formData, "templateId");

  if (applicationIds.length === 0) {
    redirect("/applications?bulk=empty");
  }

  const results = [];

  for (const applicationId of applicationIds) {
    if (bulkAction === "screening") {
      results.push(
        await advanceApplicationToScreeningById({
          actorId: session.user.id,
          applicationId,
          organizationId: session.organization.id,
        }),
      );
    } else if (bulkAction === "schedule") {
      results.push(
        await createSchedulingLinkForApplication({
          actorId: session.user.id,
          applicationId,
          organizationId: session.organization.id,
          timezone: session.organization.timezone,
        }),
      );
    } else if (bulkAction === "reject") {
      results.push(
        await rejectApplicationById({
          actorId: session.user.id,
          applicationId,
          organizationId: session.organization.id,
          templateId,
        }),
      );
    } else if (bulkAction === "reviewed") {
      const result = await markLatestResumeReviewedByApplicationId({
        actorId: session.user.id,
        applicationId,
        organizationId: session.organization.id,
      });

      if (result) {
        results.push(result);
      }
    } else {
      throw new Error("Bulk action is required.");
    }
  }

  if (results.length === 0) {
    redirect("/applications?bulk=missing-resume");
  }

  for (const result of results) {
    revalidateApplicantIntake(result.jobId, result.candidateId);
  }

  redirect(`/applications?bulk=${bulkAction}&count=${results.length}`);
}
