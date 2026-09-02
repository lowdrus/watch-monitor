import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watch Monitor",
  description: "Descubra e acompanhe filmes e séries.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
