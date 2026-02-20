"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getJSON, postJSON } from "@/lib/api";
import { resolveTgId } from "@/lib/tg";
import {
  ArrowLeft,
  Loader2,
  Swords,
  HeartPulse,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";

// ✅ outer wrapper: no useSearchParams here
export default function PerunDuelPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
          <div className="inline-flex items-center gap-2 text-sm text-slate-200">
            <Loader2 className="w-4 h-4 animate-spin" />
            Завантаження…
          </div>
        </main>
      }
    >
      <PerunDuelInner />
    </Suspense>
  );
}

// -------------------- types --------------------
type DuelState = {
  p1?: number;
  p2?: number;

  // ✅ names from backend
  p1_name?: string;
  p2_name?: string;
  p1_level?: number;
  p2_level?: number;

  hp1?: number;
  hp2?: number;

  max_hp?: number;
  max_hp1?: number;
  max_hp2?: number;

  turn?: number; // tg_id
  state?: "active" | "finished" | string;

  last?: string | null;
  winner?: number | null;
  loser?: number | null;
};

type DuelStateResp = {
  ok: boolean;
  state?: DuelState;
  event?: string;
  error?: string;
  duel_id?: number | null;
};

type DuelActiveDTO = { ok: boolean; duel_id?: number | null };

// -------------------- helpers --------------------
function safeErr(e: any, fallback: string) {
  const msg = String(e?.message || e || "").trim();
  return msg || fallback;
}

function withQuery(
  url: string,
  params: Record<string, string | number | undefined | null>
) {
  const u = new URL(url, "http://local");
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.searchParams.set(k, String(v));
  }
  return u.pathname + (u.search ? u.search : "");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function parseLast(last: any): {
  kind: "hit" | "heal" | "other";
  value?: number;
  text: string;
} {
  const s = String(last ?? "").trim();
  if (!s) return { kind: "other", text: "" };

  if (s.startsWith("hit:")) {
    const m = s.match(/^hit:(\d+)/);
    const v = m ? Number(m[1]) : undefined;
    return { kind: "hit", value: v, text: s };
  }
  if (s.startsWith("heal:")) {
    const m = s.match(/^heal:(\d+)/);
    const v = m ? Number(m[1]) : undefined;
    return { kind: "heal", value: v, text: s };
  }
  return { kind: "other", text: s };
}

// ✅ inner component: useSearchParams allowed (wrapped by Suspense above)
function PerunDuelInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [tgId, setTgId] = useState<number>(0);
  const [duelId, setDuelId] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<
    "attack" | "heal" | "surrender" | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const [st, setSt] = useState<DuelState | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tgId (для UI; бек бере з initData через lib/api.ts)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let id = 0;

      try {
        const maybe = await resolveTgId();
        if (typeof maybe === "number" && maybe > 0) id = maybe;
      } catch {}

      if (!id && typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("tg_id");
          const n = Number(saved);
          if (Number.isFinite(n) && n > 0) id = n;
        } catch {}
      }

      if (!cancelled) {
        setTgId(id);
        if (id && typeof window !== "undefined") {
          try {
            localStorage.setItem("tg_id", String(id));
          } catch {}
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // duel_id from query
  useEffect(() => {
    const q = sp.get("duel_id");
    const n = Number(q || 0);
    if (Number.isFinite(n) && n > 0) setDuelId(n);
  }, [sp]);

  async function ensureDuelId(): Promise<number> {
    if (duelId > 0) return duelId;

    try {
      const a = await getJSON<DuelActiveDTO>("/api/perun/duel/active");
      const id = Number(a?.duel_id || 0);
      if (a?.ok && id > 0) {
        setDuelId(id);
        router.replace(`/perun/duel?duel_id=${id}`);
        return id;
      }
      router.replace("/perun");
      return 0;
    } catch (e: any) {
      setError(safeErr(e, "Не вдалося знайти активну дуель (GET /api/perun/duel/active)"));
      return 0;
    }
  }

  async function loadState(forceDuelId?: number) {
    const id = forceDuelId || duelId || (await ensureDuelId());
    if (!id) return;

    setError(null);
    try {
      const url = withQuery("/api/perun/duel/state", { duel_id: id });
      const res = await getJSON<DuelStateResp>(url);

      if (!res?.ok) throw new Error(res?.error || "bad_response");

      setSt(res.state || null);

      const backId = Number(res?.duel_id || 0);
      if (!duelId && backId > 0) setDuelId(backId);

      setLoading(false);
    } catch (e: any) {
      setLoading(false);
      setError(safeErr(e, "Не вдалося завантажити стан дуелі (GET /api/perun/duel/state)"));
    }
  }

  useEffect(() => {
    setLoading(true);
    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!duelId) return;
    loadState(duelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId]);

  useEffect(() => {
    if (!duelId) return;

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    const isActive = (st?.state || "active") !== "finished";
    if (!isActive) return;

    const tick = async () => {
      await loadState(duelId);
    };

    tick();
    pollRef.current = setInterval(tick, 1500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId, st?.state]);

  async function act(kind: "attack" | "heal" | "surrender") {
    if (!duelId) return;
    try {
      setActing(kind);
      setError(null);

      const url = withQuery(`/api/perun/duel/${kind}`, { duel_id: duelId });
      const res = await postJSON<DuelStateResp>(url, {});

      if (!res?.ok) throw new Error(res?.error || "action_failed");

      if (res.state) setSt(res.state);
      await loadState(duelId);
    } catch (e: any) {
      setError(safeErr(e, `Дія не спрацювала (POST /api/perun/duel/${kind})`));
    } finally {
      setActing(null);
    }
  }

  const p1 = Number(st?.p1 || 0);
  const p2 = Number(st?.p2 || 0);

  const meIsP1 = tgId && p1 === tgId;
  const meIsP2 = tgId && p2 === tgId;

  const myHp = meIsP1 ? Number(st?.hp1 || 0) : meIsP2 ? Number(st?.hp2 || 0) : 0;
  const oppHp = meIsP1 ? Number(st?.hp2 || 0) : meIsP2 ? Number(st?.hp1 || 0) : 0;

  const myMax =
    meIsP1
      ? Number(st?.max_hp1 || st?.max_hp || 1)
      : meIsP2
      ? Number(st?.max_hp2 || st?.max_hp || 1)
      : Number(st?.max_hp || 1);

  const oppMax =
    meIsP1
      ? Number(st?.max_hp2 || st?.max_hp || 1)
      : meIsP2
      ? Number(st?.max_hp1 || st?.max_hp || 1)
      : Number(st?.max_hp || 1);

  const turn = Number(st?.turn || 0);
  const myTurn = tgId && turn === tgId;

  const finished = (st?.state || "") === "finished";
  const winner = Number(st?.winner || 0);

  const last = parseLast(st?.last);

  const myPct = useMemo(() => clamp((myHp / (myMax || 1)) * 100, 0, 100), [myHp, myMax]);
  const oppPct = useMemo(() => clamp((oppHp / (oppMax || 1)) * 100, 0, 100), [oppHp, oppMax]);

  const myName =
    meIsP1 ? (st?.p1_name || `tg:${tgId}`) :
    meIsP2 ? (st?.p2_name || `tg:${tgId}`) :
    `tg:${tgId}`;

  const oppName =
    meIsP1 ? (st?.p2_name || (p2 ? `tg:${p2}` : "—")) :
    meIsP2 ? (st?.p1_name || (p1 ? `tg:${p1}` : "—")) :
    (st?.p1_name || st?.p2_name || "—");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-xl space-y-4">
        <motion.header
          className="flex items-center justify-between gap-3"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            type="button"
            onClick={() => router.replace("/perun")}
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-300 transition"
          >
            <ArrowLeft className="w-3 h-3" />
            Назад у Суд Перуна
          </button>

          <button
            type="button"
            onClick={() => loadState(duelId)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 hover:border-amber-400 hover:text-amber-200 transition"
          >
            <RefreshCw className="w-3 h-3" />
            Оновити
          </button>
        </motion.header>

        <motion.section
          className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-lg shadow-black/60 p-4 space-y-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-300" />
              <div>
                <div className="text-sm font-semibold">Дуель Перуна</div>
                <div className="text-[11px] text-slate-400">
                  duel_id:{" "}
                  <span className="text-slate-200 font-semibold">{duelId || "—"}</span>
                </div>
              </div>
            </div>

            {(loading || acting) && (
              <div className="inline-flex items-center gap-2 text-xs text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                {acting ? "Дія..." : "Завантаження..."}
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-rose-400 border border-rose-500/40 rounded-xl px-3 py-2 bg-rose-900/20">
              {error}
            </div>
          )}

          <AnimatePresence>
            {finished && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3"
              >
                <div className="text-sm font-semibold text-amber-200">Дуель завершено</div>
                <div className="text-xs text-slate-200 mt-1">
                  Переможець:{" "}
                  <span className="font-semibold">
                    {winner ? (winner === tgId ? "ти" : "суперник") : "—"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => router.replace("/perun")}
                  className="mt-3 w-full rounded-xl bg-emerald-500 text-slate-950 font-semibold py-2 text-sm active:scale-95"
                >
                  Повернутися у Суд Перуна
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="text-slate-200">Ти: <span className="text-slate-300 font-semibold">{myName}</span></div>
                <div className="text-slate-300">{myHp}/{myMax}</div>
              </div>
              <div className="h-3 w-full rounded-xl bg-black/40 overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${myPct}%` }}
                  transition={{ duration: 0.35 }}
                  className="h-full bg-emerald-400/90"
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Хід:{" "}
                <span className={myTurn ? "text-emerald-300 font-semibold" : "text-slate-200"}>
                  {myTurn ? "твій" : "суперника"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="text-slate-200">Суперник: <span className="text-slate-300 font-semibold">{oppName}</span></div>
                <div className="text-slate-300">{oppHp}/{oppMax}</div>
              </div>
              <div className="h-3 w-full rounded-xl bg-black/40 overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${oppPct}%` }}
                  transition={{ duration: 0.35 }}
                  className="h-full bg-rose-400/90"
                />
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Стан:{" "}
                <span className={finished ? "text-amber-200 font-semibold" : "text-slate-200"}>
                  {finished ? "завершено" : "активна"}
                </span>
              </div>
            </div>
          </div>

          {st?.last && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2">
              <div className="text-[11px] text-slate-400 mb-1">Остання дія</div>
              <div className="text-xs text-slate-100 flex items-center gap-2">
                {last.kind === "hit" && <Swords className="w-4 h-4 text-rose-300" />}
                {last.kind === "heal" && <HeartPulse className="w-4 h-4 text-emerald-300" />}
                {last.kind === "other" && <ShieldAlert className="w-4 h-4 text-slate-300" />}
                <span className="break-all">{last.text}</span>
              </div>
            </div>
          )}

          {!finished && (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => act("attack")}
                disabled={!!acting || !myTurn}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-slate-950 font-semibold py-2 text-sm disabled:opacity-50 active:scale-95"
              >
                {acting === "attack" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                Атака
              </button>

              <button
                type="button"
                onClick={() => act("heal")}
                disabled={!!acting || !myTurn}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold py-2 text-sm disabled:opacity-50 active:scale-95"
              >
                {acting === "heal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <HeartPulse className="w-4 h-4" />}
                Лікування
              </button>

              <button
                type="button"
                onClick={() => act("surrender")}
                disabled={!!acting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/50 bg-rose-900/20 text-rose-200 font-semibold py-2 text-sm disabled:opacity-50 active:scale-95"
              >
                {acting === "surrender" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                Здатися
              </button>
            </div>
          )}

          {!finished && (
            <div className="text-[11px] text-slate-400">
              Якщо “не твій хід” — просто чекай, сторінка оновлює стан автоматично.
            </div>
          )}
        </motion.section>
      </div>
    </main>
  );
}