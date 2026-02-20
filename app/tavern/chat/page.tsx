"use client";

import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { resolveTgId } from "@/lib/tg";
import { getJSON, postJSON } from "@/lib/api";

// =====================
// Types (match backend)
// =====================
type ChatMessage = {
  id: number;
  tg_id: number;
  name: string;
  text: string;
  created_at: number; // unix seconds (float ok)
  system?: boolean;
};

type HistoryResponse = {
  ok: boolean;
  room?: string;
  messages: ChatMessage[];
  last_id: number;
  online: number;
};

type SendResponse = {
  ok: boolean;
  message?: ChatMessage;
  online?: number;
};

type PendingMsg = {
  local_id: string;
  tg_id: number;
  name: string;
  text: string;
  created_at: number;
  system?: boolean;
};

// =====================
// Helpers
// =====================
function normalizeMessages(list: ChatMessage[]): ChatMessage[] {
  const byId = new Map<number, ChatMessage>();
  for (const m of list) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (!incoming.length) return prev;
  return normalizeMessages([...prev, ...incoming]);
}

function formatTime(ts: number): string {
  try {
    const d = new Date(ts * 1000);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

function useTelegramViewportFix() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const wa = (window as any)?.Telegram?.WebApp;
    try {
      wa?.ready?.();
      wa?.expand?.();
    } catch {}

    const apply = () => {
      const h = wa?.viewportHeight || window.visualViewport?.height || window.innerHeight || 0;
      if (h) document.documentElement.style.setProperty("--tg-viewport-height", `${h}px`);
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener?.("resize", apply);
    vv?.addEventListener?.("scroll", apply);
    window.addEventListener("resize", apply);

    return () => {
      vv?.removeEventListener?.("resize", apply);
      vv?.removeEventListener?.("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);
}

function isNearBottom(el: HTMLElement, px = 120) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < px;
}

// =====================
// Page
// =====================
export default function TavernChatPage() {
  useTelegramViewportFix();
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingMsg[]>([]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<number>(0);

  const lastIdRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const padBottomStyle = useMemo(
    () => ({
      minHeight: "var(--tg-viewport-height, 100vh)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
    }),
    []
  );

  // tg_id init
  useEffect(() => {
    let id: number | null = null;

    const fromTg = resolveTgId();
    if (fromTg) id = fromTg;

    if (!id && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("tg_id");
        if (raw) {
          const n = Number(raw);
          if (Number.isFinite(n) && n > 0) id = n;
        }
      } catch {}
    }

    if (!id) {
      setError("Не вдалося визначити Telegram ID. Відкрий мініап із бота.");
      setLoading(false);
      return;
    }

    setTgId(id);
  }, []);

  const scrollToBottom = (smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollHeight;
    if (smooth) el.scrollTo({ top, behavior: "smooth" });
    else el.scrollTop = top;
  };

  async function loadHistory(sinceId: number, opts?: { silent?: boolean }) {
    if (!tgId) return;
    const el = scrollRef.current;
    const wasNearBottom = el ? isNearBottom(el, 140) : true;

    if (!opts?.silent) setLoading(true);

    try {
      // ✅ новий бек: since_id або after; залишаю after для сумісності
      const resp = await getJSON<HistoryResponse>(
        `/chat/tavern/history?tg_id=${tgId}&since_id=${sinceId}&after=${sinceId}&limit=50`
      );

      if (!resp?.ok) {
        if (!opts?.silent) setError("Чат тимчасово недоступний");
        return;
      }

      const incoming = normalizeMessages(resp.messages || []);
      setMessages((prev) => mergeMessages(prev, incoming));

      if (incoming.length) lastIdRef.current = incoming[incoming.length - 1].id;
      setOnline(Number(resp.online || 0));

      // автоскрол тільки якщо користувач був біля низу
      if (wasNearBottom && (incoming.length || !sinceId)) {
        setTimeout(() => scrollToBottom(false), 20);
      }
    } catch {
      if (!opts?.silent) setError("Помилка завантаження чату");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  // initial history
  useEffect(() => {
    if (!tgId) return;
    let cancelled = false;

    (async () => {
      setError(null);
      await loadHistory(0);
      if (!cancelled) {
        // після першого лоада — прибираємо pending (якщо було зі старого стану)
        setPending((p) => p.slice(-0));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgId]);

  // polling
  useEffect(() => {
    if (!tgId) return;
    if (pollingRef.current) return;

    const tick = async () => {
      const since = lastIdRef.current || 0;
      await loadHistory(since, { silent: true });
    };

    pollingRef.current = setInterval(tick, 3000);
    tick();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgId]);

  const showList = useMemo(() => {
    // показуємо pending в кінці, але не дублюємо якщо вже є такий текст+час приблизно
    return [...messages, ...pending.map((p) => ({ ...p, id: 0 }))] as any[];
  }, [messages, pending]);

  const handleSend = async () => {
    if (!tgId) return;
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    // оптимістично
    const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimistic: PendingMsg = {
      local_id: localId,
      tg_id: tgId,
      name: "Ти",
      text,
      created_at: Date.now() / 1000,
      system: false,
    };

    setPending((p) => [...p, optimistic]);
    setInput("");
    setTimeout(() => scrollToBottom(true), 10);

    try {
      const resp = await postJSON<SendResponse>(`/chat/tavern/send?tg_id=${tgId}`, {
        tg_id: tgId,
        text,
      });

      if (!resp?.ok) {
        throw new Error("SEND_FAIL");
      }

      if (typeof resp.online === "number") setOnline(resp.online);

      // прибираємо optimistic
      setPending((p) => p.filter((x) => x.local_id !== localId));

      // підтягнути нові
      const since = lastIdRef.current || 0;
      await loadHistory(since, { silent: true });
    } catch (e: any) {
      const msg = String(e?.message || e || "");

      // прибираємо optimistic
      setPending((p) => p.filter((x) => x.local_id !== localId));

      if (msg.includes("TOO_FAST")) {
        setError("⏳ Повільніше. Зачекай секунду між повідомленнями.");
      } else if (msg.includes("MUTED")) {
        setError("🔇 Тобі тимчасово заборонено писати в чат.");
      } else if (msg.includes("429")) {
        setError("⏳ Занадто швидко. Спробуй ще раз за мить.");
      } else {
        setError("Помилка надсилання. Спробуй пізніше.");
      }

      // повертаємо текст у поле (щоб не пропало)
      setInput(text);
    } finally {
      setSending(false);
      setTimeout(() => scrollToBottom(false), 20);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!tgId && !loading && error) {
    return (
      <main
        style={padBottomStyle}
        className="bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex items-center justify-center px-4 py-6"
      >
        <div className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-black/80 p-5 text-sm space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-rose-300/80">
            ПОМИЛКА ВХОДУ В КОРЧМУ
          </div>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-slate-900/90 border border-slate-700/80 px-3 py-2 text-xs font-semibold hover:border-amber-400/80 hover:text-amber-200 transition"
          >
            ⬅ Повернутися у місто
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      style={padBottomStyle}
      className="bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-3 py-4"
    >
      <div className="w-full max-w-2xl flex flex-col rounded-2xl border border-slate-800/80 bg-slate-950/90 shadow-xl shadow-black/70 overflow-hidden">
        {/* HEADER */}
        <motion.header
          className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-800/80 bg-slate-950/95"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/tavern")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/80 text-sm hover:border-amber-400/80 hover:text-amber-200 transition"
            >
              ⬅
            </button>
            <div>
              <div className="text-sm sm:text-base font-semibold">🍺 Корчма</div>
              <div className="text-[10px] sm:text-xs text-slate-400">
                Онлайн: <span className="text-emerald-200 font-semibold">{online}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="text-[11px] px-2 py-1 rounded-full border border-white/10 bg-black/25 text-slate-200/90 hover:text-amber-200 hover:border-amber-400/40 transition"
          >
            ↓ вниз
          </button>
        </motion.header>

        {/* MESSAGES */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-[50vh] max-h-[75vh] overflow-y-auto px-3 sm:px-4 py-3 space-y-2 bg-gradient-to-b from-slate-950/95 via-slate-950/90 to-slate-950/98"
        >
          {loading && (
            <div className="text-xs text-slate-400 text-center mt-4">
              Завантаження чату…
            </div>
          )}

          {!loading && messages.length === 0 && !error && (
            <div className="text-xs text-slate-500 text-center mt-4">
              Поки що тут тихо.
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-300 text-center mb-2 whitespace-pre-line">
              {error}
            </div>
          )}

          {showList.map((m: any, idx: number) => {
            const isMe = tgId && m.tg_id === tgId && !m.system;
            const isSystem = !!m.system || m.tg_id === 0;

            if (isSystem) {
              return (
                <div key={`sys-${m.id || idx}`} className="flex justify-center">
                  <div className="text-[11px] text-slate-300/80 px-3 py-1 rounded-full border border-white/10 bg-black/25">
                    {m.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id ? `m-${m.id}` : `p-${m.local_id || idx}`}
                className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-3 py-2 text-xs sm:text-sm shadow-md ${
                    isMe
                      ? "bg-emerald-600/80 text-slate-50 rounded-br-sm"
                      : "bg-slate-800/90 text-slate-50 rounded-bl-sm"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <div
                      className={`text-[10px] font-semibold truncate ${
                        isMe ? "text-emerald-100/85" : "text-amber-200/85"
                      }`}
                    >
                      {m.name}
                    </div>
                    <div className="text-[10px] text-slate-200/55 font-mono shrink-0">
                      {formatTime(Number(m.created_at || m.ts || 0))}
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* INPUT */}
        <div className="border-t border-slate-800/80 bg-slate-950/95 px-3 sm:px-4 py-2 sm:py-3 space-y-2">
          <div className="flex items-end gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напиши в чат…"
              className="flex-1 rounded-xl bg-slate-900/90 border border-slate-700/80 px-3 py-2 text-xs sm:text-sm outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400/60"
            />
            <motion.button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="inline-flex items-center justify-center rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600/90 hover:bg-emerald-500/90 text-slate-50 shadow-md shadow-emerald-700/40"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {sending ? "…" : "✉️"}
            </motion.button>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full inline-flex items-center justify-center rounded-xl bg-slate-900/90 border border-slate-700/80 px-3 py-2 text-xs sm:text-sm font-semibold hover:border-amber-400/80 hover:text-amber-200 transition"
          >
            ⬅ Повернутися у місто
          </button>
        </div>
      </div>
    </main>
  );
}