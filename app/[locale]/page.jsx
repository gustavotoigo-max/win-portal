import Link from "next/link";
import Icon from "@/components/site/Icon";
import ProductIcon from "@/components/site/ProductIcon";
import PageShell from "@/components/site/PageShell";
import ProductCard from "@/components/site/ProductCard";
import { getPricedProductPage } from "@/lib/prices";

const highlights = [
  ["database", "Qualquer versão", "Do Firebird 1.5 ao 5.0, identificada sozinha."],
  ["bolt", "Análise em minutos", "Veja na hora o que foi afetado no banco."],
  ["shield", "Seguro", "O arquivo original nunca é alterado."],
  ["check", "Sistema de volta", "Um banco novo, pronto para o sistema abrir."]
];

const steps = [
  ["Crie sua conta", "Cadastre-se com e-mail ou com a sua conta Google."],
  ["Ative a licença", "Conclua a compra com o seu cupom. A licença aparece em Minha conta."],
  ["Baixe e entre", "Instale o FbRecovery e confirme o acesso no site, sem chave."],
  ["Recupere o banco", "Abra o arquivo .fdb e receba o banco novo, pronto para uso."]
];

const faq = [
  ["Como ativo o FbRecovery?", "Abra o programa e clique para entrar: o navegador abre o site e você confirma com a sua conta. Não há chave para digitar."],
  ["O arquivo original é alterado?", "Nunca. O banco recuperado é sempre um arquivo novo, na pasta que você escolher."],
  ["Meus arquivos ficam guardados?", "Não. O banco é usado apenas durante a análise e a recuperação e é apagado assim que o resultado é baixado."],
  ["Troquei de computador. E agora?", "Em Minha conta, libere o computador antigo e entre no novo. Cada licença vale para 1 computador por vez."],
  ["Preciso de internet?", "Sim, o programa trabalha conectado: confere a licença e faz a análise e a recuperação com a conexão ativa."]
];

export const revalidate = 300;

export default async function HomePage() {
  const product = await getPricedProductPage("fbrecovery");

  return (
    <PageShell>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow eyebrow-light">Recuperação de bancos Firebird</span>
            <h1>O banco Firebird não abre e o sistema parou?</h1>
            <p className="lead">
              O FbRecovery analisa o banco em minutos, mostra o que foi afetado e entrega um banco pronto para o sistema
              voltar a funcionar. Qualquer versão do Firebird, sem nunca alterar o arquivo original.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg" href={product.pagePath}>
                Conhecer o FbRecovery <Icon name="arrow" size={18} />
              </Link>
              <Link className="btn btn-outline-light btn-lg" href="/pt/dashboard">Já tenho conta</Link>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="window">
              <div className="window-bar"><span /><span /><span /><em>FbRecovery</em></div>
              <div className="window-body">
                <div className="activation-row">
                  <ProductIcon product={product} />
                  <div>
                    <strong>Vendas Loja.fdb</strong>
                    <small>Firebird 3 · 6 tabelas com perda de páginas</small>
                  </div>
                  <span className="status status-active">Recuperado</span>
                </div>
                <div className="fake-field"><small>Análise</small><span>concluída em 40 segundos</span></div>
                <div className="fake-field"><small>Restaurado</small><span>97,4% dos registros · 100% dos objetos</span></div>
                <div className="fake-progress"><span /></div>
                <p className="fake-ok"><Icon name="check" size={16} /> Todas as tabelas legíveis no banco novo</p>
              </div>
            </div>
            <div className="floating-card">
              <Icon name="monitor" size={18} />
              <div>
                <strong>1 de 1 computador</strong>
                <small>DESKTOP-SUPORTE</small>
              </div>
            </div>
          </div>
        </div>

        <div className="container highlight-row">
          {highlights.map(([icon, title, text]) => (
            <div className="highlight" key={title}>
              <Icon name={icon} />
              <div>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="produtos">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Produto</span>
            <h2>Menos tempo com o sistema parado</h2>
            <p>Diagnóstico rápido e um banco pronto para uso, com relatório para mostrar ao cliente.</p>
          </div>
          <div className="product-grid">
            <ProductCard product={product} featured />
          </div>
        </div>
      </section>

      <section className="section" id="como-funciona">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Como funciona</span>
            <h2>Da conta à recuperação em quatro passos</h2>
          </div>
          <ol className="steps">
            {steps.map(([title, text], index) => (
              <li key={title}>
                <span className="step-number">{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
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
          <h2>Pronto para começar?</h2>
          <p>Crie sua conta, ative a licença e baixe o FbRecovery.</p>
          <div className="hero-actions center">
            <Link className="btn btn-primary btn-lg" href={product.pagePath}>Conhecer o FbRecovery</Link>
            <Link className="btn btn-outline-light btn-lg" href="/pt/cadastro">Criar conta</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
