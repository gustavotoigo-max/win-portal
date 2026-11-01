import { getProductOrNull, isStoreProduct, productPath, products } from "@/lib/products";

export const categories = {
  bancos: {
    title: "Bancos de dados",
    description: "Análise e recuperação de bancos Firebird danificados."
  }
};

// Ícones ilustrados da família Nexotool (public/product-icons).
export const productIconImages = {
  fbrecovery: "/product-icons/firebird_analyzer.webp"
};

export const categoryOrder = ["bancos"];

const defaultIncluded = [
  "Licença para 1 computador",
  "Firebird 1.x, 2.x, 3, 4 e 5",
  "Atualizações da versão publicada",
  "Entrada com a conta do site, sem chave"
];

export const productPageContent = {
  fbrecovery: {
    title: "FbRecovery",
    tagline: "Análise e recuperação de bancos Firebird corrompidos, com enxerto a partir de backups antigos.",
    description:
      "O FbRecovery examina o arquivo .fdb página por página, mostra exatamente o que se perdeu e gera um banco novo e utilizável, " +
      "aproveitando backups antigos do mesmo banco para trazer de volta setores, estrutura e blobs. O arquivo original nunca é alterado.",
    features: [
      ["Diagnóstico página a página", "Mapa visual de todas as páginas do arquivo, tabelas danificadas, páginas órfãs e setores zerados, sem depender do Firebird abrir o banco."],
      ["Recuperação completa", "Reparo do catálogo, extração e restauração num banco novo, recriação de índices e teste de todas as tabelas no final."],
      ["Enxerto de backups", "Backups antigos do mesmo banco doam setores e páginas perdidas; qualquer backup doa colunas, procedures, domínios e blobs."],
      ["Todas as versões", "Bancos do Firebird 1.x ao 5.0 (ODS 10 a 13.1), com o motor certo escolhido automaticamente."],
      ["Relatório para o cliente", "Relatório HTML com o que foi recuperado, tabela por tabela, e o mapa de relações entre as tabelas."],
      ["Mapa de setores", "Usa o mapa de setores ilegíveis da clonagem do disco (ddrescue) para saber exatamente onde houve perda."]
    ],
    useCases: [
      "Bancos de sistemas de gestão que não abrem mais",
      "Erros como \"database file appears corrupt\" e \"wrong page type\"",
      "Arquivos vindos de discos com setores ruins",
      "Recuperação com backups antigos incompletos"
    ]
  }
};

export function formatPrice(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function getProductPage(productId) {
  const product = getProductOrNull(productId);
  if (!product) return null;

  const content = productPageContent[product.id] || {};
  const title = content.title || product.name;

  return {
    ...product,
    title,
    tagline: content.tagline || `${title} para Windows.`,
    subtitle: content.tagline || `${title} para Windows.`,
    description: content.description || "",
    features: content.features || [],
    cards: content.features || [],
    useCases: content.useCases || [],
    included: defaultIncluded,
    categoryTitle: categories[product.category]?.title || "",
    priceLabel: formatPrice(product.price),
    iconImage: productIconImages[product.id] || null,
    downloadUrl: content.downloadUrl || `/api/download/${product.id}`,
    pagePath: productPath(product.id),
    installerName: product.releaseAsset.replace(/\.exe$/i, "-Setup.exe")
  };
}

export function getAllProductPages() {
  return products.filter(isStoreProduct).map((product) => getProductPage(product.id)).filter(Boolean);
}

export function getProductPagesByCategory() {
  const all = getAllProductPages();
  return categoryOrder.map((key) => ({
    key,
    ...categories[key],
    products: all.filter((product) => product.category === key)
  }));
}
