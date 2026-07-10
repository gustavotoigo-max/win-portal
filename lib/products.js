export const products = [
  { id: "image-analyzer", name: "Image Analyzer", orderPrefix: "IMAGEANALYZER" },
  { id: "pdf-analyzer", name: "PDF Analyzer", orderPrefix: "PDFANALYZER" },
  { id: "firebird-analyzer", name: "Firebird Analyzer", orderPrefix: "FIREBIRDANALYZER" },
  { id: "mysql-analyzer", name: "MySQL Analyzer", orderPrefix: "MYSQLANALYZER" },
  { id: "sector-dbfb-repair", name: "Sector DBFB Repair", orderPrefix: "SECTORDBFBREPAIR" },
  { id: "dwg-cleaner", name: "DWG Cleaner", orderPrefix: "DWGCLEANER" },
  { id: "rename-folder", name: "Rename Folder", orderPrefix: "RENAMEFOLDER" },
  { id: "mdb-integrity", name: "MDB Integrity", orderPrefix: "MDBINTEGRITY" },
  { id: "empty-folder-cleaner", name: "Empty Folder Cleaner", orderPrefix: "EMPTYFOLDERCLEANER" },
  { id: "complete-solution", name: "Solucao Completa", orderPrefix: "SOLUCAOCOMPLETA" }
];

export function getProductById(productId) {
  return products.find((product) => product.id === productId) || products[0];
}
