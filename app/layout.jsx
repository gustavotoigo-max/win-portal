import { Inter } from "next/font/google";
import "./globals.css";
import { themeInitScript } from "@/lib/theme";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "WinPortal | Ferramentas para recuperação de dados e organização de arquivos",
    template: "%s | WinPortal"
  },
  description:
    "Ferramentas Windows para recuperação de dados, diagnóstico de bancos e organização de arquivos. Compre, baixe e gerencie suas licenças em um só lugar.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png"
  }
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b1324" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes da primeira pintura (sem "flash"). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
