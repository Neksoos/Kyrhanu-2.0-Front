"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAccessToken } from "@/lib/api";
import { waitForTelegramWebApp, TelegramWidgetUser, telegramDebugInfo } from "@/lib/telegram";
import PixelButton from "@/components/PixelButton";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void;
    TelegramLoginWidget?: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tgWidgetReady, setTgWidgetReady] = useState(false);
  const [miniAppMessage, setMiniAppMessage] = useState<string | null>(null);
  const [telegramDebug, setTelegramDebug] = useState<any>(null);

  const tgBotUsername = useMemo(
    () => process.env.NEXT_PUBLIC_TG_BOT_USERNAME || "",
    []
  );

  // Mini App auto-login: read Telegram.WebApp.initData and exchange it for tokens
  useEffect(() => {
    let cancelled = false;

    const runTelegramAutoLogin = async () => {
      const debug = telegramDebugInfo();
      setTelegramDebug(debug);

      if (!debug.hasWebApp) return;

      // Try to wait for initData to become available
      const webApp = await waitForTelegramWebApp(1200);
      const initData = webApp?.initData || "";

      if (!initData) {
        setMiniAppMessage(
          "Ви в Telegram, але initData не передано. Відкрий гру через кнопку WebApp/Menu у боті або через t.me/<bot>?startapp=..."
        );
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setMiniAppMessage("Авто-логін через Telegram Mini App…");

        const res = await api.auth.telegramInitData(initData);
        if (cancelled) return;

        if (res?.accessToken) {
          setAccessToken(res.accessToken);
          router.replace("/play");
          return;
        }

        setMiniAppMessage("Не вдалося отримати токен. Спробуй ще раз.");
      } catch (e: any) {
        if (cancelled) return;
        setMiniAppMessage(null);
        setError(e?.message || "Telegram auto-login failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    runTelegramAutoLogin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Telegram Widget login (for browser): inject script and set callback
  useEffect(() => {
    if (!tgBotUsername) return;

    const existing = document.getElementById("telegram-login-script");
    if (existing) {
      setTgWidgetReady(true);
      return;
    }

    window.onTelegramAuth = async (user: TelegramWidgetUser) => {
      try {
        setLoading(true);
        setError(null);

        // send Telegram widget user payload to backend (it verifies hash)
        const res = await api.auth.telegramWidget(user);

        if (res?.accessToken) {
          setAccessToken(res.accessToken);
          router.replace("/play");
          return;
        }

        throw new Error("No accessToken from server");
      } catch (e: any) {
        setError(e?.message || "Telegram widget login failed");
      } finally {
        setLoading(false);
      }
    };

    const script = document.createElement("script");
    script.id = "telegram-login-script";
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", tgBotUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "6");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    const container = document.getElementById("tg-widget-container");
    container?.appendChild(script);

    setTgWidgetReady(true);

    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [tgBotUsername, router]);

  const onEmailLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.auth.login(email, password);
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        router.replace("/play");
        return;
      }
      throw new Error("No accessToken");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.auth.register(email, password);
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        router.replace("/play");
        return;
      }
      throw new Error("No accessToken");
    } catch (e: any) {
      setError(e?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0b0b0b] text-white">
      <div className="w-full max-w-lg space-y-6">
        <div className="border-2 border-white/50 p-6 bg-black/30">
          <h1 className="text-2xl font-bold mb-2">
            Вхід у “Прокляті Кургани”
          </h1>
          <p className="text-white/70 text-sm">
            У браузері: Telegram Widget або email/password. У Mini App все логіниться автоматично.
          </p>
        </div>

        {/* Telegram Mini App status */}
        {telegramDebug?.hasWebApp && (
          <div className="border-2 border-white/20 p-5 bg-black/20 space-y-2">
            <div className="text-sm text-gray-200 space-y-1">
              <div className="font-semibold uppercase tracking-wide opacity-80">
                Telegram
              </div>
              <div className="opacity-90">
                Ви в Telegram, але <b>initData не передано</b>, тому авто-логін не спрацював.
              </div>
              <div className="text-xs opacity-70">
                Відкрий гру через <b>кнопку WebApp/Menu</b> у боті або через{" "}
                <code>t.me/&lt;bot&gt;?startapp=...</code>
              </div>
              <pre className="mt-2 text-xs bg-black/40 p-3 overflow-auto border border-white/10">
{JSON.stringify(telegramDebug, null, 2)}
              </pre>
            </div>

            {miniAppMessage && (
              <div className="text-sm text-yellow-200">{miniAppMessage}</div>
            )}
          </div>
        )}

        {/* Telegram Widget (browser) */}
        {!!tgBotUsername && (
          <div className="border-2 border-white/20 p-5 bg-black/20">
            <div className="text-sm text-gray-200 mb-3">
              <div className="font-semibold uppercase tracking-wide opacity-80">
                Telegram
              </div>
              <div className="opacity-80">
                У браузері можна увійти через Telegram Login Widget.
              </div>
            </div>
            <div id="tg-widget-container" className="min-h-[52px]" />
            {!tgWidgetReady && (
              <div className="text-xs text-white/60 mt-2">
                Завантажую віджет…
              </div>
            )}
          </div>
        )}

        {/* Email/password */}
        <div className="border-2 border-white/20 p-5 bg-black/20 space-y-3">
          <div className="text-sm text-gray-200">
            <div className="font-semibold uppercase tracking-wide opacity-80">
              Email / Password
            </div>
          </div>

          <input
            className="w-full px-3 py-2 bg-black/50 border border-white/20 outline-none"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full px-3 py-2 bg-black/50 border border-white/20 outline-none"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && (
            <div className="text-sm text-red-300 border border-red-400/30 bg-red-900/20 p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <PixelButton
              onClick={onEmailLogin}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "..." : "Увійти"}
            </PixelButton>

            <PixelButton
              onClick={onRegister}
              disabled={loading}
              variant="secondary"
              className="flex-1"
            >
              {loading ? "..." : "Реєстрація"}
            </PixelButton>
          </div>
        </div>
      </div>
    </div>