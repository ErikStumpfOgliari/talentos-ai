import { NextResponse } from "next/server";
import { BillingStatus, Prisma } from "@/generated/prisma/client";
import { sendBillingEmail } from "@/lib/billing-notifications";
import { prisma } from "@/lib/prisma";
import { computeTrialState } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diário de lembretes do trial. Configurado em vercel.json para rodar 1x/dia.
 *
 * Segurança: se CRON_SECRET estiver definido, exige
 * `Authorization: Bearer <CRON_SECRET>` (o Vercel Cron envia esse header
 * automaticamente quando a env existe). Sem CRON_SECRET, roda livre (dev).
 *
 * Idempotência: cada tipo de lembrete é marcado em Organization.billingRemindersSent
 * ({ welcome, d7, d3, expired }) para nunca reenviar.
 */

type RemindersSent = {
  welcome?: boolean;
  d7?: boolean;
  d3?: boolean;
  expired?: boolean;
};

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return true;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const trialingOrgs = await prisma.organization.findMany({
    where: { billingStatus: BillingStatus.TRIALING },
    select: {
      id: true,
      createdAt: true,
      trialStartedAt: true,
      trialEndsAt: true,
      billingRemindersSent: true,
    },
  });

  const summary = { checked: trialingOrgs.length, ending_soon: 0, last_days: 0, expired: 0 };

  for (const org of trialingOrgs) {
    const trial = computeTrialState(org);
    const sent = (org.billingRemindersSent as RemindersSent | null) ?? {};
    const nextSent: RemindersSent = { ...sent };
    let statusUpdate: BillingStatus | undefined;
    let changed = false;

    if (!trial.isActive) {
      // Trial venceu: marca EXPIRED e envia o aviso de expiração (uma vez).
      statusUpdate = BillingStatus.EXPIRED;
      if (!sent.expired) {
        await sendBillingEmail(org.id, "expired");
        nextSent.expired = true;
        summary.expired += 1;
      }
      changed = true;
    } else if (trial.daysRemaining <= 3 && !sent.d3) {
      await sendBillingEmail(org.id, "last_days");
      nextSent.d3 = true;
      nextSent.d7 = true; // já passou da janela dos 7 dias
      summary.last_days += 1;
      changed = true;
    } else if (trial.daysRemaining <= 7 && !sent.d7) {
      await sendBillingEmail(org.id, "ending_soon");
      nextSent.d7 = true;
      summary.ending_soon += 1;
      changed = true;
    }

    if (changed) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          billingRemindersSent: nextSent as Prisma.InputJsonValue,
          ...(statusUpdate ? { billingStatus: statusUpdate } : {}),
        },
      });
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
