import Link from "next/link";
import { getDictionary, locales } from "@/lib/i18n";
import { getAllProductPages } from "@/lib/product-pages";
import { createClient } from "@/lib/supabase/server";

async function getLoggedInUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
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
            <form action="/api/auth/logout" method="post">
              <input type="hidden" name="locale" value={locale} />
              <button className="avatar" type="submit" aria-label={t.nav.logout} title={t.nav.logout}>
                <span>{user.email?.slice(0, 2).toUpperCase() || "GP"}</span>
              </button>
            </form>
          )}
        </div>
      </nav>
    </header>
  );
}
