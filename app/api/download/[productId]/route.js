import { getProductOrNull } from "@/lib/products";
import { getLatestProductRelease, getReleasesRepositoryUrl } from "@/lib/github-releases";
import { NextResponse } from "next/server";

function envKeyForProduct(product) {
  return `DOWNLOAD_URL_${product.orderPrefix}`;
}

export async function GET(_request, { params }) {
  const { productId } = await params;
  const product = getProductOrNull(productId);

  if (!product) {
    return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
  }

  const release = await getLatestProductRelease(product);
  if (release?.downloadUrl) {
    return NextResponse.redirect(release.downloadUrl);
  }

  const directUrl = process.env[envKeyForProduct(product)];
  const baseUrl = process.env.DOWNLOAD_BASE_URL;
  const fallbackUrl = process.env.DOWNLOAD_FALLBACK_URL || getReleasesRepositoryUrl();
  const targetUrl = directUrl || (baseUrl ? `${baseUrl.replace(/\/$/, "")}/${product.id}.exe` : fallbackUrl);

  return NextResponse.redirect(targetUrl);
}
