import { BillingStatus, Plan, Prisma } from "@/generated/prisma/client";
import { sendBillingEmail } from "@/lib/billing-notifications";
import { prisma } from "@/lib/prisma";

const PERIOD_DAYS = 30;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

type TransitionMeta = {
  source: "webhook" | "sandbox" | "manual";
  pagbankSubscriptionId?: string | null;
  pagbankCustomerId?: string | null;
  lastPaymentStatus?: string | null;
  raw?: Prisma.InputJsonValue;
};

async function recordBillingAudit(
  organizationId: string,
  action: string,
  metadata: Prisma.InputJsonValue,
) {
  try {
    await prisma.auditEvent.create({
      data: {
        organizationId,
        action,
        entityType: "organization",
        entityId: organizationId,
        metadata,
      },
    });
  } catch {
    // Auditoria é best-effort; nunca deve derrubar a transição de billing.
  }
}

/**
 * Pagamento aprovado => assinatura ativa no plano escolhido.
 * Fonte de verdade tanto do webhook do PagBank quanto do modo sandbox.
 */
export async function activateSubscription(
  organizationId: string,
  plan: Plan,
  meta: TransitionMeta,
) {
  const now = new Date();

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      billingStatus: BillingStatus.ACTIVE,
      plan,
      selectedPlan: plan,
      currentPeriodEnd: addDays(now, PERIOD_DAYS),
      lastPaymentStatus: meta.lastPaymentStatus ?? "approved",
      ...(meta.pagbankSubscriptionId ? { pagbankSubscriptionId: meta.pagbankSubscriptionId } : {}),
      ...(meta.pagbankCustomerId ? { pagbankCustomerId: meta.pagbankCustomerId } : {}),
    },
  });

  await recordBillingAudit(organizationId, "billing.subscription_activated", {
    plan,
    source: meta.source,
    lastPaymentStatus: organization.lastPaymentStatus,
  });

  await sendBillingEmail(organizationId, "payment_approved");

  return organization;
}

/** Pagamento recusado/atrasado => PAST_DUE (acesso bloqueado até regularizar). */
export async function markSubscriptionPastDue(organizationId: string, meta: TransitionMeta) {
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      billingStatus: BillingStatus.PAST_DUE,
      lastPaymentStatus: meta.lastPaymentStatus ?? "declined",
    },
  });

  await recordBillingAudit(organizationId, "billing.payment_failed", {
    source: meta.source,
    lastPaymentStatus: organization.lastPaymentStatus,
  });

  await sendBillingEmail(organizationId, "payment_failed");

  return organization;
}

/** Assinatura suspensa pelo gateway. */
export async function suspendSubscription(organizationId: string, meta: TransitionMeta) {
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: { billingStatus: BillingStatus.SUSPENDED },
  });

  await recordBillingAudit(organizationId, "billing.subscription_suspended", {
    source: meta.source,
  });

  return organization;
}

/** Assinatura cancelada. Mantém acesso até currentPeriodEnd (grace) via resolveBillingState. */
export async function cancelSubscription(organizationId: string, meta: TransitionMeta) {
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: { billingStatus: BillingStatus.CANCELED },
  });

  await recordBillingAudit(organizationId, "billing.subscription_canceled", {
    source: meta.source,
  });

  return organization;
}
