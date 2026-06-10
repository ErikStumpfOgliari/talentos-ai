import Link from "next/link";
import {
  BadgeCheck,
  Clock3,
  Mail,
  MailCheck,
  MailPlus,
  Power,
  Send,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import {
  createAutomationRule,
  createEmailTemplate,
  queueManualTemplateEmail,
  rejectApplicationWithEmail,
  sendQueuedEmail,
  toggleAutomationRule,
} from "@/app/email-automation/actions";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { automationRoles, requireRole } from "@/lib/auth";
import { getEmailAutomationPageData } from "@/lib/email-automation-data";

export const dynamic = "force-dynamic";

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";
const textareaClass =
  "min-h-24 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400";

function CreateTemplateForm() {
  return (
    <form action={createEmailTemplate} className="grid gap-3">
      <Field label="Name">
        <input className={inputClass} name="name" placeholder="Interview confirmation" required />
      </Field>
      <Field label="Trigger">
        <select className={inputClass} name="trigger" defaultValue="INTERVIEW_SCHEDULED">
          <option value="MANUAL">Manual</option>
          <option value="APPLICATION_RECEIVED">Application received</option>
          <option value="MOVED_TO_STAGE">Moved to stage</option>
          <option value="INTERVIEW_SCHEDULED">Interview scheduled</option>
          <option value="OFFER_CREATED">Offer created</option>
          <option value="REJECTION_SENT">Rejection sent</option>
        </select>
      </Field>
      <Field label="Subject">
        <input className={inputClass} name="subject" placeholder="Next step for {{jobTitle}}" required />
      </Field>
      <Field label="Body">
        <textarea
          className={textareaClass}
          name="body"
          placeholder="Hi {{candidateName}}, your interview for {{jobTitle}} is scheduled for {{interviewTime}}."
          required
        />
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input className="h-4 w-4 rounded border-slate-300" defaultChecked name="active" type="checkbox" />
        Active
      </label>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]"
        type="submit"
      >
        <MailPlus className="h-4 w-4" aria-hidden="true" />
        Save template
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
  if (status === "Sent" || status === "Delivered") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "Queued") {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }

  if (status === "Failed" || status === "Bounced") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getNotice(params?: {
  failed?: string;
  queued?: string;
  rejected?: string;
  rule?: string;
  sent?: string;
  template?: string;
}) {
  if (params?.template) {
    return "Email template saved.";
  }

  if (params?.rule) {
    return "Automation rule updated.";
  }

  if (params?.queued) {
    return "Email queued in the outbox. Configure Resend to send it.";
  }

  if (params?.sent) {
    return "Email sent through the configured provider.";
  }

  if (params?.failed) {
    return "Email delivery failed. Check provider settings and message details.";
  }

  if (params?.rejected) {
    if (params.rejected === "sent") {
      return "Application rejected and rejection email sent.";
    }

    if (params.rejected === "failed") {
      return "Application rejected, but email delivery failed.";
    }

    return "Application rejected and rejection email queued.";
  }

  return null;
}

export default async function EmailAutomationPage({
  searchParams,
}: {
  searchParams?: Promise<{ failed?: string; queued?: string; rejected?: string; rule?: string; sent?: string; template?: string }>;
}) {
  const params = await searchParams;
  const session = await requireRole(automationRoles);
  const data = await getEmailAutomationPageData(session.organization.id);
  const notice = getNotice(params);
  const rejectionTemplates = data.templates.filter((template) => template.trigger === "Rejection Sent");

  return (
    <WorkspacePageShell
      actions={
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          href="/interviews"
        >
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          Interviews
        </Link>
      }
      icon={<Mail className="h-5 w-5" aria-hidden="true" />}
      organizationName={data.organizationName}
      rightPanel={<CreateTemplateForm />}
      rightPanelButtonIcon={<MailPlus className="h-4 w-4" aria-hidden="true" />}
      rightPanelButtonLabel="Template"
      rightPanelDescription="Create reusable candidate communication."
      rightPanelTitle="Create template"
      title="Email Automation"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          {notice ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {notice}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Templates", value: data.stats.templates, icon: MailPlus, tone: "text-slate-700" },
              { label: "Active rules", value: data.stats.activeRules, icon: Workflow, tone: "text-violet-700" },
              { label: "Queued", value: data.stats.queued, icon: Send, tone: "text-sky-700" },
              { label: "Sent", value: data.stats.sent, icon: MailCheck, tone: "text-emerald-700" },
              { label: "Failed", value: data.stats.failed, icon: ShieldAlert, tone: "text-rose-700" },
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Outbox</p>
                <p className="mt-1 text-xs text-slate-500">Queued, sent, and event-driven candidate messages.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {data.messages.length}
              </span>
            </div>

            <div className="grid gap-3">
              {data.messages.map((message) => (
                <article className="rounded-lg border border-slate-200 p-4" key={message.id}>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-950">{message.subject}</h2>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getStatusTone(message.status)}`}>
                          {message.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-600">{message.candidate} - {message.jobTitle}</p>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{message.body}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{message.trigger}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{message.template}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{message.provider}</span>
                      </div>
                    </div>
                    <div className="grid content-start gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Recipient</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-950">{message.toEmail}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">Created</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{message.createdAt}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">Sent</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{message.sentAt}</p>
                        </div>
                      </div>
                      {message.status === "Queued" || message.status === "Draft" || message.status === "Failed" ? (
                        <form action={sendQueuedEmail}>
                          <input name="messageId" type="hidden" value={message.id} />
                          <button
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            type="submit"
                          >
                            <Send className="h-4 w-4" aria-hidden="true" />
                            Send now
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}

              {data.messages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
                  <Mail className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-950">No messages yet</p>
                  <p className="mt-1 text-sm text-slate-500">Queue the first template email from an active application.</p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MailPlus className="h-4 w-4 text-sky-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Templates</p>
              </div>
              <div className="space-y-3">
                {data.templates.map((template) => (
                  <article className="rounded-lg border border-slate-200 p-3" key={template.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{template.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{template.subject}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {template.sentCount}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{template.trigger}</span>
                      <span className={template.active ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700" : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"}>
                        {template.active ? "Active" : "Paused"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Workflow className="h-4 w-4 text-violet-700" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-950">Automation rules</p>
              </div>
              <div className="space-y-3">
                {data.rules.map((rule) => (
                  <article className="rounded-lg border border-slate-200 p-3" key={rule.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{rule.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{rule.template}</p>
                      </div>
                      <form action={toggleAutomationRule}>
                        <input name="ruleId" type="hidden" value={rule.id} />
                        <input name="active" type="hidden" value={String(!rule.active)} />
                        <button
                          aria-label={rule.active ? "Pause rule" : "Activate rule"}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                          type="submit"
                        >
                          <Power className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </form>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{rule.trigger}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{rule.stage}</span>
                      <span className={rule.active ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700" : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"}>
                        {rule.active ? "Active" : "Paused"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MailCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Delivery provider</p>
            </div>
            <div className="grid gap-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Provider</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{data.stats.providerName}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">From</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-950">{data.stats.providerFrom}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Webhook endpoint</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-950">/api/webhooks/resend</p>
              </div>
              <span
                className={
                  data.stats.providerConfigured
                    ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                    : "rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                }
              >
                {data.stats.providerConfigured ? "Ready to send" : "Outbox mode"}
              </span>
              <span
                className={
                  data.stats.webhookConfigured
                    ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                    : "rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                }
              >
                {data.stats.webhookConfigured ? "Webhooks verified" : "Webhook secret missing"}
              </span>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Create rule</p>
            </div>
            <form action={createAutomationRule} className="grid gap-3">
              <Field label="Name">
                <input className={inputClass} name="name" placeholder="Send interview confirmation" required />
              </Field>
              <Field label="Event">
                <select className={inputClass} name="trigger" defaultValue="INTERVIEW_SCHEDULED">
                  <option value="STAGE_CHANGED">Stage changed</option>
                  <option value="INTERVIEW_SCHEDULED">Interview scheduled</option>
                  <option value="CANDIDATE_CREATED">Candidate created</option>
                  <option value="SCORE_UPDATED">Score updated</option>
                  <option value="REJECTION_SENT">Rejection sent</option>
                </select>
              </Field>
              <Field label="Template">
                <select className={inputClass} name="templateId" required>
                  <option value="">Select template</option>
                  {data.templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Stage">
                <select className={inputClass} name="stageId" defaultValue="">
                  <option value="">Any stage</option>
                  {data.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Delay minutes">
                <input className={inputClass} min="0" name="delayMinutes" placeholder="0" type="number" />
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input className="h-4 w-4 rounded border-slate-300" defaultChecked name="active" type="checkbox" />
                Active
              </label>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={data.templates.length === 0}
                type="submit"
              >
                <Workflow className="h-4 w-4" aria-hidden="true" />
                Save rule
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Queue email</p>
            </div>
            <form action={queueManualTemplateEmail} className="grid gap-3">
              <Field label="Application">
                <select className={inputClass} name="applicationId" required>
                  <option value="">Select application</option>
                  {data.applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.label} ({application.matchScore}%)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Template">
                <select className={inputClass} name="templateId" required>
                  <option value="">Select template</option>
                  {data.templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sender">
                <select className={inputClass} name="senderId" defaultValue="">
                  <option value="">Unassigned</option>
                  {data.senders.map((sender) => (
                    <option key={sender.id} value={sender.id}>
                      {sender.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={data.applications.length === 0 || data.templates.length === 0}
                type="submit"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Queue email
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Reject with email</p>
            </div>
            <form action={rejectApplicationWithEmail} className="grid gap-3">
              <Field label="Application">
                <select className={inputClass} name="applicationId" required>
                  <option value="">Select application</option>
                  {data.applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.label} ({application.stage})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Template">
                <select className={inputClass} name="templateId" required>
                  <option value="">Select rejection template</option>
                  {(rejectionTemplates.length ? rejectionTemplates : data.templates).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sender">
                <select className={inputClass} name="senderId" defaultValue="">
                  <option value="">Unassigned</option>
                  {data.senders.map((sender) => (
                    <option key={sender.id} value={sender.id}>
                      {sender.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
                disabled={data.applications.length === 0 || data.templates.length === 0}
                type="submit"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                Reject candidate
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-950">Variables</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {["candidateName", "jobTitle", "stageName", "interviewTime", "meetingUrl", "matchScore"].map((variable) => (
                <span className="rounded-md bg-slate-100 px-2 py-1" key={variable}>
                  {`{{${variable}}}`}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </WorkspacePageShell>
  );
}
