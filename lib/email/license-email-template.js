import { purchaseEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/email/send-email";
import { productPath } from "@/lib/products";

// E-mail de licença ativada (compra com cupom ou licença criada no ADM). Os programas entram pela conta do site,
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
    productUrl: productUrl || downloadUrl || `${siteUrl()}${productPath(product.id)}`
  });
}
