import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export default function PageShell({ children, className = "" }) {
  return (
    <>
      <SiteHeader />
      <main className={className}>{children}</main>
      <SiteFooter />
    </>
  );
}
