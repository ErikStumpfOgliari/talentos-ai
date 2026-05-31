import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  Filter,
  Gauge,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { analyticsRoles, requireRole } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics-data";

export const dynamic = "force-dynamic";

function StatCard({
  detail,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden={true} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function ProgressBar({
  color,
  value,
}: {
  color: string;
  value: number;
}) {
  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export default async function AnalyticsPage() {
  await requireRole(analyticsRoles);
  const data = await getAnalyticsData();
  const maxFunnelCount = Math.max(...data.funnel.map((stage) => stage.count), 1);

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
                <Activity className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">{data.organizationName}</p>
                <h1 className="text-2xl font-semibold text-slate-950">Hiring Analytics</h1>
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
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href="/jobs"
            >
              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
              Jobs
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:px-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            detail={`${data.summary.activeApplications} active applications`}
            icon={BriefcaseBusiness}
            label="Open roles"
            tone="text-sky-700"
            value={String(data.summary.openRoles)}
          />
          <StatCard
            detail={`${data.summary.interviewRate}% interview rate`}
            icon={Users}
            label="Candidates"
            tone="text-emerald-700"
            value={String(data.summary.totalCandidates)}
          />
          <StatCard
            detail={`${data.summary.offerRate}% offer rate`}
            icon={Sparkles}
            label="Avg match score"
            tone="text-violet-700"
            value={`${data.summary.avgMatchScore}%`}
          />
          <StatCard
            detail={data.summary.avgTimeToHireDays ? `${data.summary.avgTimeToHireDays}d avg time to hire` : "No hires closed yet"}
            icon={Clock3}
            label="Pipeline time"
            tone="text-amber-700"
            value={`${data.summary.avgPipelineDays}d`}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Pipeline funnel</p>
            </div>
            <div className="space-y-3">
              {data.funnel.map((stage) => (
                <article className="rounded-lg border border-slate-200 p-3" key={stage.category}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{stage.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{stage.avgDaysInStage}d avg in stage</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-950">{stage.count}</p>
                      <p className="text-xs text-slate-500">{stage.share}%</p>
                    </div>
                  </div>
                  <ProgressBar color={stage.color} value={(stage.count / maxFunnelCount) * 100} />
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Role performance</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Role</th>
                    <th className="px-3 py-2 font-semibold">Apps</th>
                    <th className="px-3 py-2 font-semibold">Interviews</th>
                    <th className="px-3 py-2 font-semibold">Offers</th>
                    <th className="px-3 py-2 font-semibold">Avg score</th>
                    <th className="px-3 py-2 font-semibold">Pipeline</th>
                    <th className="px-3 py-2 font-semibold">Hire rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobPerformance.map((job) => (
                    <tr className="border-b border-slate-100 last:border-0" key={job.id}>
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-950">{job.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{job.department} - {job.status}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{job.applications}</td>
                      <td className="px-3 py-3 text-slate-600">{job.interviews}</td>
                      <td className="px-3 py-3 text-slate-600">{job.offers}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-violet-500" style={{ width: `${job.avgScore}%` }} />
                          </div>
                          <span className="text-slate-600">{job.avgScore}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{job.avgPipelineDays}d</td>
                      <td className="px-3 py-3 text-slate-600">{job.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Source quality</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {data.sourceMetrics.map((source) => (
                <article className="rounded-lg border border-slate-200 p-3" key={source.source}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{source.source}</p>
                      <p className="mt-1 text-xs text-slate-500">{source.applications} applications</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {source.candidates}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${source.avgScore}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{source.avgScore}%</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-rose-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Conversion rates</p>
            </div>
            <div className="grid gap-3">
              {[
                { label: "Interview rate", value: data.summary.interviewRate, color: "bg-violet-500" },
                { label: "Offer rate", value: data.summary.offerRate, color: "bg-emerald-500" },
                { label: "Hire rate", value: data.summary.hireRate, color: "bg-slate-950" },
              ].map((metric) => (
                <article className="rounded-lg border border-slate-200 p-3" key={metric.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-950">{metric.label}</p>
                    <p className="text-sm font-semibold text-slate-950">{metric.value}%</p>
                  </div>
                  <ProgressBar color={metric.color} value={metric.value} />
                </article>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Resume parser</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="font-semibold text-emerald-700">{data.resumeParser.parsed}</p>
                  <p className="mt-1 text-xs text-slate-500">Parsed</p>
                </div>
                <div>
                  <p className="font-semibold text-amber-700">{data.resumeParser.needsReview}</p>
                  <p className="mt-1 text-xs text-slate-500">Review</p>
                </div>
                <div>
                  <p className="font-semibold text-rose-700">{data.resumeParser.failed}</p>
                  <p className="mt-1 text-xs text-slate-500">Failed</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
