# Troca de nome para Nexotool: o que alterar fora do código

O código do site e dos aplicativos já usa o nome Nexotool. Os itens abaixo ficam em
painéis externos e só você pode alterar. Faça na ordem.

## 1. Domínio nexotool.com.br (Registro.br + Vercel)
1. Na Vercel, abra o projeto do site → **Settings → Domains** → **Add** e adicione
   `nexotool.com.br` e `www.nexotool.com.br`. A Vercel mostra os registros DNS (A/CNAME).
2. No Registro.br (ou onde o domínio estiver), em **DNS**, crie exatamente esses registros.
3. De volta na Vercel, marque `nexotool.com.br` como domínio principal e deixe o `www`
   redirecionando para ele.
4. **Não remova `win-portal.vercel.app`** e não renomeie o projeto na Vercel: os aplicativos
   (inclusive os antigos em Python) ativam licenças e procuram atualizações nesse endereço.

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables, Production)
| Variável | Novo valor |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://nexotool.com.br` |
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
1. **Settings → Business → Public details**: nome "Nexotool", site `https://nexotool.com.br`.
2. **Developers → Webhooks**: se quiser usar o domínio novo, crie um endpoint
   `https://nexotool.com.br/api/stripe/webhook` e troque `STRIPE_WEBHOOK_SECRET` pelo segredo dele.
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
