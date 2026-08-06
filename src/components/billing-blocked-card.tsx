import Link from "next/link";
import { Lock } from "lucide-react";

type BillingBlockedReason = "trial_expired" | "past_due" | "suspended" | "canceled" | "expired";

const reasonCopy: Record<BillingBlockedReason, { detail: string; title: string }> = {
  trial_expired: {
    title: "Teste grátis encerrado",
    detail: "Seu teste grátis de 30 dias terminou. Escolha um plano para reativar seu workspace.",
  },
  past_due: {
    title: "Pagamento pendente",
    detail: "Não conseguimos confirmar o pagamento. Regularize a assinatura para manter o acesso ao workspace.",
  },
  suspended: {
    title: "Workspace suspenso",
    detail: "O acesso está suspenso no momento. Regularize a assinatura para voltar a usar os recursos contratados.",
  },
  canceled: {
    title: "Assinatura cancelada",
    detail: "Sua assinatura foi cancelada. Escolha um novo plano para reativar o workspace.",
  },
  expired: {
    title: "Acesso expirado",
    detail: "O período de acesso terminou. Escolha um plano para continuar usando a Aptelys.",
  },
};

export function BillingBlockedCard({
  planLabel,
  reason,
}: {
  reason: BillingBlockedReason;
  planLabel: string;
}) {
  const copy = reasonCopy[reason];

  return (
    <section className="flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mx-auto grid max-w-md justify-items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase text-slate-500">Plano {planLabel}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{copy.detail}</p>
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/billing"
        >
          Escolher plano
        </Link>
      </div>
    </section>
  );
}
