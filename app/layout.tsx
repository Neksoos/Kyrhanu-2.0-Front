import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Прокляті Кургани",
  description: "Ethno UA pixel MMORPG — Telegram Mini App + Web"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="crt grain">
        {/* Telegram Mini App API (дає window.Telegram.WebApp + initData). */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}