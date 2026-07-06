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

O projeto comecou como um site estatico e foi migrado para uma aplicacao Next.js preparada para Vercel, Supabase e Stripe.

Stack atual:

- Next.js 15
- React 19
- Supabase Auth + PostgreSQL
- Stripe Checkout
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
- `app/[locale]/admin/page.jsx`: area administrativa
- `app/api/checkout/route.js`: cria sessao Stripe Checkout
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
```

Mapeamento discutido para Supabase:

- `SUPABASE_URL` do painel deve virar `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` deve virar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` deve virar `SUPABASE_SERVICE_ROLE_KEY`

Seguranca: uma chave secret do Supabase foi colada na conversa. Ela deve ser considerada exposta e precisa ser rotacionada antes de producao.

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

- rota `/pt/admin` ou `/en/admin`
- interface para ativar, revogar e bloquear licencas
- usuario precisa ter `role = 'admin'` em `profiles`

Pagamento:

- depende das variaveis Stripe
- `/api/checkout` cria sessao Checkout
- `/api/stripe/webhook` cria pedido e licenca depois do pagamento

Validacao de licenca pelo software Windows:

- endpoint: `/api/licenses/validate`
- payload esperado:

```json
{
  "licenseKey": "WIN-EXEMPLO",
  "machineFingerprint": "id-unico-da-maquina",
  "machineName": "DESKTOP-01"
}
```

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

4. Configurar Stripe:
   - criar produto/preco
   - adicionar `NEXT_PUBLIC_STRIPE_PRICE_ID`
   - criar webhook para `/api/stripe/webhook`
   - adicionar `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`
5. Ajustar fluxo real de associar pedidos/licencas ao usuario comprador.
6. Melhorar protecao das rotas `/dashboard` e `/admin` para redirecionar anonimos.
7. Trocar dados demo por mensagens de vazio quando Supabase estiver conectado.
8. Criar tela ADM mais completa com busca real, filtros e historico de eventos.
9. Implementar logout.
10. Criar testes ou scripts de smoke test para auth, licencas e webhook.

## Pontos tecnicos pendentes

- O webhook Stripe cria `orders` e `licenses`, mas ainda nao associa automaticamente ao `user_id` porque o checkout atual nao envia o id do usuario autenticado.
- A area ADM consulta dados reais somente se o usuario autenticado tiver `role = 'admin'`.
- As acoes ADM usam `SUPABASE_SERVICE_ROLE_KEY`; isso deve ficar apenas no ambiente do servidor/Vercel.
- O dashboard ainda cai em `demoLicenses` se Supabase nao estiver configurado ou se nao houver dados.
- Ainda nao ha pagina de logout.
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
