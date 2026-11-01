import "server-only";

import { isDatabaseConfigured, query } from "@/lib/neon/database";
import { formatPrice, getProductPage } from "@/lib/product-pages";
import { products } from "@/lib/products";

// Preços ficam no banco (public.product_prices) e são editados no ADM.
// O catálogo (lib/products.js) define quais produtos existem; produto sem preço cadastrado aparece no ADM como "sem preço"
// e no site como R$ 0,00 até o valor ser definido.

/** Mapa produto → centavos. Sem banco ou sem a tabela: vazio (tudo "sem preço"). */
export async function getPriceMap() {
  if (!isDatabaseConfigured()) return new Map();
  try {
    const rows = await query("select product_id, price_cents, updated_at, updated_by from public.product_prices");
    return new Map(rows.map((r) => [r.product_id, r]));
  } catch (error) {
    if (!String(error?.message || "").includes("does not exist")) console.error("Preços indisponíveis:", error.message);
    return new Map();
  }
}

function applyPrice(page, row) {
  if (!page) return null;
  const price = row ? row.price_cents / 100 : 0;
  return { ...page, price, priceLabel: formatPrice(price), priceSet: Boolean(row) };
}

/** Página do produto com o preço do banco. */
export async function getPricedProductPage(productId) {
  const map = await getPriceMap();
  return applyPrice(getProductPage(productId), map.get(productId));
}

/** Produto do catálogo com o preço do banco (para a compra). */
export async function getPricedProduct(product) {
  if (!product) return null;
  const map = await getPriceMap();
  const row = map.get(product.id);
  return { ...product, price: row ? row.price_cents / 100 : 0 };
}

/** Todos os produtos do catálogo com o preço atual (lista do ADM). */
export async function getCatalogWithPrices() {
  const map = await getPriceMap();
  return products.map((p) => {
    const row = map.get(p.id);
    const page = getProductPage(p.id);
    return {
      id: p.id,
      name: page?.title || p.name,
      iconImage: page?.iconImage || null,
      pagePath: page?.pagePath || null,
      priceCents: row ? row.price_cents : null,
      updatedAt: row?.updated_at || null,
      updatedBy: row?.updated_by || null
    };
  });
}
