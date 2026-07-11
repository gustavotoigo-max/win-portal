import Header from "@/components/Header";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { getDictionary, normalizeLocale } from "@/lib/i18n";

export default async function ForgotPasswordPage({ params, searchParams }) {
  const { locale: rawLocale } = await params;
  const query = await searchParams;
  const locale = normalizeLocale(rawLocale);
  const t = getDictionary(locale);

  return (
    <>
      <Header locale={locale} active="login" />
      <main className="auth-shell">
        <ForgotPasswordForm locale={locale} dictionary={t} initialEmail={query?.email || ""} />
      </main>
    </>
  );
}
