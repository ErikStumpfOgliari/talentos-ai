import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  MailCheck,
  MapPin,
} from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "@/components/public-site-shell";
import { getPublicApplicationStatusData } from "@/lib/careers-data";

export const dynamic = "force-dynamic";

const statusToneClasses = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  sky: "border-sky-200 bg-sky-50 text-sky-800",
  slate: "border-slate-200 bg-slate-50 text-slate-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
};

const dotClasses = {
  complete: "bg-emerald-600 text-white",
  current: "bg-slate-950 text-white",
  upcoming: "bg-slate-100 text-slate-400",
};

function getEmailCopy(status?: string) {
  if (!status) {
    return "Confirmation pending";
  }

  if (status === "Sent" || status === "Delivered") {
    return "Confirmation sent";
  }

  if (status === "Failed" || status === "Bounced") {
    return "Confirmation needs attention";
  }

  return "Confirmation queued";
}

export default async function PublicApplicationStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ submitted?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const data = await getPublicApplicationStatusData(token);

  if (!data) {
    notFound();
  }

  const application = data.application;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <PublicSiteHeader />
      <header className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 lg:px-6">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950" href="/careers">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Open roles
          </Link>

          <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase text-slate-500">{data.organizationName}</p>
                  <h1 className="text-3xl font-semibold text-slate-950">Application status</h1>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                  {application.jobTitle}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {application.jobLocation}
                </span>
                <span>{application.jobDepartment}</span>
              </div>
            </div>

            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={`/careers/${application.jobId}`}
            >
              View role
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[1fr_360px] lg:px-6">
        <section className="space-y-5">
          {query?.submitted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Application received.</p>
                  <p className="mt-1 leading-6">We sent a confirmation email when a delivery provider is configured. This page stays available for status updates.</p>
                </div>
              </div>
            </div>
          ) : null}

          <section className={`rounded-lg border p-5 shadow-sm ${statusToneClasses[application.statusTone]}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase opacity-75">Current status</p>
                <h2 className="mt-2 text-2xl font-semibold">{application.statusLabel}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 opacity-90">{application.statusDescription}</p>
              </div>
              <div className="rounded-lg bg-white/70 p-3 text-sm text-slate-800">
                <p className="text-xs font-semibold uppercase text-slate-500">Stage</p>
                <p className="mt-1 font-semibold">{application.stageName}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-slate-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Hiring timeline</p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {application.timeline.map((step) => (
                <div className="grid gap-3" key={step.label}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${dotClasses[step.state]}`}>
                    {step.state === "complete" ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-current" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{step.label}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {application.nextInterview ? (
            <section className="rounded-lg border border-sky-200 bg-white p-5 shadow-sm">
              <div className="flex gap-3">
                <CalendarClock className="h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-slate-950">{application.nextInterview.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{application.nextInterview.startsAt}</p>
                  {application.nextInterview.meetingUrl ? (
                    <a className="mt-3 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900" href={application.nextInterview.meetingUrl}>
                      Join meeting
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Application details</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Candidate</p>
                <p className="mt-1 font-semibold text-slate-950">{application.candidateName}</p>
                <p className="mt-1 break-words text-slate-500">{application.candidateEmail}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Applied</p>
                  <p className="mt-1 font-semibold text-slate-950">{application.appliedAt}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Updated</p>
                  <p className="mt-1 font-semibold text-slate-950">{application.updatedAt}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Resume</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-950">{application.resumeFileName}</p>
              <p className="mt-1 text-slate-500">{application.resumeStatus}</p>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Confirmation email</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-950">{getEmailCopy(application.confirmationEmail?.status)}</p>
              {application.confirmationEmail ? (
                <>
                  <p className="mt-1 text-slate-500">{application.confirmationEmail.status} via {application.confirmationEmail.provider}</p>
                  <p className="mt-1 text-slate-500">Created {application.confirmationEmail.createdAt}</p>
                  <p className="mt-1 text-slate-500">Sent {application.confirmationEmail.sentAt}</p>
                </>
              ) : (
                <p className="mt-1 text-slate-500">The recruiting team can still review this application.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
      <PublicSiteFooter />
    </main>
  );
}
