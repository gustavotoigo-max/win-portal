# WinPortal

Portal Next.js para cadastro de clientes, administracao de licencas, downloads e
ativacao dos aplicativos WinPortal. O backend usa Neon PostgreSQL e Neon Auth.

## Configuracao do Neon

1. No projeto do Neon, abra **SQL Editor**.
2. Copie todo o conteudo de `neon/schema.sql`, execute e confirme que o comando
   terminou sem erros.
3. No projeto, habilite **Neon Auth**. Copie a URL fornecida pelo Neon para
   `NEON_AUTH_BASE_URL`.
4. Em **Connect**, copie a connection string do banco para `DATABASE_URL`.
5. Gere um segredo aleatorio com pelo menos 32 caracteres para
   `NEON_AUTH_COOKIE_SECRET`. Nao altere esse valor entre deploys.

Para desenvolvimento local, copie `.env.example` para `.env.local` e preencha
os valores. Nunca envie `.env.local` para o Git.

## Variaveis da Vercel

Em **Vercel > projeto > Settings > Environment Variables**, adicione:

```dotenv
DATABASE_URL=postgresql://...
NEON_AUTH_BASE_URL=https://...
NEON_AUTH_COOKIE_SECRET=segredo-aleatorio-com-pelo-menos-32-caracteres
ADMIN_EMAILS=seu-email@exemplo.com
```

Marque ao menos **Production**. Para testar previews, marque tambem **Preview**.
Depois salve e faca um novo deploy.

As variaveis de licenciamento existentes devem ser preservadas sem mudanca:

```dotenv
LICENSE_APP_ID=com.winportal.windowssoftware
LICENSE_HMAC_SECRET=
LICENSE_ENCRYPTION_KEY=
LICENSE_ED25519_PRIVATE_KEY_PEM=
LICENSE_ED25519_PRIVATE_KEY_BASE64=
```

Tambem preserve as variaveis de Stripe, Resend, GitHub Releases e downloads que
ja estiverem configuradas. As antigas variaveis `SUPABASE_*` so devem ser
removidas da Vercel depois que o primeiro deploy com Neon estiver validado.

## Primeiro administrador

`ADMIN_EMAILS` concede acesso ao ADM pelo e-mail, mesmo antes de existir um
perfil no banco. Depois de criar e acessar a conta uma vez, tambem e possivel
fixar a funcao no banco:

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('seu-email@exemplo.com');
```

## Google Login

Login por e-mail e senha funciona com o Neon Auth habilitado. O botao Google
exige que o provedor Google esteja configurado na area de Auth do Neon. Use as
URLs de callback mostradas pelo proprio painel do Neon ao configurar o cliente
OAuth.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Validacao de producao:

```bash
pnpm build
```

## Banco de dados

O schema oficial esta em `neon/schema.sql`. O portal acessa o banco somente no
servidor por meio de `DATABASE_URL`; a connection string nunca e exposta ao
navegador. Autorizacao de usuario e administrador e verificada antes das
consultas protegidas.

## Ativacao dos aplicativos

Endpoint de ativacao:

```text
POST /api/ativar
```

Endpoint de revalidacao:

```text
POST /api/revalidar
```

O contrato assinado continua contendo `app_id`, `software` e `product_id`.
A migracao do banco nao altera as chaves criptograficas nem o payload esperado
pelos aplicativos.

## Downloads

O endpoint `/api/download/<product-id>` procura primeiro o instalador no GitHub
Releases e depois usa as URLs diretas configuradas. Consulte `RELEASES.md`.
