"use client";

import { useEffect, useState } from "react";
import { isMiniApp, getInitData } from "@/lib/telegram";
import { api, loadAccessTokenFromStorage, setAccessToken } from "@/lib/api";
import { LoadingRune } from "@/components/LoadingRune";
import { Toast } from "@/components/Toast";

export default function Home() {
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      loadAccessTokenFromStorage();

      if (isMiniApp()) {
        try {
          const initData = getInitData();
          const res = await api.auth.telegramInitData(initData);
          setAccessToken(res.accessToken);
          await api.me(); // auto-create daily character
          window.location.href = "/play";
          return;
        } catch (e: any) {
          setErr(e.message ?? "Mini App login failed");
          return;
        }
      }

      // browser
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
    </div>
  );
}