"use client";

import { useEffect, useState } from "react";
import { isMiniApp, getInitData, ensureTelegramReady, telegramDebugInfo } from "@/lib/telegram";
import { api, loadAccessTokenFromStorage, setAccessToken } from "@/lib/api";
import { LoadingRune } from "@/components/LoadingRune";
import { Toast } from "@/components/Toast";

export default function Home() {
  const [err, setErr] = useState<string | null>(null);
  const [dbg, setDbg] = useState<any>(null);

  useEffect(() => {
    (async () => {
      loadAccessTokenFromStorage();

      // Mini App flow
      if (isMiniApp()) {
        ensureTelegramReady();
        setDbg(telegramDebugInfo());

        try {
          const initData = getInitData();

          // Якщо initData порожній — це майже завжди означає, що відкрито НЕ як WebApp через бота
          if (!initData || initData.length < 10) {
            setErr(
              "Mini App виявлено, але Telegram initData порожній. Відкрий гру через кнопку Web App у боті (Menu) або через startapp-лінк."
            );
            return;
          }

          const res = await api.auth.telegramInitData(initData);
          setAccessToken(res.accessToken);
          await api.me(); // auto-create daily character if needed
          window.location.href = "/play";
          return;
        } catch (e: any) {
          setErr(e.message ?? "Mini App login failed");
          return;
        }
      }

      // Browser flow
      if (loadAccessTokenFromStorage()) {
        try {
          await api.me();
          window.location.href = "/play";
          return;
        } catch {
          setAccessToken(null);
        }
      }
      window.location.href = "/login";
    })();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <LoadingRune label="Прокидаємо Кургани…" />
      {err ? <Toast kind="error" message={err} /> : null}

      {err && dbg ? (
        <div className="mt-4 pixel-border bg-white/5 p-3 text-xs text-[var(--muted)]">
          <div className="font-black text-white mb-1">Telegram debug</div>
          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(dbg, null, 2)}</pre>
          <div className="mt-2 text-[10px] opacity-80">
            Якщо <b>initDataLen = 0</b>, сторінку відкрито НЕ як Telegram WebApp або WebApp не прив’язаний у BotFather.
          </div>
        </div>
      ) : null}
    </div>
  );
}