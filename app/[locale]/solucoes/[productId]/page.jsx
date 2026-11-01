import { notFound, redirect } from "next/navigation";
import { getProductOrNull, productPath } from "@/lib/products";

// Endereços antigos /pt/solucoes/<produto>: vão para a página do produto (ou 404 se ele não existe mais).
export default async function OldProductPage({ params }) {
  const { productId } = await params;
  const product = getProductOrNull(productId);
  if (!product) notFound();
  redirect(productPath(product.id));
}
