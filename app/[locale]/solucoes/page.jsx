import { redirect } from "next/navigation";

// Catálogo antigo: hoje o site tem um produto só.
export default function CatalogPage() {
  redirect("/pt/fbrecovery");
}
