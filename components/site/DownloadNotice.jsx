"use client";

import { useSyncExternalStore } from "react";

// Aviso mostrado quando /api/download volta sem arquivo publicado (?download=indisponivel).
// Lido no cliente para a página do produto continuar estática.
const subscribe = () => () => {};
const readFlag = () => new URLSearchParams(window.location.search).get("download") === "indisponivel";

export default function DownloadNotice() {
  const visible = useSyncExternalStore(subscribe, readFlag, () => false);
  if (!visible) return null;
  return (
    <p className="download-notice" role="status">
      O instalador ainda não está disponível para download. Tente novamente mais tarde.
    </p>
  );
}
