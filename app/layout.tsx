import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Прокляті Кургани",
  description: "Ethno UA pixel MMORPG — Telegram Mini App + Web"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="crt grain">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}