import { normalizeLocale } from "@/lib/i18n";

export default async function LocaleLayout({ children, params }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);

  return (
    <div data-locale={locale}>
      {children}
    </div>
  );
}
