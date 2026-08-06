import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FlaskConical,
  Lock,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { selectBillingPlan, simulateSandboxPayment } from "@/app/billing/actions";
import { WorkspacePageShell } from "@/components/workspace-page-shell";
import { adminRoles, requireRole } from "@/lib/auth";
import {
  billingPlans,
  getBillingCheckoutUrl,
  getBillingGatewayStatus,
  getBillingPageData,
  getBillingPlan,
} from "@/lib/billing";
import { BILLING_TRIAL_DAYS, getBillingState } from "@/lib/subscription";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

const STATUS_LABEL: Record<string, string> = {
  TRIALING: "Em teste grátis",
  ACTIVE: "Ativo",
  PAST_DUE: "Pagamento pendente",
  SUSPENDED: "Suspenso",
  CANCELED: "Cancelado",
  EXPIRED: "Expirado",
};

const BLOCKED_MESSAGE: Record<string, string> = {
  trial_expired: "Seu teste grátis de 30 dias terminou. Escolha um plano abaixo para reativar seu workspace.",
  expired: "Sua assinatura expirou. Escolha um plano abaixo para reativar o acesso.",
  past_due: "Não conseguimos confirmar seu último pagamento. Regularize para manter o acesso.",
  suspended: "Sua assinatura está suspensa. Escolha um plano para reativar.",
  canceled: "Sua assinatura foi cancelada. Escolha um plano para voltar a usar o workspace.",
};

function getNotice(status?: string, planSlug?: string) {
  if (status === "checkout-missing") {
    const plan = billingPlans.find((item) => item.slug === planSlug);
    return {
      tone: "amber" as const,
      text: `Plano ${plan?.label ?? ""} selecionado. Configure o link recorrente PagBank deste plano para ativar o redirecionamento automático.`,
    };
  }

  if (status === "sandbox-activated") {
    const plan = billingPlans.find((item) => item.slug === planSlug);
    return {
      tone: "emerald" as const,
      text: `Pagamento simulado (sandbox) aprovado. Plano ${plan?.label ?? ""} ativado — acesso liberado.`,
    };
  }

  return null;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ blocked?: string; feature?: string; plan?: string; status?: string }>;
}) {
  const params = await searchParams;
  // skipBillingCheck: esta tela precisa abrir mesmo com o trial vencido.
  const session = await requireRole(adminRoles, { skipBillingCheck: true });
  const organization = await getBillingPageData(session.organization.id);
  const billing = await getBillingState(session.organization.id);
  const currentPlan = getBillingPlan(billing.entitledPlan);
  const gateway = getBillingGatewayStatus();
  const notice = getNotice(params?.status, params?.plan);
  const blockedMessage = params?.blocked ? BLOCKED_MESSAGE[params.blocked] ?? BLOCKED_MESSAGE.expired : null;
  const sandboxMode = !gateway.configured;

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
        {blockedMessage ? (
          <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{blockedMessage}</span>
          </div>
        ) : null}

        {notice ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
              notice.tone === "emerald"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {notice.text}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase text-slate-500">Plano ativo</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{currentPlan.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {STATUS_LABEL[billing.status] ?? billing.status}
            </p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase text-slate-500">Teste grátis</p>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {billing.status === "TRIALING"
                ? billing.trial.isActive
                  ? `${billing.trial.daysRemaining} dias`
                  : "Encerrado"
                : billing.status === "ACTIVE"
                  ? "Assinatura ativa"
                  : "Encerrado"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {BILLING_TRIAL_DAYS} dias de teste. Termina em {formatDate(billing.trial.endsAt)}.
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

        {sandboxMode ? (
          <section className="flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Modo de teste (sandbox) ativo</p>
              <p className="mt-1 leading-6">
                O PagBank ainda não está configurado. Você pode usar o botão “Simular pagamento
                aprovado” em cada plano para testar todo o fluxo de ativação. Em produção, com os
                links recorrentes configurados, esse botão é desativado automaticamente.
              </p>
            </div>
          </section>
        ) : null}

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
              const isCurrent = plan.plan === billing.entitledPlan && billing.status === "ACTIVE";
              const checkoutUrl = getBillingCheckoutUrl(plan.plan);
              const buttonLabel = checkoutUrl
                ? "Selecionar e ir ao checkout"
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

                  <div className="mt-auto grid gap-2 pt-5">
                    <form action={selectBillingPlan}>
                      <input name="plan" type="hidden" value={plan.plan} />
                      <button
                        className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                          plan.highlighted
                            ? "bg-white text-slate-950 hover:bg-slate-100"
                            : "bg-slate-950 text-white hover:bg-slate-800"
                        }`}
                        type="submit"
                      >
                        {buttonLabel}
                        {checkoutUrl ? <ExternalLink className="h-4 w-4" aria-hidden="true" /> : null}
                      </button>
                    </form>

                    {sandboxMode ? (
                      <form action={simulateSandboxPayment}>
                        <input name="plan" type="hidden" value={plan.plan} />
                        <button
                          className={`inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
                            plan.highlighted
                              ? "border-white/30 text-white hover:bg-white/10"
                              : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          }`}
                          type="submit"
                        >
                          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                          Simular pagamento aprovado
                        </button>
                      </form>
                    ) : null}
                  </div>
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
