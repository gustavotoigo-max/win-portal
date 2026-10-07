"use client";

import { useSyncExternalStore } from "react";
import Icon from "@/components/site/Icon";
import { THEME_STORAGE_KEY, THEMES } from "@/lib/theme";

const OPTIONS = [
  { value: "auto", label: "Automático", hint: "Segue o tema do sistema", icon: "monitor" },
  { value: "light", label: "Claro", hint: "Tema claro", icon: "sun" },
  { value: "dark", label: "Escuro", hint: "Tema escuro", icon: "moon" }
];

const CHANGE_EVENT = "winportal-theme-change";

// Guarda a escolha da sessão caso o localStorage não esteja disponível.
let currentOverride = null;

function readTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") {
    root.setAttribute("data-theme", theme);
  } else {
    root.removeAttribute("data-theme");
  }
}

function setTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Armazenamento indisponível (modo privado, bloqueado): aplica só nesta página.
  }
  currentOverride = theme;
  applyTheme(theme);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function getSnapshot() {
  return currentOverride ?? readTheme();
}

function getServerSnapshot() {
  return "auto";
}

function subscribe(callback) {
  function onStorage(event) {
    if (event.key === THEME_STORAGE_KEY) {
      currentOverride = null;
      applyTheme(readTheme());
      callback();
    }
  }
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Seletor de tema (Automático / Claro / Escuro).
 * variant="compact": só ícones (cabeçalho). variant="full": ícones + rótulos.
 */
export default function ThemeSwitcher({ variant = "compact", className = "" }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const compact = variant === "compact";

  return (
    <div
      className={`theme-switcher theme-switcher-${variant} ${className}`.trim()}
      role="radiogroup"
      aria-label="Tema do site"
    >
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={compact ? `Tema: ${option.label}` : undefined}
            title={compact ? `${option.label} — ${option.hint}` : option.hint}
            className={selected ? "is-active" : undefined}
            onClick={() => setTheme(option.value)}
          >
            <Icon name={option.icon} size={compact ? 16 : 18} />
            {!compact && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
