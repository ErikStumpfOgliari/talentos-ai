import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  LinkIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { bookSelfSchedulingSlot } from "@/app/schedule/[token]/actions";
import { getSchedulingPageData, type SchedulingPageData } from "@/lib/self-scheduling";

export const dynamic = "force-dynamic";

function EmptyState({
  title,
  body,
}: {
  body: string;
  title: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
          <CalendarClock className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      </section>
    </main>
  );
}

function isActiveSchedulingData(
  data: SchedulingPageData,
): data is Extract<SchedulingPageData, { status: "active" }> {
  return data.status === "active";
}

export default async function SelfSchedulingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const data = await getSchedulingPageData(token);
  const rateLimited = query?.error === "rate_limited";

  if (data.status === "not_found") {
    return <EmptyState body="Please ask the recruiting team for a fresh scheduling link." title="Scheduling link not found" />;
  }

  if (data.status === "booked") {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
        <section className="mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-emerald-700">Confirmed</p>
              <h1 className="mt-2 text-2xl font-semibold">Your interview is scheduled.</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The recruiting team has your selected time. You will receive the details by email if automation is configured.
              </p>
            </div>
          </div>
          {data.link.interview ? (
            <div className="mt-6 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Role</p>
                <p className="mt-1 font-semibold text-slate-950">{data.link.application.job.title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Organizer</p>
                <p className="mt-1 font-semibold text-slate-950">{data.link.organizer?.name ?? "Recruiting team"}</p>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  if (data.status === "expired") {
    return <EmptyState body="This link has expired. Please ask the recruiting team to send a new one." title="Scheduling link expired" />;
  }

  if (!isActiveSchedulingData(data)) {
    return <EmptyState body="Please ask the recruiting team for a fresh scheduling link." title="Scheduling unavailable" />;
  }

  const activeData = data;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">{activeData.link.organization.name}</p>
              <h1 className="text-2xl font-semibold">Choose your interview time</h1>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-950">{activeData.link.application.candidate.name}</p>
            <p className="mt-1 text-slate-600">{activeData.link.application.job.title}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {rateLimited ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Too many scheduling attempts were made from this device. Please wait a few minutes and try again.
            </div>
          ) : null}

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Available times</p>
              <p className="mt-1 text-xs text-slate-500">{activeData.link.timezone}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              {activeData.link.durationMinutes} min
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {activeData.slots.map((slot) => (
              <form action={bookSelfSchedulingSlot} key={slot.id}>
                <input name="token" type="hidden" value={token} />
                <input name="slotStartIso" type="hidden" value={slot.startIso} />
                <button
                  className="grid w-full rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                  type="submit"
                >
                  <span className="text-sm font-semibold text-slate-950">{slot.dateLabel}</span>
                  <span className="mt-1 text-sm text-slate-600">{slot.timeRange}</span>
                </button>
              </form>
            ))}
          </div>

          {activeData.slots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-950">No open slots</p>
              <p className="mt-1 text-sm text-slate-500">Please ask the recruiting team to extend the scheduling window.</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold">Interview details</p>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Organizer</p>
                <p className="mt-1 font-semibold text-slate-950">{activeData.link.organizer?.name ?? "Recruiting team"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Format</p>
                <p className="mt-1 font-semibold text-slate-950">{activeData.link.meetingUrl ? "Video link provided" : "Calendar invite"}</p>
              </div>
              {activeData.link.meetingUrl ? (
                <a
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  href={activeData.link.meetingUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                  Meeting link
                </a>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
