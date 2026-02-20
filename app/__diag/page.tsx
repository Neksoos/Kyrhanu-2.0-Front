"use client";

import { useEffect, useState } from "react";
import { API_BASE, API_DEBUG, ping } from "@/lib/api";

type ScanResp = {
  summary: {
    runtimeEnv_NOW: { NEXT_PUBLIC_API_BASE: string | null; NODE_ENV: string | null };
    backendHost_EXPECTED: string | null;
    note?: string | null;
  };
  hits: { file: string; size: number; hasLocalhost: boolean; hasBackend: boolean }[];
};

type TgInfo = {
  hasWebApp: boolean;
  hasInitData: boolean;
  userId: number | null;
  initDataRaw: string | null;
  hash: string;
  search: string;
  ua: string;
  origin: string;
};

export default function DiagPage() {
  const [scan, setScan] = useState<ScanResp | null>(null);
  const [health, setHealth] = useState<string>("…");
  const [err, setErr] = useState<string | null>(null);
  const [tg, setTg] = useState<TgInfo | null>(null);

  useEffect(() => {
    // — TG block —
    try {
      const wa = (window as any)?.Telegram?.WebApp;
      if (wa?.ready) {
        wa.ready();
        wa.expand?.();
      }
      const user = (wa?.initDataUnsafe as any)?.user ?? null;
      const userId = typeof user?.id === "number" ? (user.id as number) : null;
      const initDataRaw = (wa?.initData as string) ?? null;

      setTg({
        hasWebApp: !!wa,
        hasInitData: !!initDataRaw,
        userId,
        initDataRaw,
        hash: window.location.hash,
        search: window.location.search,
        ua: navigator.userAgent,
        origin: window.location.origin,
      });
    } catch {
      setTg({
        hasWebApp: false,
        hasInitData: false,
        userId: null,
        initDataRaw: null,
        hash: window.location.hash,
        search: window.location.search,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "ssr",
        origin: typeof window !== "undefined" ? window.location.origin : "ssr",
      });
    }

    // — backend / health —
    ping()
      .then(() => setHealth("OK"))
      .catch((e) => setHealth("FAIL: " + String(e)));

    // — scan (optional api route) —
    fetch("/api/diag/scan")
      .then((r) => (r.ok ? r.json() : Promise.reject(`${r.status} ${r.statusText}`)))
      .then(setScan)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <main className="max-w-md mx-auto p-4 space-y-4" style={{ fontFamily: "ui-monospace, monospace" }}>
      <h1 className="text-xl font-semibold">__diag</h1>

      <section className="card space-y-1">
        <div>origin: <b>{tg?.origin ?? "…"}</b></div>
        <div>userAgent: <small>{tg?.ua ?? "…"}</small></div>
        <div>search: <small>{tg?.search || "(empty)"}</small></div>
        <div>hash: <small>{tg?.hash || "(empty)"}</small></div>
      </section>

      <section className="card space-y-1">
        <div>WebApp API: <b>{tg?.hasWebApp ? "yes" : "no"}</b></div>
        <div>initData present: <b>{tg?.hasInitData ? "yes" : "no"}</b></div>
        <div>user.id: <b>{tg?.userId ?? "null"}</b></div>
      </section>

      <section className="card space-y-1">
        <div>API_BASE: <b>{API_BASE}</b></div>
        <div>API_DEBUG: <b>{String(API_DEBUG)}</b></div>
        <div>Backend /health: <b>{health}</b></div>
      </section>

      <section className="card">
        <div className="font-medium mb-1">Env summary</div>
        {!scan ? (
          <div>scan…</div>
        ) : (
          <>
            <pre className="text-xs whitespace-pre-wrap break-all">
{JSON.stringify(scan.summary, null, 2)}
            </pre>
            {scan.hits?.length > 0 && (
              <ol className="text-sm list-decimal pl-5">
                {scan.hits.map((h, i) => (
                  <li key={i}>
                    <code>{h.file}</code> • {Math.round(h.size / 1024)} kB
                    {h.hasLocalhost ? " • ⚠ localhost" : ""}{h.hasBackend ? " • ✓ backendHost" : ""}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        {err && <div className="mt-2 text-red-500 text-sm">/api/diag/scan error: {err}</div>}
      </section>

      <section className="card text-sm">
        <div className="font-medium mb-1">Hints</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>Відкривай MiniApp з чату бота (кнопка MiniApp), не напряму в браузері.</li>
          <li>У BotFather → <i>Main App</i> вказано твій Railway фронт.</li>
          <li>Перевір <code>NEXT_PUBLIC_API_BASE</code> у фронті → має вказувати на бек.</li>
        </ul>
      </section>
    </main>
  );
}