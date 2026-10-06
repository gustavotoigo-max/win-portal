import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CheckoutForm from "@/components/shop/CheckoutForm";
import Icon from "@/components/site/Icon";
import PageShell from "@/components/site/PageShell";
import { getProductPage } from "@/lib/product-pages";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Finalizar compra",
  robots: { index: false }
};

export default async function CheckoutPage({ params }) {
  const { productId } = await params;
  const product = getProductPage(productId);
  if (!product) notFound();

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/pt/login?next=${encodeURIComponent(`/pt/comprar/${product.id}`)}`);
  }

  return (
    <PageShell className="checkout-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Você está em">
          <Link href={`/pt/solucoes/${product.id}`}>{product.title}</Link>
          <span>/</span>
          <span>Finalizar compra</span>
        </nav>
        <h1 className="page-title">Finalizar compra</h1>

        <div className="checkout-grid">
          <CheckoutForm
            product={{
              id: product.id,
              title: product.title,
              price: product.price,
              icon: product.icon,
              category: product.category
            }}
            email={user.email}
          />

          <aside className="order-summary-static">
            <div className="summary-product">
              <span className={`product-icon tone-${product.category}`}><Icon name={product.icon} /></span>
              <div>
                <strong>{product.title}</strong>
                <small>{product.categoryTitle}</small>
              </div>
            </div>
            <ul className="included">
              {product.included.map((item) => (
                <li key={item}><Icon name="check" size={16} /> {item}</li>
              ))}
            </ul>
            <p className="muted small">
              A licença fica vinculada ao e-mail <strong>{user.email}</strong>. Use esse mesmo e-mail para ativar o
              aplicativo.
            </p>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
