function formatDate(value) {
  if (!value) return "Sem vencimento";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export function buildLicenseEmail({ customerEmail, licenseKey, orderNumber, product, expiresAt, downloadUrl }) {
  const subject = `Sua licenca ${product.title} - ${orderNumber}`;
  const text = [
    `Ola,`,
    ``,
    `Sua licenca foi criada com sucesso.`,
    ``,
    `Cliente: ${customerEmail}`,
    `Produto: ${product.title}`,
    `Pedido: ${orderNumber}`,
    `Chave de ativacao: ${licenseKey}`,
    `Vencimento: ${formatDate(expiresAt)}`,
    `Download: ${downloadUrl}`,
    ``,
    `Use o mesmo e-mail informado acima junto com a chave de ativacao no software.`,
    ``,
    `WinPortal`
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#10222b;line-height:1.55">
      <h2 style="margin:0 0 12px;color:#0b4652">Sua licenca foi criada</h2>
      <p>Ola, sua licenca oficial esta pronta para uso.</p>
      <table style="border-collapse:collapse;width:100%;max-width:620px">
        <tr><td style="padding:8px;border-bottom:1px solid #e5eef2"><strong>Cliente</strong></td><td style="padding:8px;border-bottom:1px solid #e5eef2">${customerEmail}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5eef2"><strong>Produto</strong></td><td style="padding:8px;border-bottom:1px solid #e5eef2">${product.title}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5eef2"><strong>Pedido</strong></td><td style="padding:8px;border-bottom:1px solid #e5eef2">${orderNumber}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5eef2"><strong>Chave</strong></td><td style="padding:8px;border-bottom:1px solid #e5eef2"><code style="font-size:15px">${licenseKey}</code></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e5eef2"><strong>Vencimento</strong></td><td style="padding:8px;border-bottom:1px solid #e5eef2">${formatDate(expiresAt)}</td></tr>
      </table>
      <p style="margin:20px 0">
        <a href="${downloadUrl}" style="background:#139393;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir pagina de download</a>
      </p>
      <p>Use este mesmo e-mail junto com a chave de ativacao dentro do software.</p>
    </div>
  `;

  return { subject, text, html };
}
