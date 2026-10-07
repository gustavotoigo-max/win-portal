import "server-only";
import { canonicalJson, signLicensePayload } from "@/lib/license-crypto";
import { findLatestRelease } from "@/lib/github-releases";

// Cada executável procura a própria versão nova. O prefixo da tag segue o id do
// produto no portal (o mesmo usado pelo download do site); o Office Cleaner usa um
// prefixo próprio porque compartilha o produto complete-solution com a Solução Completa.
// Cada release precisa ter os dois arquivos: "<Exe>.exe" e "<Exe>-Setup.exe".
export const updatableApps = [
  { executable: "ImageAnalyzer", tagPrefix: "image-analyzer-v" },
  { executable: "PDFAnalyzer", tagPrefix: "pdf-analyzer-v" },
  { executable: "FirebirdAnalyzer", tagPrefix: "firebird-analyzer-v" },
  { executable: "MySQLAnalyzer", tagPrefix: "mysql-analyzer-v" },
  { executable: "SectorDBRepair", tagPrefix: "sector-dbfb-repair-v" },
  { executable: "DWGCleaner", tagPrefix: "dwg-cleaner-v" },
  { executable: "RenameFolder", tagPrefix: "rename-folder-v" },
  { executable: "MDBIntegrity", tagPrefix: "mdb-integrity-v" },
  { executable: "EmptyFolders", tagPrefix: "empty-folder-cleaner-v" },
  { executable: "SolucaoCompleta", tagPrefix: "complete-solution-v" },
  { executable: "OfficeCleaner", tagPrefix: "office-cleaner-v" }
];

export function getUpdatableApp(executable) {
  const name = String(executable || "").toLowerCase();
  return updatableApps.find((app) => app.executable.toLowerCase() === name) || null;
}

// GitHub informa o SHA-256 de cada arquivo enviado como "sha256:<hex>".
function sha256FromDigest(digest) {
  const match = /^sha256:([0-9a-f]{64})$/i.exec(digest || "");
  return match ? match[1].toLowerCase() : null;
}

function assetInfo(asset) {
  const sha256 = sha256FromDigest(asset?.digest);
  if (!asset?.browser_download_url || !sha256) return null;
  return { name: asset.name, url: asset.browser_download_url, size: asset.size || 0, sha256 };
}

/**
 * Manifesto assinado da versão mais recente. A assinatura usa a mesma chave Ed25519
 * das licenças, sobre o JSON canônico; o campo "kind" impede que um manifesto seja
 * confundido com uma licença.
 */
export async function buildUpdateManifest(app) {
  const executableAsset = `${app.executable}.exe`;
  const setupAsset = `${app.executable}-Setup.exe`;
  const release = await findLatestRelease(app.tagPrefix, [executableAsset, setupAsset]);

  const manifest = {
    kind: "winportal-update-v1",
    executable: app.executable,
    checked_at_utc: new Date().toISOString(),
    latest: null
  };

  if (release) {
    const portable = assetInfo(release.assets[executableAsset]);
    const installer = assetInfo(release.assets[setupAsset]);
    if (portable && installer) {
      manifest.latest = {
        version: release.version,
        published_at_utc: release.publishedAt ? new Date(release.publishedAt).toISOString() : null,
        notes_url: release.releaseUrl,
        portable,
        installer
      };
    }
  }

  const signature = signLicensePayload(manifest);
  return { manifest, signature, canonical: canonicalJson(manifest) };
}
