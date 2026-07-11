import { getProductOrNull, products } from "@/lib/products";

const defaultCards = [
  ["Licenca segura", "Ativacao online com validacao por e-mail, key, produto e maquina."],
  ["Controle administrativo", "O painel ADM permite criar, bloquear, revogar e acompanhar cada licenca."],
  ["Pronto para operacao", "Pensado para distribuir ferramentas Windows com suporte e rastreabilidade."]
];

export const productPageContent = {
  "image-analyzer": {
    title: "Image Analyzer",
    subtitle: "Analise imagens com foco em organizacao, verificacao e produtividade.",
    cards: [
      ["Analise visual", "Ferramenta para apoiar verificacoes e conferencias em conjuntos de imagens."],
      ["Fluxo simples", "Interface direta para selecionar arquivos, processar e revisar resultados."],
      ["Licenca por maquina", "Ativacao controlada pelo WinPortal com historico de validacao."]
    ]
  },
  "pdf-analyzer": {
    title: "PDF Analyzer",
    subtitle: "Ferramenta para conferir e organizar documentos PDF com mais controle.",
    cards: [
      ["Verificacao de PDFs", "Apoia a analise de arquivos e lotes de documentos."],
      ["Operacao local", "Executa no Windows do cliente com licenca validada pelo portal."],
      ["Entrega profissional", "Download, ativacao e suporte seguem um fluxo padronizado."]
    ]
  },
  "firebird-analyzer": {
    title: "Firebird Analyzer",
    subtitle: "Analise bancos Firebird com uma ferramenta dedicada para suporte tecnico.",
    cards: [
      ["Diagnostico Firebird", "Pensado para investigar bases e apoiar rotinas tecnicas."],
      ["Controle de acesso", "Cada key fica vinculada ao cliente, produto e maquina."],
      ["Rastreabilidade", "Validacoes e maquinas aparecem no painel administrativo."]
    ]
  },
  "mysql-analyzer": {
    title: "MySQL Analyzer",
    subtitle: "Uma ferramenta para apoio tecnico em ambientes MySQL.",
    cards: [
      ["Analise direcionada", "Organiza verificacoes importantes para bancos MySQL."],
      ["Ativacao segura", "A licenca so funciona para o produto comprado."],
      ["Suporte objetivo", "Dados de versao, maquina e validacao ficam registrados."]
    ]
  },
  "sector-dbfb-repair": {
    title: "Sector DBFB Repair",
    subtitle: "Reparo e suporte tecnico para cenarios especificos de bases DBFB.",
    cards: [
      ["Foco em reparo", "Ferramenta dedicada para rotinas tecnicas de correcao."],
      ["Uso controlado", "Validade, bloqueio e revogacao sao gerenciados pelo ADM."],
      ["Distribuicao organizada", "Cliente recebe key e link oficial de download."]
    ]
  },
  "dwg-cleaner": {
    title: "DWG Cleaner",
    subtitle: "Limpeza e organizacao de arquivos DWG em ambiente Windows.",
    cards: [
      ["Limpeza de arquivos", "Ajuda a padronizar rotinas com arquivos DWG."],
      ["Instalacao simples", "Download direto pela pagina do produto."],
      ["Licenca vinculada", "A key e validada especificamente para o DWG Cleaner."]
    ]
  },
  "rename-folder": {
    title: "Rename Folder",
    subtitle: "Automatize rotinas de renomeacao de pastas com seguranca.",
    cards: [
      ["Renomeacao guiada", "Ferramenta focada em padronizar nomes de pastas."],
      ["Menos trabalho manual", "Reduz tarefas repetitivas de organizacao."],
      ["Controle por cliente", "Cada cliente recebe uma key propria para ativacao."]
    ]
  },
  "mdb-integrity": {
    title: "MDB Integrity",
    subtitle: "Verifique integridade de arquivos MDB com uma ferramenta dedicada.",
    cards: [
      ["Conferencia MDB", "Auxilia a validacao e suporte de arquivos Access/MDB."],
      ["Relatorio tecnico", "Fluxo pensado para diagnostico e manutencao."],
      ["Licenca oficial", "Ativacao protegida por assinatura e validacao online/offline."]
    ]
  },
  "empty-folder-cleaner": {
    title: "Empty Folder Cleaner",
    subtitle: "Localize e remova pastas vazias com mais praticidade.",
    cards: [
      ["Limpeza rapida", "Ajuda a encontrar estruturas vazias no Windows."],
      ["Uso simples", "Fluxo direto para selecionar, revisar e limpar."],
      ["Distribuicao segura", "Download e ativacao seguem o padrao WinPortal."]
    ]
  },
  "complete-solution": {
    title: "Solucao Completa",
    subtitle: "Pacote com acesso organizado ao conjunto de ferramentas.",
    cards: [
      ["Pacote completo", "Ideal para clientes que precisam de varias ferramentas."],
      ["Gestao centralizada", "Licencas e produtos podem ser acompanhados pelo painel."],
      ["Pronto para crescer", "Estrutura preparada para novos produtos e downloads."]
    ]
  }
};

export function getProductPage(productId) {
  const product = getProductOrNull(productId);
  if (!product) return null;

  const content = productPageContent[product.id] || {};
  const title = content.title || product.name;

  return {
    ...product,
    title,
    subtitle: content.subtitle || `${title} integrado ao WinPortal para download, ativacao e suporte.`,
    cards: content.cards || defaultCards,
    downloadUrl: content.downloadUrl || `/api/download/${product.id}`
  };
}

export function getAllProductPages() {
  return products.map((product) => getProductPage(product.id)).filter(Boolean);
}
