# WinPortal Project Log

Data do registro: 2026-07-06

Este arquivo registra onde o projeto parou para facilitar a retomada em outra conversa.

## Repositorio

- GitHub: https://github.com/gustavotoigo-max/win-portal
- Branch principal: `main`
- Pasta local usada nesta conversa: `C:\Users\Gustavo\Documents\Codex\2026-07-06\qu\outputs`

Ultimos commits relevantes:

- `b367862` - `Avoid extension creation in Supabase schema`
- `1a29c8b` - `Configure Vercel Next.js output`
- `e4e5283` - `Migrate to Next.js license portal`
- `0edc838` - `Add WinPortal static site`

## Estado atual

O projeto comecou como um site estatico e foi migrado para uma aplicacao Next.js preparada para Vercel, Supabase e, futuramente, Stripe. No fluxo atual, compra real foi pausada e substituida por uma compra fake que gera uma key automaticamente.

Stack atual:

- Next.js 15
- React 19
- Supabase Auth + PostgreSQL
- Compra fake para gerar licencas no fluxo atual
- Stripe Checkout mantido no codigo como integracao futura
- Vercel
- Rotas com idioma: `/pt` e `/en`

Build local validado com sucesso:

```bash
npm.cmd run build
```

## Estrutura principal

- `app/[locale]/page.jsx`: Home/landing page
- `app/[locale]/login/page.jsx`: login
- `app/[locale]/cadastro/page.jsx`: cadastro
- `app/[locale]/dashboard/page.jsx`: dashboard do usuario
- `app/ADM/page.jsx`: area administrativa oculta, acessivel somente por `/ADM`
- `app/api/auth/logout/route.js`: encerra a sessao ao clicar no circulo do perfil
- `app/api/licenses/fake-purchase/route.js`: cria pedido fake e licenca para usuario autenticado
- `app/api/checkout/route.js`: cria sessao Stripe Checkout para fluxo futuro de pagamento real
- `app/api/stripe/webhook/route.js`: recebe webhook Stripe e cria pedido/licenca
- `app/api/licenses/validate/route.js`: endpoint para o software Windows validar licenca
- `app/api/admin/licenses/route.js`: atualiza status de licenca pelo ADM
- `middleware.js`: detecta idioma do navegador e redireciona para `/pt` ou `/en`
- `lib/i18n.js`: textos em portugues e ingles
- `lib/supabase/*`: clientes Supabase browser/server/admin
- `lib/stripe.js`: cliente Stripe
- `supabase/schema.sql`: schema do banco
- `vercel.json`: configura Vercel como Next.js com output `.next`

## Banco de dados

Banco escolhido: Supabase PostgreSQL.

Tabelas planejadas/criadas pelo `supabase/schema.sql`:

- `profiles`
- `orders`
- `licenses`
- `machines`
- `license_events`

O schema tambem cria:

- trigger `on_auth_user_created` para criar perfil automaticamente em `profiles`
- funcao `public.is_admin()`
- politicas RLS para leitura de dados do usuario e gerenciamento por ADM
- indices para consultas principais

Observacao importante: o comando `CREATE EXTENSION pgcrypto` foi removido do SQL porque o Supabase retornou:

```text
ERROR: 25006: cannot execute CREATE EXTENSION in a read-only transaction
```

O arquivo agora assume que `gen_random_uuid()` esta disponivel. Se em algum projeto novo isso falhar, habilitar `pgcrypto` em `Database > Extensions` no painel do Supabase.

## Variaveis de ambiente esperadas

No Vercel, usar estes nomes:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_STRIPE_PRICE_ID=
LICENSE_APP_ID=
LICENSE_HMAC_SECRET=
LICENSE_ENCRYPTION_KEY=
LICENSE_ED25519_PRIVATE_KEY_PEM=
LICENSE_ED25519_PRIVATE_KEY_BASE64=
```

Mapeamento discutido para Supabase:

- `SUPABASE_URL` do painel deve virar `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` deve virar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` deve virar `SUPABASE_SERVICE_ROLE_KEY`

Seguranca: uma chave secret do Supabase foi colada na conversa. Ela deve ser considerada exposta e precisa ser rotacionada antes de producao.

As variaveis Stripe nao sao obrigatorias enquanto o fluxo atual for de compra fake.

As variaveis de licenca sao usadas para:

- HMAC da key (`LICENSE_HMAC_SECRET`)
- criptografia da key exibida no dashboard (`LICENSE_ENCRYPTION_KEY`)
- assinatura Ed25519 da licenca offline (`LICENSE_ED25519_PRIVATE_KEY_PEM` ou `LICENSE_ED25519_PRIVATE_KEY_BASE64`)

## Vercel

Houve erro de deploy:

```text
Error: No Output Directory named "public" found after the Build completed.
```

Correcao aplicada:

- criado `vercel.json`
- definido `framework: "nextjs"`
- definido `outputDirectory: ".next"`

Se o erro voltar, conferir em `Project Settings > Build & Development Settings > Output Directory` e apagar `public`.

## Comportamento esperado agora

Ao abrir o site:

- navegador em portugues deve redirecionar para `/pt`
- outros idiomas devem redirecionar para `/en`
- o topo tem alternancia manual `PT | EN`

Cadastro/login:

- usa Supabase Auth
- apos cadastro/login, redireciona para o dashboard
- trigger do Supabase deve criar linha em `profiles`

Dashboard do usuario:

- sem dados reais, mostra dados demo
- com dados reais, deve listar licencas, status, ultima maquina, ultima validacao, pedido e data

Area ADM:

- rota oculta `/ADM`
- o link ADM foi removido da navegacao publica
- a rota ADM foi marcada como dinamica para sempre checar sessao e role atual
- interface para ativar, revogar e bloquear licencas
- usuario precisa ter `role = 'admin'` em `profiles`

Compra/licenca no fluxo atual:

- usuario cria perfil ou faz login
- no dashboard, clica em `Gerar key fake`
- `/api/licenses/fake-purchase` cria uma ordem com valor zero e uma licenca ativa
- o botao `Gerar key fake` usa um componente client-side que envia o access token Supabase via Bearer para evitar problemas de cookie/sessao em form POST
- o dashboard mostra mensagem de sucesso ou erro via parametro `fakePurchase`
- a key aparece no dashboard
- o cliente insere essa key no software Windows
- o software chama `/api/licenses/validate` para validar e registrar a maquina

Pagamento real:

- pausado por enquanto
- depende das variaveis Stripe
- `/api/checkout` cria sessao Checkout
- `/api/stripe/webhook` cria pedido e licenca depois do pagamento

Validacao de licenca pelo software Windows:

- endpoints preferidos: `/api/ativar` e `/api/revalidar`
- endpoint legado ainda disponivel: `/api/licenses/validate`
- payload de ativacao esperado:

```json
{
  "app_id": "com.suaempresa.templateativacao",
  "email": "usuario@empresa.com",
  "license_key": "WIN-EXEMPLO",
  "machine_id": "id-unico-da-maquina",
  "machine_name": "DESKTOP-01",
  "software_version": "1.0.0",
  "system_info": {}
}
```

Resposta de sucesso segue o contrato com `ok`, `status`, objeto `license` canonico e `signature` Ed25519 base64.

## Proximos passos recomendados

1. Confirmar deploy Vercel com variaveis Supabase.
2. Criar usuario pelo site e validar:
   - `Authentication > Users`
   - `Table Editor > profiles`
3. Promover usuario ADM:

```sql
update public.profiles
set role = 'admin'
where email = 'seu-email@example.com';
```

Se aparecer `Email not confirmed` ao tentar login:

- confirmar o e-mail pelo link enviado pelo Supabase; ou
- para testes, desativar `Confirm email` em `Authentication > Providers > Email`.

4. Testar compra fake:
   - entrar com usuario real
   - abrir `/pt/dashboard`
   - clicar em `Gerar key fake`
   - confirmar linhas em `orders`, `licenses` e `license_events`
5. Configurar Stripe futuramente:
   - criar produto/preco
   - adicionar `NEXT_PUBLIC_STRIPE_PRICE_ID`
   - criar webhook para `/api/stripe/webhook`
   - adicionar `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`
6. Melhorar protecao geral das rotas e mensagens de permissao.
7. Trocar dados demo por mensagens de vazio quando Supabase estiver conectado.
8. Criar tela ADM mais completa com busca real, filtros e historico de eventos.
9. Criar testes ou scripts de smoke test para auth, licencas e webhook.

## Pontos tecnicos pendentes

- O fluxo atual usa `/api/licenses/fake-purchase`, que cria `orders` e `licenses` associados ao usuario autenticado.
- O webhook Stripe ainda existe, mas e um fluxo futuro e ainda nao associa automaticamente ao `user_id`.
- A area ADM consulta dados reais somente se o usuario autenticado tiver `role = 'admin'`.
- As acoes ADM usam `SUPABASE_SERVICE_ROLE_KEY`; isso deve ficar apenas no ambiente do servidor/Vercel.
- O dashboard ainda cai em `demoLicenses` se Supabase nao estiver configurado. Com Supabase configurado e usuario real, lista vazio ate gerar a primeira key fake.
- Logout ja existe em `/api/auth/logout` e e acionado pelo circulo do perfil.
- Ainda nao ha fluxo de recuperacao de senha.

## Como retomar

Ao voltar a este projeto, comece por:

```bash
cd C:\Users\Gustavo\Documents\Codex\2026-07-06\qu\outputs
git status -sb
npm.cmd install --cache .\.npm-cache
npm.cmd run build
```

Depois verifique no Supabase:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

E confira se existem as tabelas principais: `profiles`, `orders`, `licenses`, `machines`, `license_events`.

Depois de atualizar esta etapa, conferir tambem:

- `activations`
- `validation_logs`
- `revocations`
