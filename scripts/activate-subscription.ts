import "dotenv/config";
import { MembershipRole } from "../src/generated/prisma/client";
import { getBillingPlanByValue } from "../src/lib/billing";
import { activateSubscription } from "../src/lib/billing-mutations";
import { prisma } from "../src/lib/prisma";

/**
 * Ativação MANUAL de assinatura (ferramenta de operador).
 *
 * Uso quando você confirmou um pagamento no PagBank mas o webhook não conseguiu
 * casar automaticamente (ex.: cliente pagou com email diferente do cadastro).
 *
 *   npm run billing:activate -- <email-ou-slug-da-empresa> <plano>
 *
 * <plano>: basico | intermediario | avancado  (ou FREE | PRO | ENTERPRISE)
 *
 * Exemplos:
 *   npm run billing:activate -- cliente@empresa.com intermediario
 *   npm run billing:activate -- minha-empresa avancado
 *
 * O que faz: marca a org como ACTIVE no plano, define currentPeriodEnd (+30 dias),
 * registra auditoria e dispara o email de "pagamento aprovado".
 */
async function main() {
  const [identifierRaw, planRaw] = process.argv.slice(2);

  if (!identifierRaw || !planRaw) {
    console.error("Uso: npm run billing:activate -- <email-ou-slug> <basico|intermediario|avancado>");
    process.exitCode = 1;
    return;
  }

  const identifier = identifierRaw.trim();
  const billingPlan = getBillingPlanByValue(planRaw.trim());

  if (!billingPlan) {
    console.error(`Plano inválido: "${planRaw}". Use basico, intermediario ou avancado.`);
    process.exitCode = 1;
    return;
  }

  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: identifier },
        {
          memberships: {
            some: {
              role: MembershipRole.OWNER,
              user: { email: identifier.toLowerCase() },
            },
          },
        },
      ],
    },
    select: { id: true, name: true, slug: true, plan: true, billingStatus: true },
  });

  if (!org) {
    console.error(`Nenhuma empresa encontrada para "${identifier}" (tente o slug ou o email do dono).`);
    process.exitCode = 1;
    return;
  }

  console.log(`Empresa: ${org.name} (${org.slug}) — status atual: ${org.billingStatus}/${org.plan}`);
  console.log(`Ativando plano ${billingPlan.label}...`);

  await activateSubscription(org.id, billingPlan.plan, {
    source: "manual",
    lastPaymentStatus: "manual confirmation (PagBank link)",
  });

  console.log(`OK: ${org.name} agora está ACTIVE no plano ${billingPlan.label}. Email de confirmação disparado.`);
}

main()
  .catch((error) => {
    console.error("Falha ao ativar assinatura:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
