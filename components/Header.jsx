import Link from "next/link";
import { getDictionary, locales } from "@/lib/i18n";

export default function Header({ locale, active = "home" }) {
  const t = getDictionary(locale);

  const nav = [
    ["home", t.nav.home, `/${locale}`],
    ["dashboard", t.nav.dashboard, `/${locale}/dashboard`],
    ["signup", t.nav.signup, `/${locale}/cadastro`]
  ];

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Navegacao principal">
        <Link className="brand" href={`/${locale}`}>
          <span className="brand-mark" aria-hidden="true" />
          <span>WinPortal</span>
        </Link>
        <div className="nav-actions">
          {nav.map(([key, label, href]) => (
            <Link key={key} className={`nav-link ${active === key ? "active" : ""}`} href={href}>
              {label}
            </Link>
          ))}
          <Link className="nav-link" href={`/${locale}/login`}>
            {t.nav.login}
          </Link>
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
          <form action="/api/auth/logout" method="post">
            <input type="hidden" name="locale" value={locale} />
            <button className="avatar" type="submit" aria-label={t.nav.logout} title={t.nav.logout}>
              <span>GP</span>
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
