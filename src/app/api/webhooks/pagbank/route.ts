import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import {
  activateSubscription,
  cancelSubscription,
  markSubscriptionPastDue,
  suspendSubscription,
} from "@/lib/billing-mutations";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Webhook de pagamentos recorrentes do PagBank.
 *
 * COMO PLUGAR (quando a conta PagBank estiver pronta):
 * 1. Defina PAGBANK_WEBHOOK_TOKEN no ambiente (um segredo aleatório).
 * 2. Cadastre a URL do webhook no PagBank apontando para
 *    `https://SEU_DOMINIO/api/webhooks/pagbank?token=SEU_TOKEN`.
 * 3. Ao criar o Link de Pagamento Recorrente, envie o id da organização no campo
 *    de referência (reference_id / reference), para que o webhook saiba qual
 *    workspace ativar. Alternativamente, salvamos o pagbankSubscriptionId.
 *
 * O formato exato do payload do PagBank pode variar; a extração abaixo é tolerante
 * e cobre os campos mais comuns. Ajuste `classifyEvent`/`extractRefs` conforme o
 * payload real que você observar nos primeiros eventos (ficam salvos em WebhookEvent).
 */

type BillingAction = "activate" | "past_due" | "suspend" | "cancel" | "ignore";

function tokenIsValid(request: Request): boolean {
  const expected = process.env.PAGBANK_WEBHOOK_TOKEN?.trim();

  // Sem token configurado: ainda em setup. Aceita para permitir testes locais,
  // mas registra. Em produção, DEFINA o token para rejeitar chamadas não autenticadas.
  if (!expected) {
    return true;
  }

  const url = new URL(request.url);
  const provided =
    url.searchParams.get("token") ??
    request.headers.get("x-pagbank-token") ??
    request.headers.get("x-webhook-token") ??
    "";

  return provided === expected;
}

/** Classifica o evento em uma transição de billing a partir do tipo/status. */
function classifyEvent(payload: Record<string, unknown>): BillingAction {
  const haystack = JSON.stringify(payload).toUpperCase();

  const has = (...terms: string[]) => terms.some((term) => haystack.includes(term));

  if (has("CANCEL")) {
    return "cancel";
  }
  if (has("SUSPEND")) {
    return "suspend";
  }
  if (has("DECLINED", "REFUSED", "UNPAID", "PAST_DUE", "PAYMENT_FAILED", "CHARGEBACK")) {
    return "past_due";
  }
  if (has("PAID", "APPROVED", "ACTIVE", "AUTHORIZED", "SUBSCRIPTION.CREATED")) {
    return "activate";
  }

  return "ignore";
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Extrai referências úteis do payload (id do evento, org, assinatura, cliente). */
function extractRefs(payload: Record<string, unknown>) {
  const nestedData =
    (payload.data as Record<string, unknown> | undefined) ??
    (payload.charge as Record<string, unknown> | undefined) ??
    payload;

  const referenceId =
    pickString(payload, ["reference_id", "reference", "external_reference"]) ??
    pickString(nestedData, ["reference_id", "reference", "external_reference"]);

  const subscriptionId =
    pickString(payload, ["subscription_id", "subscriptionId"]) ??
    pickString(nestedData, ["subscription_id", "subscriptionId", "id"]);

  const customerId = pickString(nestedData, ["customer_id", "customerId"]);
  const customerEmail =
    pickString((nestedData.customer as Record<string, unknown>) ?? {}, ["email"]) ??
    pickString(nestedData, ["customer_email", "email"]);

  const eventId =
    pickString(payload, ["id", "notification_code", "notificationCode", "event_id"]) ??
    subscriptionId ??
    `${Date.now()}`;

  return { referenceId, subscriptionId, customerId, customerEmail, eventId };
}

/** Descobre a qual organização o evento pertence. */
async function findOrganizationId(refs: ReturnType<typeof extractRefs>): Promise<string | null> {
  if (refs.referenceId) {
    const byRef = await prisma.organization.findUnique({
      where: { id: refs.referenceId },
      select: { id: true },
    });
    if (byRef) {
      return byRef.id;
    }
  }

  if (refs.subscriptionId) {
    const bySub = await prisma.organization.findFirst({
      where: { pagbankSubscriptionId: refs.subscriptionId },
      select: { id: true },
    });
    if (bySub) {
      return bySub.id;
    }
  }

  if (refs.customerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: refs.customerEmail.toLowerCase() },
      select: {
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          select: { organizationId: true },
          take: 1,
        },
      },
    });
    const orgId = user?.memberships[0]?.organizationId;
    if (orgId) {
      return orgId;
    }
  }

  return null;
}

export async function POST(request: Request) {
  if (!tokenIsValid(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();

  let payload: Record<string, unknown>;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const refs = extractRefs(payload);
  const action = classifyEvent(payload);
  const eventType = pickString(payload, ["type", "event", "status"]) ?? action;

  // Idempotência: se já processamos este eventId, não repete.
  const existing = await prisma.webhookEvent.findUnique({
    where: { provider_externalId: { provider: "pagbank", externalId: refs.eventId } },
    select: { id: true, status: true },
  });

  if (existing) {
    return NextResponse.json({ duplicate: true, id: refs.eventId });
  }

  const organizationId = await findOrganizationId(refs);

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      provider: "pagbank",
      externalId: refs.eventId,
      eventType,
      organizationId,
      status: "received",
      payload: payload as Prisma.InputJsonValue,
    },
  });

  // Sem organização identificada: guarda o evento para inspeção manual, mas não falha.
  if (!organizationId) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "unmatched", processedAt: new Date() },
    });
    return NextResponse.json({ received: true, matched: false, action });
  }

  try {
    if (action === "activate") {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { plan: true, selectedPlan: true },
      });
      await activateSubscription(organizationId, org.selectedPlan ?? org.plan, {
        source: "webhook",
        pagbankSubscriptionId: refs.subscriptionId,
        pagbankCustomerId: refs.customerId,
        lastPaymentStatus: eventType,
        raw: payload as Prisma.InputJsonValue,
      });
    } else if (action === "past_due") {
      await markSubscriptionPastDue(organizationId, { source: "webhook", lastPaymentStatus: eventType });
    } else if (action === "suspend") {
      await suspendSubscription(organizationId, { source: "webhook" });
    } else if (action === "cancel") {
      await cancelSubscription(organizationId, { source: "webhook" });
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: action === "ignore" ? "ignored" : "processed", processedAt: new Date() },
    });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: "error",
        error: error instanceof Error ? error.message : "unknown",
        processedAt: new Date(),
      },
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true, matched: true, action });
}
