import "dotenv/config";
import { BillingStatus } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

/**
 * Executar UMA vez logo após `prisma db push` desta feature.
 *
 * Ao adicionar `billingStatus` com default TRIALING e `trialStartedAt` nulo,
 * toda organização já existente passaria a ter o trial vencido (contado a partir
 * do createdAt antigo) e seria bloqueada. Este script "grandfathera" essas orgs
 * como ACTIVE, para que nenhuma conta atual perca acesso.
 *
 * Detecção: orgs criadas antes desta migração têm `trialStartedAt` = NULL
 * (o signup novo sempre preenche a data). Só essas são atualizadas.
 */
async function main() {
  const legacyOrgs = await prisma.organization.findMany({
    where: { trialStartedAt: null },
    select: { id: true, name: true, plan: true, billingStatus: true },
  });

  if (legacyOrgs.length === 0) {
    console.log("Nenhuma organização legada encontrada. Nada a fazer.");
    return;
  }

  const result = await prisma.organization.updateMany({
    where: { trialStartedAt: null },
    data: {
      billingStatus: BillingStatus.ACTIVE,
      trialStartedAt: new Date(),
      trialEndsAt: new Date(),
    },
  });

  console.log(`Organizações preservadas como ACTIVE: ${result.count}`);
  for (const org of legacyOrgs) {
    console.log(`  - ${org.name} (${org.id}) plano=${org.plan}`);
  }
}

main()
  .catch((error) => {
    console.error("Falha no backfill de billing:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
