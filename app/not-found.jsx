import Link from "next/link";
import PageShell from "@/components/site/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="container not-found">
        <strong>404</strong>
        <h1>Página não encontrada</h1>
        <p className="muted">O endereço pode ter mudado. Que tal ver os produtos?</p>
        <Link className="btn btn-primary" href="/pt/solucoes">Ver produtos</Link>
      </div>
    </PageShell>
  );
}
