"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminRoles, requireRole } from "@/lib/auth";
import {
  getBillingCheckoutUrl,
  getBillingPlanByValue,
} from "@/lib/billing";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBillingRedirectPath(status: string, planSlug: string) {
  return `/billing?status=${encodeURIComponent(status)}&plan=${encodeURIComponent(planSlug)}`;
}

export async function selectBillingPlan(formData: FormData) {
  const session = await requireRole(adminRoles);
  const billingPlan = getBillingPlanByValue(readString(formData, "plan"));

  if (!billingPlan) {
    throw new Error("Plano de cobrança inválido.");
  }

  const checkoutUrl = getBillingCheckoutUrl(billingPlan.plan);

  await prisma.organization.update({
    where: {
      id: session.organization.id,
    },
    data: {
      plan: billingPlan.plan,
    },
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
        trialDays: 30,
      },
    },
  });

  revalidatePath("/billing");
  revalidatePath("/settings");
  revalidatePath("/admin");
  revalidatePath("/dashboard");

  if (checkoutUrl) {
    redirect(checkoutUrl);
  }

  redirect(getBillingRedirectPath("checkout-missing", billingPlan.slug));
}
