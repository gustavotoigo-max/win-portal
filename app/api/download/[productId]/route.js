import { getProductOrNull } from "@/lib/products";
import { getLatestProductRelease, getReleasesRepositoryUrl } from "@/lib/github-releases";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function envKeyForProduct(product) {
  return `DOWNLOAD_URL_${product.orderPrefix}`;
}

function pathEnvKeyForProduct(product) {
  return `DOWNLOAD_PATH_${product.orderPrefix}`;
}

async function getSupabaseStorageUrl(product) {
  const bucket = process.env.SUPABASE_INSTALLERS_BUCKET;
  if (!bucket || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const filePath = process.env[pathEnvKeyForProduct(product)] || product.releaseAsset || `${product.id}.exe`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(filePath, 300, {
      download: product.releaseAsset || `${product.id}.exe`
    });

  if (error) {
    console.error(`Nao foi possivel criar URL assinada para ${filePath}:`, error.message);
    return null;
  }

  return data?.signedUrl || null;
}

export async function GET(_request, { params }) {
  const { productId } = await params;
  const product = getProductOrNull(productId);

  if (!product) {
    return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
  }

  const storageUrl = await getSupabaseStorageUrl(product);
  if (storageUrl) {
    return NextResponse.redirect(storageUrl);
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
