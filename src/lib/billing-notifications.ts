import { MembershipRole } from "@/generated/prisma/client";
import { getBillingPlan } from "@/lib/billing";
import {
  paymentApprovedEmail,
  paymentFailedEmail,
  trialEndingSoonEmail,
  trialExpiredEmail,
  trialLastDaysEmail,
  trialWelcomeEmail,
  type BillingEmailContext,
} from "@/lib/billing-emails";
import { sendTransactionalEmail } from "@/lib/email-provider";
import { prisma } from "@/lib/prisma";
import { computeTrialState } from "@/lib/subscription";

export type BillingEmailKind =
  | "welcome"
  | "ending_soon"
  | "last_days"
  | "expired"
  | "payment_approved"
  | "payment_failed";

const TEMPLATE: Record<BillingEmailKind, (ctx: BillingEmailContext) => { subject: string; body: string }> = {
  welcome: trialWelcomeEmail,
  ending_soon: trialEndingSoonEmail,
  last_days: trialLastDaysEmail,
  expired: trialExpiredEmail,
  payment_approved: paymentApprovedEmail,
  payment_failed: paymentFailedEmail,
};

function billingUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  return `${base}/billing`;
}

async function getOrganizationEmailTarget(
  organizationId: string,
): Promise<{ ctx: BillingEmailContext; toEmail: string } | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      plan: true,
      createdAt: true,
      trialStartedAt: true,
      trialEndsAt: true,
      memberships: {
        where: { role: MembershipRole.OWNER, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { user: { select: { name: true, email: true } } },
      },
    },
  });

  const owner = org?.memberships[0]?.user;

  if (!org || !owner?.email) {
    return null;
  }

  const trial = computeTrialState(org);

  return {
    toEmail: owner.email,
    ctx: {
      organizationName: org.name,
      recipientName: owner.name || "Olá",
      trialEndsAt: trial.endsAt,
      daysRemaining: trial.daysRemaining,
      planLabel: getBillingPlan(org.plan).label,
      billingUrl: billingUrl(),
    },
  };
}

/**
 * Envia um email do ciclo de vida de billing para o dono do workspace.
 * Best-effort: nunca lança (não deve derrubar signup/pagamento/cron).
 * Retorna true se enviou, false se pulou (sem destinatário / provedor off).
 */
export async function sendBillingEmail(
  organizationId: string,
  kind: BillingEmailKind,
): Promise<boolean> {
  try {
    const target = await getOrganizationEmailTarget(organizationId);

    if (!target) {
      return false;
    }

    const { subject, body } = TEMPLATE[kind](target.ctx);
    await sendTransactionalEmail({ body, subject, toEmail: target.toEmail });
    return true;
  } catch {
    // Best-effort: falha de email nunca interrompe o fluxo principal.
    return false;
  }
}
