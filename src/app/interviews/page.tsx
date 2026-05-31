import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock3,
  Gauge,
  LinkIcon,
  Plus,
  Users,
  Video,
} from "lucide-react";
import { createInterview, updateInterviewStatus } from "@/app/interviews/actions";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { getInterviewsPageData } from "@/lib/interviews-data";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

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

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string }>;
}) {
  const params = await searchParams;
  await requireRole(recruitingRoles);
  const data = await getInterviewsPageData();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
          <div className="min-w-0">
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950" href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">{data.organizationName}</p>
                <h1 className="text-2xl font-semibold text-slate-950">Interviews</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href="/matching"
            >
              <Gauge className="h-4 w-4" aria-hidden="true" />
              Matching
            </Link>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              href="#schedule"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Schedule
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_390px] lg:px-6">
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
                  <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
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
                      </div>
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
                      <form action={updateInterviewStatus} className="grid grid-cols-[1fr_auto] gap-2">
                        <input name="interviewId" type="hidden" value={interview.id} />
                        <select className={inputClass} defaultValue={interview.status.toUpperCase().replace("-", "_").replace(" ", "_")} name="status">
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="NO_SHOW">No show</option>
                        </select>
                        <button
                          className="h-10 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          type="submit"
                        >
                          Save
                        </button>
                      </form>
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

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" id="schedule">
            <div className="mb-4 flex items-center gap-2">
              <Video className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Schedule interview</p>
            </div>
            <form action={createInterview} className="grid gap-3">
              <Field label="Application">
                <select className={inputClass} name="applicationId" required>
                  <option value="">Select candidate and role</option>
                  {data.applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.label} ({application.matchScore}%)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input className={inputClass} name="title" placeholder="Technical screen" required />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
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
                  {data.organizers.map((organizer) => (
                    <option key={organizer.id} value={organizer.id}>
                      {organizer.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Timezone">
                <input className={inputClass} name="timezone" defaultValue={data.timezone} />
              </Field>
              <Field label="Meeting URL">
                <input className={inputClass} name="meetingUrl" placeholder="https://meet.google.com/..." type="url" />
              </Field>
              <button
                className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={data.applications.length === 0}
                type="submit"
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Schedule interview
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
        </aside>
      </div>
    </main>
  );
}
