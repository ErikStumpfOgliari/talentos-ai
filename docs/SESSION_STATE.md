# Session State - Aptelys

> **Memoria oficial da sessao.** Este arquivo e o unico ponto de continuidade entre threads.
> Em nova conversa, **sempre** pedir para reler este arquivo antes de prosseguir.
> Ultima atualizacao: 2026-06-13 (America/Sao_Paulo).

---

## 1. Identidade do workspace

- Caminho raiz: `C:\Users\Erik\Documents\AI Recruitment CRM (ATS SaaS) - Full Stack AI Developer Needed`
- Shell: PowerShell
- Sandbox: `danger-full-access` (filesystem irrestrito, rede habilitada)
- Branch prefix: `codex/`

## 2. Stack confirmada (package.json)

- Next.js **16.2.6** (atencao: `AGENTS.md` avisa breaking changes vs. treino; checar `node_modules/next/dist/docs/` antes de editar paginas/layout)
- React 19.2.4
- Prisma 7.8 + `@prisma/adapter-pg`, driver `pg`
- Tailwind 4
- OpenAI 6.39.1 (Responses API + embeddings)
- Resend 6.12.4 (email)
- dnd-kit (Kanban ATS)
- Zod 4, lucide-react, pdfjs-dist, AWS SDK S3

## 3. O que e o projeto

- **Aptelys**: ATS/CRM SaaS multi-tenant para recrutadores.
- README cobre workflows recruiter/candidato, deploy, case study, roadmap E2E.
- Demo seed: `erik@example.com` / `aptelys-demo-2026`.

## 4. Mapa de rotas (src/app)

- Privadas: `dashboard`, `jobs`, `jobs/[jobId]`, `candidates`, `candidates/[candidateId]`, `applications`, `matching`, `interviews`, `email-automation`, `analytics`, `admin`, `pipeline`, `settings`, `schedule/[token]`
- Publicas: `careers`, `careers/[jobId]`, `careers/applications/...`, `candidate-status`, `login`, `signup`, `logout`
- API: `api/integrations/google/...`, `api/pipeline/move`, `api/webhooks/resend`

## 5. Estrutura de apoio

- `prisma/` schema + seed
- `src/lib` helpers (auth, parsing, matching, email, calendar, etc.)
- `src/components` UI
- `src/generated/prisma` cliente gerado
- `docker/postgres` compose
- `scripts/smoke.ts` smoke test das rotas criticas
- `docs/` ja tem `CASE_STUDY.md`, `DEMO_SCRIPT.md`, `SCREENSHOT_PLAN.md`, `SESSION_STATE.md` (este)
- `storage/` uploads locais

## 6. Historico da conversa (linha do tempo)

1. Usuario perguntou se eu lembro de papos anteriores. Respondi que cada thread comeca do zero (limitacao de memoria entre sessoes).
2. Perguntou se consigo acessar o projeto - sim, cwd ja estava apontado.
3. Pediu para eu olhar a estrutura. Mapeei `package.json`, `AGENTS.md`, `CLAUDE.md`, `README.md` e a arvore de `src/`, `prisma/`, `docs/`, `scripts/`, `docker/`.
4. Perguntou se eu sou o Codex ou o agente Ollama. Confirmei: sou o Codex dentro do app desktop.
5. Perguntou se sou ilimitado. Respondi nao: memoria por thread, contexto finito, conhecimento ate jan/2026, ferramentas locais, posso errar.
6. Pediu se tenho API propria de IA. Respondi que **nao exponho HTTP** - o usuario tem que integrar OpenAI, Gemini, Groq, etc.
7. Pediu API 100% gratis. Expliquei que free tiers existem mas nao sao infinitos. Propondi tres caminhos:
   - (a) adapter multi-provider em `lib/ai/` (Groq/Gemini com fallback local)
   - (b) modo demo so com parser local + HF embeddings free
   - (c) seguir com OpenAI (ja instalada, $5 de credito inicial)
8. **Decisao em aberto**: usuario ainda nao escolheu (a), (b) ou (c).
9. Usuario perguntou sobre limite de contexto. Expliquei compactacao automatica e a estrategia de persistir em arquivo.
10. Pediu para eu avisar quando o contexto estiver enchendo e gerar resumo antes da compactacao. Implementei o "protocolo de memoria" abaixo.
11. Usuario pediu para fazer o primeiro checkpoint agora e seguir atualizando apos cada processo importante.

## 7. Decisoes e pendencias

| Status | Item | Detalhe |
|--------|------|---------|
| Pendente | Escolha do provider de IA | (a) Groq/Gemini, (b) local+HF, (c) OpenAI |
| A fazer | Smoke test inicial | `npm run dev` + `npm run smoke` apos usuario decidir |
| A fazer | Atualizar SESSION_STATE apos cada marco | ver secao 9 |

## 8. Limitacoes uteis desta sessao

- Janela de contexto finita. Quando enche, o app **compacta**: gera resumo, descarta texto bruto, continua.
- Estado persistido esta no disco, nao na minha memoria. Ler arquivos de novo e barato.
- Nao tenho medidor preciso de tokens - monitoro por feeling e sinais indiretos.
- Compactacao pode disparar **sem aviso previo** entre respostas.

## 9. Protocolo de memoria da sessao (compromisso)

- Este arquivo e a **unica ponte** entre threads. Em nova conversa, pedir para reler `docs/SESSION_STATE.md` antes de tudo.
- Atualizar o arquivo **apos cada processo importante**: decisao nova, arquivo chave criado/alterado, mudanca de plano, bug encontrado, escolha de stack/lib, marco de implementacao.
- Quando o contexto da thread estiver ficando pesado (por feeling), avisar o usuario com a frase: **"contexto pesado, quer que eu atualize o SESSION_STATE agora?"**.
- Antes da compactacao automatica (se percebida) ou quando o usuario pedir, gerar snapshot estruturado e salvar.
- Nao prometer monitoramento exato de tokens - so estimativas.

## 10. Frase de retomada (colar no inicio de nova thread)

> Leia `docs/SESSION_STATE.md` no workspace `C:\Users\Erik\Documents\AI Recruitment CRM (ATS SaaS) - Full Stack AI Developer Needed` antes de qualquer coisa. E a nossa memoria oficial. Depois me diga em que posso ajudar.

## 11. Proximos passos sugeridos

1. Usuario escolher entre (a), (b) ou (c) para provider de IA.
2. Apos implementacao, rodar `npm run dev` + `npm run smoke` para validar.
3. Atualizar este arquivo com a decisao tomada e o diff aplicado.

---

## 12. Marcos da sessao (atualizado em 2026-06-11)

- [x] Mapeamento inicial do projeto: stack Next 16.2.6, Prisma 7, OpenAI, Resend, Supabase.
- [x] Confirmado `.env` aponta pro Supabase `jdazjplrarudwdueegdz` (Reference ID bate).
- [x] Primeiro seed rodado sem flag -> criou so a organizacao vazia "Aptelys".
- [x] Decisao do usuario: NAO rodar seed completo, apenas criar o owner.
- [x] Script cirurgico criado: `prisma/seed-owner.ts`. Cria/atualiza o usuario `erik@example.com` como OWNER da organizacao `northstar-recruiting`, sem popular dados demo.
- [x] Script executado com sucesso: `Owner ready: erik@example.com (OWNER) in "Aptelys" [northstar-recruiting]`.
- [ ] **Proximo**: usuario tentar login em aptelys.com com `erik@example.com` / `aptelys-demo-2026` e confirmar que entra.
- [ ] Pendente: checar envs no Vercel (DATABASE_URL, DIRECT_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL=https://aptelys.com).
- [ ] Pendente: rotacionar credenciais expostas no `.env` (OPENAI_API_KEY, senha do Supabase) e mover pra `.env.local`.

## 13. Credenciais de demo (so para referencia, nao e dado real)

- Owner: `erik@example.com` / `aptelys-demo-2026`
- Organizacao: slug `northstar-recruiting`, nome "Aptelys"
- Outras credenciais do seed completo NAO foram aplicadas (Marina, Theo, Sofia, etc.).

---

## 14. Marco 2026-06-12 - Auth e verificacao

- [x] Corrigido o bug local `Cannot read properties of undefined (reading 'create')` no login:
  - `src/lib/auth.ts` agora usa fallback local quando o Prisma Client/DB ainda nao tem `AuthSession`.
  - Em producao, ausencia da sessao persistente continua falhando explicitamente para nao esconder problema de seguranca.
- [x] Login virou fluxo em duas etapas:
  - email/senha validam credenciais;
  - cria cookie temporario `aptelys_pending_auth`;
  - redireciona para `/verify-login`;
  - verificacao cria a sessao real `aptelys_session`.
- [x] Cadastro de workspace tambem passa por `/verify-login` antes de entrar no dashboard.
- [x] `/verify-login` tem seta de volta para login ou cadastro conforme a origem.
- [x] Visual do cadastro foi polido para parecer mais premium e consistente com a landing.
- [x] Traducoes PT/EN adicionadas para landing, login, cadastro, carreiras, status e verificacao.
- [x] Validado localmente:
  - `npm run lint` passou;
  - `npm run build` passou;
  - fluxo `erik@example.com` / `aptelys-demo-2026` funcionou: `/login` -> `/verify-login` -> `/dashboard`;
  - rota privada `/jobs` abriu sem pedir login novamente.

## 15. Marco 2026-06-12 - Landing PT/EN

- [x] Revisada a home `/` em portugues pelo navegador embutido.
- [x] Corrigidas traducoes faltantes na landing:
  - botoes publicos (`Create workspace`, `Open roles`);
  - cards de timeline;
  - cards de features;
  - preview do ATS;
  - footer publico.
- [x] Removidos termos desnecessariamente em ingles no PT da home:
  - `workspace` -> espaco;
  - `owner` -> proprietario;
  - `templates` -> modelos;
  - `timeline` -> linha do tempo;
  - `match` -> compatibilidade;
  - `pipeline` -> funil quando era texto publico.
- [x] Validado localmente:
  - home em `pt-BR` sem `?`/caracteres quebrados;
  - sem overflow horizontal;
  - sem console errors;
  - `npm run lint` passou.

## 16. Marco 2026-06-12 - Polimento signup e nav publica

- [x] Reformulada a pagina `/signup` de criacao do espaco da empresa:
  - removido o painel esquerdo pesado com mock de ATS;
  - removida a sensacao de bordas brancas laterais soltas;
  - criado fundo escuro continuo com apresentacao curta;
  - formulario passou a ser o foco visual em card branco premium;
  - textos novos adicionados ao dicionario PT/EN.
- [x] Links/abas da navegacao publica ganharam microinteracao:
  - leve escala;
  - flutuacao no hover;
  - fundo/sombra suave.
- [x] Validado localmente:
  - `/signup` em portugues sem overflow horizontal;
  - sem console errors;
  - `npm run lint` passou;
  - `npm run build` passou.

## 17. Marco 2026-06-13 - Primeira dobra da landing

- [x] Reformulada a hero da home `/` para ficar mais minimalista e premium:
  - titulo principal reduzido e encurtado;
  - copy principal simplificada;
  - preview do ATS compactado;
  - grid da primeira dobra mais centralizado;
  - secao escura limitada a altura da viewport em desktop com `100svh`;
  - secao branca com os cards publicos inicia logo apos a dobra.
- [x] Textos novos adicionados ao dicionario PT/EN.
- [x] Validado localmente:
  - titulo em desktop ficou em ~48px e 2 linhas no viewport testado;
  - hero mediu 720px em viewport de 720px;
  - proxima secao inicia em `nextTop = 720`;
  - sem overflow horizontal;
  - sem console errors;
  - `npm run lint` passou;
  - `npm run build` passou.

## 18. Marco 2026-06-13 - Cadastro de workspace em etapas

- [x] Reformulado `/signup` para um fluxo compacto em tres etapas:
  - dados da conta e empresa;
  - endereco da empresa;
  - escolha de verificacao.
- [x] Removida a escolha de verificacao da primeira tela para o card nao puxar a pagina para baixo.
- [x] Apresentacao lateral do cadastro foi simplificada:
  - titulo menor;
  - menos blocos informativos;
  - foco visual maior no formulario.
- [x] `createWorkspaceSignup` passou a validar telefone e endereco antes de criar workspace.
- [x] Endereco informado no cadastro fica registrado no `auditEvent.metadata.signupAddress`.
- [x] Textos novos do fluxo adicionados ao dicionario PT/EN.
- [x] Validado localmente:
  - `/signup` sem overflow horizontal;
  - primeira etapa cabe na viewport desktop testada;
  - sem console errors;
  - `npm run lint` passou;
  - `npm run build` passou.

## 19. Marco 2026-06-13 - Login em etapas, header flutuante e marca

- [x] Login `/login` virou fluxo em duas etapas:
  - dados de login;
  - escolha do metodo de verificacao.
- [x] Removido da primeira tela de login o card/aviso `Trusted device session`.
- [x] Metodo escolhido no login/cadastro agora e salvo no cookie temporario de verificacao.
- [x] `/verify-login` passou a confirmar o metodo ja escolhido, sem repetir as tres opcoes quando o fluxo novo envia essa informacao.
- [x] Landing `/` recebeu header publico flutuante/fixo:
  - acompanha a rolagem;
  - usa fundo translucido com blur;
  - mantem brand, secoes e botoes sempre clicaveis.
- [x] Ajuste posterior do header flutuante:
  - removido o comportamento visual de barra fixa ocupando a tela toda;
  - header agora encolhe ao tamanho do conteudo em formato de capsula/dock;
  - links e botoes ficam em uma linha para evitar quebra no PT.
- [x] Criado novo simbolo `InterellisMark` em `src/components/interellis-mark.tsx`.
- [x] Substituida a marca de estrelinhas no header publico, footer publico, login, cadastro, verificacao e menu lateral interno.
- [x] Textos novos do login adicionados ao dicionario PT/EN.
- [x] Validado localmente:
  - `/login` sem aviso antigo e sem overflow horizontal;
  - `/` com header `fixed` no topo apos rolagem;
  - sem console errors;
  - `npm run lint` passou;
  - `npm run build` passou.

## 20. Marco 2026-06-13 - Recuperacao de senha e ajuste do dock

- [x] Dock flutuante da landing teve bordas reduzidas:
  - saiu de formato totalmente arredondado;
  - agora usa bordas levemente arredondadas (`rounded-lg`).
- [x] Criada rota publica `/forgot-password`.
- [x] Criada action `requestPasswordRecovery`:
  - recebe email de trabalho;
  - registra auditoria `password_recovery.requested` quando a conta existe;
  - usa mensagem neutra para nao expor se o email existe.
- [x] `/forgot-password` foi liberada no `src/proxy.ts` como rota publica.
- [x] Login ganhou area de recuperacao:
  - link `Forgot password?` perto do campo senha;
  - bloco explicando que apos 5 falhas o Aptelys encaminha para recuperacao.
- [x] `login` agora conta tentativas falhas por cookie httpOnly:
  - apos 5 falhas para o mesmo email, redireciona para `/forgot-password?reason=attempts&email=...`;
  - ao logar com sucesso ou solicitar recuperacao, limpa o contador.
- [x] Textos novos adicionados ao dicionario PT/EN.
- [x] Validado localmente:
  - `/forgot-password` abre sem login;
  - email via querystring preenche o formulario;
  - mensagem de muitas tentativas aparece com `reason=attempts`;
  - sem overflow horizontal;
  - sem console errors;
  - `npm run lint` passou;
  - `npm run build` passou.

## 21. Marco 2026-06-14 - Login visual alinhado ao cadastro

- [x] Removido do card de login o aviso explicito sobre 5 falhas de senha.
- [x] Mantido apenas o link `Forgot password?` / `Esqueceu a senha?` junto ao campo de senha.
- [x] Comportamento automatico preservado:
  - apos 5 falhas no mesmo email/navegador, o usuario continua sendo encaminhado para `/forgot-password`.
- [x] Tela `/login` foi reformulada para o mesmo padrao visual de `/signup`:
  - fundo escuro continuo com gradientes sutis;
  - `PublicSiteHeader` no topo;
  - apresentacao lateral curta;
  - card branco como foco do formulario;
  - chips informativos discretos.
- [x] Bloco grande `New company?` virou linha discreta, como no cadastro.
- [x] Textos novos adicionados ao dicionario PT/EN.
- [x] Validado localmente:
  - `/login` sem aviso dos 5 erros;
  - link `Esqueceu a senha?` presente;
  - sem overflow horizontal;
  - sem console errors;
  - `npm run lint` passou;
  - `npm run build` passou.

## 22. Marco 2026-06-14 - Toggle dos painéis laterais de ação

- [x] Ajustado `src/components/workspace-page-shell.tsx`.
- [x] O botão de painel lateral agora alterna aberto/fechado pelo mesmo clique:
  - primeiro clique abre;
  - segundo clique no mesmo botão fecha.
- [x] Mantido o botão interno de fechar painel.
- [x] A mudança cobre todas as páginas que usam `rightPanel` no `WorkspacePageShell`, incluindo:
  - Jobs / `New job`;
  - Candidates / `Candidate`;
  - Interviews / `Schedule`;
  - Email Automation / `Template`;
  - Admin / `User`.
- [x] Adicionado `aria-pressed` no botão para refletir o estado visual/semântico.
- [x] Validado:
  - `npm run lint` passou;
  - `npm run build` passou.
- [ ] Observacao: teste visual protegido em `/jobs` redirecionou para `/login` no navegador local porque nao havia sessao ativa.

## 23. Marco 2026-06-14 - Modo dark premium Aptelys

- [x] Criado `src/components/site-theme-provider.tsx`:
  - provider global de tema;
  - preferencia salva em `localStorage` como `aptelys-theme`;
  - aplica `data-color-theme="light|dark"` no documento;
  - aplica tambem `theme-dark` / `theme-light` no `html` e `body` para garantir troca visual imediata;
  - botao `ThemeToggle` com icones de sol/lua e transicao suave.
- [x] `src/app/layout.tsx` agora envolve o app com `SiteThemeProvider`.
- [x] `src/components/workspace-page-shell.tsx` recebeu escopo `data-app-theme-scope` para aplicar tema nas paginas internas.
- [x] Dashboard recebeu o botao de alternancia light/dark no topo.
- [x] Settings recebeu o botao de alternancia light/dark nas acoes do header.
- [x] `src/app/globals.css` recebeu paleta dark escopada ao app interno:
  - fundos escuros premium;
  - cards, overlays, bordas, inputs e tabelas ajustados;
  - badges/accent colors preservados em tons mais adequados ao dark.
- [x] Segunda rodada de ajuste:
  - botao light/dark saiu do quadrado simples e virou switch premium com thumb deslizante;
  - CSS passou a usar `body.theme-dark` com overrides mais fortes para evitar mudar apenas o scrollbar do navegador.
- [x] Terceira rodada de ajuste:
  - removido o switch desalinhado;
  - botao virou controle compacto de 40px, alinhado ao padrao dos headers internos;
  - icones de sol/lua ficam centralizados e alternam com transicao limpa.
- [x] Validado:
  - `npm run lint` passou;
  - `npm run build` passou.
- [ ] Observacao: teste visual direto da dashboard/settings no navegador interno ficou limitado porque as rotas protegidas redirecionam para `/login` sem sessao ativa, e o browser interno nao conseguiu digitar nos campos por limitacao de clipboard.

## 24. Marco 2026-06-15 - Revisao inicial de seguranca

- [x] Confirmado que o Prisma/DATABASE_URL nao aparece como variavel publica `NEXT_PUBLIC_*`.
- [x] Confirmado que componentes client nao importam Prisma diretamente.
- [x] Confirmado que o banco e acessado pelo server do Next/Vercel via Server Actions, Route Handlers e libs server.
- [x] Revisados pontos principais:
  - auth/session cookies;
  - middleware/proxy;
  - actions de admin/recruiting;
  - rotas API;
  - candidatura publica;
  - upload/download de curriculo;
  - webhooks Resend;
  - Google OAuth state.
- [x] Corrigido risco multi-tenant em `src/app/admin/actions.ts`:
  - `updateWorkspaceMember` agora confirma membership dentro da organizacao antes de atualizar;
  - `resendWorkspaceInvite` tambem confirma membership dentro da organizacao.
- [x] Adicionados headers de seguranca em `next.config.ts`:
  - remove `X-Powered-By`;
  - `X-Content-Type-Options: nosniff`;
  - `X-Frame-Options: DENY`;
  - `Referrer-Policy`;
  - `Permissions-Policy`;
  - CSP inicial compativel com Next.
- [x] Verificacao de producao via `curl -I https://aptelys.com` antes do redeploy:
  - HTTPS/HSTS presentes;
  - headers extras ainda ausentes no deploy atual ate novo deploy.
- [x] `npm audit --omit=dev` executado:
  - retornou vulnerabilidades moderadas em dependencias transitivas de `next/postcss` e `prisma/@prisma/dev`;
  - `npm audit fix --force` nao foi aplicado por sugerir mudancas quebraveis/downgrade.
- [x] Validado:
  - `npm run lint` passou;
  - `npm run build` passou.
- [x] Recuperacao de senha real implementada:
  - adicionada tabela `PasswordResetToken` no Prisma;
  - tokens sao gerados com entropia alta e gravados apenas como SHA-256;
  - links expiram em 30 minutos e sao de uso unico;
  - pedido de recuperacao envia email via Resend quando configurado, ou registra no local-outbox;
  - reset de senha revoga sessoes antigas do usuario;
  - rota publica `/reset-password` liberada no proxy;
  - mensagens principais adicionadas ao dicionario PT/EN.
- [x] Validado apos recuperacao de senha:
  - `npm run db:generate` passou;
  - `npm run lint` passou;
  - `npm run build` passou.
- [ ] Pendencias de seguranca:
  - 2FA por email implementado em codigo, mas ainda precisa aplicar `npx prisma db push` no banco correto;
  - aplicar `npx prisma db push` no banco correto antes de testar/deployar o reset de senha;
  - rate limiting/CAPTCHA ainda pendente;
  - upload precisa de validacao/scan mais forte;
  - CSP pode ficar mais rigida depois de testar integracoes reais;
  - rotacionar chaves e senhas expostas anteriormente.

## 25. Marco 2026-06-15 - Verificacao real por codigo de email

- [x] Implementado 2FA inicial por email:
  - adicionada tabela `AuthVerificationCode`;
  - codigos de 6 digitos expiram em 10 minutos;
  - codigo bruto nao e salvo no banco, apenas HMAC usando `AUTH_SECRET`;
  - cada codigo e de uso unico;
  - limite de 5 tentativas por desafio.
- [x] Login agora:
  - valida email/senha;
  - cria desafio de verificacao por email;
  - envia codigo via Resend ou registra no local-outbox;
  - so cria sessao persistente depois do codigo correto.
- [x] Cadastro agora:
  - cria workspace/owner;
  - cria desafio de verificacao por email;
  - so entra no dashboard depois do codigo correto.
- [x] `/verify-login` atualizado:
  - campo real de codigo de 6 digitos;
  - mensagens para codigo ausente, invalido, expirado ou bloqueado;
  - SMS e app autenticador aparecem como proximas integracoes, desabilitados.
- [x] Verificacao local:
  - `npm run db:generate` passou;
  - `npm run lint` passou;
  - `npm run build` passou;
  - navegador local confirmou login em PT com email code ativo e SMS/app desabilitados.
- [ ] Pendente:
  - aplicar `npx prisma db push` no banco certo para criar `AuthVerificationCode` e `PasswordResetToken`;
  - configurar `RESEND_API_KEY`/dominio de envio para producao receber os codigos por email;
  - implementar SMS real e TOTP/app autenticador em etapas futuras.

## 26. Marco 2026-06-15 - Reset do banco Supabase para teste real

- [x] Usuario autorizou limpar os dados atuais para testar cadastro com email real.
- [x] `npm run db:push` aplicado no Supabase remoto configurado no `.env`.
- [x] Antes da limpeza:
  - 2 organizacoes;
  - 2 usuarios;
  - 0 vagas;
  - 0 candidatos.
- [x] Limpeza executada:
  - `organization.deleteMany({})`;
  - `user.deleteMany({})`.
- [x] Depois da limpeza:
  - 0 organizacoes;
  - 0 usuarios;
  - 0 vagas;
  - 0 candidatos;
  - 0 memberships;
  - 0 authSessions;
  - 0 authVerificationCodes;
  - 0 passwordResetTokens.
- [ ] Proximo teste: criar workspace novo pela tela `/signup` usando email real.

## 27. Marco 2026-06-15 - Correcao de Prisma Client stale no cadastro

- [x] Erro observado no cadastro local:
  - `Cannot read properties of undefined (reading 'updateMany')`;
  - origem: `prisma.authVerificationCode` indefinido no `next dev` antigo.
- [x] Causa confirmada:
  - Prisma Client gerado ja tinha `AuthVerificationCode`;
  - Supabase ja estava sincronizado;
  - processo `next dev` mantinha um `PrismaClient` antigo em cache global.
- [x] Ajustado `src/lib/prisma.ts`:
  - recria o Prisma Client em desenvolvimento quando o client global nao tem delegates novos (`authVerificationCode`, `passwordResetToken`).
- [x] Dev server local reiniciado na porta 3000.
- [x] Validado:
  - runtime direto confirma `authVerificationCode` e `passwordResetToken`;
  - `npm run lint` passou;
  - `npm run build` passou;
  - `GET /signup` retornou 200 sem overlay de erro.

## 28. Marco 2026-06-15 - Cadastro so persiste apos verificacao

- [x] Usuario identificou o comportamento incorreto:
  - cadastro criava `User`/`Organization` antes de confirmar o codigo por email.
- [x] Banco Supabase limpo novamente:
  - antes: 1 organizacao e 1 usuario;
  - depois: 0 organizacoes, 0 usuarios, 0 memberships, 0 emails, 0 codigos.
- [x] Novo fluxo implementado:
  - `/signup` valida campos e email existente;
  - gera codigo de email;
  - envia email via provider;
  - salva apenas um cadastro pendente em cookie temporario criptografado/httpOnly;
  - nao cria `User`, `Organization`, `Membership`, `EmailMessage` nem `AuthVerificationCode` antes da confirmacao.
- [x] `/verify-login` agora:
  - se for cadastro pendente, valida o codigo pelo cookie criptografado;
  - somente apos codigo correto cria organization, user, membership, availability, templates, audit event e sessao.
- [x] Validado:
  - `npm run lint` passou;
  - `npm run build` passou;
  - contagem do banco confirmou 0 registros antes do novo teste;
  - dev server reiniciado na porta 3000.

## 29. Marco 2026-06-15 - Fallback local para codigo de email

- [x] Confirmado que o `.env` local nao tem `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_WEBHOOK_SECRET` nem `NEXT_PUBLIC_APP_URL`.
- [x] Provider de email local esta em `local-outbox`, portanto nao envia email real.
- [x] Explicado: o site nao precisa estar no ar para enviar email, mas o ambiente local precisa de `RESEND_API_KEY` e remetente valido.
- [x] Implementado fallback apenas em desenvolvimento:
  - cadastro pendente guarda `verificationDebugCode` dentro do cookie criptografado/httpOnly;
  - login pendente guarda `verificationDebugCode` no cookie httpOnly;
  - `/verify-login` mostra o codigo quando `NODE_ENV !== production` e o Resend nao esta configurado;
  - em producao o codigo nao aparece.
- [x] Validado:
  - `npm run lint` passou;
  - `npm run build` passou;
  - dev server reiniciado na porta 3000.

---

## 14. Marcos - bloco 2 (atualizado em 2026-06-11)

- [x] Envs configuradas no Vercel: AUTH_SECRET, DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_APP_URL, DEFAULT_ORGANIZATION_SLUG, OPENAI_API_KEY, AI_PROVIDER_MODE.
- [x] Redeploy feito no Vercel.
- [x] **Login funcionando em https://aptelys.com com erik@example.com / aptelys-demo-2026.**
- [x] Banco Supabase `jdazjplrarudwdueegdz` com a organizacao "Aptelys" (slug northstar-recruiting) e o owner Erik Santos.
- [ ] Pendente: rotacionar AUTH_SECRET, OPENAI_API_KEY e senha do Supabase (estao em texto puro no `.env` local, e pelo menos o AUTH_SECRET ja foi exposto no painel do Vercel).
- [ ] Pendente: decidir a integracao de IA gratuita (a) adapter Groq/Gemini, (b) local+HF, (c) seguir com OpenAI. Continua em aberto.
- [ ] Pendente: smoke test `npm run dev` + `npm run smoke` no ambiente local para baseline.

## 15. Notas tecnicas relevantes

- O `.env` local ja tem o `NEXT_PUBLIC_APP_URL` faltando (so existe no Vercel). Vale adicionar `NEXT_PUBLIC_APP_URL=http://localhost:3000` no `.env` local e no `.env.example` para paridade dev/prod.
- O deploy inicial sem AUTH_SECRET quebrou em runtime com erro `AUTH_SECRET is required in production`. Apos adicionar no Vercel, voltou a subir.
