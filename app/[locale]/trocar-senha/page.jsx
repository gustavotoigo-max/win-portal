import AuthLayout from "@/components/auth/AuthLayout";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Criar nova senha" };

export default async function ResetPasswordPage({ searchParams }) {
  const { token } = await searchParams;

  return (
    <AuthLayout>
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
