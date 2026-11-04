import Link from "next/link";
import DownloadNotice from "@/components/site/DownloadNotice";
import Icon from "@/components/site/Icon";
import ProductIcon from "@/components/site/ProductIcon";
import PageShell from "@/components/site/PageShell";
import { getLatestProductRelease } from "@/lib/github-releases";
import { getPricedProductPage } from "@/lib/prices";

export const revalidate = 300;

export const metadata = {
  title: "Nexo SQL Recovery",
  description: "Seu banco SQL Server não abre? Diagnóstico página por página e recuperação de páginas e tabelas, com o nível de confiança de cada resultado."
};

const steps = [
  ["Crie sua conta e ative a licença", "Cadastre-se no site e conclua a compra com o seu cupom. A licença aparece em Minha conta."],
  ["Baixe e instale", "O instalador baixa direto desta página. Windows 10 ou 11, 64 bits. Não é preciso ter o SQL Server instalado."],
  ["Entre pelo navegador", "Ao abrir o programa, confirme o acesso no site com a sua conta. Não há chave para digitar."],
  ["Adicione os arquivos e recupere", "Escolha o .mdf e os .ndf, e também os backups e o log, se tiver. Você recebe as tabelas, o banco recuperado e o laudo na pasta que escolher."]
];

const faq = [
  ["Os arquivos originais são alterados?", "Nunca. O programa só lê os arquivos; o resultado é sempre gravado à parte, na pasta que você escolher."],
  ["Meus arquivos ficam guardados em algum lugar?", "Não. Os arquivos são enviados ao servidor apenas para a análise e a recuperação, em um ambiente isolado e sem acesso à internet, e são apagados depois que o resultado é baixado. Resultado não baixado é apagado em até 2 horas."],
  ["Preciso de internet?", "Sim. A análise e a recuperação rodam no servidor, então a conexão precisa ficar ativa enquanto os arquivos são enviados e o resultado é baixado."],
  ["Quais versões do SQL Server?", "Bancos das versões 2017, 2019, 2022 e 2025, testados em cada uma delas. O programa identifica a versão sozinho. As versões 2014 e 2016 ainda não foram validadas."],
  ["Preciso ter backup?", "Não é obrigatório: sem backup, o programa exporta o que ainda pode ser lido. Com um backup, uma cópia antiga ou o log, ele consegue recuperar as páginas atingidas. Backup comprimido ou criptografado não pode ser aproveitado."],
  ["Qual o tamanho máximo?", "O caso inteiro, depois de comprimido pelo programa, pode ter até 20 GB."],
  ["O banco volta exatamente como era?", "Depende do dano e do que você tiver de backup e log. O laudo diz o que voltou idêntico ao original, o que pode estar desatualizado e o que não foi possível recuperar. Páginas que podem estar desatualizadas só entram se você marcar essa opção."],
  ["Posso usar em outro computador?", "Cada licença vale para 1 computador por vez. Em Minha conta você libera o computador antigo para usar em outro."]
];

function formatSize(bytes) {
  if (!bytes) return null;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export default async function SqlRecoveryPage() {
  const product = await getPricedProductPage("sqlrecovery");
  const release = await getLatestProductRelease(product);
  const publishedAt = release?.publishedAt
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(release.publishedAt))
    : null;

  return (
    <PageShell>
      <section className="page-hero product-hero">
        <div className="container product-hero-grid">
          <div>
            <span className="eyebrow">Bancos SQL Server</span>
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
            <span className="buy-sub">Licença para 1 computador</span>
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
            <h2>Do banco parado aos dados de volta</h2>
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
          <h2>Tem um banco SQL Server que não abre?</h2>
          <p>Descubra o que foi atingido e recupere os dados, sabendo o quanto pode confiar em cada resultado.</p>
          <div className="hero-actions center">
            <Link className="btn btn-primary btn-lg" href={`/pt/comprar/${product.id}`}>Ativar licença</Link>
            <a className="btn btn-outline-light btn-lg" href={product.downloadUrl} download>Baixar instalador</a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
