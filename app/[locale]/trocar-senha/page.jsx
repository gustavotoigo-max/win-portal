import Header from "@/components/Header";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { getDictionary, normalizeLocale } from "@/lib/i18n";

export default async function ResetPasswordPage({ params }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const t = getDictionary(locale);

  return (
    <>
      <Header locale={locale} active="login" />
      <main className="auth-shell">
        <ResetPasswordForm locale={locale} dictionary={t} />
      </main>
    </>
  );
}
