import AuthForm from "@/components/auth/AuthForm";
import AuthLayout from "@/components/auth/AuthLayout";
import { safeNextPath } from "@/lib/session";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;

  return (
    <AuthLayout>
      <AuthForm mode="login" next={next ? safeNextPath(next) : ""} />
    </AuthLayout>
  );
}
