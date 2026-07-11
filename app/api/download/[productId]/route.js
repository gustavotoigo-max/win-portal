import { getProductOrNull } from "@/lib/products";
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

  const directUrl = process.env[envKeyForProduct(product)];
  const baseUrl = process.env.DOWNLOAD_BASE_URL;
  const fallbackUrl = process.env.DOWNLOAD_FALLBACK_URL || "https://github.com/gustavotoigo-max/win-portal/releases";
  const targetUrl = directUrl || (baseUrl ? `${baseUrl.replace(/\/$/, "")}/${product.id}.exe` : fallbackUrl);

  return NextResponse.redirect(targetUrl);
}
