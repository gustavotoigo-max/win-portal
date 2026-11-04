// id, name, orderPrefix, releaseAsset e aliases fazem parte do contrato de
// ativacao com os aplicativos (ver docs/CONTRATO-ATIVACAO.md). Nao renomeie.
// price (em reais), category e icon sao usados apenas pela vitrine e pela loja.
// server: true = produto atendido pelo servidor NPAPcore (login pelo navegador, sem chave de ativacao);
// o id precisa existir tambem em npap.product no banco.
export const products = [
  // Valor ainda nao definido: R$ 0,00. A compra so conclui com cupom valido (ver lib/coupons.js).
  { id: "fbrecovery", name: "FbRecovery", orderPrefix: "FBRECOVERY", releaseAsset: "FbRecovery.exe", aliases: ["FbRecovery"], price: 0, category: "bancos", icon: "database", server: true },
  { id: "sqlrecovery", name: "Nexo SQL Recovery", orderPrefix: "NEXOSQL", releaseAsset: "NexoSqlRecovery.exe", aliases: ["NexoSqlRecovery", "SQL Recovery"], price: 0, category: "bancos", icon: "database", server: true }
];

// Pagina propria de cada produto (fora do modelo generico /pt/solucoes/<id>).
export const productPaths = { fbrecovery: "/pt/fbrecovery", sqlrecovery: "/pt/sqlrecovery" };

export function productPath(productId) {
  return productPaths[productId] || `/pt/solucoes/${productId}`;
}

export function getProductById(productId) {
  return products.find((product) => product.id === productId) || products[0];
}


export function getProductOrNull(productId) {
  return products.find((product) => product.id === productId) || null;
}

export function isStoreProduct(product) {
  return Boolean(product) && product.store !== false;
}

export function normalizeProductInput(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function getProductBySoftware(software) {
  const normalized = normalizeProductInput(software);
  if (!normalized) return null;

  return products.find((product) => {
    const candidates = [product.id, product.name, product.orderPrefix, ...(product.aliases || [])];
    return candidates.some((candidate) => normalizeProductInput(candidate) === normalized);
  }) || null;
}
