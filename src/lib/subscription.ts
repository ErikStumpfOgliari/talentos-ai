import { BillingStatus, Plan } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const BILLING_TRIAL_DAYS = 30;

/**
 * Plano com acesso liberado durante o teste grátis.
 * Toda organização nova testa o Intermediário (PRO) por 30 dias.
 */
export const TRIAL_PLAN: Plan = Plan.PRO;

export type PlanFeature =
  | "aiMatching"
  | "emailAutomation"
  | "interviews"
  | "analytics"
  | "careersPage";

export type PlanLimits = {
  /** null = ilimitado */
  maxActiveJobs: number | null;
  maxCandidates: number | null;
  features: Record<PlanFeature, boolean>;
};

/**
 * Limites reais aplicados no backend (não só escondendo botão).
 * Mantido em sincronia com os textos de `billingPlans` em `@/lib/billing`.
 */
export const planLimits: Record<Plan, PlanLimits> = {
  [Plan.FREE]: {
    maxActiveJobs: 3,
    maxCandidates: 150,
    features: {
      aiMatching: false,
      emailAutomation: false,
      interviews: false,
      analytics: false,
      careersPage: true,
    },
  },
  [Plan.PRO]: {
    maxActiveJobs: 15,
    maxCandidates: 1000,
    features: {
      aiMatching: true,
      emailAutomation: true,
      interviews: true,
      analytics: true,
      careersPage: true,
    },
  },
  [Plan.ENTERPRISE]: {
    maxActiveJobs: null,
    maxCandidates: null,
    features: {
      aiMatching: true,
      emailAutomation: true,
      interviews: true,
      analytics: true,
      careersPage: true,
    },
  },
};

export type BillingAccessReason =
  | "trialing"
  | "active"
  | "canceled_grace"
  | "trial_expired"
  | "past_due"
  | "suspended"
  | "canceled"
  | "expired";

export type TrialState = {
  isActive: boolean;
  daysRemaining: number;
  startedAt: Date;
  endsAt: Date;
};

/** Campos de billing lidos da organização (subconjunto do model Prisma). */
export type OrganizationBillingInput = {
  createdAt: Date;
  plan: Plan;
  billingStatus: BillingStatus;
  selectedPlan: Plan | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

export type BillingState = {
  /** Status efetivo (pode diferir do banco: ex. TRIALING vencido => EXPIRED). */
  status: BillingStatus;
  /** Plano cujos recursos estão ativos agora. */
  entitledPlan: Plan;
  limits: PlanLimits;
  trial: TrialState;
  /** false => usuário só pode acessar /billing. */
  hasAccess: boolean;
  reason: BillingAccessReason;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function computeTrialState(org: Pick<OrganizationBillingInput, "createdAt" | "trialStartedAt" | "trialEndsAt">, now = new Date()): TrialState {
  const startedAt = org.trialStartedAt ?? org.createdAt;
  const endsAt = org.trialEndsAt ?? addDays(startedAt, BILLING_TRIAL_DAYS);
  const msRemaining = endsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return {
    isActive: now.getTime() < endsAt.getTime(),
    daysRemaining,
    startedAt,
    endsAt,
  };
}

/**
 * Máquina de estados: decide, a partir dos campos de billing da organização,
 * qual plano está ativo, quais limites valem e se o acesso deve ser liberado.
 */
export function resolveBillingState(org: OrganizationBillingInput, now = new Date()): BillingState {
  const trial = computeTrialState(org, now);
  const paidPlan = org.plan;

  const grant = (status: BillingStatus, entitledPlan: Plan, reason: BillingAccessReason): BillingState => ({
    status,
    entitledPlan,
    limits: planLimits[entitledPlan],
    trial,
    hasAccess: true,
    reason,
  });

  const block = (status: BillingStatus, reason: BillingAccessReason): BillingState => ({
    status,
    entitledPlan: Plan.FREE,
    limits: planLimits[Plan.FREE],
    trial,
    hasAccess: false,
    reason,
  });

  switch (org.billingStatus) {
    case BillingStatus.ACTIVE:
      return grant(BillingStatus.ACTIVE, paidPlan, "active");

    case BillingStatus.TRIALING:
      if (trial.isActive) {
        return grant(BillingStatus.TRIALING, TRIAL_PLAN, "trialing");
      }
      return block(BillingStatus.EXPIRED, "trial_expired");

    case BillingStatus.CANCELED:
      // Cancelado mas ainda dentro do período pago => mantém acesso até o fim.
      if (org.currentPeriodEnd && org.currentPeriodEnd.getTime() > now.getTime()) {
        return grant(BillingStatus.CANCELED, paidPlan, "canceled_grace");
      }
      return block(BillingStatus.CANCELED, "canceled");

    case BillingStatus.PAST_DUE:
      return block(BillingStatus.PAST_DUE, "past_due");

    case BillingStatus.SUSPENDED:
      return block(BillingStatus.SUSPENDED, "suspended");

    case BillingStatus.EXPIRED:
      return block(BillingStatus.EXPIRED, "expired");

    default:
      return block(BillingStatus.EXPIRED, "expired");
  }
}

const BILLING_SELECT = {
  createdAt: true,
  plan: true,
  billingStatus: true,
  selectedPlan: true,
  trialStartedAt: true,
  trialEndsAt: true,
  currentPeriodEnd: true,
} as const;

/** Carrega os campos de billing e resolve o estado da assinatura. */
export async function getBillingState(organizationId: string, now = new Date()): Promise<BillingState> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: BILLING_SELECT,
  });

  return resolveBillingState(org, now);
}

export function isFeatureEnabled(state: BillingState, feature: PlanFeature) {
  return state.hasAccess && state.limits.features[feature];
}

export type LimitCheck = {
  allowed: boolean;
  limit: number | null;
  current: number;
  remaining: number | null;
};

function checkCountLimit(current: number, limit: number | null): LimitCheck {
  if (limit === null) {
    return { allowed: true, limit: null, current, remaining: null };
  }
  return {
    allowed: current < limit,
    limit,
    current,
    remaining: Math.max(0, limit - current),
  };
}

/** Pode criar mais uma vaga ativa? (limite real por plano) */
export function canAddActiveJob(state: BillingState, currentActiveJobs: number): LimitCheck {
  if (!state.hasAccess) {
    return { allowed: false, limit: 0, current: currentActiveJobs, remaining: 0 };
  }
  return checkCountLimit(currentActiveJobs, state.limits.maxActiveJobs);
}

/** Pode adicionar mais um candidato? (limite real por plano) */
export function canAddCandidate(state: BillingState, currentCandidates: number): LimitCheck {
  if (!state.hasAccess) {
    return { allowed: false, limit: 0, current: currentCandidates, remaining: 0 };
  }
  return checkCountLimit(currentCandidates, state.limits.maxCandidates);
}
