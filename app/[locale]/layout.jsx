import { notFound } from "next/navigation";

export function generateStaticParams() {
  return [{ locale: "pt" }];
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  if (locale !== "pt") notFound();

  return children;
}
