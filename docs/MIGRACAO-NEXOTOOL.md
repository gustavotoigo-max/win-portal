# Troca de nome para Nexotool: o que alterar fora do código

O código do site e dos aplicativos já usa o nome Nexotool. Os itens abaixo ficam em
painéis externos e só você pode alterar. Faça na ordem.

## 1. Domínio www.nexotool.com.br (Registro.br + Vercel)
O endereço principal é `www.nexotool.com.br`; `nexotool.com.br` (sem www) só redireciona para ele.

**Na Vercel** (vercel.com → projeto `win-portal` → **Settings → Domains**):
1. Clique em **Add Domain**, digite `www.nexotool.com.br` e confirme.
2. Quando a Vercel perguntar, aceite também adicionar `nexotool.com.br` redirecionando para o www
   (ou adicione `nexotool.com.br` à parte e escolha **Redirect to www.nexotool.com.br**, 308).
3. A Vercel mostra os registros DNS que faltam. Normalmente são:
   | Tipo | Nome | Valor |
   | --- | --- | --- |
   | A | (vazio / `@`) | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |
   Se a tela mostrar valores diferentes, use os da tela.

**No Registro.br** (registro.br → **Meus domínios** → `nexotool.com.br`):
1. Em **DNS**, confirme que está usando os servidores DNS do Registro.br
   (se não, clique em **Alterar servidores DNS → Utilizar os DNS do Registro.br**).
2. Clique em **Configurar zona DNS** / **Editar zona** → **Nova entrada** e crie os dois registros acima.
3. Salve. A propagação costuma levar de minutos a algumas horas.

**De volta na Vercel**: espere os dois domínios ficarem com **Valid Configuration** (o certificado
HTTPS é emitido sozinho). Teste `https://www.nexotool.com.br` e `https://nexotool.com.br`.

**Não remova `win-portal.vercel.app`** e não renomeie o projeto na Vercel: os aplicativos
(inclusive os antigos em Python) ativam licenças e procuram atualizações nesse endereço.

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables, Production)
| Variável | Novo valor |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://www.nexotool.com.br` |
| `LICENSE_EMAIL_FROM` | `Nexotool <licencas@nexotool.com.br>` (depois do passo 4) |
| `LICENSE_APP_ID` | **não altere** (`com.winportal.windowssoftware`) |
Depois de salvar, faça **Redeploy** do último deploy de produção.

## 3. Banco de dados (Neon)
- **Nenhuma tabela precisa de UPDATE.** O nome do site não fica gravado em nenhuma tabela.
- **Não altere** a coluna `licenses.app_id` nem o valor padrão `com.winportal.windowssoftware`.
  Todas as licenças já emitidas são assinadas com esse valor; mudar invalida todas as ativações.
- Opcional e só visual: no console do Neon, **Settings → General → Project name**, renomeie o
  projeto para "Nexotool". Isso não muda a `DATABASE_URL`.
- **Neon Auth** (login do site), no console do Neon → **Auth**:
  1. Em **Domains / Trusted origins**, adicione `https://nexotool.com.br` e
     `https://www.nexotool.com.br` (mantenha o endereço vercel.app).
  2. Se houver nome do aplicativo ou remetente nos e-mails de verificação, troque para Nexotool.
  3. Se o login com Google usar credenciais próprias, no Google Cloud Console → **Credenciais**,
     adicione o novo domínio em "Origens JavaScript autorizadas" e nos URIs de redirecionamento.

## 4. E-mail das licenças (Resend)
1. Em resend.com → **Domains → Add domain**: `nexotool.com.br`.
2. Crie no DNS os registros que o Resend mostrar (SPF, DKIM, e MX se pedir) e clique em **Verify**.
3. Só depois de verificado, troque `LICENSE_EMAIL_FROM` (passo 2) e faça o redeploy.

## 5. Stripe (se estiver em uso)
1. **Settings → Business → Public details**: nome "Nexotool", site `https://www.nexotool.com.br`.
2. **Developers → Webhooks**: se quiser usar o domínio novo, crie um endpoint
   `https://www.nexotool.com.br/api/stripe/webhook` e troque `STRIPE_WEBHOOK_SECRET` pelo segredo dele.
   O endpoint atual em vercel.app continua funcionando se preferir não mexer.

## 6. GitHub
- O repositório pode continuar `win-portal`. Se renomear, atualize `GITHUB_RELEASES_REPOSITORY`
  na Vercel; o GitHub redireciona o nome antigo, mas é melhor não depender disso.

## O que continua com o nome antigo, de propósito
- `com.winportal.windowssoftware` (identificador assinado das licenças).
- Pasta `%LOCALAPPDATA%\WinPortal` nos PCs dos clientes (licenças e preferências já gravadas).
- Endereço `win-portal.vercel.app` usado pelos aplicativos para ativar e atualizar.
- Formato da chave `WIN-XXXX-XXXX-XXXX-XXXX`.
- Nomes internos do código (namespaces `WinPortal.*`), que o usuário não vê.
