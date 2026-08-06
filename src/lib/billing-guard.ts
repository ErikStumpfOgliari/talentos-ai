import { redirect } from "next/navigation";
import { requireSession, type AuthSession } from "@/lib/auth";
import {
  getBillingState,
  isFeatureEnabled,
  type BillingState,
  type PlanFeature,
} from "@/lib/subscription";

/**
 * Erro de limite/permissão de plano. As server actions lançam este erro para
 * bloquear a ação no backend (não basta esconder o botão na UI).
 */
export class PlanLimitError extends Error {
  readonly code: string;

  constructor(message: string, code = "plan_limit") {
    super(message);
    this.name = "PlanLimitError";
    this.code = code;
  }
}

export function isPlanLimitError(error: unknown): error is PlanLimitError {
  return error instanceof PlanLimitError;
}

/** Sessão + estado de billing resolvido. Não redireciona. */
export async function getSessionBilling(): Promise<{ session: AuthSession; billing: BillingState }> {
  // skipBillingCheck: resolvemos o estado nós mesmos abaixo (evita consulta dupla).
  const session = await requireSession({ skipBillingCheck: true });
  const billing = await getBillingState(session.organization.id);
  return { session, billing };
}

/**
 * Garante que a organização tem acesso liberado (trial ativo ou assinatura paga).
 * Se o trial venceu / assinatura não está em dia, manda para /billing.
 * Use no layout do workspace e em páginas protegidas.
 */
export async function requireBillingAccess(): Promise<{ session: AuthSession; billing: BillingState }> {
  const { session, billing } = await getSessionBilling();

  if (!billing.hasAccess) {
    redirect(`/billing?blocked=${encodeURIComponent(billing.reason)}`);
  }

  return { session, billing };
}

/**
 * Garante acesso E que o plano atual inclui o recurso pedido (IA, automação, etc.).
 * Para páginas de recursos avançados.
 */
export async function requireFeature(feature: PlanFeature): Promise<{ session: AuthSession; billing: BillingState }> {
  const { session, billing } = await requireBillingAccess();

  if (!isFeatureEnabled(billing, feature)) {
    redirect(`/billing?feature=${encodeURIComponent(feature)}`);
  }

  return { session, billing };
}

/**
 * Versão para server actions: lança PlanLimitError em vez de redirecionar.
 */
export function assertFeature(billing: BillingState, feature: PlanFeature, message?: string) {
  if (!billing.hasAccess) {
    throw new PlanLimitError(
      "Seu teste grátis terminou. Escolha um plano em Cobrança para continuar.",
      "billing_blocked",
    );
  }

  if (!isFeatureEnabled(billing, feature)) {
    throw new PlanLimitError(
      message ?? "Este recurso não está incluído no seu plano atual. Faça upgrade em Cobrança.",
      "feature_locked",
    );
  }
}
