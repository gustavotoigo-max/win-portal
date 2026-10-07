import Link from "next/link";
import Icon from "@/components/site/Icon";
import ProductIcon from "@/components/site/ProductIcon";

export default function ProductCard({ product, featured = false }) {
  return (
    <article className={`product-card${featured ? " featured" : ""}`}>
      <Link className="product-card-link" href={`/pt/solucoes/${product.id}`} aria-label={`${product.title}, ${product.priceLabel}`} />
      <div className="product-card-top">
        <ProductIcon product={product} />
        <span className="chip">{product.categoryTitle}</span>
      </div>
      <h3>{product.title}</h3>
      <p>{product.tagline}</p>
      <div className="product-card-bottom">
        <span className="price">
          <small>Licença vitalícia</small>
          {product.priceLabel}
        </span>
        <span className="card-cta">Ver detalhes <Icon name="arrow" size={16} /></span>
      </div>
    </article>
  );
}
