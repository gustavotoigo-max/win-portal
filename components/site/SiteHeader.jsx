import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/site/Icon";
import UserMenu from "@/components/site/UserMenu";
import { getProductPagesByCategory } from "@/lib/product-pages";

export function Brand() {
  return (
    <Link className="brand" href="/pt" aria-label="WinPortal, página inicial">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="30" height="30">
          <rect width="32" height="32" rx="8" fill="currentColor" />
          <path d="M8 10.5 11 22l3.5-8 3.5 8 3-11.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="brand-name">WinPortal</span>
    </Link>
  );
}

// Cabecalho estatico: o estado de login e resolvido no cliente (UserMenu),
// assim as paginas publicas podem ser servidas como HTML estatico.
export default function SiteHeader() {
  const groups = getProductPagesByCategory();

  return (
    <header className="site-header">
      <div className="container header-row">
        <Brand />

        <nav className="main-nav" aria-label="Navegação principal">
          <div className="mega">
            <Link className="nav-link mega-trigger" href="/pt/solucoes">
              Produtos
              <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </Link>
            <div className="mega-panel">
              {groups.map((group) => (
                <div className="mega-group" key={group.key}>
                  <p className="mega-title">{group.title}</p>
                  {group.products.map((product) => (
                    <Link className="mega-item" href={`/pt/solucoes/${product.id}`} key={product.id}>
                      <span className="mega-icon"><Image src={product.iconImage} alt="" width={80} height={80} unoptimized /></span>
                      <span>
                        <strong>{product.title}</strong>
                        <small>{product.priceLabel}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <Link className="nav-link" href="/pt#como-funciona">Como funciona</Link>
          <Link className="nav-link" href="/pt#perguntas">Dúvidas</Link>
        </nav>

        <div className="header-actions">
          <UserMenu />
          <details className="mobile-nav">
            <summary aria-label="Abrir menu"><Icon name="menu" /></summary>
            <div className="mobile-nav-panel">
              <Link href="/pt/solucoes">Todos os produtos</Link>
              <Link href="/pt#como-funciona">Como funciona</Link>
              <Link href="/pt#perguntas">Dúvidas</Link>
              <Link href="/pt/dashboard">Minha conta</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
