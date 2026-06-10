import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Clock3,
  Database,
  PlugZap,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShieldQuestion,
  UserCog,
  Users,
} from "lucide-react";
import {
  resendWorkspaceInvite,
  updateWorkspaceMember,
  upsertWorkspaceMember,
} from "@/app/admin/actions";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { adminRoles, requireRole } from "@/lib/auth";
import { getAdminPageData } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function AddUserForm() {
  return (
    <form action={upsertWorkspaceMember} className="grid gap-3">
      <Field label="Name">
        <input className={inputClass} name="name" placeholder="Livia Pereira" required />
      </Field>
      <Field label="Email">
        <input className={inputClass} name="email" placeholder="livia@example.com" required type="email" />
      </Field>
      <Field label="Temporary password">
        <input
          className={inputClass}
          minLength={8}
          name="password"
          placeholder="Set only when activating access"
          type="password"
        />
      </Field>
      <div className="grid gap-3">
        <Field label="Role">
          <select className={inputClass} name="role" defaultValue="RECRUITER">
            <option value="OWNER">Owner</option>
            <option value="ADMIN">Admin</option>
            <option value="RECRUITER">Recruiter</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} name="status" defaultValue="INVITED">
            <option value="INVITED">Invited</option>
            <option value="ACTIVE">Active</option>
          </select>
        </Field>
      </div>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]"
        type="submit"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add user
      </button>
    </form>
  );
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

function getStatusTone(status: string) {
  if (status === "Active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "Invited") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function roleValue(role: string) {
  return role.toUpperCase().replaceAll(" ", "_");
}

function statusValue(status: string) {
  return status.toUpperCase().replaceAll(" ", "_");
}

function getNotice(params?: {
  invite?: string;
  member?: string;
}) {
  if (params?.member) {
    return "Workspace member updated.";
  }

  if (params?.invite) {
    return "Workspace invite refreshed.";
  }

  return null;
}

function PermissionCell({ allowed }: { allowed: boolean }) {
  return (
    <td className="px-3 py-3">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
          allowed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
        }`}
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </td>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ invite?: string; member?: string }>;
}) {
  const params = await searchParams;
  const session = await requireRole(adminRoles);
  const data = await getAdminPageData(session.organization.id);
  const notice = getNotice(params);

  return (
    <WorkspacePageShell
      actions={
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          href="/analytics"
        >
          <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
          Analytics
        </Link>
      }
      icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
      organizationName={data.organization.slug}
      rightPanel={<AddUserForm />}
      rightPanelButtonIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
      rightPanelButtonLabel="User"
      rightPanelDescription="Invite or activate a workspace member."
      rightPanelTitle="Add user"
      title="Admin"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          {notice ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {notice}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Active users", value: data.stats.activeUsers, icon: Users, tone: "text-emerald-700" },
              { label: "Automations", value: data.stats.activeAutomations, icon: PlugZap, tone: "text-sky-700" },
              { label: "Owners/Admins", value: data.stats.ownersAndAdmins, icon: ShieldCheck, tone: "text-violet-700" },
              {
                label: "Issues",
                value: data.stats.failedEmails + data.stats.pendingResumeReview,
                icon: ShieldQuestion,
                tone: "text-amber-700",
              },
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
            <div className="mb-4 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Workspace readiness</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Workspace users</p>
            </div>
            <div className="grid gap-3">
              {data.members.map((member) => (
                <article className="rounded-lg border border-slate-200 p-4" key={member.id}>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-950">{member.name}</h2>
                        <span className={`dashboard-pill rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getStatusTone(member.status)}`}>
                          {member.status}
                        </span>
                        <span className="dashboard-pill rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {member.role}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{member.email}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {[
                          ["Managed jobs", member.managedJobs],
                          ["Interviews", member.interviews],
                          ["Emails", member.sentEmails],
                        ].map(([label, value]) => (
                          <div className="rounded-lg bg-slate-50 px-3 py-2" key={label}>
                            <p className="text-xs font-medium text-slate-500">{label}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid content-start gap-3">
                      <form action={updateWorkspaceMember} className="grid gap-2">
                        <input name="membershipId" type="hidden" value={member.id} />
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                          <select className={inputClass} defaultValue={roleValue(member.role)} name="role">
                            <option value="OWNER">Owner</option>
                            <option value="ADMIN">Admin</option>
                            <option value="RECRUITER">Recruiter</option>
                          </select>
                          <select className={inputClass} defaultValue={statusValue(member.status)} name="status">
                            <option value="INVITED">Invited</option>
                            <option value="ACTIVE">Active</option>
                            <option value="DISABLED">Disabled</option>
                          </select>
                        </div>
                        <button
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          type="submit"
                        >
                          <UserCog className="h-4 w-4" aria-hidden="true" />
                          Save access
                        </button>
                      </form>
                      <form action={resendWorkspaceInvite}>
                        <input name="membershipId" type="hidden" value={member.id} />
                        <button
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          type="submit"
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Refresh invite
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Permission matrix</p>
            </div>
            <div className="grid gap-3 2xl:hidden">
              {data.permissions.map((permission) => (
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={permission.role}>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{permission.role}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{permission.scope}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      { allowed: permission.users, label: "Users" },
                      { allowed: permission.recruiting, label: "Recruiting" },
                      { allowed: permission.automation, label: "Automation" },
                      { allowed: permission.analytics, label: "Analytics" },
                      { allowed: permission.settings, label: "Settings" },
                    ].map((item) => (
                      <div className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2" key={item.label}>
                        <span className="text-xs font-semibold uppercase text-slate-500">{item.label}</span>
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                            item.allowed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden 2xl:block">
              <table className="w-full table-fixed border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Role</th>
                    <th className="px-3 py-2 font-semibold">Users</th>
                    <th className="px-3 py-2 font-semibold">Recruiting</th>
                    <th className="px-3 py-2 font-semibold">Automation</th>
                    <th className="px-3 py-2 font-semibold">Analytics</th>
                    <th className="px-3 py-2 font-semibold">Settings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.permissions.map((permission) => (
                    <tr className="border-b border-slate-100 last:border-0" key={permission.role}>
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-950">{permission.role}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{permission.scope}</p>
                      </td>
                      <PermissionCell allowed={permission.users} />
                      <PermissionCell allowed={permission.recruiting} />
                      <PermissionCell allowed={permission.automation} />
                      <PermissionCell allowed={permission.analytics} />
                      <PermissionCell allowed={permission.settings} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" id="integrations">
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
              <Clock3 className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Audit trail</p>
            </div>
            <div className="space-y-2">
              {data.auditEvents.map((event) => (
                <article className="rounded-lg border border-slate-200 p-3" key={event.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{event.action}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{event.entityType} - {event.context}</p>
                    </div>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{event.actor} - {event.createdAt}</p>
                </article>
              ))}
              {data.auditEvents.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No audit events yet.</p>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </WorkspacePageShell>
  );
}
