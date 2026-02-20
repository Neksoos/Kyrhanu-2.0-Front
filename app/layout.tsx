// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

import RootClientShell from "./_components/RootClientShell";
import { AudioProvider } from "./_components/AudioProvider";
import BackToCity from "./_components/BackToCity";

export const metadata = {
  title: "Прокляті кургани",
  description: "Mini App",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="uk">
      <head>
        {/* ✅ Telegram WebApp SDK */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>

      <body className="bg-black">
        <AudioProvider>
          {/* ✅ tgId/level визначаються ВСЕРЕДИНІ RootClientShell (на клієнті) */}
          <RootClientShell>
            <div className="max-w-md mx-auto">
              <div
                className="px-3"
                style={{
                  paddingTop: "calc(env(safe-area-inset-top) + 12px)",
                  paddingBottom: "calc(env(safe-area-inset-bottom) + 56px)",
                }}
              >
                {children}
              </div>

              <BackToCity />
            </div>
          </RootClientShell>
        </AudioProvider>
      </body>
    </html>
  );
}