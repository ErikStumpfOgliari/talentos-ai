# Tarefas para o Codex — Sistema de Assinatura

Estas são tarefas **isoladas e seguras**: não tocam banco de dados, autenticação,
webhooks nem lógica de cobrança. São só texto e componentes visuais. Podem ser
feitas em paralelo sem risco de quebrar o fluxo crítico.

> Contexto: o app é Next.js 16 (App Router) + Tailwind v4. Textos voltados ao
> cliente devem estar em **português do Brasil**. Ícones usam `lucide-react`.

---

## Tarefa 1 — Textos dos 6 emails de ciclo de vida do trial

**Arquivo a criar:** `src/lib/billing-emails.ts`

Exportar uma função por email, cada uma recebendo dados e devolvendo
`{ subject: string; body: string }` (texto simples, quebras com `\n`). Assinatura:

```ts
export type BillingEmailContext = {
  organizationName: string;
  recipientName: string;
  trialEndsAt: Date;     // usar Intl.DateTimeFormat("pt-BR")
  daysRemaining: number;
  planLabel: string;     // ex.: "Intermediário"
  billingUrl: string;    // link para a tela de cobrança
};

export function trialWelcomeEmail(ctx: BillingEmailContext): { subject: string; body: string }
export function trialEndingSoonEmail(ctx: BillingEmailContext): { subject: string; body: string } // faltam 7 dias
export function trialLastDaysEmail(ctx: BillingEmailContext): { subject: string; body: string }   // faltam 3 dias
export function trialExpiredEmail(ctx: BillingEmailContext): { subject: string; body: string }
export function paymentApprovedEmail(ctx: BillingEmailContext): { subject: string; body: string }
export function paymentFailedEmail(ctx: BillingEmailContext): { subject: string; body: string }
```

Regras:
- Tom profissional, acolhedor, direto. Produto se chama **Aptelys**.
- Cada corpo termina com uma linha de ação e o `billingUrl`.
- Nada de HTML — texto puro (o provedor de email já converte).
- Não importar nada além de tipos; a função é pura.

## Tarefa 2 — Componente visual de banner de trial

**Arquivo a criar:** `src/components/trial-banner.tsx`

Componente de servidor (sem `"use client"`), puramente visual:

```ts
export function TrialBanner(props: {
  daysRemaining: number;
  status: "trialing" | "past_due" | "canceled_grace";
  planLabel: string;
  href?: string; // default "/billing"
}) { /* ... */ }
```

- `trialing`: faixa âmbar suave "Seu teste grátis termina em X dias — escolha um plano".
- `past_due`: faixa vermelha "Pagamento pendente — regularize para manter o acesso".
- `canceled_grace`: faixa cinza "Assinatura cancelada — acesso até o fim do período".
- Usar as mesmas classes Tailwind do resto do app (ver `src/app/billing/page.tsx`
  para o padrão de cores: `rounded-lg border ... bg-amber-50 text-amber-900`).
- Botão/Link à direita para `href` com texto "Ver planos".

## Tarefa 3 — Tela de bloqueio (paywall) reutilizável

**Arquivo a criar:** `src/components/billing-blocked-card.tsx`

Componente visual mostrado quando o acesso está bloqueado. Props:

```ts
export function BillingBlockedCard(props: {
  reason: "trial_expired" | "past_due" | "suspended" | "canceled" | "expired";
  planLabel: string;
}) { /* ... */ }
```

- Mensagem clara por `reason` (ex.: `trial_expired` = "Seu teste grátis de 30 dias
  terminou. Escolha um plano para reativar seu workspace.").
- Um card central, ícone `Lock` do lucide, e um `<Link href="/billing">` com CTA
  "Escolher plano".
- Só visual. Não faz fetch, não checa sessão.

## Tarefa 4 — Revisar textos dos cards de plano

**Arquivo:** `src/lib/billing.ts` (apenas os campos `description`, `subtitle`,
`features` de cada item em `billingPlans`).

- Não alterar `plan`, `priceCents`, `slug`, `checkoutEnvKeys` nem nenhuma função.
- Só melhorar clareza/consistência do texto comercial em pt-BR.
- Manter os limites coerentes com `src/lib/subscription.ts` (`planLimits`):
  Básico = 3 vagas / 150 candidatos / sem IA; Intermediário = 15 vagas / 1000
  candidatos / com IA e automação; Avançado = ilimitado.

---

**Não fazer (reservado para o fluxo crítico):** schema Prisma, `subscription.ts`,
`billing-guard.ts`, webhook, integração PagBank, actions de cobrança, gates de
página. Essas partes têm dependências sensíveis e são feitas separadamente.
