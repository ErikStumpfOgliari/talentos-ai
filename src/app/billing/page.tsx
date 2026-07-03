import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { selectBillingPlan } from "@/app/billing/actions";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { adminRoles, requireRole } from "@/lib/auth";
import {
  BILLING_TRIAL_DAYS,
  billingPlans,
  getBillingCheckoutUrl,
  getBillingGatewayStatus,
  getBillingPageData,
  getBillingPlan,
  getTrialState,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getNotice(status?: string, planSlug?: string) {
  if (status === "checkout-missing") {
    const plan = billingPlans.find((item) => item.slug === planSlug);
    return `Plano ${plan?.label ?? ""} selecionado. Configure o link recorrente PagBank deste plano para ativar o redirecionamento automático.`;
  }

  return null;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await requireRole(adminRoles);
  const organization = await getBillingPageData(session.organization.id);
  const currentPlan = getBillingPlan(organization.plan);
  const trial = getTrialState(organization.createdAt);
  const gateway = getBillingGatewayStatus();
  const notice = getNotice(params?.status, params?.plan);

  return (
    <WorkspacePageShell
      actions={
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:scale-[1.03] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          href="/settings"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Configurações
        </Link>
      }
      icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
      organizationName={organization.slug}
      title="Cobrança e planos"
    >
      <div className="grid gap-5">
        {notice ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {notice}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase text-slate-500">Plano atual</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{currentPlan.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{currentPlan.priceLabel}</p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase text-slate-500">Teste grátis</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {trial.isActive ? `${trial.daysRemaining} dias` : "Encerrado"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {BILLING_TRIAL_DAYS} dias desde a criação. Termina em {formatDate(trial.endsAt)}.
            </p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-700" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase text-slate-500">Gateway</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{gateway.status}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{gateway.detail}</p>
          </article>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Planos comerciais</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Os três planos incluem {BILLING_TRIAL_DAYS} dias grátis. A cobrança recorrente usa o link/checkout configurado no PagBank.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href="/pricing"
            >
              Ver pagina publica
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {billingPlans.map((plan) => {
              const isCurrent = plan.plan === organization.plan;
              const checkoutUrl = getBillingCheckoutUrl(plan.plan);
              const buttonLabel = checkoutUrl
                ? isCurrent
                  ? "Abrir checkout recorrente"
                  : "Selecionar e ir ao checkout"
                : isCurrent
                  ? "Plano atual"
                  : "Selecionar plano";

              return (
                <article
                  className={`flex min-w-0 flex-col rounded-lg border p-4 ${
                    plan.highlighted ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"
                  }`}
                  key={plan.plan}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold uppercase ${plan.highlighted ? "text-emerald-200" : "text-slate-500"}`}>
                        {plan.subtitle}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">{plan.label}</h2>
                    </div>
                    {isCurrent ? (
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${plan.highlighted ? "bg-white text-slate-950" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>
                        Atual
                      </span>
                    ) : null}
                  </div>

                  <p className={`mt-3 text-sm leading-6 ${plan.highlighted ? "text-slate-300" : "text-slate-600"}`}>
                    {plan.description}
                  </p>
                  <p className="mt-5 text-3xl font-semibold">{plan.priceLabel}</p>
                  <p className={`mt-1 text-xs ${plan.highlighted ? "text-slate-400" : "text-slate-500"}`}>
                    30 dias grátis antes da cobrança recorrente.
                  </p>

                  <ul className="mt-5 grid gap-2 text-sm">
                    {plan.features.map((feature) => (
                      <li className="flex gap-2" key={feature}>
                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? "text-emerald-300" : "text-emerald-700"}`} aria-hidden="true" />
                        <span className={plan.highlighted ? "text-slate-200" : "text-slate-700"}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <form action={selectBillingPlan} className="mt-auto pt-5">
                    <input name="plan" type="hidden" value={plan.plan} />
                    <button
                      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                        plan.highlighted
                          ? "bg-white text-slate-950 hover:bg-slate-100"
                          : "bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600"
                      }`}
                      disabled={isCurrent && !checkoutUrl}
                      type="submit"
                    >
                      {buttonLabel}
                      {checkoutUrl ? <ExternalLink className="h-4 w-4" aria-hidden="true" /> : null}
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        </section>

        {!gateway.configured ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-semibold">Falta conectar os links recorrentes do PagBank.</p>
                <p className="mt-1 leading-6">
                  Configure `PAGBANK_BASIC_CHECKOUT_URL`, `PAGBANK_INTERMEDIATE_CHECKOUT_URL` e `PAGBANK_ADVANCED_CHECKOUT_URL`
                  com os links recorrentes criados no PagBank. Depois disso, os botões levam o cliente direto para a cobrança automática.
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </WorkspacePageShell>
  );
}
