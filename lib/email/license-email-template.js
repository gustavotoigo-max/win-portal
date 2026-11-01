import { purchaseEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/email/send-email";

// E-mail de licença ativada (compra com cupom ou licença criada no ADM). O FbRecovery entra pela conta do site,
// então a chave não é enviada.
export function buildLicenseEmail({ customerEmail, orderNumber, product, expiresAt, downloadUrl, productUrl, maxMachines }) {
  return purchaseEmail({
    base: siteUrl(),
    email: customerEmail,
    orderNumber,
    product,
    expiresAt,
    maxMachines: maxMachines || 1,
    downloadUrl: downloadUrl || `${siteUrl()}/api/download/${product.id}`,
    productUrl: productUrl || downloadUrl || `${siteUrl()}/pt/fbrecovery`
  });
}
