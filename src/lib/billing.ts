import { Plan } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const BILLING_TRIAL_DAYS = 30;

export type BillingPlan = {
  checkoutEnvKeys: string[];
  description: string;
  features: string[];
  highlighted?: boolean;
  label: string;
  plan: Plan;
  priceCents: number;
  priceLabel: string;
  slug: string;
  subtitle: string;
};

export const billingPlans: BillingPlan[] = [
  {
    checkoutEnvKeys: ["PAGBANK_BASIC_CHECKOUT_URL", "PAGBANK_CHECKOUT_BASIC_URL"],
    description: "Para recrutadores independentes e equipes pequenas que querem organizar vagas, candidatos e pipeline.",
    features: [
      "Até 3 vagas ativas",
      "Até 150 candidatos",
      "Página pública de carreiras",
      "Pipeline ATS completo",
      "Suporte por email",
    ],
    label: "Básico",
    plan: Plan.FREE,
    priceCents: 4900,
    priceLabel: "R$ 49/mês",
    slug: "basico",
    subtitle: "Essencial para começar",
  },
  {
    checkoutEnvKeys: ["PAGBANK_INTERMEDIATE_CHECKOUT_URL", "PAGBANK_CHECKOUT_INTERMEDIATE_URL"],
    description: "Para empresas em crescimento que precisam de IA, automações e mais capacidade operacional.",
    features: [
      "Até 15 vagas ativas",
      "Até 1.000 candidatos",
      "Matching com IA",
      "Automação de emails",
      "Agenda e entrevistas",
      "Relatórios de recrutamento",
    ],
    highlighted: true,
    label: "Intermediário",
    plan: Plan.PRO,
    priceCents: 9900,
    priceLabel: "R$ 99/mês",
    slug: "intermediario",
    subtitle: "Mais vendido",
  },
  {
    checkoutEnvKeys: ["PAGBANK_ADVANCED_CHECKOUT_URL", "PAGBANK_CHECKOUT_ADVANCED_URL"],
    description: "Para operações robustas, agências e empresas que contratam com alto volume e precisam de prioridade.",
    features: [
      "Vagas e candidatos ampliados",
      "IA e automações completas",
      "Usuários e permissões avançadas",
      "Onboarding prioritário",
      "Suporte prioritário",
      "Integração assistida",
    ],
    label: "Avançado",
    plan: Plan.ENTERPRISE,
    priceCents: 19900,
    priceLabel: "R$ 199/mês",
    slug: "avancado",
    subtitle: "Operação completa",
  },
];

export function getBillingPlan(plan: Plan) {
  return billingPlans.find((item) => item.plan === plan) ?? billingPlans[1];
}

export function getBillingPlanBySlug(slug?: string | null) {
  return billingPlans.find((item) => item.slug === slug) ?? null;
}

export function getBillingPlanByValue(value?: string | null) {
  return billingPlans.find((item) => item.plan === value || item.slug === value) ?? null;
}

export function getBillingCheckoutUrl(plan: Plan) {
  const billingPlan = getBillingPlan(plan);

  for (const key of billingPlan.checkoutEnvKeys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function getBillingGatewayStatus() {
  const configuredPlans = billingPlans.filter((plan) => Boolean(getBillingCheckoutUrl(plan.plan)));
  const configured = configuredPlans.length === billingPlans.length;

  return {
    configured,
    configuredCount: configuredPlans.length,
    detail: configured
      ? "Links recorrentes do PagBank configurados para todos os planos."
      : `${configuredPlans.length}/${billingPlans.length} links recorrentes configurados.`,
    label: "PagBank Recorrente",
    status: configured ? "Configurado" : configuredPlans.length > 0 ? "Parcial" : "Pendente",
    tone: configured
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : configuredPlans.length > 0
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200",
  };
}

export function getTrialState(createdAt: Date, now = new Date()) {
  const trialEndsAt = new Date(createdAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + BILLING_TRIAL_DAYS);

  const msRemaining = trialEndsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return {
    daysRemaining,
    endsAt: trialEndsAt,
    isActive: daysRemaining > 0,
  };
}

export async function getBillingPageData(organizationId: string) {
  return prisma.organization.findUniqueOrThrow({
    where: {
      id: organizationId,
    },
    select: {
      createdAt: true,
      id: true,
      name: true,
      plan: true,
      slug: true,
      timezone: true,
    },
  });
}
