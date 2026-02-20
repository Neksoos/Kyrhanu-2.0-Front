"use client";

import { useEffect, useState } from "react";

export function useTelegramReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const wa = (window as any)?.Telegram?.WebApp;
    if (!wa) return;

    wa.ready();

    // initData з'являється одразу в MiniApp
    if (typeof wa.initData === "string" && wa.initData.length > 0) {
      setReady(true);
    }
  }, []);

  return ready;
}