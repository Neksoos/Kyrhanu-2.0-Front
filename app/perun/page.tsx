"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getJSON, postJSON } from "@/lib/api";
import { resolveTgId } from "@/lib/tg";
import { ArrowLeft, Loader2, Sword, Users, Trophy, Activity } from "lucide-react";

type PerunStatusDTO = {
  ok: boolean;
  active: number;
  online: number;
  rating?: number | null;
  place?: number | null;
  season?: string | null;
};

type LadderRowDTO = {
  tg_id: number;
  name: string;
  level: number;
  rating: number;
  place: number;
};

type LadderResponseDTO = {
  ok: boolean;
  items: LadderRowDTO[];
  my_place?: number | null;
  my_rating?: number | null;
};

type QueueMeDTO = { ok: boolean; in_queue: boolean };

type QueueJoinResponseDTO = {
  ok: boolean;
  in_queue: boolean;
  matched: boolean;
  duel_id?: number | null;
};

type DuelActiveDTO = { ok: boolean; duel_id?: number | null };

function withTg(url: string, tgId: number) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}tg_id=${encodeURIComponent(String(tgId))}`;
}

function safeErr(e: any, fallback: string) {
  const msg = String(e?.message || e || "").trim();
  return msg || fallback;
}

export default function PerunPage() {
  const router = useRouter();

  const [tgId, setTgId] = useState<number>(0);

  const [status, setStatus] = useState<PerunStatusDTO | null>(null);
  const [ladder, setLadder] = useState<LadderResponseDTO | null>(null);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingLadder, setLoadingLadder] = useState(true);

  const [queueLoading, setQueueLoading] = useState(false);
  const [inQueue, setInQueue] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const title = "⚖️ Суд Перуна";

  // ✅ дістаємо tgId
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

  async function loadStatus(id = tgId) {
    if (!id) return;
    try {
      setLoadingStatus(true);
      const data = await getJSON<PerunStatusDTO>(withTg("/api/perun/status", id));
      setStatus(data);
    } catch (e: any) {
      setError(safeErr(e, "Не вдалося завантажити статус Перуна"));
    } finally {
      setLoadingStatus(false);
    }
  }

  async function loadLadder(id = tgId) {
    if (!id) return;
    try {
      setLoadingLadder(true);
      const data = await getJSON<LadderResponseDTO>(withTg("/api/perun/ladder", id));
      setLadder(data);
    } catch (e: any) {
      setError(safeErr(e, "Не вдалося завантажити драбину"));
    } finally {
      setLoadingLadder(false);
    }
  }

  async function syncQueueMe(id = tgId) {
    if (!id) return;
    try {
      const q = await getJSON<QueueMeDTO>(withTg("/api/perun/queue/me", id));
      if (q?.ok) setInQueue(!!q.in_queue);
    } catch {
      // тихо
    }
  }

  async function checkActiveDuelAndGo(id = tgId) {
    if (!id) return;
    try {
      const a = await getJSON<DuelActiveDTO>(withTg("/api/perun/duel/active", id));
      const duelId = Number(a?.duel_id || 0);
      if (a?.ok && duelId > 0) {
        router.push(`/perun/duel?duel_id=${duelId}`);
        return true;
      }
    } catch {
      // тихо
    }
    return false;
  }

  useEffect(() => {
    if (!tgId) return;
    setError(null);
    loadStatus(tgId);
    loadLadder(tgId);
    syncQueueMe(tgId);
    checkActiveDuelAndGo(tgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgId]);

  // ✅ polling: поки в черзі — перевіряємо, чи зʼявилась активна дуель
  useEffect(() => {
    if (!tgId) return;

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (!inQueue) return;

    const tick = async () => {
      await checkActiveDuelAndGo(tgId);
      await loadStatus(tgId);
    };

    tick();
    pollRef.current = setInterval(tick, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inQueue, tgId]);

  async function handleJoinQueue() {
    if (!tgId) return;
    try {
      setQueueLoading(true);
      setError(null);

      const res = await postJSON<QueueJoinResponseDTO>(withTg("/api/perun/queue/join", tgId), {});

      // якщо одразу заматчило — переходимо у дуель
      const duelId = Number(res?.duel_id || 0);
      if (res?.matched && duelId > 0) {
        setInQueue(false);
        router.push(`/perun/duel?duel_id=${duelId}`);
        return;
      }

      setInQueue(true);
      await loadStatus(tgId);
    } catch (e: any) {
      setError(safeErr(e, "Не вдалося увійти в чергу"));
    } finally {
      setQueueLoading(false);
    }
  }

  async function handleLeaveQueue() {
    if (!tgId) return;
    try {
      setQueueLoading(true);
      setError(null);

      await postJSON(withTg("/api/perun/queue/leave", tgId), {});
      setInQueue(false);
      await loadStatus(tgId);
    } catch (e: any) {
      setError(safeErr(e, "Не вдалося вийти з черги"));
    } finally {
      setQueueLoading(false);
    }
  }

  const myRating = status?.rating ?? null;
  const myPlace = status?.place ?? null;

  const statusBlocks = useMemo(() => {
    return [
      {
        label: "Активні дуелі",
        icon: <Activity className="w-3 h-3 text-emerald-300" />,
        value: status?.active ?? 0,
        valueCls: "text-emerald-300",
      },
      {
        label: "У черзі",
        icon: <Users className="w-3 h-3 text-cyan-300" />,
        value: status?.online ?? 0,
        valueCls: "text-cyan-300",
      },
      {
        label: "Твій рейтинг",
        icon: <Trophy className="w-3 h-3 text-yellow-300" />,
        value: myRating ?? "—",
        valueCls: "text-yellow-300",
      },
      {
        label: "Твоє місце",
        icon: <span className="text-[11px] text-slate-300">#</span>,
        value: myPlace ?? "—",
        valueCls: "text-slate-100",
      },
    ];
  }, [status, myRating, myPlace]);

  if (!tgId) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="text-sm text-center">
          Не вдалося визначити Telegram ID. Запусти мініап із бота.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-5">
      <div className="w-full max-w-xl space-y-4">
        <motion.header
          className="flex items-center gap-3 mb-1"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            type="button"
            onClick={() => router.push("/city")}
            className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-300 transition"
          >
            <ArrowLeft className="w-3 h-3" />
            У місто
          </button>
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-xs text-slate-400">Черга → матч → дуель. Все просто.</p>
          </div>
        </motion.header>

        <motion.section
          className="rounded-2xl border border-amber-500/30 bg-slate-950/80 shadow-lg shadow-black/60 p-4 space-y-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sword className="w-5 h-5 text-amber-300" />
              <span className="text-sm font-semibold">Статус</span>
            </div>
            {loadingStatus && <Loader2 className="w-4 h-4 animate-spin text-amber-200" />}
          </div>

          {error && (
            <div className="text-xs text-rose-400 border border-rose-500/40 rounded-xl px-3 py-2 bg-rose-900/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {statusBlocks.map((b, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-1 text-slate-300">
                  {b.icon}
                  <span>{b.label}</span>
                </div>
                <div className={"text-lg font-semibold " + b.valueCls}>{b.value as any}</div>
              </div>
            ))}
          </div>

          {status?.season && (
            <div className="text-[11px] text-amber-200/80">
              Сезон: <span className="font-semibold">{status.season}</span>
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleJoinQueue}
              disabled={queueLoading || inQueue}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold py-2.5 disabled:opacity-60 active:scale-95"
            >
              {queueLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Увійти в чергу
            </button>

            <button
              type="button"
              onClick={handleLeaveQueue}
              disabled={queueLoading || !inQueue}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 text-sm font-medium text-slate-100 py-2.5 disabled:opacity-40 active:scale-95"
            >
              Вийти
            </button>
          </div>

          {inQueue && (
            <div className="mt-1 text-[11px] text-emerald-300">
              Ти в черзі. Якщо суперник знайдеться — тебе перекине в дуель автоматично.
            </div>
          )}

          {!inQueue && (
            <button
              type="button"
              onClick={() => checkActiveDuelAndGo(tgId)}
              className="w-full mt-2 rounded-xl border border-slate-700 bg-slate-900/70 py-2 text-xs text-slate-200 hover:border-amber-400 hover:text-amber-200 transition"
            >
              Перевірити активну дуель
            </button>
          )}
        </motion.section>

        <motion.section
          className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-lg shadow-black/60 p-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-300" />
              <span className="text-sm font-semibold">Драбина</span>
            </div>
            {loadingLadder && <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
          </div>

          {!loadingLadder && ladder && ladder.items.length === 0 && (
            <div className="text-xs text-slate-400">Поки що порожньо.</div>
          )}

          {!loadingLadder && ladder && ladder.items.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/80">
              <div className="grid grid-cols-[40px,1fr,70px,60px] gap-2 px-3 py-2 text-[11px] text-slate-400 border-b border-slate-800">
                <div>#</div>
                <div>Гравець</div>
                <div className="text-right">Рейт</div>
                <div className="text-right">Рів</div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {ladder.items.map((row) => (
                  <div
                    key={row.tg_id}
                    className="grid grid-cols-[40px,1fr,70px,60px] gap-2 px-3 py-1.5 text-[12px] text-slate-100 border-b border-slate-800/60 last:border-b-0"
                  >
                    <div className="text-slate-400">{row.place}</div>
                    <div className="truncate">
                      <span className="font-medium">{row.name}</span>
                    </div>
                    <div className="text-right text-amber-300">{row.rating}</div>
                    <div className="text-right text-slate-200">{row.level}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ladder && (ladder.my_place || ladder.my_rating) && (
            <div className="mt-3 text-[11px] text-slate-300">
              Ти: <span className="font-semibold">#{ladder.my_place ?? "—"}</span>
              {" · "}
              рейтинг: <span className="font-semibold">{ladder.my_rating ?? "—"}</span>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!tgId) return;
                setError(null);
                loadStatus(tgId);
                loadLadder(tgId);
              }}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900/70 py-2 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-200 transition"
            >
              Оновити
            </button>
          </div>
        </motion.section>
      </div>
    </main>
  );
}