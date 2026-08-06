import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  CreditCard,
} from "lucide-react";

type TrialBannerStatus = "trialing" | "past_due" | "canceled_grace";

const statusCopy: Record<
  TrialBannerStatus,
  {
    className: string;
    icon: typeof Clock3;
    message: (daysRemaining: number, planLabel: string) => string;
  }
> = {
  trialing: {
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Clock3,
    message: (daysRemaining, planLabel) =>
      `Seu teste grátis do plano ${planLabel} termina em ${daysRemaining} dias — escolha um plano.`,
  },
  past_due: {
    className: "border-rose-200 bg-rose-50 text-rose-900",
    icon: AlertTriangle,
    message: () => "Pagamento pendente — regularize para manter o acesso.",
  },
  canceled_grace: {
    className: "border-slate-200 bg-slate-50 text-slate-700",
    icon: CreditCard,
    message: () => "Assinatura cancelada — acesso até o fim do período.",
  },
};

export function TrialBanner({
  daysRemaining,
  href = "/billing",
  planLabel,
  status,
}: {
  daysRemaining: number;
  status: TrialBannerStatus;
  planLabel: string;
  href?: string;
}) {
  const config = statusCopy[status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${config.className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 leading-6">{config.message(daysRemaining, planLabel)}</p>
        </div>
        <Link
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-slate-950 ring-1 ring-black/10 transition hover:bg-slate-50"
          href={href}
        >
          Ver planos
        </Link>
      </div>
    </div>
  );
}
