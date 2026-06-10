import {
  AutomationTrigger,
  CalendarSyncStatus,
  InterviewStatus,
  PipelineCategory,
  Prisma,
} from "@/generated/prisma/client";
import { clamp, normalizeWorkingDays } from "@/lib/availability";
import { queueAutomationEmails } from "@/lib/email-automation";
import { createGoogleCalendarEvent, getGoogleCalendarBusyIntervals } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

const MIN_LEAD_MINUTES = 120;
const MAX_PUBLIC_SLOTS = 30;

type SchedulingLinkWithDetails = Prisma.SchedulingLinkGetPayload<{
  include: {
    application: {
      include: {
        candidate: true;
        job: true;
      };
    };
    interview: true;
    organization: true;
    organizer: true;
  };
}>;

type BusyInterval = {
  end: Date;
  start: Date;
};

export type SchedulingSlot = {
  dateLabel: string;
  endIso: string;
  id: string;
  startIso: string;
  timeRange: string;
};

export type SchedulingPageData =
  | {
      status: "not_found";
    }
  | {
      link: SchedulingLinkWithDetails;
      slots: SchedulingSlot[];
      status: "active";
    }
  | {
      link: SchedulingLinkWithDetails;
      status: "booked" | "expired";
    };

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86400000);
}

function overlaps(left: BusyInterval, right: BusyInterval) {
  return left.start < right.end && left.end > right.start;
}

function getZonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
    month: Number(values.get("month")),
    year: Number(values.get("year")),
  };
}

function getZonedWeekdayNumber(date: Date, timezone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(date);

  return new Map([
    ["Sun", 0],
    ["Mon", 1],
    ["Tue", 2],
    ["Wed", 3],
    ["Thu", 4],
    ["Fri", 5],
    ["Sat", 6],
  ]).get(weekday) ?? 0;
}

function zonedTimeToUtc({
  day,
  hour,
  minute,
  month,
  timezone,
  year,
}: {
  day: number;
  hour: number;
  minute: number;
  month: number;
  timezone: string;
  year: number;
}) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const zonedGuess = getZonedParts(new Date(utcGuess), timezone);
  const zonedGuessAsUtc = Date.UTC(
    zonedGuess.year,
    zonedGuess.month - 1,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute,
  );

  return new Date(utcGuess + (utcGuess - zonedGuessAsUtc));
}

function formatDateLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    timeZone: timezone,
    weekday: "short",
  }).format(date);
}

function formatTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function getLinkStatus(link: SchedulingLinkWithDetails): "active" | "booked" | "expired" {
  if (!link.active || link.bookedAt || link.interviewId) {
    return "booked";
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return "expired";
  }

  return "active";
}

async function getLocalBusyIntervals(link: SchedulingLinkWithDetails, timeMin: Date, timeMax: Date) {
  if (!link.organizerId) {
    return [];
  }

  const interviews = await prisma.interview.findMany({
    where: {
      endsAt: {
        gt: timeMin,
      },
      organizerId: link.organizerId,
      organizationId: link.organizationId,
      startsAt: {
        lt: timeMax,
      },
      status: {
        not: InterviewStatus.CANCELLED,
      },
    },
    select: {
      endsAt: true,
      startsAt: true,
    },
  });

  return interviews.map((interview) => ({
    end: interview.endsAt,
    start: interview.startsAt,
  }));
}

async function getBusyIntervals(link: SchedulingLinkWithDetails, timeMin: Date, timeMax: Date) {
  const localBusy = await getLocalBusyIntervals(link, timeMin, timeMax);

  try {
    const googleBusy = await getGoogleCalendarBusyIntervals({
      organizationId: link.organizationId,
      organizerId: link.organizerId,
      timeMax,
      timeMin,
      timezone: link.timezone,
    });

    return [...localBusy, ...googleBusy.busy];
  } catch {
    return localBusy;
  }
}

export async function getAvailableSchedulingSlots(link: SchedulingLinkWithDetails) {
  const now = new Date();
  const timeMin = addMinutes(now, MIN_LEAD_MINUTES);
  const timeMax = addDays(now, clamp(link.maxDaysAhead, 1, 30));
  const bufferBeforeMinutes = clamp(link.bufferBeforeMinutes, 0, 240);
  const bufferAfterMinutes = clamp(link.bufferAfterMinutes, 0, 240);
  const busyIntervals = (await getBusyIntervals(link, timeMin, timeMax)).map((busyInterval) => ({
    end: addMinutes(busyInterval.end, bufferAfterMinutes),
    start: addMinutes(busyInterval.start, -bufferBeforeMinutes),
  }));
  const slots: SchedulingSlot[] = [];
  const seenDates = new Set<string>();
  const maxDaysAhead = clamp(link.maxDaysAhead, 1, 30);
  const slotIntervalMinutes = clamp(link.slotIntervalMinutes, 15, 120);
  const durationMinutes = clamp(link.durationMinutes, 15, 240);
  const workingDays = normalizeWorkingDays(link.workingDays);
  const workdayStartHour = clamp(link.workdayStartHour, 0, 23);
  const workdayEndHour = clamp(link.workdayEndHour, workdayStartHour + 1, 24);

  for (let dayOffset = 0; dayOffset <= maxDaysAhead && slots.length < MAX_PUBLIC_SLOTS; dayOffset += 1) {
    const zonedParts = getZonedParts(addDays(now, dayOffset), link.timezone);
    const dateKey = `${zonedParts.year}-${zonedParts.month}-${zonedParts.day}`;

    if (seenDates.has(dateKey)) {
      continue;
    }

    seenDates.add(dateKey);

    const midday = zonedTimeToUtc({
      day: zonedParts.day,
      hour: 12,
      minute: 0,
      month: zonedParts.month,
      timezone: link.timezone,
      year: zonedParts.year,
    });
    const weekday = getZonedWeekdayNumber(midday, link.timezone);

    if (!workingDays.includes(weekday)) {
      continue;
    }

    for (
      let minuteOfDay = workdayStartHour * 60;
      minuteOfDay + durationMinutes <= workdayEndHour * 60 && slots.length < MAX_PUBLIC_SLOTS;
      minuteOfDay += slotIntervalMinutes
    ) {
      const start = zonedTimeToUtc({
        day: zonedParts.day,
        hour: Math.floor(minuteOfDay / 60),
        minute: minuteOfDay % 60,
        month: zonedParts.month,
        timezone: link.timezone,
        year: zonedParts.year,
      });
      const end = addMinutes(start, durationMinutes);
      const slotInterval = { end, start };

      if (start < timeMin || busyIntervals.some((busyInterval) => overlaps(slotInterval, busyInterval))) {
        continue;
      }

      slots.push({
        dateLabel: formatDateLabel(start, link.timezone),
        endIso: end.toISOString(),
        id: start.toISOString(),
        startIso: start.toISOString(),
        timeRange: `${formatTime(start, link.timezone)}-${formatTime(end, link.timezone)}`,
      });
    }
  }

  return slots;
}

export async function getSchedulingPageData(token: string): Promise<SchedulingPageData> {
  const link = await prisma.schedulingLink.findUnique({
    where: {
      token,
    },
    include: {
      application: {
        include: {
          candidate: true,
          job: true,
        },
      },
      interview: true,
      organization: true,
      organizer: true,
    },
  });

  if (!link) {
    return {
      status: "not_found",
    };
  }

  const status = getLinkStatus(link);

  if (status === "booked") {
    return {
      link,
      status: "booked",
    };
  }

  if (status === "expired") {
    return {
      link,
      status: "expired",
    };
  }

  return {
    link,
    slots: await getAvailableSchedulingSlots(link),
    status: "active",
  };
}

export async function bookSchedulingSlot({
  slotStartIso,
  token,
}: {
  slotStartIso: string;
  token: string;
}) {
  const pageData = await getSchedulingPageData(token);

  if (pageData.status !== "active") {
    throw new Error("This scheduling link is no longer available.");
  }

  const slot = pageData.slots.find((availableSlot) => availableSlot.startIso === slotStartIso);

  if (!slot) {
    throw new Error("This time is no longer available.");
  }

  const link = pageData.link;
  const startsAt = new Date(slot.startIso);
  const endsAt = new Date(slot.endIso);
  const interviewStage = await prisma.pipelineStage.findFirst({
    where: {
      category: PipelineCategory.INTERVIEW,
      jobId: link.application.jobId,
      organizationId: link.organizationId,
    },
    orderBy: {
      position: "asc",
    },
  });
  const interview = await prisma.interview.create({
    data: {
      applicationId: link.applicationId,
      candidateId: link.application.candidateId,
      endsAt,
      jobId: link.application.jobId,
      meetingUrl: link.meetingUrl,
      organizationId: link.organizationId,
      organizerId: link.organizerId,
      startsAt,
      status: InterviewStatus.SCHEDULED,
      timezone: link.timezone,
      title: link.title,
      type: link.type,
    },
  });

  await prisma.schedulingLink.update({
    where: {
      id: link.id,
    },
    data: {
      active: false,
      bookedAt: new Date(),
      interviewId: interview.id,
    },
  });

  await prisma.application.update({
    where: {
      id: link.applicationId,
    },
    data: {
      stageEnteredAt: interviewStage ? new Date() : link.application.stageEnteredAt,
      stageId: interviewStage?.id ?? link.application.stageId,
    },
  });

  let calendarStatus = "not_connected";

  try {
    const calendarEvent = await createGoogleCalendarEvent({
      application: link.application,
      endsAt,
      interviewId: interview.id,
      meetingUrl: link.meetingUrl,
      organizationId: link.organizationId,
      organizerId: link.organizerId,
      startsAt,
      status: InterviewStatus.SCHEDULED,
      timezone: link.timezone,
      title: link.title,
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
          calendarEventId: calendarEvent.eventId,
          calendarEventUrl: calendarEvent.eventUrl,
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
  }

  await prisma.auditEvent.create({
    data: {
      action: "scheduling_link.booked",
      applicationId: link.applicationId,
      candidateId: link.application.candidateId,
      entityId: link.id,
      entityType: "scheduling_link",
      jobId: link.application.jobId,
      metadata: {
        calendarStatus,
        bufferAfterMinutes: link.bufferAfterMinutes,
        bufferBeforeMinutes: link.bufferBeforeMinutes,
        interviewId: interview.id,
        slotStart: startsAt.toISOString(),
      },
      organizationId: link.organizationId,
    },
  });

  await queueAutomationEmails({
    applicationId: link.applicationId,
    interviewId: interview.id,
    organizationId: link.organizationId,
    trigger: AutomationTrigger.INTERVIEW_SCHEDULED,
  });

  if (interviewStage) {
    await queueAutomationEmails({
      applicationId: link.applicationId,
      interviewId: interview.id,
      organizationId: link.organizationId,
      stageId: interviewStage.id,
      trigger: AutomationTrigger.STAGE_CHANGED,
    });
  }

  return interview;
}
