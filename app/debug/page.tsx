"use client";

import { useEffect, useState } from "react";

type State = {
  inTelegram: boolean;
  hasWebApp: boolean;
  platform?: string;
  version?: string;
  initData?: string;
  initDataUnsafe?: any;
  user?: any;
  errors: string[];
};

export default function DebugPage() {
  const [s, setS] = useState<State>({
    inTelegram: false,
    hasWebApp: false,
  errors: [],
  });

  useEffect(() => {
    const errors: string[] = [];
    try {
      const w = window as any;
      const WA = w?.Telegram?.WebApp;
      const inTelegram = !!w?.Telegram;
      const hasWebApp = !!WA;

      let initData = "";
      let initDataUnsafe: any = null;
      let user: any = null;

      if (WA) {
        try { WA.ready?.(); WA.expand?.(); } catch {}
        initData = String(WA.initData || "");
        initDataUnsafe = WA.initDataUnsafe ?? null;
        user = initDataUnsafe?.user ?? null;
      } else {
        errors.push("window.Telegram.WebApp відсутній");
      }

      setS({
        inTelegram,
        hasWebApp,
        platform: WA?.platform,
        version: WA?.version,
        initData,
        initDataUnsafe,
        user,
        errors,
      });
    } catch (e: any) {
      errors.push(String(e?.message || e));
      setS((p) => ({ ...p, errors }));
    }
  }, []);

  return (
    <div className="max-w-md mx-auto p-3 space-y-3 text-sm">
      <h1 className="text-lg font-bold">Telegram MiniApp Debug</h1>

      <div className="card">
        <div>inTelegram: <b>{String(s.inTelegram)}</b></div>
        <div>hasWebApp: <b>{String(s.hasWebApp)}</b></div>
        <div>platform: <b>{s.platform || "-"}</b></div>
        <div>version: <b>{s.version || "-"}</b></div>
      </div>

      <div className="card break-words">
        <div className="font-semibold mb-1">initData (raw):</div>
        <pre className="whitespace-pre-wrap break-words">{s.initData || "(порожньо)"}</pre>
      </div>

      <div className="card break-words">
        <div className="font-semibold mb-1">initDataUnsafe:</div>
        <pre className="whitespace-pre-wrap break-words">
          {s.initDataUnsafe ? JSON.stringify(s.initDataUnsafe, null, 2) : "(null)"}
        </pre>
      </div>

      <div className="card break-words">
        <div className="font-semibold mb-1">user:</div>
        <pre className="whitespace-pre-wrap break-words">
          {s.user ? JSON.stringify(s.user, null, 2) : "(null)"}
        </pre>
      </div>

      {s.errors.length > 0 && (
        <div className="card text-red-400">
          <div className="font-semibold mb-1">errors:</div>
          <ul className="list-disc ml-5">
            {s.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}