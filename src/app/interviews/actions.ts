"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AutomationTrigger,
  CalendarSyncStatus,
  InterviewStatus,
  InterviewType,
  PipelineCategory,
} from "@/generated/prisma/client";
import { queueAutomationEmails } from "@/lib/email-automation";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, disconnectGoogleCalendarConnection } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

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

function readEnum<T extends Record<string, string>>(enumObject: T, value: string, fallback: T[keyof T]) {
  return Object.values(enumObject).includes(value) ? (value as T[keyof T]) : fallback;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function parseDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("A valid interview start time is required.");
  }

  return date;
}

export async function createInterview(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const applicationId = readString(formData, "applicationId");
  const title = readString(formData, "title");
  const startsAt = parseDateTime(readString(formData, "startsAt"));
  const durationMinutes = Math.max(15, readNumber(formData, "durationMinutes") ?? 45);
  const type = readEnum(InterviewType, readString(formData, "type"), InterviewType.PHONE_SCREEN);
  const organizerId = readOptionalString(formData, "organizerId") ?? session.user.id;

  if (!applicationId || !title) {
    throw new Error("Application and title are required to schedule an interview.");
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      organizationId: organization.id,
    },
    include: {
      candidate: true,
      job: true,
    },
  });

  if (!application) {
    throw new Error("Application not found for this organization.");
  }

  const interviewStage = await prisma.pipelineStage.findFirst({
    where: {
      organizationId: organization.id,
      jobId: application.jobId,
      category: PipelineCategory.INTERVIEW,
    },
    orderBy: {
      position: "asc",
    },
  });

  const interview = await prisma.interview.create({
    data: {
      organizationId: organization.id,
      applicationId: application.id,
      candidateId: application.candidateId,
      jobId: application.jobId,
      organizerId,
      title,
      type,
      status: InterviewStatus.SCHEDULED,
      startsAt,
      endsAt: addMinutes(startsAt, durationMinutes),
      timezone: readOptionalString(formData, "timezone") ?? organization.timezone,
      meetingUrl: readOptionalString(formData, "meetingUrl"),
    },
  });
  let calendarStatus = "not_connected";

  try {
    const calendarEvent = await createGoogleCalendarEvent({
      application,
      endsAt: interview.endsAt,
      interviewId: interview.id,
      meetingUrl: interview.meetingUrl,
      organizationId: organization.id,
      organizerId,
      startsAt: interview.startsAt,
      timezone: interview.timezone,
      title,
    });

    if (calendarEvent.skipped) {
      calendarStatus = calendarEvent.reason ?? "skipped";
    } else {
      calendarStatus = "synced";
      await prisma.interview.update({
        where: {
          id: interview.id,
        },
        data: {
          calendarEventUrl: calendarEvent.eventUrl,
          calendarEventId: calendarEvent.eventId,
          calendarProvider: "google",
          calendarSyncedAt: new Date(),
          calendarSyncError: null,
          calendarSyncStatus: CalendarSyncStatus.SYNCED,
          meetingUrl: calendarEvent.meetingUrl,
        },
      });
    }
  } catch (error) {
    calendarStatus = "failed";
    await prisma.interview.update({
      where: {
        id: interview.id,
      },
      data: {
        calendarSyncError: error instanceof Error ? error.message : "Unknown Google Calendar sync error.",
        calendarSyncStatus: CalendarSyncStatus.FAILED,
      },
    });
    await prisma.auditEvent.create({
      data: {
        organizationId: organization.id,
        actorId: session.user.id,
        jobId: application.jobId,
        candidateId: application.candidateId,
        applicationId: application.id,
        action: "calendar.google_sync_failed",
        entityType: "interview",
        entityId: interview.id,
        metadata: {
          error: error instanceof Error ? error.message : "Unknown Google Calendar sync error.",
        },
      },
    });
  }

  await prisma.application.update({
    where: {
      id: application.id,
    },
    data: {
      stageId: interviewStage?.id ?? application.stageId,
      stageEnteredAt: interviewStage ? new Date() : application.stageEnteredAt,
    },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      jobId: application.jobId,
      candidateId: application.candidateId,
      applicationId: application.id,
      action: "interview.scheduled",
      entityType: "interview",
      entityId: interview.id,
      metadata: {
        calendarStatus,
        title,
        type,
        startsAt: startsAt.toISOString(),
      },
    },
  });

  await queueAutomationEmails({
    organizationId: organization.id,
    applicationId: application.id,
    interviewId: interview.id,
    trigger: AutomationTrigger.INTERVIEW_SCHEDULED,
  });

  if (interviewStage) {
    await queueAutomationEmails({
      organizationId: organization.id,
      applicationId: application.id,
      interviewId: interview.id,
      stageId: interviewStage.id,
      trigger: AutomationTrigger.STAGE_CHANGED,
    });
  }

  revalidatePath("/");
  revalidatePath("/interviews");
  revalidatePath("/candidates");
  revalidatePath("/email-automation");

  redirect(`/interviews?created=1&calendar=${calendarStatus}`);
}

export async function disconnectGoogleCalendar(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const next = readOptionalString(formData, "next") ?? "/interviews";

  await disconnectGoogleCalendarConnection({
    organizationId: organization.id,
    userId: session.user.id,
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      action: "calendar.google_disconnected",
      entityType: "calendar_connection",
      entityId: session.user.id,
      metadata: {
        provider: "google",
      },
    },
  });

  revalidatePath("/interviews");
  redirect(`${next}?calendar=disconnected`);
}

export async function updateInterviewStatus(formData: FormData) {
  const session = await requireRole(recruitingRoles);
  const organization = session.organization;
  const interviewId = readString(formData, "interviewId");
  const status = readEnum(InterviewStatus, readString(formData, "status"), InterviewStatus.SCHEDULED);

  if (!interviewId) {
    throw new Error("Interview id is required.");
  }

  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,
      organizationId: organization.id,
    },
  });

  if (!interview) {
    throw new Error("Interview not found for this organization.");
  }

  let calendarStatus: string | null = null;
  const interviewUpdate: {
    calendarSyncedAt?: Date;
    calendarSyncError?: string | null;
    calendarSyncStatus?: CalendarSyncStatus;
    status: InterviewStatus;
  } = {
    status,
  };

  if (
    status === InterviewStatus.CANCELLED &&
    interview.status !== InterviewStatus.CANCELLED &&
    interview.calendarEventId &&
    interview.calendarSyncStatus === CalendarSyncStatus.SYNCED
  ) {
    try {
      const deletion = await deleteGoogleCalendarEvent({
        calendarEventId: interview.calendarEventId,
        organizationId: organization.id,
        organizerId: interview.organizerId,
      });

      calendarStatus = deletion.reason === "already_removed" ? "already_removed" : "cancelled";
      interviewUpdate.calendarSyncedAt = new Date();
      interviewUpdate.calendarSyncError = null;
      interviewUpdate.calendarSyncStatus = CalendarSyncStatus.CANCELLED;

      await prisma.auditEvent.create({
        data: {
          organizationId: organization.id,
          actorId: session.user.id,
          jobId: interview.jobId,
          candidateId: interview.candidateId,
          applicationId: interview.applicationId,
          action: "calendar.google_cancelled",
          entityType: "interview",
          entityId: interview.id,
          metadata: {
            calendarEventId: interview.calendarEventId,
            reason: deletion.reason,
          },
        },
      });
    } catch (error) {
      calendarStatus = "cancel_failed";
      interviewUpdate.calendarSyncError = error instanceof Error ? error.message : "Unknown Google Calendar cancellation error.";
      interviewUpdate.calendarSyncStatus = CalendarSyncStatus.FAILED;

      await prisma.auditEvent.create({
        data: {
          organizationId: organization.id,
          actorId: session.user.id,
          jobId: interview.jobId,
          candidateId: interview.candidateId,
          applicationId: interview.applicationId,
          action: "calendar.google_cancel_failed",
          entityType: "interview",
          entityId: interview.id,
          metadata: {
            calendarEventId: interview.calendarEventId,
            error: error instanceof Error ? error.message : "Unknown Google Calendar cancellation error.",
          },
        },
      });
    }
  }

  await prisma.interview.update({
    where: {
      id: interview.id,
    },
    data: interviewUpdate,
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: organization.id,
      actorId: session.user.id,
      jobId: interview.jobId,
      candidateId: interview.candidateId,
      applicationId: interview.applicationId,
      action: "interview.status_updated",
      entityType: "interview",
      entityId: interview.id,
      metadata: {
        calendarStatus,
        status,
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/interviews");

  redirect(`/interviews?updated=1${calendarStatus ? `&calendar=${calendarStatus}` : ""}`);
}
