import "server-only";

const DEFAULT_REPOSITORY = "gustavotoigo-max/win-portal";
const DEFAULT_CACHE_SECONDS = 300;
const MAX_RELEASE_PAGES = 3;

function repositoryName() {
  return process.env.GITHUB_RELEASES_REPOSITORY || DEFAULT_REPOSITORY;
}

function cacheSeconds() {
  const configured = Number(process.env.GITHUB_RELEASES_CACHE_SECONDS);
  return Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_CACHE_SECONDS;
}

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "win-portal",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (process.env.GITHUB_RELEASES_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_RELEASES_TOKEN}`;
  }

  return headers;
}

function versionFromTag(tagName, productId) {
  const prefix = `${productId}-v`;
  return tagName.startsWith(prefix) ? tagName.slice(prefix.length) : tagName;
}

/** Nome do instalador no release: "ImageAnalyzer.exe" vira "ImageAnalyzer-Setup.exe". */
export function installerAssetName(product) {
  return String(product?.releaseAsset || "").replace(/\.exe$/i, "-Setup.exe");
}

function findProductRelease(releases, product) {
  const tagPrefix = `${product.id}-v`;

  for (const release of releases) {
    if (release.draft || release.prerelease || !release.tag_name?.startsWith(tagPrefix)) {
      continue;
    }

    // O site entrega o instalador; releases antigas só tinham o executável avulso.
    const uploaded = (name) =>
      release.assets?.find((candidate) => candidate.name === name && candidate.state === "uploaded");
    const asset = uploaded(installerAssetName(product)) || uploaded(product.releaseAsset);
    if (!asset?.browser_download_url) continue;

    return {
      tag: release.tag_name,
      version: versionFromTag(release.tag_name, product.id),
      name: release.name || release.tag_name,
      publishedAt: release.published_at || release.created_at,
      releaseUrl: release.html_url,
      downloadUrl: asset.browser_download_url,
      assetName: asset.name,
      size: asset.size || 0,
      downloadCount: asset.download_count || 0,
      digest: asset.digest || null
    };
  }

  return null;
}

function compareVersions(a, b) {
  const pa = String(a).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const pb = String(b).split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Release de maior versão cuja tag começa com o prefixo e que tem todos os
 * arquivos pedidos. Usado pela atualização automática dos aplicativos.
 */
export async function findLatestRelease(tagPrefix, requiredAssets) {
  const repository = repositoryName();
  const revalidate = cacheSeconds();
  let best = null;

  for (let page = 1; page <= MAX_RELEASE_PAGES; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`,
      { headers: githubHeaders(), next: { revalidate } }
    );
    if (!response.ok) {
      throw new Error(`GitHub Releases respondeu ${response.status} para ${repository}.`);
    }

    const releases = await response.json();
    for (const release of releases) {
      if (release.draft || release.prerelease || !release.tag_name?.startsWith(tagPrefix)) continue;
      const version = release.tag_name.slice(tagPrefix.length);
      if (!/^\d+(\.\d+){1,3}$/.test(version)) continue;

      const assets = {};
      for (const name of requiredAssets) {
        const asset = release.assets?.find((candidate) => candidate.name === name && candidate.state === "uploaded");
        if (asset) assets[name] = asset;
      }
      if (Object.keys(assets).length !== requiredAssets.length) continue;

      if (!best || compareVersions(version, best.version) > 0) {
        best = {
          tag: release.tag_name,
          version,
          publishedAt: release.published_at || release.created_at,
          releaseUrl: release.html_url,
          assets
        };
      }
    }
    if (releases.length < 100) break;
  }

  return best;
}

export function getReleasesRepositoryUrl() {
  return `https://github.com/${repositoryName()}/releases`;
}

export async function getLatestProductRelease(product) {
  if (!product?.id || !product?.releaseAsset) return null;

  const repository = repositoryName();
  const revalidate = cacheSeconds();

  try {
    for (let page = 1; page <= MAX_RELEASE_PAGES; page += 1) {
      const response = await fetch(
        `https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`,
        {
          headers: githubHeaders(),
          next: { revalidate }
        }
      );

      if (!response.ok) {
        console.error(`GitHub Releases respondeu ${response.status} para ${repository}.`);
        return null;
      }

      const releases = await response.json();
      const match = findProductRelease(releases, product);
      if (match) return match;
      if (releases.length < 100) return null;
    }
  } catch (error) {
    console.error("Nao foi possivel consultar o GitHub Releases.", error);
  }

  return null;
}
