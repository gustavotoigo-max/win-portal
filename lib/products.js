// id, name, orderPrefix, releaseAsset e aliases fazem parte do contrato de
// ativacao com os aplicativos (ver docs/CONTRATO-ATIVACAO.md). Nao renomeie.
// price (em reais), category e icon sao usados apenas pela vitrine e pela loja.
export const products = [
  { id: "image-analyzer", name: "Image Analyzer", orderPrefix: "IMAGEANALYZER", releaseAsset: "ImageAnalyzer.exe", aliases: ["ImageAnalyzer", "Image Analyzer"], price: 390, category: "recuperacao", icon: "image" },
  { id: "pdf-analyzer", name: "PDF Analyzer", orderPrefix: "PDFANALYZER", releaseAsset: "PDFAnalyzer.exe", aliases: ["PDFAnalyzer", "PDF Analyzer"], price: 350, category: "recuperacao", icon: "pdf" },
  { id: "firebird-analyzer", name: "Firebird Analyzer", orderPrefix: "FIREBIRDANALYZER", releaseAsset: "FirebirdAnalyzer.exe", aliases: ["FirebirdAnalyzer", "Firebird Analyzer"], price: 690, category: "bancos", icon: "database" },
  { id: "mysql-analyzer", name: "MySQL Analyzer", orderPrefix: "MYSQLANALYZER", releaseAsset: "MySQLAnalyzer.exe", aliases: ["MySQLAnalyzer", "MySQL Analyzer"], price: 650, category: "bancos", icon: "database" },
  { id: "sector-dbfb-repair", name: "Sector DBFB Repair", orderPrefix: "SECTORDBFBREPAIR", releaseAsset: "SectorDBRepair.exe", aliases: ["SectorDBFBRepair", "Sector DBFB Repair"], price: 890, category: "bancos", icon: "repair" },
  { id: "dwg-cleaner", name: "DWG Cleaner", orderPrefix: "DWGCLEANER", releaseAsset: "DWGCleaner.exe", aliases: ["DWGCleaner", "DWG Cleaner"], price: 420, category: "organizacao", icon: "drawing" },
  { id: "rename-folder", name: "Rename Folder", orderPrefix: "RENAMEFOLDER", releaseAsset: "RenameFolder.exe", aliases: ["RenameFolder", "Rename Folder"], price: 320, category: "organizacao", icon: "rename" },
  { id: "mdb-integrity", name: "MDB Integrity", orderPrefix: "MDBINTEGRITY", releaseAsset: "MDBIntegrity.exe", aliases: ["MDBIntegrity", "MDB Integrity"], price: 540, category: "bancos", icon: "shield" },
  { id: "empty-folder-cleaner", name: "Empty Folder Cleaner", orderPrefix: "EMPTYFOLDERCLEANER", releaseAsset: "EmptyFolders.exe", aliases: ["EmptyFolderCleaner", "Empty Folder Cleaner"], price: 310, category: "organizacao", icon: "folder" },
  { id: "complete-solution", name: "Solucao Completa", orderPrefix: "SOLUCAOCOMPLETA", releaseAsset: "OfficeCleaner.exe", aliases: ["SolucaoCompleta", "Solucao Completa", "CompleteSolution"], price: 990, category: "pacote", icon: "bundle" }
];

export function getProductById(productId) {
  return products.find((product) => product.id === productId) || products[0];
}

export function getProductOrNull(productId) {
  return products.find((product) => product.id === productId) || null;
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
