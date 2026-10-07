import { getProductOrNull } from "@/lib/products";
import { getLatestProductRelease } from "@/lib/github-releases";
import { NextResponse } from "next/server";

function envKeyForProduct(product) {
  return `DOWNLOAD_URL_${product.orderPrefix}`;
}

export async function GET(request, { params }) {
  const { productId } = await params;
  const product = getProductOrNull(productId);

  if (!product) {
    return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
  }

  // O link do arquivo responde com "attachment": o navegador baixa direto, sem abrir o GitHub.
  const release = await getLatestProductRelease(product);
  if (release?.downloadUrl) {
    return NextResponse.redirect(release.downloadUrl);
  }

  const directUrl = process.env[envKeyForProduct(product)];
  const baseUrl = process.env.DOWNLOAD_BASE_URL;
  const targetUrl = directUrl || (baseUrl ? `${baseUrl.replace(/\/$/, "")}/${product.id}.exe` : null);
  if (targetUrl) return NextResponse.redirect(targetUrl);

  // Sem arquivo publicado: volta para a página do produto com um aviso, em vez de abrir o GitHub.
  return NextResponse.redirect(new URL(`/pt/solucoes/${product.id}?download=indisponivel`, request.url));
}
