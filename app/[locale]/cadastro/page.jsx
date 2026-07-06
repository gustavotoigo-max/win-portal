import Header from "@/components/Header";
import AuthForm from "@/components/AuthForm";
import { getDictionary, normalizeLocale } from "@/lib/i18n";

export default async function SignupPage({ params }) {
  const { locale: rawLocale } = await params;
  const locale = normalizeLocale(rawLocale);
  const t = getDictionary(locale);

  return (
    <>
      <Header locale={locale} active="signup" />
      <main className="auth-shell">
        <AuthForm locale={locale} dictionary={t} mode="signup" />
      </main>
    </>
  );
}
