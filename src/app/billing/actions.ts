"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminRoles, requireRole } from "@/lib/auth";
import {
  getBillingCheckoutUrl,
  getBillingGatewayStatus,
  getBillingPlanByValue,
} from "@/lib/billing";
import { activateSubscription } from "@/lib/billing-mutations";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBillingRedirectPath(status: string, planSlug: string) {
  return `/billing?status=${encodeURIComponent(status)}&plan=${encodeURIComponent(planSlug)}`;
}

function revalidateBillingSurfaces() {
  revalidatePath("/billing");
  revalidatePath("/settings");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

/**
 * Cliente escolhe o plano que pretende assinar. NÃO ativa a assinatura — isso só
 * acontece quando o pagamento é confirmado (webhook do PagBank ou modo sandbox).
 * Registra a intenção em `selectedPlan` e leva ao checkout recorrente, se houver.
 */
export async function selectBillingPlan(formData: FormData) {
  // skipBillingCheck: precisa funcionar mesmo com o trial vencido (é como o cliente paga).
  const session = await requireRole(adminRoles, { skipBillingCheck: true });
  const billingPlan = getBillingPlanByValue(readString(formData, "plan"));

  if (!billingPlan) {
    throw new Error("Plano de cobrança inválido.");
  }

  const checkoutUrl = getBillingCheckoutUrl(billingPlan.plan);

  await prisma.organization.update({
    where: { id: session.organization.id },
    data: { selectedPlan: billingPlan.plan },
  });

  await prisma.auditEvent.create({
    data: {
      organizationId: session.organization.id,
      actorId: session.user.id,
      action: "billing.plan_selected",
      entityType: "organization",
      entityId: session.organization.id,
      metadata: {
        checkoutConfigured: Boolean(checkoutUrl),
        plan: billingPlan.plan,
        planLabel: billingPlan.label,
        provider: "pagbank_recurring",
      },
    },
  });

  revalidateBillingSurfaces();

  if (checkoutUrl) {
    redirect(checkoutUrl);
  }

  redirect(getBillingRedirectPath("checkout-missing", billingPlan.slug));
}

/**
 * MODO SANDBOX — simula um pagamento aprovado para testar o fluxo de ponta a ponta
 * sem o PagBank real. Só funciona enquanto os links recorrentes NÃO estão
 * configurados (ambiente de teste). Em produção com gateway ativo, é bloqueado.
 */
export async function simulateSandboxPayment(formData: FormData) {
  const session = await requireRole(adminRoles, { skipBillingCheck: true });

  if (getBillingGatewayStatus().configured) {
    // Gateway real configurado: não permitir ativação fake.
    redirect(getBillingRedirectPath("sandbox-disabled", ""));
  }

  const billingPlan = getBillingPlanByValue(readString(formData, "plan"));

  if (!billingPlan) {
    throw new Error("Plano de cobrança inválido.");
  }

  await activateSubscription(session.organization.id, billingPlan.plan, {
    source: "sandbox",
    lastPaymentStatus: "approved (sandbox)",
  });

  revalidateBillingSurfaces();
  redirect(getBillingRedirectPath("sandbox-activated", billingPlan.slug));
}
