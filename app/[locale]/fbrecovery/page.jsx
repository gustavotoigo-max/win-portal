import Link from "next/link";
import DownloadNotice from "@/components/site/DownloadNotice";
import Icon from "@/components/site/Icon";
import ProductIcon from "@/components/site/ProductIcon";
import PageShell from "@/components/site/PageShell";
import { getLatestProductRelease } from "@/lib/github-releases";
import { getProductPage } from "@/lib/product-pages";

export const revalidate = 300;

export const metadata = {
  title: "FbRecovery",
  description: "Análise e recuperação de bancos Firebird corrompidos, com enxerto a partir de backups antigos."
};

const steps = [
  ["Crie sua conta e ative a licença", "Cadastre-se no site e conclua a compra com o seu cupom. A licença aparece em Minha conta."],
  ["Baixe e instale", "O instalador baixa direto desta página. Windows 10 ou 11, 64 bits."],
  ["Entre pelo navegador", "Ao abrir o programa, confirme o acesso no site com a sua conta. Não há chave para digitar."],
  ["Abra o banco e recupere", "Escolha o .fdb (e backups antigos, se tiver). O banco recuperado e os relatórios ficam na pasta que você escolher."]
];

const faq = [
  ["O arquivo original é alterado?", "Nunca. O programa só lê o arquivo; o banco recuperado é sempre um arquivo novo."],
  ["Meus arquivos ficam guardados em algum lugar?", "Não. O banco é usado apenas durante a análise e a recuperação e é apagado assim que o resultado é baixado."],
  ["Preciso de internet?", "Sim. O programa confere a licença e faz a análise e a recuperação com a conexão ativa."],
  ["Quais versões do Firebird?", "Bancos criados no Firebird 1.x, 2.0, 2.1, 2.5, 3, 4 e 5 (ODS 10 a 13.1)."],
  ["E se eu não tiver backup?", "A recuperação funciona sem backup: repara a estrutura, extrai o que for legível e gera um banco novo. Com um backup antigo, mais dados voltam."],
  ["Posso usar em outro computador?", "Cada licença vale para 1 computador por vez. Em Minha conta você libera o computador antigo para usar em outro."]
];

function formatSize(bytes) {
  if (!bytes) return null;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export default async function FbRecoveryPage() {
  const product = getProductPage("fbrecovery");
  const release = await getLatestProductRelease(product);
  const publishedAt = release?.publishedAt
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(release.publishedAt))
    : null;

  return (
    <PageShell>
      <section className="page-hero product-hero">
        <div className="container product-hero-grid">
          <div>
            <span className="eyebrow">Bancos Firebird</span>
            <div className="product-title">
              <ProductIcon product={product} size="lg" />
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
            <span className="buy-label">Licença</span>
            <strong className="buy-price">{product.priceLabel}</strong>
            <span className="buy-sub">1 computador · ative com o seu cupom</span>
            <Link className="btn btn-primary btn-lg btn-block" href={`/pt/comprar/${product.id}`}>
              <Icon name="cart" size={18} /> Ativar licença
            </Link>
            <DownloadNotice />
            <a className="btn btn-ghost btn-block" href={product.downloadUrl} download>
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
            <h2>O que o FbRecovery faz</h2>
          </div>
          <div className="feature-grid">
            {product.features.map(([title, text]) => (
              <article className="feature" key={title}>
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
            <h2>Quando usar</h2>
            <ul className="check-list">
              {product.useCases.map((item) => (
                <li key={item}><Icon name="check" size={18} /> {item}</li>
              ))}
            </ul>
          </div>
          <div className="activation-card">
            <span className="eyebrow">Como começar</span>
            <h3>Da conta à recuperação</h3>
            <ol className="mini-steps">
              {steps.map(([title, text]) => (
                <li key={title}><strong>{title}.</strong> {text}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section" id="perguntas">
        <div className="container narrow">
          <div className="section-head center">
            <span className="eyebrow">Dúvidas</span>
            <h2>Perguntas frequentes</h2>
          </div>
          <div className="faq">
            {faq.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="cta-band">
          <h2>Tem um banco Firebird que não abre?</h2>
          <p>Crie sua conta, ative a licença com o seu cupom e baixe o FbRecovery.</p>
          <div className="hero-actions center">
            <Link className="btn btn-primary btn-lg" href={`/pt/comprar/${product.id}`}>Ativar licença</Link>
            <a className="btn btn-outline-light btn-lg" href={product.downloadUrl} download>Baixar instalador</a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
