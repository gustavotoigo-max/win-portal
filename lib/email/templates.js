// Modelos de e-mail da Nexotool (HTML em tabelas e estilos embutidos, que é o que os leitores de e-mail aceitam).
// Cada modelo devolve { subject, html, text }. Sem dados sensíveis: nada de senha nem link de troca aqui
// (os de verificação e troca de senha são enviados pelo Neon Auth).

const C = {
  navy: "#0b1733",
  ink: "#0f172a",
  muted: "#475569",
  line: "#e2e8f0",
  soft: "#f4f6fa",
  accent: "#2563eb",
  ok: "#16a34a"
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function fmtDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="background:${C.accent};border-radius:8px">
    <a href="${esc(href)}" style="display:inline-block;padding:13px 22px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none">${esc(label)}</a>
  </td></tr></table>`;
}

function facts(rows) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:18px 0;background:${C.soft};border-radius:10px">
    ${rows.filter(Boolean).map(([k, v], i) => `<tr>
      <td style="padding:11px 16px;${i ? `border-top:1px solid ${C.line};` : ""}color:${C.muted};font-size:13px;width:38%">${esc(k)}</td>
      <td style="padding:11px 16px;${i ? `border-top:1px solid ${C.line};` : ""}color:${C.ink};font-size:14px;font-weight:600">${esc(v)}</td>
    </tr>`).join("")}
  </table>`;
}

/** Moldura comum: cabeçalho azul-marinho com a marca, cartão branco e rodapé. */
function layout({ base, preheader, title, body, icon }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.soft};font-family:Segoe UI,Arial,Helvetica,sans-serif">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft}"><tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
      <tr><td style="background:${C.navy};border-radius:14px 14px 0 0;padding:20px 28px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td><img src="${base}/email/nexotool-96.png" width="32" height="32" alt="" style="display:block;border:0"></td>
          <td style="padding-left:10px;color:#ffffff;font-size:20px;font-weight:700">Nexo<span style="color:#22d3ee">tool</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px 28px;border-left:1px solid ${C.line};border-right:1px solid ${C.line}">
        ${icon ? `<img src="${base}/email/fbrecovery-128.png" width="56" height="56" alt="" style="display:block;border:0;margin-bottom:16px">` : ""}
        <h1 style="margin:0 0 14px;color:${C.ink};font-size:22px;line-height:1.3">${esc(title)}</h1>
        <div style="color:${C.ink};font-size:15px;line-height:1.6">${body}</div>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid ${C.line};border-top:0;border-radius:0 0 14px 14px;padding:18px 28px;color:${C.muted};font-size:12px;line-height:1.5">
        Você recebeu este e-mail porque tem uma conta na Nexotool.<br>
        <a href="${base}/pt/dashboard" style="color:${C.muted}">Minha conta</a> &middot; <a href="${base}/pt" style="color:${C.muted}">nexotool.com.br</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** Conta criada (enviado no primeiro acesso, por e-mail e senha ou pelo Google). */
export function welcomeEmail({ base, name, email }) {
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  const subject = "Bem-vindo à Nexotool";
  const body = `
    <p style="margin:0 0 12px">Olá${first ? `, ${esc(first)}` : ""}! Sua conta foi criada com o e-mail <strong>${esc(email)}</strong>.</p>
    <p style="margin:0">Com ela você ativa licenças, baixa o FbRecovery e gerencia os computadores em que ele está liberado.</p>
    ${button(`${base}/pt/fbrecovery`, "Conhecer o FbRecovery")}`;
  const text = [
    `Olá${first ? `, ${first}` : ""}! Sua conta na Nexotool foi criada com o e-mail ${email}.`,
    "Com ela você ativa licenças, baixa o FbRecovery e gerencia os computadores liberados.",
    `${base}/pt/fbrecovery`
  ].join("\n\n");
  return { subject, text, html: layout({ base, preheader: "Sua conta está pronta.", title: "Sua conta está pronta", body }) };
}

/** Compra concluída / licença ativada. */
export function purchaseEmail({ base, email, orderNumber, product, expiresAt, maxMachines = 1, downloadUrl, productUrl }) {
  const until = fmtDate(expiresAt);
  const subject = `Licença ${product.title} ativada · ${orderNumber}`;
  const body = `
    <p style="margin:0 0 4px">Sua licença do <strong>${esc(product.title)}</strong> está ativa.</p>
    ${facts([
      ["Pedido", orderNumber],
      ["Conta", email],
      ["Validade", until ? `até ${until}` : "Sem prazo"],
      ["Computadores", `${maxMachines}`]
    ])}
    <p style="margin:0 0 6px;font-weight:700">Para começar</p>
    <ol style="margin:0 0 0 18px;padding:0;color:${C.ink}">
      <li style="margin-bottom:6px">Baixe e instale o ${esc(product.title)} (Windows 10 ou 11, 64 bits).</li>
      <li style="margin-bottom:6px">Abra o programa e clique para entrar: o navegador abre o site e você confirma com esta conta.</li>
      <li>Abra o banco .fdb e recupere. Não há chave para digitar.</li>
    </ol>
    ${button(downloadUrl, "Baixar o instalador")}
    <p style="margin:8px 0 0;color:${C.muted};font-size:13px">Página do produto: <a href="${esc(productUrl)}" style="color:${C.accent}">${esc(productUrl)}</a></p>`;
  const text = [
    `Sua licença do ${product.title} está ativa.`,
    `Pedido: ${orderNumber}\nConta: ${email}\nValidade: ${until ? `até ${until}` : "sem prazo"}\nComputadores: ${maxMachines}`,
    "Para começar: baixe e instale o programa, abra e entre pelo navegador com esta conta, abra o banco e recupere.",
    `Instalador: ${downloadUrl}`,
    `Página do produto: ${productUrl}`
  ].join("\n\n");
  return { subject, text, html: layout({ base, preheader: `Pedido ${orderNumber}`, title: "Licença ativada", body, icon: true }) };
}

/** Aviso de senha alterada (segurança). */
export function passwordChangedEmail({ base, email, when = new Date() }) {
  const at = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(when);
  const subject = "Sua senha foi alterada";
  const body = `
    <p style="margin:0 0 12px">A senha da conta <strong>${esc(email)}</strong> foi alterada em ${esc(at)}.</p>
    <p style="margin:0 0 12px">Se foi você, está tudo certo e não precisa fazer nada.</p>
    <p style="margin:0">Se <strong>não</strong> foi você, troque a senha agora e confira os computadores liberados na sua conta.</p>
    ${button(`${base}/pt/esqueci-senha`, "Trocar a senha")}`;
  const text = [
    `A senha da conta ${email} foi alterada em ${at}.`,
    "Se foi você, não precisa fazer nada.",
    `Se não foi você, troque a senha agora: ${base}/pt/esqueci-senha`
  ].join("\n\n");
  return { subject, text, html: layout({ base, preheader: "Aviso de segurança da sua conta.", title: "Senha alterada", body }) };
}
