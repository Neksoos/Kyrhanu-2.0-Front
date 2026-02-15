"use client";

import { useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "@/lib/api";
import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { Toast } from "@/components/Toast";
import { telegramDebugInfo, waitForTelegramWebApp } from "@/lib/telegram";
import type { TelegramWidgetUser } from "@/lib/telegram";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TG_BOT_USERNAME!;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<{ kind: "info" | "error"; msg: string } | null>(null);

  const [mini, setMini] = useState(false);
  const [miniDbg, setMiniDbg] = useState<any>(null);

  const widgetId = useMemo(() => `tg-widget-${Math.random().toString(16).slice(2)}`, []);

  useEffect(() => {
    let disposed = false;
    let injectedScript: HTMLScriptElement | null = null;

    (async () => {
      // Даємо Telegram WebApp API шанс з'явитись (інакше Mini App помилково сприймається як браузер)
      const tg = await waitForTelegramWebApp(600);
      if (disposed) return;

      const isMini = Boolean(tg);
      setMini(isMini);

      if (isMini) {
        setMiniDbg(telegramDebugInfo());
        return;
      }

      window.onTelegramAuth = async (user: TelegramWidgetUser) => {
        try {
          const res = await api.auth.telegramWidget(user);
          setAccessToken(res.accessToken);
          await api.me();
          window.location.href = "/play";
        } catch (e: any) {
          setToast({ kind: "error", msg: e.message ?? "Telegram login failed" });
        }
      };

      injectedScript = document.createElement("script");
      injectedScript.async = true;
      injectedScript.src = "https://telegram.org/js/telegram-widget.js?22";
      injectedScript.setAttribute("data-telegram-login", BOT_USERNAME);
      injectedScript.setAttribute("data-size", "large");
      injectedScript.setAttribute("data-radius", "0");
      injectedScript.setAttribute("data-onauth", "onTelegramAuth(user)");
      injectedScript.setAttribute("data-request-access", "write");
      const el = document.getElementById(widgetId);
      el?.appendChild(injectedScript);
    })();

    return () => {
      disposed = true;
      delete window.onTelegramAuth;
      try {
        injectedScript?.remove();
      } catch {}
    };
  }, [widgetId]);

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-4">
      <div className="pixel-border bg-white/5 p-4">
        <div className="text-lg font-black tracking-wider">Вхід у “Прокляті Кургани”</div>
        <div className="text-sm text-[var(--muted)] mt-1">
          У браузері: Telegram Widget або email/password. У Mini App все логіниться автоматично.
        </div>
      </div>

      <PixelCard title="Telegram">
        {mini ? (
          <div className="text-sm text-[var(--muted)]">
            Ви в Telegram, але <b>initData не передано</b>, тому авто-логін не спрацював.
            <div className="mt-2 text-xs">
              Відкрий гру через <b>кнопку WebApp/Menu у боті</b> або через <b>t.me/&lt;bot&gt;?startapp=...</b>.
            </div>
            {miniDbg ? (
              <pre className="mt-3 text-[10px] whitespace-pre-wrap break-words">{JSON.stringify(miniDbg, null, 2)}</pre>
            ) : null}
          </div>
        ) : (
          <>
            <div id={widgetId} />
            <div className="text-xs text-[var(--muted)] mt-2">
              Якщо ви вже залогінені email/password — Telegram Widget **прикріпить telegram_id** до вашого акаунта (linking).
            </div>
          </>
        )}
      </PixelCard>

      <PixelCard title="Email / Password">
        <div className="grid gap-3">
          <input
            className="pixel-border bg-black/30 p-3 outline-none"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="pixel-border bg-black/30 p-3 outline-none"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex gap-2 flex-wrap">
            <PixelButton
              onClick={async () => {
                try {
                  const res = await api.auth.login(email, password);
                  setAccessToken(res.accessToken);
                  await api.me();
                  window.location.href = "/play";
                } catch (e: any) {
                  setToast({ kind: "error", msg: e.message ?? "Login failed" });
                }
              }}
            >
              Увійти
            </PixelButton>

            <PixelButton
              variant="ghost"
              onClick={async () => {
                try {
                  const res = await api.auth.register(email, password);
                  setAccessToken(res.accessToken);
                  await api.me();
                  window.location.href = "/play";
                } catch (e: any) {
                  setToast({ kind: "error", msg: e.message ?? "Register failed" });
                }
              }}
            >
              Реєстрація
            </PixelButton>
          </div>
        </div>
      </PixelCard>

      {toast ? <Toast kind={toast.kind} message={toast.msg} onDone={() => setToast(null)} /> : null}
    </div>
  );
}