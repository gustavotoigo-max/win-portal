import PageShell from "@/components/site/PageShell";
import ProductCard from "@/components/site/ProductCard";
import { getProductPagesByCategory } from "@/lib/product-pages";

export const metadata = {
  title: "Produtos",
  description: "Conheça todas as ferramentas WinPortal para recuperação de dados, bancos de dados e organização de arquivos."
};

export default function CatalogPage() {
  const groups = getProductPagesByCategory();

  return (
    <PageShell>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Produtos</span>
          <h1>Todas as ferramentas</h1>
          <p className="lead-dark">Licenças vitalícias para Windows, com ativação online e gerenciamento pela sua conta.</p>
          <nav className="category-tabs" aria-label="Categorias">
            {groups.map((group) => (
              <a href={`#${group.key}`} key={group.key}>{group.title}</a>
            ))}
          </nav>
        </div>
      </section>
      <section className="section section-tight">
        <div className="container">
          {groups.map((group) => (
            <div className="category-block" id={group.key} key={group.key}>
              <div className="category-head">
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <div className="product-grid">
                {group.products.map((product) => (
                  <ProductCard key={product.id} product={product} featured={group.key === "pacote"} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
