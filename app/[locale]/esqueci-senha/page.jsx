import AuthLayout from "@/components/auth/AuthLayout";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Recuperar senha" };

export default async function ForgotPasswordPage({ searchParams }) {
  const { email } = await searchParams;

  return (
    <AuthLayout>
      <ForgotPasswordForm initialEmail={email || ""} />
    </AuthLayout>
  );
}
