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

function findProductRelease(releases, product) {
  const tagPrefix = `${product.id}-v`;

  for (const release of releases) {
    if (release.draft || release.prerelease || !release.tag_name?.startsWith(tagPrefix)) {
      continue;
    }

    const asset = release.assets?.find(
      (candidate) => candidate.name === product.releaseAsset && candidate.state === "uploaded"
    );
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
