import AuthLayout from "@/components/auth/AuthLayout";
import FinishLogin from "@/components/auth/FinishLogin";
import { safeNextPath } from "@/lib/session";

export const metadata = { title: "Entrando", robots: { index: false } };

export default async function FinishLoginPage({ searchParams }) {
  const { method, next } = await searchParams;

  return (
    <AuthLayout>
      <FinishLogin method={String(method || "unknown")} next={next ? safeNextPath(next) : ""} />
    </AuthLayout>
  );
}
