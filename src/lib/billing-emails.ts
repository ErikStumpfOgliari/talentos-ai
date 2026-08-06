export type BillingEmailContext = {
  organizationName: string;
  recipientName: string;
  trialEndsAt: Date;
  daysRemaining: number;
  planLabel: string;
  billingUrl: string;
};

type BillingEmail = {
  subject: string;
  body: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildBody(lines: string[], action: string, billingUrl: string) {
  return [...lines, "", `Ação: ${action}`, billingUrl].join("\n");
}

export function trialWelcomeEmail(ctx: BillingEmailContext): BillingEmail {
  return {
    subject: `Bem-vindo ao teste grátis da Aptelys`,
    body: buildBody(
      [
        `Olá, ${ctx.recipientName}.`,
        "",
        `O workspace ${ctx.organizationName} já está com o teste grátis da Aptelys ativo no plano ${ctx.planLabel}.`,
        `Você tem acesso aos recursos do plano até ${formatDate(ctx.trialEndsAt)}.`,
        "",
        "Aproveite este período para cadastrar vagas, organizar candidatos, testar o matching com IA e validar o fluxo de recrutamento com sua equipe.",
      ],
      "acesse a área de cobrança para acompanhar seu teste grátis",
      ctx.billingUrl,
    ),
  };
}

export function trialEndingSoonEmail(ctx: BillingEmailContext): BillingEmail {
  return {
    subject: `Seu teste grátis da Aptelys termina em 7 dias`,
    body: buildBody(
      [
        `Olá, ${ctx.recipientName}.`,
        "",
        `O teste grátis do workspace ${ctx.organizationName} termina em ${ctx.daysRemaining} dias, em ${formatDate(ctx.trialEndsAt)}.`,
        `Até lá, o plano ${ctx.planLabel} continua liberado para sua operação de recrutamento.`,
        "",
        "Para manter o acesso sem interrupção, escolha o plano que melhor acompanha o volume da sua equipe.",
      ],
      "escolha um plano para manter seu workspace ativo",
      ctx.billingUrl,
    ),
  };
}

export function trialLastDaysEmail(ctx: BillingEmailContext): BillingEmail {
  return {
    subject: `Faltam 3 dias para o fim do teste grátis`,
    body: buildBody(
      [
        `Olá, ${ctx.recipientName}.`,
        "",
        `Seu teste grátis da Aptelys para ${ctx.organizationName} está nos últimos ${ctx.daysRemaining} dias.`,
        `O acesso ao plano ${ctx.planLabel} segue disponível até ${formatDate(ctx.trialEndsAt)}.`,
        "",
        "Regularize a assinatura agora para continuar usando o ATS, os dados da operação e os recursos do plano sem pausa.",
      ],
      "acesse os planos e regularize sua assinatura",
      ctx.billingUrl,
    ),
  };
}

export function trialExpiredEmail(ctx: BillingEmailContext): BillingEmail {
  return {
    subject: `Seu teste grátis da Aptelys terminou`,
    body: buildBody(
      [
        `Olá, ${ctx.recipientName}.`,
        "",
        `O teste grátis do workspace ${ctx.organizationName} terminou em ${formatDate(ctx.trialEndsAt)}.`,
        "Para reativar o acesso completo, escolha um plano e finalize a assinatura.",
        "",
        "Depois da confirmação do pagamento, o workspace volta a operar conforme os recursos do plano selecionado.",
      ],
      "escolha um plano para reativar seu workspace",
      ctx.billingUrl,
    ),
  };
}

export function paymentApprovedEmail(ctx: BillingEmailContext): BillingEmail {
  return {
    subject: `Pagamento aprovado na Aptelys`,
    body: buildBody(
      [
        `Olá, ${ctx.recipientName}.`,
        "",
        `Recebemos a confirmação de pagamento do workspace ${ctx.organizationName}.`,
        `O plano ${ctx.planLabel} está ativo e os recursos contratados já podem ser usados pela sua equipe.`,
        "",
        "Obrigado por confiar na Aptelys para organizar e acelerar sua operação de recrutamento.",
      ],
      "acesse sua área de cobrança para ver os detalhes da assinatura",
      ctx.billingUrl,
    ),
  };
}

export function paymentFailedEmail(ctx: BillingEmailContext): BillingEmail {
  return {
    subject: `Não conseguimos confirmar seu pagamento`,
    body: buildBody(
      [
        `Olá, ${ctx.recipientName}.`,
        "",
        `Não conseguimos confirmar o pagamento do workspace ${ctx.organizationName}.`,
        `Para manter o acesso ao plano ${ctx.planLabel}, atualize a forma de pagamento ou tente novamente pela área de cobrança.`,
        "",
        "Se o pagamento já foi feito, aguarde alguns minutos e acompanhe a atualização do status no painel.",
      ],
      "regularize o pagamento para manter seu workspace ativo",
      ctx.billingUrl,
    ),
  };
}
