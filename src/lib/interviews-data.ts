import { isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

export type InterviewsPageInterview = {
  id: string;
  title: string;
  candidate: string;
  candidateTitle: string;
  jobTitle: string;
  type: string;
  status: string;
  date: string;
  timeRange: string;
  durationMinutes: number;
  timezone: string;
  meetingUrl: string | null;
  organizer: string;
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
  id: string;
  name: string;
  email: string;
};

export type InterviewsPageData = {
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
      memberships: {
        where: {
          status: "ACTIVE",
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!organization) {
    return {
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
  const interviews = organization.interviews.map((interview) => ({
    id: interview.id,
    title: interview.title,
    candidate: interview.candidate.name,
    candidateTitle: interview.candidate.currentTitle ?? "Candidate",
    jobTitle: interview.job.title,
    type: formatEnum(interview.type),
    status: formatEnum(interview.status),
    date: formatDate(interview.startsAt, interview.timezone),
    timeRange: `${formatTime(interview.startsAt, interview.timezone)}-${formatTime(interview.endsAt, interview.timezone)}`,
    durationMinutes: minutesBetween(interview.startsAt, interview.endsAt),
    timezone: interview.timezone,
    meetingUrl: interview.meetingUrl,
    organizer: interview.organizer?.name ?? "Unassigned",
    matchScore: interview.application.matchScore ?? 0,
    stage: interview.application.stage?.name ?? "Unassigned",
    calendarEventUrl: interview.calendarEventUrl,
    calendarEventId: interview.calendarEventId,
    calendarSyncError: interview.calendarSyncError,
    calendarSyncStatus: interview.calendarSyncStatus,
    calendarSyncedAt: interview.calendarSyncedAt ? formatDateTime(interview.calendarSyncedAt, interview.timezone) : null,
  }));

  return {
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
    organizers: organization.memberships.map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
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
