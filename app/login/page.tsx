"use client";

import { useEffect, useMemo, useState } from "react";
import { api, setAccessToken } from "@/lib/api";
import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { Toast } from "@/components/Toast";
import type { TelegramWidgetUser } from "@/lib/telegram";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TG_BOT_USERNAME!;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [toast, setToast] = useState<{ kind: "info" | "error"; msg: string } | null>(null);

  const widgetId = useMemo(() => `tg-widget-${Math.random().toString(16).slice(2)}`, []);

  useEffect(() => {
    // Telegram widget callback
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

    // Inject widget script
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "0");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    const el = document.getElementById(widgetId);
    el?.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
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
        <div id={widgetId} />
        <div className="text-xs text-[var(--muted)] mt-2">
          Якщо ви вже залогінені email/password, натискання Telegram Widget **прикріпить telegram_id** до вашого акаунта (linking).
        </div>
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