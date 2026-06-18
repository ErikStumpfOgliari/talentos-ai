import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CirclePause,
  FilePlus2,
  Globe2,
  MapPin,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { archiveJob, createJob, updateJobStatus } from "@/app/jobs/actions";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { recruitingRoles, requireRole } from "@/lib/auth";
import { getJobsPageData, type JobsPageManager } from "@/lib/jobs-data";
import { LONG_TEXT_LIMIT_HINT, TEXT_LIMITS } from "@/lib/text-limits";

export const dynamic = "force-dynamic";

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

function isPublicJob(status: string) {
  return status === "Active";
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

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";
const textareaClass =
  "min-h-24 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function CreateJobForm({ managers }: { managers: JobsPageManager[] }) {
  return (
    <form action={createJob} className="grid gap-3">
      <Field label="Title">
        <input className={inputClass} name="title" placeholder="Operations Coordinator" required />
      </Field>
      <div className="grid gap-3">
        <Field label="Department">
          <input className={inputClass} name="department" placeholder="Operations" />
        </Field>
        <Field label="Location">
          <input className={inputClass} name="location" placeholder="Hybrid Sao Paulo" />
        </Field>
      </div>
      <div className="grid gap-3">
        <Field label="Work mode">
          <select className={inputClass} name="workMode" defaultValue="REMOTE">
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">Onsite</option>
          </select>
        </Field>
        <Field label="Type">
          <select className={inputClass} name="employmentType" defaultValue="FULL_TIME">
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3">
        <Field label="Openings">
          <input className={inputClass} min="1" name="openings" placeholder="1" type="number" />
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue="DRAFT">
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3">
        <Field label="Currency">
          <input className={inputClass} maxLength={3} name="currency" placeholder="USD" />
        </Field>
        <Field label="Salary min">
          <input className={inputClass} min="0" name="salaryMin" placeholder="65000" type="number" />
        </Field>
        <Field label="Salary max">
          <input className={inputClass} min="0" name="salaryMax" placeholder="90000" type="number" />
        </Field>
      </div>
      <Field label="Hiring manager">
        <select className={inputClass} name="hiringManagerId" defaultValue="">
          <option value="">Unassigned</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea
          className={textareaClass}
          maxLength={TEXT_LIMITS.longText}
          name="description"
          placeholder="Describe the role, seniority, team, and hiring goals."
          required
        />
        <span className="text-xs text-slate-500">{LONG_TEXT_LIMIT_HINT}</span>
      </Field>
      <Field label="Requirements">
        <textarea className={textareaClass} maxLength={TEXT_LIMITS.longText} name="requirements" placeholder={"Customer service\nScheduling\nExcel"} />
        <span className="text-xs text-slate-500">{LONG_TEXT_LIMIT_HINT}</span>
      </Field>
      <Field label="Responsibilities">
        <textarea
          className={textareaClass}
          maxLength={TEXT_LIMITS.longText}
          name="responsibilities"
          placeholder={"Coordinate daily workflows\nSupport hiring managers\nTrack operational KPIs"}
        />
        <span className="text-xs text-slate-500">{LONG_TEXT_LIMIT_HINT}</span>
      </Field>
      <button
        className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]"
        type="submit"
      >
        <FilePlus2 className="h-4 w-4" aria-hidden="true" />
        Create job
      </button>
    </form>
  );
}

export default async function JobsPage() {
  const session = await requireRole(recruitingRoles);
  const data = await getJobsPageData(session.organization.id);

  return (
    <WorkspacePageShell
      icon={<BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />}
      organizationName={data.organizationName}
      rightPanel={<CreateJobForm managers={data.managers} />}
      rightPanelButtonIcon={<FilePlus2 className="h-4 w-4" aria-hidden="true" />}
      rightPanelButtonLabel="New job"
      rightPanelDescription="Create a role without leaving Jobs."
      rightPanelTitle="Create job"
      title="Jobs"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total jobs", value: data.stats.total, icon: BriefcaseBusiness, tone: "text-slate-700" },
              { label: "Active", value: data.stats.active, icon: CheckCircle2, tone: "text-emerald-700" },
              { label: "Draft", value: data.stats.draft, icon: FilePlus2, tone: "text-slate-600" },
              { label: "Paused", value: data.stats.paused, icon: CirclePause, tone: "text-amber-700" },
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
                <p className="text-sm font-semibold text-slate-950">Open requisitions</p>
                <p className="mt-1 text-xs text-slate-500">Create, review, pause, close, or archive hiring roles.</p>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                type="button"
                aria-label="More job actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-3">
              {data.jobs.map((job) => (
                <article className="rounded-lg border border-slate-200 p-4" key={job.id}>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link className="text-base font-semibold text-slate-950 transition hover:text-slate-600" href={`/jobs/${job.id}`}>
                          {job.title}
                        </Link>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getStatusTone(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
                          {job.department}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {job.location}
                        </span>
                        <span>{job.workMode}</span>
                        <span>{job.employmentType}</span>
                      </div>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{job.description}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          ["Openings", job.openings],
                          ["Candidates", job.candidateCount],
                          ["Avg score", `${job.avgScore}%`],
                          ["Pipeline", `${job.stageCount} stages`],
                        ].map(([label, value]) => (
                          <div className="rounded-lg bg-slate-50 px-3 py-2" key={label}>
                            <p className="text-xs font-medium text-slate-500">{label}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid content-start gap-3 xl:min-w-56">
                      <Link
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        href={`/jobs/${job.id}`}
                      >
                        Open pipeline
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      {isPublicJob(job.status) ? (
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          href={`/careers/${job.id}`}
                        >
                          <Globe2 className="h-4 w-4" aria-hidden="true" />
                          Public page
                        </Link>
                      ) : (
                        <div className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-center text-sm font-semibold text-slate-500">
                          <Globe2 className="h-4 w-4" aria-hidden="true" />
                          Publish to open public page
                        </div>
                      )}
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Hiring manager</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{job.hiringManager}</p>
                        <p className="mt-1 text-xs text-slate-500">{job.salaryRange}</p>
                      </div>
                      <form action={updateJobStatus} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input name="jobId" type="hidden" value={job.id} />
                        <select className={inputClass} defaultValue={job.status.toUpperCase().replace(" ", "_")} name="status">
                          <option value="DRAFT">Draft</option>
                          <option value="ACTIVE">Active</option>
                          <option value="PAUSED">Paused</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                        <button
                          className="h-10 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          type="submit"
                        >
                          Save
                        </button>
                      </form>
                      <form action={archiveJob}>
                        <input name="jobId" type="hidden" value={job.id} />
                        <button
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          type="submit"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Archive
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}

              {data.jobs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                  <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-950">No jobs yet</p>
                  <p className="mt-1 text-sm text-slate-500">Create your first role to start building the hiring pipeline.</p>
                </div>
              ) : null}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Tenant scope</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Organization</p>
                <p className="mt-1 font-semibold text-slate-950">{data.organizationName}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Assignable users</p>
                <p className="mt-1 font-semibold text-slate-950">{data.managers.length}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Data boundary</p>
                <p className="mt-1 text-slate-600">All job actions are scoped by organizationId.</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Hiring team</p>
            </div>
            <div className="space-y-2">
              {data.managers.map((manager) => (
                <div className="rounded-lg border border-slate-200 p-3" key={manager.id}>
                  <p className="text-sm font-semibold text-slate-950">{manager.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{manager.email}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </WorkspacePageShell>
  );
}
