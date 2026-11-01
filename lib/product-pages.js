import { getProductOrNull, isStoreProduct, productPath, products } from "@/lib/products";

export const categories = {
  bancos: {
    title: "Bancos de dados",
    description: "Bancos Firebird que não abrem de volta ao trabalho."
  }
};

// Ícones ilustrados da família Nexotool (public/product-icons).
export const productIconImages = {
  fbrecovery: "/product-icons/firebird_analyzer.webp"
};

export const categoryOrder = ["bancos"];

const defaultIncluded = [
  "Licença para 1 computador",
  "Qualquer versão do Firebird (1.5 a 5.0)",
  "Arquivo original nunca é alterado",
  "Atualizações incluídas"
];

export const productPageContent = {
  fbrecovery: {
    title: "FbRecovery",
    tagline: "Seu banco Firebird não abre? Descubra em minutos o que aconteceu e coloque o sistema para funcionar de novo.",
    description:
      "Quando o banco Firebird corrompe, o sistema para, o cliente fica sem vender e cada hora custa caro. " +
      "O FbRecovery analisa o arquivo de forma rápida e segura, mostra com clareza o que foi afetado e entrega um banco " +
      "pronto para o sistema voltar a abrir. O arquivo original nunca é alterado.",
    features: [
      ["Qualquer versão do Firebird", "Funciona com bancos do Firebird 1.5 ao 5.0, sem você precisar descobrir a versão nem instalar nada além do programa."],
      ["Diagnóstico em minutos", "Abra o arquivo e veja na hora o estado do banco: o que está íntegro, o que foi afetado e o tamanho do problema."],
      ["Seguro do início ao fim", "O arquivo original nunca é alterado. O resultado é sempre um banco novo, na pasta que você escolher."],
      ["Banco de volta ao trabalho", "Gera um banco novo e testado, pronto para o sistema do cliente abrir e voltar a operar."],
      ["Relatório para o cliente", "Relatório claro do que foi recuperado, para mostrar ao cliente o resultado do seu trabalho."],
      ["Simples de usar", "Abrir, analisar e recuperar. Sem comandos, sem configurações complicadas."]
    ],
    useCases: [
      "Sistema de gestão que parou de abrir de uma hora para outra",
      "Banco corrompido depois de queda de energia ou desligamento forçado",
      "Mensagens como \"database file appears corrupt\" ou \"wrong page type\"",
      "Arquivo .fdb recuperado de um disco com defeito"
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
