export const products = [
  { id: "image-analyzer", name: "Image Analyzer", orderPrefix: "IMAGEANALYZER", releaseAsset: "ImageAnalyzer.exe", aliases: ["ImageAnalyzer", "Image Analyzer"] },
  { id: "pdf-analyzer", name: "PDF Analyzer", orderPrefix: "PDFANALYZER", releaseAsset: "PDFAnalyzer.exe", aliases: ["PDFAnalyzer", "PDF Analyzer"] },
  { id: "firebird-analyzer", name: "Firebird Analyzer", orderPrefix: "FIREBIRDANALYZER", releaseAsset: "FirebirdAnalyzer.exe", aliases: ["FirebirdAnalyzer", "Firebird Analyzer"] },
  { id: "mysql-analyzer", name: "MySQL Analyzer", orderPrefix: "MYSQLANALYZER", releaseAsset: "MySQLAnalyzer.exe", aliases: ["MySQLAnalyzer", "MySQL Analyzer"] },
  { id: "sector-dbfb-repair", name: "Sector DBFB Repair", orderPrefix: "SECTORDBFBREPAIR", releaseAsset: "SectorDBRepair.exe", aliases: ["SectorDBFBRepair", "Sector DBFB Repair"] },
  { id: "dwg-cleaner", name: "DWG Cleaner", orderPrefix: "DWGCLEANER", releaseAsset: "DWGCleaner.exe", aliases: ["DWGCleaner", "DWG Cleaner"] },
  { id: "rename-folder", name: "Rename Folder", orderPrefix: "RENAMEFOLDER", releaseAsset: "RenameFolder.exe", aliases: ["RenameFolder", "Rename Folder"] },
  { id: "mdb-integrity", name: "MDB Integrity", orderPrefix: "MDBINTEGRITY", releaseAsset: "MDBIntegrity.exe", aliases: ["MDBIntegrity", "MDB Integrity"] },
  { id: "empty-folder-cleaner", name: "Empty Folder Cleaner", orderPrefix: "EMPTYFOLDERCLEANER", releaseAsset: "EmptyFolders.exe", aliases: ["EmptyFolderCleaner", "Empty Folder Cleaner"] },
  { id: "complete-solution", name: "Solucao Completa", orderPrefix: "SOLUCAOCOMPLETA", releaseAsset: "OfficeCleaner.exe", aliases: ["SolucaoCompleta", "Solucao Completa", "CompleteSolution"] }
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
