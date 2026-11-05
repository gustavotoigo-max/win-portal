"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";

const TENTATIVAS = 4;
const INTERVALO_MS = 1500;

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Na volta do Google, a sessão só existe depois que o navegador troca o código da URL pelo cookie.
// authClient.getSession() faz essa troca quando roda na própria página de retorno.
async function confirmarSessao() {
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa += 1) {
    try {
      const { data } = await authClient.getSession();
      if (data?.user) return true;
    } catch {
      // O serviço de login pode demorar a responder depois de um tempo parado.
    }
    if (tentativa < TENTATIVAS) await esperar(INTERVALO_MS);
  }
  return false;
}

export default function FinishLogin({ method, next }) {
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function concluir() {
      if (!(await confirmarSessao())) {
        if (ativo) setFalhou(true);
        return;
      }

      try {
        await fetch("/api/auth/login-method", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ method, provider: method })
        });
      } catch {
        // O login nao deve falhar se o enriquecimento do perfil falhar.
      }

      let destino = next || "/pt/dashboard";
      try {
        const query = next ? `?next=${encodeURIComponent(next)}` : "";
        const response = await fetch(`/api/auth/redirect-target${query}`, { cache: "no-store" });
        const payload = await response.json();
        if (response.ok && payload.target) destino = payload.target;
      } catch {
        // Segue para o destino padrao.
      }
      if (ativo) window.location.replace(destino);
    }

    concluir();
    return () => {
      ativo = false;
    };
  }, [method, next]);

  if (!falhou) {
    return (
      <div className="auth-card">
        <h1>Entrando…</h1>
        <p className="muted">Estamos confirmando o seu acesso.</p>
      </div>
    );
  }

  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="auth-card">
      <h1>Não foi possível entrar</h1>
      <p className="form-message" role="status">O site não conseguiu confirmar o seu acesso. Tente entrar de novo.</p>
      <Link className="btn btn-primary btn-lg btn-block" href={`/pt/login${nextQuery}`}>Voltar para entrar</Link>
    </div>
  );
}
