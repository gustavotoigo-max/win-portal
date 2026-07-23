import Link from "next/link";
import Header from "@/components/Header";
import { getDictionary, normalizeLocale } from "@/lib/i18n";

export default async function HomePage({ params }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const t = getDictionary(locale);

  return (
    <>
      <Header locale={locale} active="home" />
      <main>
        <section className="hero section-band">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">{t.home.eyebrow}</p>
              <h1>{t.home.title}</h1>
              <p className="hero-text">{t.home.text}</p>
              <div className="button-row">
                <Link className="btn primary" href={`/${locale}/cadastro`}>{t.common.createAccount}</Link>
                <Link className="btn secondary" href={`/${locale}/login`}>{t.common.login}</Link>
              </div>
            </div>
            <div className="software-preview" aria-label="Tela de exemplo do software">
              <div className="preview-topbar"><span /><span /><span /></div>
              <div className="preview-layout">
                <aside>
                  <strong>WinPortal</strong>
                  <small>{t.nav.dashboard}</small>
                  <small>{t.dashboard.order}</small>
                  <small>{t.dashboard.license}</small>
                </aside>
                <div className="preview-main">
                  <div className="preview-kpis">
                    <article><span>{t.dashboard.active}</span><strong>1.284</strong></article>
                    <article><span>{t.dashboard.blocked}</span><strong>18</strong></article>
                    <article><span>{t.dashboard.total}</span><strong>R$ 92k</strong></article>
                  </div>
                  <div className="preview-chart">
                    <span style={{ height: "42%" }} /><span style={{ height: "66%" }} />
                    <span style={{ height: "51%" }} /><span style={{ height: "78%" }} />
                    <span style={{ height: "59%" }} /><span style={{ height: "88%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container welcome-card">
          <div>
            <p className="eyebrow">WinPortal</p>
            <h2>{t.home.welcomeTitle}</h2>
            <p>{t.home.welcomeText}</p>
          </div>
          <div className="button-row compact">
            <Link className="btn primary" href={`/${locale}/cadastro`}>{t.common.signup}</Link>
            <Link className="btn secondary" href={`/${locale}/login`}>{t.common.login}</Link>
          </div>
        </section>

        <section className="container section-block">
          <div className="section-heading">
            <p className="eyebrow">{t.nav.dashboard}</p>
            <h2>{t.home.resourcesTitle}</h2>
          </div>
          <div className="card-grid three">
            {t.home.resources.map(([title, text], index) => (
              <article className="feature-card" key={title}>
                <span className="card-icon">{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container section-block split-block">
          <div>
            <p className="eyebrow">{t.home.faqTitle}</p>
            <h2>{t.home.howTitle}</h2>
            <p>{t.home.howText}</p>
          </div>
          <article className="how-card">
            <h3>{t.home.howTitle}</h3>
            <p>{t.home.howText}</p>
            <Link href={`/${locale}/cadastro`}>{t.common.createAccount}</Link>
          </article>
        </section>

        <section className="container cta-card">
          <p className="eyebrow">{t.common.ready}</p>
          <h2>{t.home.finalTitle}</h2>
          <div className="button-row compact center">
            <Link className="btn primary" href={`/${locale}/cadastro`}>{t.common.signup}</Link>
            <Link className="btn secondary" href={`/${locale}/login`}>{t.common.login}</Link>
          </div>
        </section>

        <section className="container section-block">
          <div className="section-heading">
            <p className="eyebrow">WinPortal</p>
            <h2>{t.home.advantagesTitle}</h2>
          </div>
          <div className="vertical-list">
            {t.home.advantages.map(([title, text]) => (
              <article key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="container section-block">
          <div className="section-heading">
            <p className="eyebrow">{t.home.testimonialsTitle}</p>
            <h2>{t.home.testimonialsTitle}</h2>
          </div>
          <div className="card-grid three">
            {t.home.testimonials.map(([text, author]) => (
              <article className="testimonial-card" key={author}>
                <p>{`"${text}"`}</p>
                <strong>{author}</strong>
                <span>WinPortal</span>
              </article>
            ))}
          </div>
        </section>

        <section className="container section-block">
          <div className="section-heading">
            <p className="eyebrow">{t.home.faqTitle}</p>
            <h2>{t.home.faqTitle}</h2>
          </div>
          <div className="faq-list">
            {t.home.faq.map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="container final-card">
          <p className="eyebrow">{t.common.ready}</p>
          <h2>{t.home.finalTitle}</h2>
          <div className="button-row compact center">
            <Link className="btn primary" href={`/${locale}/cadastro`}>{t.common.signup}</Link>
            <Link className="btn secondary" href={`/${locale}/login`}>{t.common.login}</Link>
          </div>
        </section>
      </main>
    </>
  );
}
