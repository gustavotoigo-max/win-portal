import AuthForm from "@/components/auth/AuthForm";
import AuthLayout from "@/components/auth/AuthLayout";
import { safeNextPath } from "@/lib/session";

export const metadata = { title: "Criar conta" };

export default async function SignupPage({ searchParams }) {
  const { next } = await searchParams;

  return (
    <AuthLayout>
      <AuthForm mode="signup" next={next ? safeNextPath(next) : ""} />
    </AuthLayout>
  );
}
