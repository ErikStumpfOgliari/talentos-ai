import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/secure-token";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_CALENDAR_PROVIDER = "google";
const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
];

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleUserInfoResponse = {
  email?: string;
};

type GoogleCalendarEventResponse = {
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
  hangoutLink?: string;
  htmlLink?: string;
  id?: string;
};

type CreateCalendarEventInput = {
  application: {
    candidate: {
      email: string | null;
      name: string;
    };
    job: {
      title: string;
    };
  };
  endsAt: Date;
  interviewId: string;
  meetingUrl: string | null;
  organizationId: string;
  organizerId: string | null;
  startsAt: Date;
  timezone: string;
  title: string;
};

type DeleteCalendarEventInput = {
  calendarEventId: string | null;
  organizationId: string;
  organizerId: string | null;
};

function getGoogleCalendarClientConfig(origin?: string) {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ||
    (origin ? `${origin}/api/integrations/google-calendar/callback` : null);

  return {
    clientId,
    clientSecret,
    configured: Boolean(clientId && clientSecret && redirectUri),
    redirectUri,
  };
}

function getTokenExpiry(expiresIn?: number) {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
}

function parseGoogleError(responseText: string) {
  try {
    const parsed = JSON.parse(responseText) as { error?: { message?: string } | string; error_description?: string };

    if (typeof parsed.error === "object" && parsed.error?.message) {
      return parsed.error.message;
    }

    if (typeof parsed.error === "string") {
      return parsed.error_description ?? parsed.error;
    }
  } catch {
    return responseText;
  }

  return responseText;
}

function shouldCreateGoogleMeet(meetingUrl: string | null) {
  return !meetingUrl && process.env.GOOGLE_CALENDAR_CREATE_MEET !== "false";
}

function readGoogleMeetLink(event: GoogleCalendarEventResponse) {
  return (
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find((entryPoint) => entryPoint.entryPointType === "video" && entryPoint.uri)?.uri ??
    null
  );
}

async function postGoogleToken(body: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(parseGoogleError(responseText));
  }

  return JSON.parse(responseText) as GoogleTokenResponse;
}

export function isGoogleCalendarConfigured(origin?: string) {
  const config = getGoogleCalendarClientConfig(origin);
  return Boolean(config.clientId && config.clientSecret && (config.redirectUri || origin));
}

export function buildGoogleCalendarAuthUrl({
  origin,
  state,
}: {
  origin: string;
  state: string;
}) {
  const config = getGoogleCalendarClientConfig(origin);

  if (!config.configured || !config.clientId || !config.redirectUri) {
    throw new Error("Google Calendar OAuth is not configured.");
  }

  const params = new URLSearchParams({
    access_type: "offline",
    client_id: config.clientId,
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES.join(" "),
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCalendarCode({
  code,
  organizationId,
  origin,
  userId,
}: {
  code: string;
  organizationId: string;
  origin: string;
  userId: string;
}) {
  const config = getGoogleCalendarClientConfig(origin);

  if (!config.configured || !config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("Google Calendar OAuth is not configured.");
  }

  const tokens = await postGoogleToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  );

  if (!tokens.access_token) {
    throw new Error("Google OAuth did not return an access token.");
  }

  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });
  const userInfo = userInfoResponse.ok ? ((await userInfoResponse.json()) as GoogleUserInfoResponse) : {};
  const existingConnection = await prisma.calendarConnection.findUnique({
    where: {
      organizationId_userId_provider: {
        organizationId,
        provider: GOOGLE_CALENDAR_PROVIDER,
        userId,
      },
    },
    select: {
      refreshToken: true,
    },
  });

  return prisma.calendarConnection.upsert({
    where: {
      organizationId_userId_provider: {
        organizationId,
        provider: GOOGLE_CALENDAR_PROVIDER,
        userId,
      },
    },
    update: {
      accessToken: encryptSecret(tokens.access_token),
      connectedEmail: userInfo.email,
      expiresAt: getTokenExpiry(tokens.expires_in),
      refreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : existingConnection?.refreshToken,
      scope: tokens.scope,
      tokenType: tokens.token_type,
    },
    create: {
      organizationId,
      userId,
      provider: GOOGLE_CALENDAR_PROVIDER,
      connectedEmail: userInfo.email,
      calendarId: "primary",
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      scope: tokens.scope,
      tokenType: tokens.token_type,
      expiresAt: getTokenExpiry(tokens.expires_in),
    },
  });
}

export async function disconnectGoogleCalendarConnection({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  await prisma.calendarConnection.deleteMany({
    where: {
      organizationId,
      provider: GOOGLE_CALENDAR_PROVIDER,
      userId,
    },
  });
}

async function getValidGoogleCalendarAccessToken(connectionId: string) {
  const connection = await prisma.calendarConnection.findUnique({
    where: {
      id: connectionId,
    },
  });

  if (!connection) {
    throw new Error("Google Calendar connection was not found.");
  }

  if (!connection.expiresAt || connection.expiresAt.getTime() > Date.now() + 120_000) {
    return {
      accessToken: decryptSecret(connection.accessToken),
      calendarId: connection.calendarId,
    };
  }

  if (!connection.refreshToken) {
    throw new Error("Google Calendar refresh token is missing.");
  }

  const config = getGoogleCalendarClientConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error("Google Calendar OAuth is not configured.");
  }

  const refreshedTokens = await postGoogleToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: decryptSecret(connection.refreshToken),
    }),
  );

  if (!refreshedTokens.access_token) {
    throw new Error("Google OAuth refresh did not return an access token.");
  }

  await prisma.calendarConnection.update({
    where: {
      id: connection.id,
    },
    data: {
      accessToken: encryptSecret(refreshedTokens.access_token),
      expiresAt: getTokenExpiry(refreshedTokens.expires_in),
      scope: refreshedTokens.scope ?? connection.scope,
      tokenType: refreshedTokens.token_type ?? connection.tokenType,
    },
  });

  return {
    accessToken: refreshedTokens.access_token,
    calendarId: connection.calendarId,
  };
}

export async function createGoogleCalendarEvent({
  application,
  endsAt,
  interviewId,
  meetingUrl,
  organizationId,
  organizerId,
  startsAt,
  timezone,
  title,
}: CreateCalendarEventInput) {
  if (!organizerId) {
    return { skipped: true, reason: "missing_organizer" };
  }

  const connection = await prisma.calendarConnection.findUnique({
    where: {
      organizationId_userId_provider: {
        organizationId,
        provider: GOOGLE_CALENDAR_PROVIDER,
        userId: organizerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!connection) {
    return { skipped: true, reason: "calendar_not_connected" };
  }

  const { accessToken, calendarId } = await getValidGoogleCalendarAccessToken(connection.id);
  const createMeet = shouldCreateGoogleMeet(meetingUrl);
  const description = [
    `Candidate: ${application.candidate.name}`,
    `Role: ${application.job.title}`,
    meetingUrl ? `Meeting: ${meetingUrl}` : createMeet ? "Meeting: Google Meet will be generated by Calendar." : null,
    "",
    `TalentOS interview ID: ${interviewId}`,
  ]
    .filter(Boolean)
    .join("\n");
  const attendees = application.candidate.email ? [{ email: application.candidate.email, displayName: application.candidate.name }] : [];
  const eventPayload = {
    attendees,
    description,
    end: {
      dateTime: endsAt.toISOString(),
      timeZone: timezone,
    },
    conferenceData: createMeet
      ? {
          createRequest: {
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
            requestId: `talentos-${interviewId}-${randomUUID()}`,
          },
        }
      : undefined,
    location: meetingUrl ?? undefined,
    start: {
      dateTime: startsAt.toISOString(),
      timeZone: timezone,
    },
    summary: `${title} - ${application.candidate.name}`,
  };
  const params = new URLSearchParams({
    sendUpdates: process.env.GOOGLE_CALENDAR_SEND_UPDATES ?? "none",
  });

  if (createMeet) {
    params.set("conferenceDataVersion", "1");
  }

  const response = await fetch(
    `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    {
      body: JSON.stringify(eventPayload),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(parseGoogleError(responseText));
  }

  const event = JSON.parse(responseText) as GoogleCalendarEventResponse;

  if (!event.id) {
    throw new Error("Google Calendar event response did not include an id.");
  }

  const googleMeetingUrl = readGoogleMeetLink(event);

  return {
    eventId: event.id,
    eventUrl: event.htmlLink ?? null,
    meetingUrl: googleMeetingUrl ?? meetingUrl,
    skipped: false,
  };
}

export async function deleteGoogleCalendarEvent({
  calendarEventId,
  organizationId,
  organizerId,
}: DeleteCalendarEventInput) {
  if (!organizerId) {
    return { skipped: true, reason: "missing_organizer" };
  }

  if (!calendarEventId) {
    return { skipped: true, reason: "missing_event" };
  }

  const connection = await prisma.calendarConnection.findUnique({
    where: {
      organizationId_userId_provider: {
        organizationId,
        provider: GOOGLE_CALENDAR_PROVIDER,
        userId: organizerId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!connection) {
    return { skipped: true, reason: "calendar_not_connected" };
  }

  const { accessToken, calendarId } = await getValidGoogleCalendarAccessToken(connection.id);
  const params = new URLSearchParams({
    sendUpdates: process.env.GOOGLE_CALENDAR_SEND_UPDATES ?? "none",
  });
  const response = await fetch(
    `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(calendarEventId)}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "DELETE",
    },
  );

  if (response.status === 404 || response.status === 410) {
    return { skipped: false, reason: "already_removed" };
  }

  if (!response.ok) {
    throw new Error(parseGoogleError(await response.text()));
  }

  return { skipped: false, reason: null };
}
