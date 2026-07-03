import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Database,
  Mail,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { updateOrganizationSettings } from "@/app/admin/actions";
import { ThemeToggle } from "@/components/site-theme-provider";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { adminRoles, requireRole } from "@/lib/auth";
import { getAdminPageData } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

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

function getNotice(params?: { settings?: string }) {
  if (params?.settings) {
    return "Workspace settings updated.";
  }

  return null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ settings?: string }>;
}) {
  const params = await searchParams;
  const session = await requireRole(adminRoles);
  const data = await getAdminPageData(session.organization.id);
  const notice = getNotice(params);

  return (
    <WorkspacePageShell
      actions={
        <>
          <ThemeToggle />
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
            href="/admin"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin
          </Link>
        </>
      }
      icon={<Settings className="h-5 w-5" aria-hidden="true" />}
      organizationName={data.organization.slug}
      title="Settings"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          {notice ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {notice}
            </div>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Organization settings</p>
            </div>
            <form action={updateOrganizationSettings} className="grid gap-3">
              <input name="redirectTo" type="hidden" value="/settings?settings=1" />
              <Field label="Name">
                <input className={inputClass} defaultValue={data.organization.name} name="name" required />
              </Field>
              <Field label="Slug">
                <input className={`${inputClass} bg-slate-50 text-slate-500`} disabled value={data.organization.slug} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Plan">
                  <select className={inputClass} defaultValue={data.organization.plan.toUpperCase()} name="plan">
                    <option value="FREE">Básico</option>
                    <option value="PRO">Intermediário</option>
                    <option value="ENTERPRISE">Avançado</option>
                  </select>
                </Field>
                <Field label="Timezone">
                  <input className={inputClass} defaultValue={data.organization.timezone} name="timezone" required />
                </Field>
              </div>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Save settings
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Workspace readiness</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.reliabilityChecks.map((check) => (
                <Link
                  className="rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
                  href={check.href}
                  key={check.label}
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-xs font-semibold uppercase text-slate-500">{check.label}</p>
                    <span className={`dashboard-pill shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${check.tone}`}>
                      {check.status}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{check.value}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{check.detail}</p>
                </Link>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Integration status</p>
            </div>
            <div className="grid gap-2">
              {data.integrations.map((integration) => (
                <Link
                  className="rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
                  href={integration.actionHref}
                  key={integration.id}
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{integration.label}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{integration.detail}</p>
                    </div>
                    <span className={`dashboard-pill shrink-0 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${integration.tone}`}>
                      {integration.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Workspace summary</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { icon: ShieldCheck, label: "Active users", value: data.stats.activeUsers },
                { icon: BriefcaseBusiness, label: "Jobs", value: data.stats.jobs },
                { icon: Mail, label: "Email issues", value: data.stats.failedEmails },
                { icon: CalendarDays, label: "Calendars", value: data.stats.calendarConnections },
              ].map((item) => (
                <div className="rounded-lg bg-slate-50 p-3" key={item.label}>
                  <item.icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  <p className="mt-3 text-xs font-semibold uppercase text-slate-500">{item.label}</p>
                  <p className="mt-1 font-semibold text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </WorkspacePageShell>
  );
}
