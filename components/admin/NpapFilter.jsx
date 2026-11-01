"use client";

import { useState } from "react";

/** Campo de busca que esconde as linhas da tabela que não contêm o texto (atributo data-search). */
export default function NpapFilter({ target, placeholder }) {
  const [term, setTerm] = useState("");

  function apply(value) {
    setTerm(value);
    const t = value.trim().toLowerCase();
    document.querySelectorAll(`[data-filter="${target}"] tbody tr`).forEach((row) => {
      row.hidden = Boolean(t) && !(row.dataset.search || "").includes(t);
    });
  }

  return (
    <input
      className="npap-filter"
      type="search"
      value={term}
      onChange={(event) => apply(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  );
}
