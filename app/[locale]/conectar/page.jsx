import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/site/Icon";
import PageShell from "@/components/site/PageShell";
import { getPendingRequest, hasValidLicense, normalizeUserCode } from "@/lib/npap/device-auth";
import { isDatabaseConfigured } from "@/lib/neon/database";
import { getCurrentUser } from "@/lib/session";
import { decideConnection } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conectar aplicativo",
  robots: { index: false }
};

const results = {
  autorizado: {
    icon: "check",
    tone: "success",
    title: "Aplicativo conectado",
    text: "Pode voltar ao programa: ele libera o acesso sozinho em alguns segundos."
  },
  recusado: {
    icon: "lock",
    tone: "muted",
    title: "Pedido recusado",
    text: "O aplicativo não foi conectado. Se não foi você que iniciou esse login, nada mais precisa ser feito."
  },
  "sem-licenca": {
    icon: "key",
    tone: "warning",
    title: "Sem licença para este programa",
    text: "Sua conta não tem uma licença ativa para o programa que pediu acesso. Fale com o suporte para obter uma."
  }
};

function formatTime(value) {
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function CodeForm({ code, error }) {
  return (
    <form className="connect-form" method="get" action="/pt/conectar">
      <label className="field">
        Código mostrado no aplicativo
        <input
          name="codigo"
          defaultValue={code || ""}
          placeholder="ABCD-EFGH"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          required
          className="connect-code-input"
        />
      </label>
      {error && <p className="connect-error">{error}</p>}
      <button className="btn btn-primary" type="submit">Continuar</button>
    </form>
  );
}

export default async function ConnectPage({ searchParams }) {
  const { codigo, resultado } = await searchParams;
  const code = normalizeUserCode(codigo);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/pt/login?next=${encodeURIComponent(code ? `/pt/conectar?codigo=${code}` : "/pt/conectar")}`);
  }

  const result = results[resultado];
  const request = !result && code && isDatabaseConfigured() ? await getPendingRequest(code) : null;
  const licensed = request ? await hasValidLicense(user, request.product_id) : false;

  return (
    <PageShell className="success-page">
      <div className="container narrow">
        <div className="success-card connect-card">
          {result ? (
            <>
              <span className={`success-icon connect-icon-${result.tone}`}><Icon name={result.icon} size={30} strokeWidth={2.2} /></span>
              <h1>{result.title}</h1>
              <p className="muted">{result.text}</p>
              <div className="hero-actions center">
                <Link className="btn btn-ghost" href="/pt/dashboard">Ir para Minha conta</Link>
              </div>
            </>
          ) : request ? (
            <>
              <span className="success-icon"><Icon name="monitor" size={30} strokeWidth={2.2} /></span>
              <h1>Conectar {request.product_name}?</h1>
              <p className="muted">
                Um aplicativo pediu para entrar na conta <strong>{user.email}</strong>.
              </p>

              <dl className="connect-details">
                <div><dt>Programa</dt><dd>{request.product_name}{request.client_version ? ` ${request.client_version}` : ""}</dd></div>
                <div><dt>Computador</dt><dd>{request.device_label || "Não informado"}</dd></div>
                <div><dt>Código</dt><dd className="mono">{code}</dd></div>
                <div><dt>Pedido às</dt><dd>{formatTime(request.created_at)} (vale até {formatTime(request.expires_at)})</dd></div>
              </dl>

              <p className="connect-warning">
                <Icon name="lock" size={18} />
                <span>
                  Só confirme se <strong>você</strong> acabou de abrir o programa e o mesmo código aparece na tela dele.
                  Nunca confirme um código enviado por outra pessoa.
                </span>
              </p>

              {!licensed && (
                <p className="connect-error">Sua conta não tem licença ativa para o {request.product_name}.</p>
              )}

              <form action={decideConnection} className="hero-actions center">
                <input type="hidden" name="codigo" value={code} />
                {licensed && (
                  <button className="btn btn-primary" type="submit" name="decisao" value="autorizar">
                    <Icon name="check" size={16} /> Autorizar
                  </button>
                )}
                <button className="btn btn-ghost" type="submit" name="decisao" value="recusar">Recusar</button>
              </form>
            </>
          ) : (
            <>
              <span className="success-icon"><Icon name="key" size={30} strokeWidth={2.2} /></span>
              <h1>Conectar aplicativo</h1>
              <p className="muted">Digite o código que aparece na tela do programa.</p>
              <CodeForm
                code={codigo}
                error={codigo ? "Código inválido ou expirado. Gere um novo no programa." : null}
              />
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
