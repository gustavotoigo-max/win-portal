import Link from "next/link";
import { getDictionary, locales } from "@/lib/i18n";
import { getAllProductPages } from "@/lib/product-pages";
import { getAuthSession } from "@/lib/auth/server";

async function getLoggedInUser() {
  try {
    const session = await getAuthSession();
    return session?.user || null;
  } catch {
    return null;
  }
}

export default async function Header({ locale, active = "home" }) {
  const t = getDictionary(locale);
  const user = await getLoggedInUser();
  const products = getAllProductPages();

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Navegacao principal">
        <Link className="brand" href={`/${locale}`}>
          <span className="brand-mark" aria-hidden="true" />
          <span>WinPortal</span>
        </Link>
        <div className="nav-actions">
          <Link className={`nav-link ${active === "home" ? "active" : ""}`} href={`/${locale}`}>
            {t.nav.home}
          </Link>
          <div className="nav-dropdown">
            <button className={`nav-link nav-dropdown-trigger ${active === "solutions" ? "active" : ""}`} type="button">
              {t.nav.solutions}
            </button>
            <div className="nav-dropdown-menu">
              {products.map((product) => (
                <Link key={product.id} href={`/${locale}/solucoes/${product.id}`}>
                  {product.title}
                </Link>
              ))}
            </div>
          </div>
          {user && (
            <Link className={`nav-link ${active === "dashboard" ? "active" : ""}`} href={`/${locale}/dashboard`}>
              {t.nav.dashboard}
            </Link>
          )}
          {!user && (
            <Link className={`nav-link ${active === "signup" ? "active" : ""}`} href={`/${locale}/cadastro`}>
              {t.nav.signup}
            </Link>
          )}
          {!user && (
            <Link className="nav-link" href={`/${locale}/login`}>
              {t.nav.login}
            </Link>
          )}
          <div className="locale-switch" aria-label="Idioma">
            {locales.map((item) => (
              <Link
                key={item}
                className={`locale-link ${item === locale ? "active" : ""}`}
                href={`/${item}`}
              >
                {item.toUpperCase()}
              </Link>
            ))}
          </div>
          {user && (
            <details className="profile-menu">
              <summary className="avatar" aria-label={t.nav.profileMenu} title={t.nav.profileMenu}>
                <span>{user.email?.slice(0, 2).toUpperCase() || "WP"}</span>
              </summary>
              <div className="profile-menu-panel">
                <span className="profile-email">{user.email}</span>
                <Link href={`/${locale}/dashboard`}>{t.nav.myLicenses}</Link>
                <form action="/api/auth/logout" method="post">
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit">{t.nav.logout}</button>
                </form>
              </div>
            </details>
          )}
        </div>
      </nav>
    </header>
  );
}
