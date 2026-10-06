// O site e publicado somente em portugues. O segmento /[locale] continua na
// URL para manter validos os links ja distribuidos (/pt/...); /en/... e
// redirecionado para /pt/... pelo proxy.
export const locales = ["pt"];
export const defaultLocale = "pt";

export function normalizeLocale() {
  return defaultLocale;
}
