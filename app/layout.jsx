import "./globals.css";

export const metadata = {
  title: "WinPortal",
  description: "Software license sales, customer dashboard, and admin license management."
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
