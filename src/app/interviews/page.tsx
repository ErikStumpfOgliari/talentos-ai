import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock3,
  Gauge,
  LinkIcon,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  createInterview,
  createSchedulingLink,
  disconnectGoogleCalendar,
  updateInterviewDetails,
  updateMyAvailability,
} from "@/app/interviews/actions";
import { WorkspacePanelTabs } from "@/components/workspace-panel-tabs";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { WEEKDAY_OPTIONS } from "@/lib/availability";
import {
  getInterviewsPageData,
  type InterviewsPageApplication,
  type InterviewsPageOrganizer,
} from "@/lib/interviews-data";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function getStatusTone(status: string) {
  if (status === "Scheduled") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (status === "Completed") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "Cancelled") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function getScoreTone(score: number) {
  if (score >= 85) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (score >= 65) {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (score > 0) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function FieldGroup({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function ScheduleInterviewForm({
  applications,
  organizers,
  timezone,
}: {
  applications: InterviewsPageApplication[];
  organizers: InterviewsPageOrganizer[];
  timezone: string;
}) {
  return (
    <form action={createInterview} className="grid gap-3">
      <Field label="Application">
        <select className={inputClass} name="applicationId" required>
          <option value="">Select candidate and role</option>
          {applications.map((application) => (
            <option key={application.id} value={application.id}>
              {application.label} ({application.matchScore}%)
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title">
        <input className={inputClass} name="title" placeholder="Technical screen" required />
      </Field>
      <div className="grid gap-3">
        <Field label="Type">
          <select className={inputClass} name="type" defaultValue="PHONE_SCREEN">
            <option value="PHONE_SCREEN">Phone screen</option>
            <option value="TECHNICAL">Technical</option>
            <option value="HIRING_MANAGER">Hiring manager</option>
            <option value="ONSITE">Onsite</option>
            <option value="FINAL">Final</option>
          </select>
        </Field>
        <Field label="Duration">
          <select className={inputClass} name="durationMinutes" defaultValue="45">
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
        </Field>
      </div>
      <Field label="Starts at">
        <input className={inputClass} name="startsAt" required type="datetime-local" />
      </Field>
      <Field label="Organizer">
        <select className={inputClass} name="organizerId" defaultValue="">
          <option value="">Unassigned</option>
          {organizers.map((organizer) => (
            <option key={organizer.id} value={organizer.id}>
              {organizer.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Timezone">
        <input className={inputClass} name="timezone" defaultValue={timezone} />
      </Field>
      <Field label="Meeting URL">
        <input className={inputClass} name="meetingUrl" placeholder="Leave empty for Google Meet" type="url" />
      </Field>
      <button
        className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={applications.length === 0}
        type="submit"
      >
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        Schedule interview
      </button>
    </form>
  );
}

function getCalendarNoticeTone(calendar: string) {
  if (calendar === "synced" || calendar === "connected" || calendar === "updated") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (calendar === "cancelled" || calendar === "already_removed") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (
    calendar === "failed" ||
    calendar === "missing-config" ||
    calendar === "state-mismatch" ||
    calendar === "cancel_failed" ||
    calendar === "update_failed"
  ) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function getCalendarNoticeMessage(calendar: string) {
  if (calendar === "connected") {
    return "Google Calendar connected.";
  }

  if (calendar === "disconnected") {
    return "Google Calendar disconnected.";
  }

  if (calendar === "synced") {
    return "Interview synced to Google Calendar.";
  }

  if (calendar === "updated") {
    return "Google Calendar event updated.";
  }

  if (calendar === "cancelled") {
    return "Google Calendar event cancelled.";
  }

  if (calendar === "already_removed") {
    return "Interview updated. The Google Calendar event was already removed.";
  }

  if (calendar === "calendar_not_connected") {
    return "Interview scheduled. Connect Google Calendar to sync future events.";
  }

  if (calendar === "missing_organizer") {
    return "Interview scheduled. Assign an organizer to sync with Google Calendar.";
  }

  if (calendar === "missing-config") {
    return "Google Calendar OAuth is missing client configuration.";
  }

  if (calendar === "state-mismatch") {
    return "Google Calendar connection failed state validation.";
  }

  if (calendar === "cancel_failed") {
    return "Interview status updated, but Google Calendar cancellation failed.";
  }

  if (calendar === "update_failed") {
    return "Interview updated, but Google Calendar sync failed.";
  }

  if (calendar === "failed") {
    return "Interview scheduled, but Google Calendar sync failed.";
  }

  return "Interview scheduled without calendar sync.";
}

function getCalendarBadge(status: string) {
  if (status === "SYNCED") {
    return {
      label: "Google Calendar",
      tone: "bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "CANCELLED") {
    return {
      label: "Calendar cancelled",
      tone: "bg-sky-50 text-sky-700",
    };
  }

  if (status === "FAILED") {
    return {
      label: "Calendar failed",
      tone: "bg-rose-50 text-rose-700",
    };
  }

  return null;
}

type InterviewsPageData = Awaited<ReturnType<typeof getInterviewsPageData>>;

function InterviewToolsPanel({
  data,
  userId,
}: {
  data: InterviewsPageData;
  userId: string;
}) {
  return (
    <WorkspacePanelTabs
      tabs={[
        {
          id: "schedule",
          label: "Schedule",
          description: "Create a calendar event from an active application.",
          children: <ScheduleInterviewForm applications={data.applications} organizers={data.organizers} timezone={data.timezone} />,
        },
        {
          id: "calendar",
          label: "Calendar",
          description: "Connect or disconnect the workspace Google Calendar integration.",
          children: (
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Google Calendar</p>
              </div>
              <div className="grid gap-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {data.calendarConnection.connected ? "Connected" : data.calendarConnection.configured ? "Ready to connect" : "Missing OAuth config"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Account</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-950">{data.calendarConnection.connectedEmail}</p>
                </div>
                {data.calendarConnection.connected ? (
                  <form action={disconnectGoogleCalendar}>
                    <input name="next" type="hidden" value="/interviews" />
                    <button
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      type="submit"
                    >
                      Disconnect
                    </button>
                  </form>
                ) : (
                  <a
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                      data.calendarConnection.configured
                        ? "bg-slate-950 text-white hover:bg-slate-800"
                        : "cursor-not-allowed bg-slate-200 text-slate-500"
                    }`}
                    href={data.calendarConnection.configured ? "/api/integrations/google-calendar/connect" : "#"}
                  >
                    Connect Google Calendar
                  </a>
                )}
              </div>
            </section>
          ),
        },
        {
          id: "availability",
          label: "Availability",
          description: "Set the default working window used by self-scheduling links.",
          children: (
            <form action={updateMyAvailability} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-1 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Your availability</p>
              </div>
              <FieldGroup label="Available days">
                <div className="grid grid-cols-2 gap-2">
                  {WEEKDAY_OPTIONS.map((day) => (
                    <label
                      className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700"
                      key={day.value}
                    >
                      <input
                        className="h-4 w-4 accent-slate-950"
                        defaultChecked={data.availability.workingDays.includes(day.value)}
                        name="workingDays"
                        type="checkbox"
                        value={day.value}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </FieldGroup>
              <Field label="Timezone">
                <input className={inputClass} defaultValue={data.availability.timezone} name="timezone" />
              </Field>
              <Field label="Default duration">
                <select className={inputClass} defaultValue={data.availability.defaultDurationMinutes} name="defaultDurationMinutes">
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="From">
                  <input className={inputClass} defaultValue={data.availability.workdayStartHour} max={23} min={0} name="workdayStartHour" type="number" />
                </Field>
                <Field label="To">
                  <input className={inputClass} defaultValue={data.availability.workdayEndHour} max={24} min={1} name="workdayEndHour" type="number" />
                </Field>
                <Field label="Days">
                  <input className={inputClass} defaultValue={data.availability.maxDaysAhead} max={30} min={1} name="maxDaysAhead" type="number" />
                </Field>
              </div>
              <Field label="Interval">
                <select className={inputClass} defaultValue={data.availability.slotIntervalMinutes} name="slotIntervalMinutes">
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Buffer before">
                  <select className={inputClass} defaultValue={data.availability.bufferBeforeMinutes} name="bufferBeforeMinutes">
                    <option value="0">0 min</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">60 min</option>
                  </select>
                </Field>
                <Field label="Buffer after">
                  <select className={inputClass} defaultValue={data.availability.bufferAfterMinutes} name="bufferAfterMinutes">
                    <option value="0">0 min</option>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="60">60 min</option>
                  </select>
                </Field>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                Save availability
              </button>
            </form>
          ),
        },
        {
          id: "self",
          label: "Self-booking",
          description: "Generate candidate-facing scheduling links from active applications.",
          children: (
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <form action={createSchedulingLink} className="grid gap-3">
                <div className="mb-1 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-violet-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-950">Self-scheduling</p>
                </div>
                <Field label="Application">
                  <select className={inputClass} name="applicationId" required>
                    <option value="">Select candidate and role</option>
                    {data.applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Title">
                  <input className={inputClass} defaultValue="Recruiter screen" name="title" required />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Type">
                    <select className={inputClass} defaultValue="PHONE_SCREEN" name="type">
                      <option value="PHONE_SCREEN">Phone screen</option>
                      <option value="TECHNICAL">Technical</option>
                      <option value="HIRING_MANAGER">Hiring manager</option>
                      <option value="ONSITE">Onsite</option>
                      <option value="FINAL">Final</option>
                    </select>
                  </Field>
                  <Field label="Duration">
                    <select className={inputClass} defaultValue="" name="durationMinutes">
                      <option value="">Default ({data.availability.defaultDurationMinutes} min)</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                      <option value="90">90 min</option>
                    </select>
                  </Field>
                </div>
                <Field label="Organizer">
                  <select className={inputClass} name="organizerId" defaultValue={userId}>
                    {data.organizers.map((organizer) => (
                      <option key={organizer.id} value={organizer.id}>
                        {organizer.name} - {organizer.availabilityLabel}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Days">
                    <input className={inputClass} max={30} min={1} name="maxDaysAhead" placeholder={`${data.availability.maxDaysAhead}`} type="number" />
                  </Field>
                  <Field label="From">
                    <input className={inputClass} max={23} min={0} name="workdayStartHour" placeholder={`${data.availability.workdayStartHour}`} type="number" />
                  </Field>
                  <Field label="To">
                    <input className={inputClass} max={24} min={1} name="workdayEndHour" placeholder={`${data.availability.workdayEndHour}`} type="number" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Interval">
                    <select className={inputClass} defaultValue="" name="slotIntervalMinutes">
                      <option value="">Default ({data.availability.slotIntervalMinutes} min)</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </Field>
                  <Field label="Timezone">
                    <input className={inputClass} name="timezone" placeholder={data.availability.timezone} />
                  </Field>
                </div>
                <FieldGroup label="Days override">
                  <div className="grid grid-cols-2 gap-2">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <label
                        className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                        key={day.value}
                      >
                        <input className="h-3.5 w-3.5 accent-slate-950" name="workingDays" type="checkbox" value={day.value} />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </FieldGroup>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Buffer before">
                    <select className={inputClass} defaultValue="" name="bufferBeforeMinutes">
                      <option value="">Default ({data.availability.bufferBeforeMinutes} min)</option>
                      <option value="0">0 min</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </Field>
                  <Field label="Buffer after">
                    <select className={inputClass} defaultValue="" name="bufferAfterMinutes">
                      <option value="">Default ({data.availability.bufferAfterMinutes} min)</option>
                      <option value="0">0 min</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </Field>
                </div>
                <Field label="Meeting URL">
                  <input className={inputClass} name="meetingUrl" placeholder="Leave empty for Google Meet" type="url" />
                </Field>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={data.applications.length === 0}
                  type="submit"
                >
                  Create scheduling link
                </button>
              </form>

              {data.schedulingLinks.length > 0 ? (
                <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
                  {data.schedulingLinks.map((link) => (
                    <div className="rounded-lg bg-slate-50 p-3 text-sm" key={link.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">{link.candidate}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{link.jobTitle}</p>
                        </div>
                        <Link className="shrink-0 text-xs font-semibold text-slate-700 hover:text-slate-950" href={link.url}>
                          Open
                        </Link>
                      </div>
                      <p className="mt-2 break-all rounded-md bg-white px-2 py-1 text-xs text-slate-500">{link.url}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {link.durationMinutes} min with {link.organizer} - {link.windowLabel} - {link.bufferLabel}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ),
        },
        {
          id: "ready",
          label: "Ready",
          description: "Candidates ready for interview actions and workflow notes.",
          children: (
            <div className="grid gap-4">
              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-950">Interview-ready</p>
                </div>
                <div className="space-y-2">
                  {data.applications.slice(0, 6).map((application) => (
                    <article className="rounded-lg border border-slate-200 p-3" key={application.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{application.candidate}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{application.jobTitle} - {application.stage}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(application.matchScore)}`}>
                          {application.matchScore}%
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-violet-700" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-950">Workflow</p>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Pipeline sync</p>
                    <p className="mt-1 text-slate-600">Scheduling an interview moves the application into the Interview stage.</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-slate-500">Audit trail</p>
                    <p className="mt-1 text-slate-600">Schedule and status changes are recorded as organization-scoped events.</p>
                  </div>
                </div>
              </section>
            </div>
          ),
        },
      ]}
    />
  );
}

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ availability?: string; calendar?: string; created?: string; scheduling?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const session = await requireRole(recruitingRoles);
  const data = await getInterviewsPageData({
    organizationId: session.organization.id,
    userId: session.user.id,
  });
  const calendarNotice = params?.calendar ? getCalendarNoticeMessage(params.calendar) : null;

  return (
    <WorkspacePageShell
      actions={
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          href="/matching"
        >
          <Gauge className="h-4 w-4" aria-hidden="true" />
          Matching
        </Link>
      }
      icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
      organizationName={data.organizationName}
      rightPanel={<InterviewToolsPanel data={data} userId={session.user.id} />}
      rightPanelButtonIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
      rightPanelButtonLabel="Tools"
      rightPanelDescription="Schedule, calendar, availability, and booking tools."
      rightPanelTitle="Interview tools"
      title="Interviews"
    >
      <div className="grid gap-5">
        <section className="space-y-5">
          {params?.created ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Interview scheduled and candidate moved into the interview stage.
            </div>
          ) : null}
          {params?.updated ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
              Interview status updated.
            </div>
          ) : null}
          {params?.scheduling === "created" ? (
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">
              Self-scheduling link created.
            </div>
          ) : null}
          {params?.availability === "updated" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Availability settings updated.
            </div>
          ) : null}
          {params?.calendar && calendarNotice ? (
            <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${getCalendarNoticeTone(params.calendar)}`}>
              {calendarNotice}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Scheduled", value: data.stats.scheduled, icon: CalendarDays, tone: "text-sky-700" },
              { label: "Today", value: data.stats.today, icon: Clock3, tone: "text-violet-700" },
              { label: "Completed", value: data.stats.completed, icon: CheckCircle2, tone: "text-emerald-700" },
              { label: "Cancelled/no-show", value: data.stats.cancelledOrNoShow, icon: CircleX, tone: "text-rose-700" },
            ].map((metric) => (
              <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={metric.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                  <metric.icon className={`h-5 w-5 ${metric.tone}`} aria-hidden="true" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
              </article>
            ))}
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Interview calendar</p>
                <p className="mt-1 text-xs text-slate-500">Upcoming and completed interviews across active requisitions.</p>
              </div>
              <span className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                {data.timezone}
              </span>
            </div>

            <div className="grid gap-3">
              {data.interviews.map((interview) => (
                <article className="rounded-lg border border-slate-200 p-4" key={interview.id}>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-950">{interview.title}</h2>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getStatusTone(interview.status)}`}>
                          {interview.status}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getScoreTone(interview.matchScore)}`}>
                          {interview.matchScore}% match
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-600">{interview.candidate} - {interview.candidateTitle}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
                          {interview.jobTitle}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          {interview.date}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {interview.timeRange}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{interview.type}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{interview.durationMinutes} min</span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{interview.stage}</span>
                        {getCalendarBadge(interview.calendarSyncStatus) ? (
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-medium ${
                              getCalendarBadge(interview.calendarSyncStatus)?.tone
                            }`}
                          >
                            {getCalendarBadge(interview.calendarSyncStatus)?.label}
                          </span>
                        ) : null}
                      </div>
                      <details className="mt-4 rounded-lg bg-slate-50 p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Edit interview</summary>
                        <form action={updateInterviewDetails} className="mt-3 grid gap-3">
                          <input name="interviewId" type="hidden" value={interview.id} />
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Title">
                              <input className={inputClass} defaultValue={interview.title} name="title" required />
                            </Field>
                            <Field label="Starts at">
                              <input className={inputClass} defaultValue={interview.startsAtInput} name="startsAt" required type="datetime-local" />
                            </Field>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Field label="Type">
                              <select className={inputClass} defaultValue={interview.typeValue} name="type">
                                <option value="PHONE_SCREEN">Phone screen</option>
                                <option value="TECHNICAL">Technical</option>
                                <option value="HIRING_MANAGER">Hiring manager</option>
                                <option value="ONSITE">Onsite</option>
                                <option value="FINAL">Final</option>
                              </select>
                            </Field>
                            <Field label="Status">
                              <select className={inputClass} defaultValue={interview.statusValue} name="status">
                                <option value="SCHEDULED">Scheduled</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="NO_SHOW">No show</option>
                              </select>
                            </Field>
                            <Field label="Duration">
                              <input className={inputClass} defaultValue={interview.durationMinutes} min={15} name="durationMinutes" step={15} type="number" />
                            </Field>
                            <Field label="Timezone">
                              <input className={inputClass} defaultValue={interview.timezone} name="timezone" />
                            </Field>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Organizer">
                              <select className={inputClass} defaultValue={interview.organizerId ?? ""} name="organizerId">
                                <option value="">Unassigned</option>
                                {data.organizers.map((organizer) => (
                                  <option key={organizer.id} value={organizer.id}>
                                    {organizer.name}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Meeting URL">
                              <input
                                className={inputClass}
                                defaultValue={interview.meetingUrl ?? ""}
                                name="meetingUrl"
                                placeholder="Leave empty for Google Meet"
                                type="url"
                              />
                            </Field>
                          </div>
                          <button
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            type="submit"
                          >
                            Update interview
                          </button>
                        </form>
                      </details>
                    </div>

                    <div className="grid content-start gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Organizer</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{interview.organizer}</p>
                      </div>
                      {interview.meetingUrl ? (
                        <a
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          href={interview.meetingUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <LinkIcon className="h-4 w-4" aria-hidden="true" />
                          Meeting link
                        </a>
                      ) : null}
                      {interview.calendarEventUrl && interview.calendarSyncStatus !== "CANCELLED" ? (
                        <a
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          href={interview.calendarEventUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <CalendarDays className="h-4 w-4" aria-hidden="true" />
                          Calendar event
                        </a>
                      ) : null}
                      {interview.calendarSyncError ? (
                        <div className="rounded-lg bg-rose-50 p-3">
                          <p className="text-xs font-semibold uppercase text-rose-500">Calendar sync</p>
                          <p className="mt-1 text-sm font-semibold text-rose-800">Needs attention</p>
                        </div>
                      ) : interview.calendarSyncedAt ? (
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">Calendar sync</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{interview.calendarSyncedAt}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}

              {data.interviews.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-950">No interviews yet</p>
                  <p className="mt-1 text-sm text-slate-500">Rank candidates and schedule the first interview from an active application.</p>
                </div>
              ) : null}
            </div>
          </section>
        </section>

      </div>
    </WorkspacePageShell>
  );
}
