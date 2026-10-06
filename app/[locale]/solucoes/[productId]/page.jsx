import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/site/Icon";
import ProductIcon from "@/components/site/ProductIcon";
import PageShell from "@/components/site/PageShell";
import ProductCard from "@/components/site/ProductCard";
import { getLatestProductRelease } from "@/lib/github-releases";
import { getAllProductPages, getProductPage } from "@/lib/product-pages";

export const revalidate = 300;

export function generateStaticParams() {
  return getAllProductPages().map((product) => ({ productId: product.id }));
}

export async function generateMetadata({ params }) {
  const { productId } = await params;
  const product = getProductPage(productId);
  if (!product) return {};

  return {
    title: product.title,
    description: product.tagline
  };
}

function formatSize(bytes) {
  if (!bytes) return null;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export default async function ProductPage({ params }) {
  const { productId } = await params;
  const product = getProductPage(productId);
  if (!product) notFound();

  const release = await getLatestProductRelease(product);
  const publishedAt = release?.publishedAt
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(release.publishedAt))
    : null;
  const related = getAllProductPages()
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 3);

  return (
    <PageShell>
      <section className="page-hero product-hero">
        <div className="container product-hero-grid">
          <div>
            <nav className="breadcrumb" aria-label="Você está em">
              <Link href="/pt/solucoes">Produtos</Link>
              <span>/</span>
              <span>{product.categoryTitle}</span>
            </nav>
            <div className="product-title">
              <ProductIcon product={product} size={88} priority />
              <div>
                <h1>{product.title}</h1>
                <p className="lead-dark">{product.tagline}</p>
              </div>
            </div>
            <p className="product-description">{product.description}</p>

            <div className="release-line">
              {release ? (
                <>
                  <span className="dot dot-ok" />
                  <span>Versão {release.version}{publishedAt ? `, publicada em ${publishedAt}` : ""}</span>
                </>
              ) : (
                <>
                  <span className="dot" />
                  <span>Instalador em preparação</span>
                </>
              )}
            </div>
          </div>

          <aside className="buy-box">
            <span className="buy-label">Licença vitalícia</span>
            <strong className="buy-price">{product.priceLabel}</strong>
            <span className="buy-sub">Pagamento único, 1 computador</span>
            <Link className="btn btn-primary btn-lg btn-block" href={`/pt/comprar/${product.id}`}>
              <Icon name="cart" size={18} /> Comprar licença
            </Link>
            <a
              className="btn btn-ghost btn-block"
              download={product.releaseAsset}
              href={product.downloadUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon name="download" size={18} /> Baixar instalador
              {release?.size ? <small className="muted-inline">{formatSize(release.size)}</small> : null}
            </a>
            <ul className="included">
              {product.included.map((item) => (
                <li key={item}><Icon name="check" size={16} /> {item}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Recursos</span>
            <h2>O que o {product.title} faz por você</h2>
          </div>
          <div className="feature-grid">
            {product.features.map(([title, text], index) => (
              <article className="feature" key={title}>
                <span className="feature-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-muted">
        <div className="container split split-even">
          <div>
            <span className="eyebrow">Indicado para</span>
            <h2>Onde ele faz diferença</h2>
            <ul className="check-list">
              {product.useCases.map((item) => (
                <li key={item}><Icon name="check" size={18} /> {item}</li>
              ))}
            </ul>
          </div>
          <div className="activation-card">
            <span className="eyebrow">Ativação</span>
            <h3>Como ativar depois da compra</h3>
            <ol className="mini-steps">
              <li>Baixe e instale o <strong>{product.releaseAsset}</strong>.</li>
              <li>Abra o aplicativo e vá até a tela de ativação.</li>
              <li>Informe o e-mail da sua conta e a chave exibida em <Link href="/pt/dashboard">Minha conta</Link>.</li>
            </ol>
            <p className="muted small">Aplicativo para Windows. A ativação exige conexão com a internet.</p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Veja também</span>
              <h2>Outras ferramentas de {product.categoryTitle.toLowerCase()}</h2>
            </div>
            <div className="product-grid">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
}
