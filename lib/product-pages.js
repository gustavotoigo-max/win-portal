import { getProductOrNull, products } from "@/lib/products";

export const categories = {
  recuperacao: {
    title: "Recuperação e diagnóstico",
    description: "Confira arquivos recuperados e descubra rapidamente o que está íntegro."
  },
  bancos: {
    title: "Bancos de dados",
    description: "Diagnóstico, integridade e reparo de bases Firebird, MySQL e Access."
  },
  organizacao: {
    title: "Organização de arquivos",
    description: "Automatize a limpeza e a padronização de pastas e arquivos."
  },
  pacote: {
    title: "Pacote completo",
    description: "Todas as rotinas reunidas em uma única licença."
  }
};

// Ícones ilustrados da família Nexotool (assets/product-icons-v1), em public/product-icons.
export const productIconImages = {
  "image-analyzer": "/product-icons/image_analyzer.webp",
  "pdf-analyzer": "/product-icons/pdf_analyzer.webp",
  "firebird-analyzer": "/product-icons/firebird_analyzer.webp",
  "mysql-analyzer": "/product-icons/mysql_analyzer.webp",
  "sector-dbfb-repair": "/product-icons/sector_db_repair.webp",
  "dwg-cleaner": "/product-icons/dwg_cleaner.webp",
  "rename-folder": "/product-icons/rename_folder.webp",
  "mdb-integrity": "/product-icons/mdb_integrity.webp",
  "empty-folder-cleaner": "/product-icons/empty_folders.webp",
  "complete-solution": "/product-icons/complete_solution.webp"
};

export const categoryOrder = ["recuperacao", "bancos", "organizacao", "pacote"];

const defaultIncluded = [
  "Licença vitalícia para 1 computador",
  "Atualizações da versão publicada",
  "Ativação online com e-mail e chave",
  "Uso offline por até 30 dias entre validações"
];

export const productPageContent = {
  "image-analyzer": {
    title: "Image Analyzer",
    tagline: "Verifique lotes de imagens e separe o que está íntegro do que está corrompido.",
    description:
      "Depois de uma recuperação de dados, milhares de imagens chegam misturadas, renomeadas e muitas vezes danificadas. O Image Analyzer percorre as pastas, analisa cada arquivo e organiza o resultado para que você entregue ao cliente apenas o que realmente abre.",
    features: [
      ["Análise em lote", "Processa pastas inteiras de imagens sem precisar abrir arquivo por arquivo."],
      ["Separação de resultados", "Identifica arquivos íntegros e problemáticos para facilitar a triagem."],
      ["Fluxo simples", "Selecione a pasta, acompanhe o progresso e revise o relatório no final."]
    ],
    useCases: ["Triagem após recuperação de cartões e HDs", "Conferência de acervos fotográficos", "Limpeza de backups de imagens"]
  },
  "pdf-analyzer": {
    title: "PDF Analyzer",
    tagline: "Confira a integridade de documentos PDF em grandes volumes.",
    description:
      "Documentos recuperados ou migrados nem sempre abrem como deveriam. O PDF Analyzer verifica lotes de PDFs e aponta quais estão íntegros, ajudando a priorizar o trabalho de recuperação e a organizar a entrega.",
    features: [
      ["Verificação em lote", "Analisa pastas com centenas ou milhares de documentos de uma vez."],
      ["Execução local", "Os arquivos ficam no seu computador; nada é enviado para a internet."],
      ["Relatório objetivo", "Resultado claro para decidir o que precisa de nova tentativa de recuperação."]
    ],
    useCases: ["Recuperação de documentos de escritório", "Auditoria de arquivos digitalizados", "Migração de acervos"]
  },
  "firebird-analyzer": {
    title: "Firebird Analyzer",
    tagline: "Diagnóstico dedicado para bancos de dados Firebird.",
    description:
      "Ferramenta para técnicos que precisam investigar bases Firebird com rapidez. Reúne as verificações mais usadas no suporte em uma interface direta, ajudando a entender o estado da base antes de qualquer intervenção.",
    features: [
      ["Diagnóstico Firebird", "Verificações pensadas para investigar bases e apoiar rotinas técnicas."],
      ["Apoio ao suporte", "Informações organizadas para decidir o próximo passo com segurança."],
      ["Operação local", "Roda no Windows do técnico, sem expor a base a serviços externos."]
    ],
    useCases: ["Suporte a sistemas de gestão com Firebird", "Avaliação de bases após queda de energia", "Pré-análise antes de reparo"]
  },
  "mysql-analyzer": {
    title: "MySQL Analyzer",
    tagline: "Apoio técnico organizado para ambientes MySQL.",
    description:
      "Concentra verificações importantes para bancos MySQL em um fluxo guiado. Ideal para quem presta suporte e precisa de um diagnóstico rápido e repetível em diferentes clientes.",
    features: [
      ["Análise direcionada", "Organiza as verificações essenciais para bancos MySQL."],
      ["Repetível", "O mesmo roteiro de diagnóstico para todos os atendimentos."],
      ["Leve", "Instalação simples no Windows, sem dependências complicadas."]
    ],
    useCases: ["Suporte técnico a clientes com MySQL", "Diagnóstico após falhas de servidor", "Checagem preventiva"]
  },
  "sector-dbfb-repair": {
    title: "Sector DBFB Repair",
    tagline: "Reparo especializado para bases DBFB danificadas.",
    description:
      "Para os casos em que a base já apresenta danos, o Sector DBFB Repair oferece rotinas técnicas de correção focadas em cenários específicos de bases DBFB, ajudando a recuperar o máximo de informação possível.",
    features: [
      ["Foco em reparo", "Rotinas dedicadas à correção de bases DBFB danificadas."],
      ["Trabalho seguro", "Pensado para operar sobre cópias, preservando o arquivo original."],
      ["Para profissionais", "Ferramenta de uso técnico em recuperação de dados."]
    ],
    useCases: ["Recuperação de bases corrompidas", "Atendimento a clientes sem backup", "Laboratórios de recuperação de dados"]
  },
  "dwg-cleaner": {
    title: "DWG Cleaner",
    tagline: "Limpeza e padronização de arquivos DWG.",
    description:
      "Escritórios de engenharia e arquitetura acumulam versões e arquivos temporários de projetos. O DWG Cleaner ajuda a padronizar rotinas de limpeza de arquivos DWG, liberando espaço e deixando as pastas de projeto organizadas.",
    features: [
      ["Limpeza de arquivos", "Ajuda a padronizar rotinas de limpeza com arquivos DWG."],
      ["Menos espaço ocupado", "Remove o excesso que se acumula nas pastas de projeto."],
      ["Instalação simples", "Baixe, ative com sua chave e comece a usar."]
    ],
    useCases: ["Escritórios de arquitetura e engenharia", "Servidores de arquivos de projeto", "Organização antes de backup"]
  },
  "rename-folder": {
    title: "Rename Folder",
    tagline: "Renomeie pastas em lote seguindo um padrão.",
    description:
      "Padronizar nomes de pastas manualmente é lento e sujeito a erros. O Rename Folder automatiza a renomeação seguindo regras definidas por você, deixando a estrutura de diretórios consistente em poucos minutos.",
    features: [
      ["Renomeação guiada", "Defina o padrão e aplique em muitas pastas de uma vez."],
      ["Menos trabalho manual", "Elimina tarefas repetitivas de organização."],
      ["Previsível", "Revise o resultado antes de confirmar as alterações."]
    ],
    useCases: ["Organização de arquivos de clientes", "Padronização após recuperação de dados", "Preparação de acervos para migração"]
  },
  "mdb-integrity": {
    title: "MDB Integrity",
    tagline: "Verifique a integridade de bancos Access (MDB).",
    description:
      "Arquivos MDB ainda sustentam muitos sistemas legados. O MDB Integrity auxilia na verificação e no diagnóstico dessas bases, apoiando a manutenção e a recuperação de informações.",
    features: [
      ["Conferência MDB", "Auxilia a validação e o suporte de arquivos Access/MDB."],
      ["Diagnóstico técnico", "Fluxo pensado para manutenção e suporte."],
      ["Execução local", "Os dados não saem do seu computador."]
    ],
    useCases: ["Sistemas legados em Access", "Suporte a pequenas empresas", "Verificação antes de migração"]
  },
  "empty-folder-cleaner": {
    title: "Empty Folder Cleaner",
    tagline: "Encontre e remova pastas vazias com segurança.",
    description:
      "Estruturas de pastas vazias poluem servidores e backups. O Empty Folder Cleaner localiza essas pastas, mostra o que encontrou e remove apenas o que você confirmar.",
    features: [
      ["Varredura rápida", "Localiza estruturas vazias em discos e servidores Windows."],
      ["Revisão antes de apagar", "Você confere a lista antes de qualquer remoção."],
      ["Uso simples", "Selecione, revise e limpe em poucos cliques."]
    ],
    useCases: ["Limpeza após recuperação de dados", "Manutenção de servidores de arquivos", "Organização de backups"]
  },
  "complete-solution": {
    title: "Solução Completa",
    tagline: "O conjunto de rotinas de limpeza e organização reunido em uma única ferramenta.",
    description:
      "Para quem precisa de várias rotinas no dia a dia, a Solução Completa reúne as ferramentas de organização e limpeza em um único aplicativo, com uma licença e um só lugar para gerenciar.",
    features: [
      ["Tudo em um", "Várias rotinas de organização e limpeza em um único aplicativo."],
      ["Gestão centralizada", "Uma licença para acompanhar no painel da sua conta."],
      ["Melhor custo", "Mais econômica do que licenciar rotinas separadamente."]
    ],
    useCases: ["Técnicos de suporte e TI", "Escritórios com grande volume de arquivos", "Prestadores de serviço de recuperação"]
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
    installerName: product.releaseAsset.replace(/\.exe$/i, "-Setup.exe")
  };
}

export function getAllProductPages() {
  return products.map((product) => getProductPage(product.id)).filter(Boolean);
}

export function getProductPagesByCategory() {
  const all = getAllProductPages();
  return categoryOrder.map((key) => ({
    key,
    ...categories[key],
    products: all.filter((product) => product.category === key)
  }));
}
