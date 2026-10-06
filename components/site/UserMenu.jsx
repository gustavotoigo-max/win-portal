"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth/client";

function initials(user) {
  const source = user.name && user.name !== user.email ? user.name : user.email || "";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "WP";
}

export default function UserMenu() {
  const { data, isPending } = authClient.useSession();
  const user = data?.user;

  if (isPending) {
    return <span className="user-menu-placeholder" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="auth-links">
        <Link className="nav-link" href="/pt/login">Entrar</Link>
        <Link className="btn btn-primary btn-sm" href="/pt/cadastro">Criar conta</Link>
      </div>
    );
  }

  return (
    <div className="auth-links">
      <Link className="btn btn-ghost btn-sm hide-sm" href="/pt/dashboard">Minha conta</Link>
      <details className="profile-menu">
        <summary className="avatar" aria-label="Menu do perfil">{initials(user)}</summary>
        <div className="profile-panel">
          <div className="profile-head">
            <strong>{user.name && user.name !== user.email ? user.name : "Minha conta"}</strong>
            <span>{user.email}</span>
          </div>
          <Link href="/pt/dashboard">Minhas licenças</Link>
          <Link href="/pt/dashboard#pedidos">Meus pedidos</Link>
          <Link href="/pt/solucoes">Comprar produtos</Link>
          <form action="/api/auth/logout" method="post">
            <input type="hidden" name="locale" value="pt" />
            <button type="submit">Sair</button>
          </form>
        </div>
      </details>
    </div>
  );
}
