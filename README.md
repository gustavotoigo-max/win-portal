# Nexotool

Portal Next.js para cadastro de clientes, administracao de licencas, downloads e
ativacao dos aplicativos Nexotool (nexotool.com.br). O backend usa Neon PostgreSQL e
Neon Auth.

O site foi renomeado de WinPortal para Nexotool. Identificadores internos como o
`app_id` `com.winportal.windowssoftware`, o nome do pacote e o repositorio
`gustavotoigo-max/win-portal` mantem o nome antigo de proposito: as licencas ja
emitidas sao assinadas com eles.

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

## Loja (compra simulada)

Cada produto tem um preco em `lib/products.js` (campo `price`, em reais). Nao ha
gateway de pagamento: o pedido so e concluido quando um cupom zera o total. O
cupom `COMPREAQUI` da 100% de desconto (definido em `lib/coupons.js`, somente no
servidor). A compra cria pedido e licenca com o mesmo gerador usado pelo ADM
(`lib/licenses/issue.js`), vinculada ao e-mail da conta, 1 computador, sem
vencimento.

Antes do primeiro deploy da loja, execute no Neon SQL Editor
`neon/migrations/20261006_simulated_checkout.sql` (alteracao apenas aditiva na
tabela `orders`). Sem ela a emissao manual pelo ADM continua funcionando, mas a
compra pela loja falha.

O cliente pode desvincular um computador em Minha conta; isso remove apenas
aquela ativacao, como a acao "Limpar ativacao" do ADM.

O site e publicado somente em portugues; `/en/...` redireciona para `/pt/...`.

## Ativacao dos aplicativos

O contrato completo esta em `docs/CONTRATO-ATIVACAO.md`.

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

## Login dos aplicativos pelo navegador (NPAPcore)

Os aplicativos novos (começando pelo FbRecovery) entram com a conta do site pelo servidor
[NPAPcore](https://github.com/gustavotoigo-max/NPAPcore-Server): o app mostra um código e abre
`/pt/conectar?codigo=XXXX-XXXX`; a pessoa entra no site e confirma. A página grava a decisão em
`npap.device_authorization` no Neon, e o servidor lê de lá (o site nunca chama o servidor).

- Migração: `neon/migrations/20261101_npap_server.sql` (schema `npap`, aditivo; não altera `public.*`).
- Produtos com `store: false` em `lib/products.js` (ex.: `fbrecovery`) ficam fora da vitrine e da loja;
  a licença é criada pelo ADM. O id precisa existir também em `npap.product`.
- O contrato antigo (`/api/ativar`, `/api/revalidar`) continua igual para os aplicativos atuais.

## FbRecovery (único produto do site)

- Página: `/pt/fbrecovery`. Endereços antigos `/pt/solucoes/...` redirecionam para ela.
- Valor R$ 0,00 por enquanto: a licença é ativada **com cupom** (`/pt/comprar/fbrecovery`).
- "Baixar instalador" (`/api/download/fbrecovery`) baixa direto o `FbRecovery-Setup.exe` do release mais recente
  `fbrecovery-v<versão>` deste repositório (publicado pela automação do repositório FbRecovery).

## Cupons (ADM → Cupons)

Tabela `public.coupons` (migração `neon/migrations/20261103_cupons.sql`). Cada cupom tem desconto (%), validade,
limite de usos, prazo da licença em dias (opcional, para testadores), computadores e produto. Um uso por conta;
o uso é reservado de forma atômica na compra e devolvido se a compra falhar.

## E-mails

Enviados pelo site (`lib/email`): conta criada, licença ativada e senha alterada. Prévia em `/ADM/emails`.
Envio por SMTP (Gmail agora, Hostinger depois, só trocando as variáveis):

| Variável | Gmail | Hostinger |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` | `465` |
| `SMTP_USER` | seu e-mail Gmail | o e-mail do domínio |
| `SMTP_PASS` | senha de app (conta com verificação em 2 etapas) | senha da caixa |
| `EMAIL_FROM` | `Nexotool <seu e-mail>` | `Nexotool <contato@seu-dominio>` |

Verificação de e-mail e troca de senha são enviadas pelo Neon Auth; configure o mesmo SMTP em
Neon → Settings → Auth (provedor de e-mail SMTP personalizado) para saírem com o seu remetente.

## Preços (ADM → Produtos e preços)

Os produtos existem no catálogo do código (`lib/products.js`); o preço fica no banco (`public.product_prices`,
migração `neon/migrations/20261104_precos.sql`) e é editado no ADM. Produto novo do catálogo, sem preço cadastrado,
aparece no ADM como **Sem preço** e no site como R$ 0,00 até o valor ser salvo. Ao salvar, as páginas são atualizadas.
