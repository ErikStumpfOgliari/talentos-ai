import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  PublicPageShell,
} from "@/components/public-site-shell";
import {
  BILLING_TRIAL_DAYS,
  billingPlans,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos e Preços — Aptelys",
  description:
    "Planos da Aptelys com 30 dias grátis e cobrança recorrente via PagBank: Básico R$49, Intermediário R$69,90 e Avançado R$110/mês. Recrutamento com IA, ATS e automação.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingPage() {
  return (
    <PublicPageShell
      actions={
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:scale-[1.03] hover:bg-slate-800 active:scale-[0.98]"
          href="/signup"
        >
          Começar teste grátis
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
      description="Escolha um plano, use a Aptelys por 30 dias grátis e depois siga com cobrança recorrente automática pelo PagBank."
      eyebrow="Planos Aptelys"
      title="Planos para transformar recrutamento em uma operação recorrente."
    >
      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_320px] lg:items-start">
        <div className="grid gap-4 lg:grid-cols-3">
          {billingPlans.map((plan) => (
            <article
              className={`flex min-w-0 flex-col rounded-lg border p-5 shadow-sm ${
                plan.highlighted ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"
              }`}
              key={plan.plan}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-xs font-semibold uppercase ${plan.highlighted ? "text-emerald-200" : "text-slate-500"}`}>
                    {plan.subtitle}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{plan.label}</h2>
                </div>
                {plan.highlighted ? (
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-950">
                    Popular
                  </span>
                ) : null}
              </div>

              <p className={`mt-4 text-sm leading-6 ${plan.highlighted ? "text-slate-300" : "text-slate-600"}`}>
                {plan.description}
              </p>
              <p className="mt-5 text-3xl font-semibold">{plan.priceLabel}</p>
              <p className={`mt-1 text-xs ${plan.highlighted ? "text-slate-400" : "text-slate-500"}`}>
                {BILLING_TRIAL_DAYS} dias grátis para validar no seu fluxo.
              </p>

              <ul className="mt-5 grid gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li className="flex gap-2" key={feature}>
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? "text-emerald-300" : "text-emerald-700"}`} aria-hidden="true" />
                    <span className={plan.highlighted ? "text-slate-200" : "text-slate-700"}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                className={`mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                  plan.highlighted ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-slate-950 text-white hover:bg-slate-800"
                }`}
                href={`/signup?plan=${plan.slug}`}
              >
                Testar {plan.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>

        <aside className="grid gap-4">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 p-5 text-white">
              <div className="flex items-center gap-3">
                <Image
                  alt="Aptelys"
                  className="h-12 w-12 rounded-lg object-cover"
                  height={96}
                  src="/aptelys-mark.png"
                  width={96}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Aptelys</p>
                  <p className="text-xs text-slate-300">SaaS de recrutamento com IA</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 p-4 text-sm text-slate-600">
              {[
                { icon: BadgeCheck, text: "30 dias grátis antes da cobrança." },
                { icon: CreditCard, text: "Cobrança recorrente mensal via PagBank." },
                { icon: Sparkles, text: "Planos pensados para recrutadores, RHs e agencias." },
                { icon: ShieldCheck, text: "Workspace privado para operacao ATS." },
              ].map((item) => (
                <div className="flex gap-2" key={item.text}>
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
                  <p className="leading-6">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">Divulgação sugerida</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use o teste grátis para converter recrutadores que querem reduzir tempo de triagem, centralizar candidatos e automatizar etapas do processo seletivo.
            </p>
          </section>
        </aside>
      </section>
    </PublicPageShell>
  );
}
