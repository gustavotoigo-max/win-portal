import "./globals.css";

export const metadata = {
  title: "WinPortal",
  description: "Software license sales, customer dashboard, and admin license management.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
