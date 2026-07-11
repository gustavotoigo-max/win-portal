import Header from "@/components/Header";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { getAllProductPages, getProductPage } from "@/lib/product-pages";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getAllProductPages().flatMap((product) => [
    { locale: "pt", productId: product.id },
    { locale: "en", productId: product.id }
  ]);
}

export async function generateMetadata({ params }) {
  const { productId } = await params;
  const product = getProductPage(productId);
  if (!product) return {};

  return {
    title: `${product.title} | WinPortal`,
    description: product.subtitle
  };
}

export default async function ProductPage({ params }) {
  const { locale: rawLocale, productId } = await params;
  const locale = normalizeLocale(rawLocale);
  const t = getDictionary(locale);
  const product = getProductPage(productId);

  if (!product) notFound();

  return (
    <>
      <Header locale={locale} active="solutions" />
      <main className="product-page">
        <section className="product-hero container">
          <div>
            <p className="eyebrow">{t.nav.solutions}</p>
            <h1>{product.title}</h1>
            <p className="hero-text">{product.subtitle}</p>
            <div className="button-row">
              <Link className="btn primary" href={product.downloadUrl}>
                {t.product.download}
              </Link>
              <Link className="btn secondary" href={`/${locale}/cadastro`}>
                {t.common.createAccount}
              </Link>
            </div>
          </div>

          <div className="product-slider" aria-label={t.product.sliderLabel}>
            <div className="slider-empty">
              <span>{t.product.imagePlaceholder}</span>
            </div>
            <div className="slider-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        <section className="section-block container">
          <div className="section-heading">
            <p className="eyebrow">{t.product.highlights}</p>
            <h2>{t.product.productInfo}</h2>
          </div>
          <div className="card-grid three">
            {product.cards.map(([title, text]) => (
              <article className="feature-card" key={title}>
                <div className="card-icon">{title.slice(0, 1)}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
