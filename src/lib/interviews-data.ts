import { buildAvailabilitySettings, formatWorkingDayLabels, type AvailabilitySettings } from "@/lib/availability";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export type InterviewsPageInterview = {
  id: string;
  title: string;
  candidate: string;
  candidateTitle: string;
  jobTitle: string;
  type: string;
  typeValue: string;
  status: string;
  statusValue: string;
  date: string;
  timeRange: string;
  startsAtInput: string;
  durationMinutes: number;
  timezone: string;
  meetingUrl: string | null;
  organizer: string;
  organizerId: string | null;
  matchScore: number;
  stage: string;
  calendarEventUrl: string | null;
  calendarEventId: string | null;
  calendarSyncError: string | null;
  calendarSyncStatus: string;
  calendarSyncedAt: string | null;
};

export type InterviewsPageApplication = {
  id: string;
  label: string;
  candidate: string;
  jobTitle: string;
  matchScore: number;
  stage: string;
};

export type InterviewsPageOrganizer = {
  availabilityLabel: string;
  id: string;
  name: string;
  email: string;
};

export type InterviewsPageSchedulingLink = {
  candidate: string;
  durationMinutes: number;
  id: string;
  jobTitle: string;
  organizer: string;
  token: string;
  url: string;
  bufferLabel: string;
  windowLabel: string;
};

export type InterviewsPageData = {
  availability: AvailabilitySettings & {
    workingDaysLabel: string;
  };
  calendarConnection: {
    connected: boolean;
    connectedEmail: string;
    configured: boolean;
  };
  organizationName: string;
  timezone: string;
  interviews: InterviewsPageInterview[];
  applications: InterviewsPageApplication[];
  organizers: InterviewsPageOrganizer[];
  schedulingLinks: InterviewsPageSchedulingLink[];
  stats: {
    scheduled: number;
    today: number;
    completed: number;
    cancelledOrNoShow: number;
  };
};

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function formatTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function formatDateTime(date: Date, timezone: string) {
  return `${formatDate(date, timezone)} ${formatTime(date, timezone)}`;
}

function formatDateTimeInput(date: Date, timezone: string) {
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

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}T${values.get("hour")}:${values.get("minute")}`;
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
}

function isSameLocalDay(left: Date, right: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });

  return formatter.format(left) === formatter.format(right);
}

function getAvailabilityView(availability: Parameters<typeof buildAvailabilitySettings>[0], fallbackTimezone: string) {
  const settings = buildAvailabilitySettings(availability, fallbackTimezone);

  return {
    ...settings,
    workingDaysLabel: formatWorkingDayLabels(settings.workingDays),
  };
}

export async function getInterviewsPageData({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}): Promise<InterviewsPageData> {
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    include: {
      calendarConnections: {
        where: {
          provider: "google",
          userId,
        },
        take: 1,
      },
      applications: {
        where: {
          status: "ACTIVE",
        },
        include: {
          candidate: true,
          job: true,
          stage: true,
        },
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
      },
      interviews: {
        include: {
          application: {
            include: {
              stage: true,
            },
          },
          candidate: true,
          job: true,
          organizer: true,
        },
        orderBy: {
          startsAt: "asc",
        },
      },
      schedulingLinks: {
        where: {
          active: true,
          bookedAt: null,
        },
        include: {
          application: {
            include: {
              candidate: true,
              job: true,
            },
          },
          organizer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      },
      memberships: {
        where: {
          status: "ACTIVE",
        },
        include: {
          user: {
            include: {
              availabilitySettings: {
                where: {
                  organizationId,
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      availabilitySettings: {
        where: {
          userId,
        },
        take: 1,
      },
    },
  });

  if (!organization) {
    return {
      availability: getAvailabilityView(null, "America/Sao_Paulo"),
      calendarConnection: {
        connected: false,
        connectedEmail: "Not connected",
        configured: isGoogleCalendarConfigured(),
      },
      organizationName: "No organization",
      timezone: "America/Sao_Paulo",
      interviews: [],
      applications: [],
      organizers: [],
      schedulingLinks: [],
      stats: {
        scheduled: 0,
        today: 0,
        completed: 0,
        cancelledOrNoShow: 0,
      },
    };
  }

  const now = new Date();
  const calendarConnection = organization.calendarConnections[0];
  const availability = getAvailabilityView(organization.availabilitySettings[0], organization.timezone);
  const interviews = organization.interviews.map((interview) => ({
    id: interview.id,
    title: interview.title,
    candidate: interview.candidate.name,
    candidateTitle: interview.candidate.currentTitle ?? "Candidate",
    jobTitle: interview.job.title,
    type: formatEnum(interview.type),
    typeValue: interview.type,
    status: formatEnum(interview.status),
    statusValue: interview.status,
    date: formatDate(interview.startsAt, interview.timezone),
    timeRange: `${formatTime(interview.startsAt, interview.timezone)}-${formatTime(interview.endsAt, interview.timezone)}`,
    startsAtInput: formatDateTimeInput(interview.startsAt, interview.timezone),
    durationMinutes: minutesBetween(interview.startsAt, interview.endsAt),
    timezone: interview.timezone,
    meetingUrl: interview.meetingUrl,
    organizer: interview.organizer?.name ?? "Unassigned",
    organizerId: interview.organizerId,
    matchScore: interview.application.matchScore ?? 0,
    stage: interview.application.stage?.name ?? "Unassigned",
    calendarEventUrl: interview.calendarEventUrl,
    calendarEventId: interview.calendarEventId,
    calendarSyncError: interview.calendarSyncError,
    calendarSyncStatus: interview.calendarSyncStatus,
    calendarSyncedAt: interview.calendarSyncedAt ? formatDateTime(interview.calendarSyncedAt, interview.timezone) : null,
  }));

  return {
    availability,
    calendarConnection: {
      connected: Boolean(calendarConnection),
      connectedEmail: calendarConnection?.connectedEmail ?? "Not connected",
      configured: isGoogleCalendarConfigured(),
    },
    organizationName: organization.name,
    timezone: organization.timezone,
    interviews,
    applications: organization.applications
      .map((application) => ({
        id: application.id,
        label: `${application.candidate.name} - ${application.job.title}`,
        candidate: application.candidate.name,
        jobTitle: application.job.title,
        matchScore: application.matchScore ?? 0,
        stage: application.stage?.name ?? "Unassigned",
      }))
      .sort((left, right) => right.matchScore - left.matchScore),
    organizers: organization.memberships.map((membership) => {
      const organizerAvailability = getAvailabilityView(membership.user.availabilitySettings[0], organization.timezone);

      return {
        availabilityLabel: `${organizerAvailability.workingDaysLabel}, ${organizerAvailability.workdayStartHour}:00-${organizerAvailability.workdayEndHour}:00`,
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
      };
    }),
    schedulingLinks: organization.schedulingLinks.map((link) => ({
      bufferLabel: `Buffer ${link.bufferBeforeMinutes}/${link.bufferAfterMinutes} min`,
      candidate: link.application.candidate.name,
      durationMinutes: link.durationMinutes,
      id: link.id,
      jobTitle: link.application.job.title,
      organizer: link.organizer?.name ?? "Unassigned",
      token: link.token,
      url: `/schedule/${link.token}`,
      windowLabel: `${formatWorkingDayLabels(link.workingDays)}, ${link.workdayStartHour}:00-${link.workdayEndHour}:00, ${link.maxDaysAhead} days`,
    })),
    stats: {
      scheduled: organization.interviews.filter((interview) => interview.status === "SCHEDULED").length,
      today: organization.interviews.filter(
        (interview) => interview.status === "SCHEDULED" && isSameLocalDay(interview.startsAt, now, interview.timezone),
      ).length,
      completed: organization.interviews.filter((interview) => interview.status === "COMPLETED").length,
      cancelledOrNoShow: organization.interviews.filter(
        (interview) => interview.status === "CANCELLED" || interview.status === "NO_SHOW",
      ).length,
    },
  };
}
