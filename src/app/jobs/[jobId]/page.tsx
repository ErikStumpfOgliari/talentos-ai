import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  Globe2,
  Mail,
  MapPin,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { updateJobStatus } from "@/app/jobs/actions";
import { JobPipelineBoard } from "@/components/job-pipeline-board";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { getJobDetailData } from "@/lib/job-detail-data";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function getStatusTone(status: string) {
  if (status === "Active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "Draft") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (status === "Paused") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "Closed") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function statusValue(status: string) {
  return status.toUpperCase().replaceAll(" ", "_");
}

function isPublicJob(status: string) {
  return status === "Active";
}

function StatCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  tone: string;
  value: string | number;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden={true} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await requireRole(recruitingRoles);
  const { jobId } = await params;
  const data = await getJobDetailData({
    jobId,
    organizationId: session.organization.id,
  });

  if (!data) {
    notFound();
  }

  return (
    <WorkspacePageShell
      actions={
        <>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            href={`/matching?jobId=${data.job.id}`}
          >
            <Gauge className="h-4 w-4" aria-hidden="true" />
            Matching
          </Link>
          {isPublicJob(data.job.status) ? (
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
              href={`/careers/${data.job.id}`}
            >
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              Careers page
            </Link>
          ) : (
            <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
              Publish job to open careers page
            </span>
          )}
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            href="/interviews"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Interviews
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]"
            href="/candidates"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Candidates
          </Link>
        </>
      }
      icon={<BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />}
      organizationName={data.organizationName}
      title={data.job.title}
    >
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className={`rounded-full px-2 py-1 font-semibold ring-1 ${getStatusTone(data.job.status)}`}>
            {data.job.status}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {data.job.location}
          </span>
          <span>{data.job.workMode}</span>
          <span>{data.job.employmentType}</span>
          <span>{data.job.salaryRange}</span>
        </div>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={Users} label="Candidates" tone="text-emerald-700" value={data.stats.candidates} />
          <StatCard icon={Sparkles} label="Avg match" tone="text-violet-700" value={`${data.stats.avgScore}%`} />
          <StatCard icon={CalendarDays} label="Interviews" tone="text-sky-700" value={data.stats.interviews} />
          <StatCard icon={Mail} label="Queued emails" tone="text-amber-700" value={data.stats.queuedEmails} />
          <StatCard icon={CheckCircle2} label="Active apps" tone="text-slate-700" value={data.stats.activeApplications} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Role brief</p>
            </div>
            <p className="text-sm leading-6 text-slate-600">{data.job.description}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["Hiring manager", data.job.hiringManager],
                ["Created by", data.job.createdBy],
                ["Published", data.job.publishedAt],
              ].map(([label, value]) => (
                <div className="rounded-lg bg-slate-50 p-3" key={label}>
                  <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Job status</p>
            </div>
            <form action={updateJobStatus} className="grid gap-3">
              <input name="jobId" type="hidden" value={data.job.id} />
              <select className={inputClass} defaultValue={statusValue(data.job.status)} name="status">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="CLOSED">Closed</option>
              </select>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Save status
              </button>
            </form>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Openings</p>
                <p className="mt-1 font-semibold text-slate-950">{data.job.openings}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Stages</p>
                <p className="mt-1 font-semibold text-slate-950">{data.pipelineStages.length}</p>
              </div>
            </div>
          </section>
        </section>

        <JobPipelineBoard
          candidates={data.candidates}
          initialPipeline={data.initialPipeline}
          jobTitle={data.job.title}
          pipelineStages={data.pipelineStages}
        />

        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Role requirements</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Requirements</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {(data.job.requirements.length ? data.job.requirements : ["No requirements listed"]).map((item) => (
                    <li className="flex gap-2" key={item}>
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Responsibilities</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {(data.job.responsibilities.length ? data.job.responsibilities : ["No responsibilities listed"]).map((item) => (
                    <li className="flex gap-2" key={item}>
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Recent activity</p>
            </div>
            <div className="space-y-2">
              {data.activity.map((event) => (
                <article className="rounded-lg border border-slate-200 p-3" key={event.id}>
                  <p className="truncate text-sm font-semibold text-slate-950">{event.action}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{event.context}</p>
                  <p className="mt-2 text-xs text-slate-500">{event.actor} - {event.createdAt}</p>
                </article>
              ))}
              {data.activity.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No activity yet.</p>
              ) : null}
            </div>
          </section>
        </section>
      </div>
    </WorkspacePageShell>
  );
}
