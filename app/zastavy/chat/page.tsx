"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getJSON, postJSON } from "@/lib/api";
import { resolveTgId } from "@/lib/tg";

// =====================
// Types (match backend)
// =====================
type ChatMessage = {
  tg_id: number;
  name: string;
  role?: string;
  text: string;
  ts: number; // unix seconds (int)
};

type ChatHistoryResponse = {
  ok: boolean;
  fort_id: number;
  fort_name: string;
  messages: ChatMessage[];
};

type SendResponse = {
  ok: boolean;
};

// optimistic (frontend only)
type PendingMsg = {
  local_id: string;
  tg_id: number;
  name: string;
  role?: string;
  text: string;
  ts: number;
};

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

function formatTimeFromUnix(ts: number): string {
  try {
    const d = new Date(ts * 1000);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

function isNearBottom(el: HTMLElement, px = 140) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < px;
}

// merge without ids (fort chat has no message ids)
function keyMsg(m: Pick<ChatMessage, "tg_id" | "ts" | "text">) {
  const t = (m.text || "").trim().slice(0, 180);
  return `${m.tg_id}|${m.ts}|${t}`;
}

function normalizeMerge(prev: ChatMessage[], incoming: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  for (const m of prev) map.set(keyMsg(m), m);
  for (const m of incoming) map.set(keyMsg(m), m);

  // sort by ts asc, stable-ish
  return Array.from(map.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

export default function ZastavaChatPage() {
  useTelegramViewportFix();
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);

  const [fortName, setFortName] = useState<string>("");
  const [fortId, setFortId] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingMsg[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const padBottomStyle = useMemo(
    () => ({
      minHeight: "var(--tg-viewport-height, 100vh)",
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
    }),
    []
  );

  // tg id init
  useEffect(() => {
    let id: number | null = null;

    const fromHook = resolveTgId();
    if (fromHook) id = fromHook;

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
      setErr("Не знайдено Telegram ID. Відкрий мініап із бота.");
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

  async function loadHistory(opts?: { silent?: boolean }) {
    if (!tgId) return;

    const el = scrollRef.current;
    const wasNear = el ? isNearBottom(el, 160) : true;

    if (!opts?.silent) {
      setLoading(true);
      setErr(null);
    }

    try {
      const data = (await getJSON(
        `/api/zastavy/chat/history?tg_id=${tgId}`
      )) as ChatHistoryResponse;

      if (!data?.ok) {
        if (!opts?.silent) setErr("Не вдалося завантажити чат застави.");
        return;
      }

      setFortName(data.fort_name || "");
      setFortId(Number(data.fort_id || 0) || null);

      const incoming = (data.messages || []).filter(Boolean);
      setMessages((prev) => normalizeMerge(prev, incoming));

      // прибираємо pending, якщо вже підтягнулося таке саме
      setPending((p) => {
        const existing = new Set(incoming.map((m) => keyMsg(m)));
        return p.filter((x) => !existing.has(keyMsg(x)));
      });

      if (wasNear) setTimeout(() => scrollToBottom(false), 20);
    } catch (e: any) {
      const raw = String(e?.message || e || "");

      // типові кейси
      if (raw.includes("NOT_IN_FORT") || raw.includes("404")) {
        setErr("🏰 Ти не в заставі. Вступи в заставу, щоб бачити цей чат.");
      } else {
        if (!opts?.silent) setErr("Помилка завантаження. Спробуй пізніше.");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  // initial + polling
  useEffect(() => {
    if (!tgId) return;

    loadHistory();

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      loadHistory({ silent: true });
    }, 4500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgId]);

  const list = useMemo(() => {
    // pending додаємо в кінець
    return [...messages, ...pending] as any[];
  }, [messages, pending]);

  async function sendMessage() {
    const text = input.trim();
    if (!tgId || !text || sending) return;

    setSending(true);
    setErr(null);

    // optimistic
    const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimistic: PendingMsg = {
      local_id: localId,
      tg_id: tgId,
      name: "Ти",
      role: undefined,
      text,
      ts: Math.floor(Date.now() / 1000),
    };

    setPending((p) => [...p, optimistic]);
    setInput("");
    setTimeout(() => scrollToBottom(true), 10);

    try {
      const resp = (await postJSON(`/api/zastavy/chat/send?tg_id=${tgId}`, {
        tg_id: tgId,
        text,
      })) as SendResponse;

      if (!resp?.ok) throw new Error("SEND_FAIL");

      // підтягнути з бекенда
      await loadHistory({ silent: true });

      // якщо бек не повернув швидко — просто приберемо pending через секунду (щоб не висіло)
      setTimeout(() => {
        setPending((p) => p.filter((x) => x.local_id !== localId));
      }, 1200);
    } catch (e: any) {
      const raw = String(e?.message || e || "");

      // прибрати pending
      setPending((p) => p.filter((x) => x.local_id !== localId));

      if (raw.includes("TOO_FAST") || raw.includes("429")) {
        setErr("⏳ Повільніше. Тут ліміт повідомлень.");
      } else if (raw.includes("NOT_IN_FORT") || raw.includes("404")) {
        setErr("🏰 Ти не в заставі. Вступи в заставу, щоб писати тут.");
      } else {
        setErr("Не вдалося надіслати повідомлення. Спробуй пізніше.");
      }

      // повернемо текст назад, щоб не пропав
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const title = fortName ? `Чат застави «${fortName}»` : "Чат застави";

  return (
    <main
      style={padBottomStyle}
      className="bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-3 py-4"
    >
      <div className="w-full max-w-xl relative flex flex-col">
        <motion.div
          className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.22),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.18),transparent_60%)]"
          animate={{ opacity: [0.18, 0.35, 0.22], scale: [1, 1.02, 1] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "mirror" }}
        />

        <div className="relative flex flex-col flex-1 rounded-3xl border border-emerald-500/15 bg-slate-950/85 shadow-xl shadow-black/60 overflow-hidden">
          {/* HEADER */}
          <header className="px-4 pt-3 pb-2 flex items-center gap-3 border-b border-slate-800/70 bg-slate-950/80">
            <button
              type="button"
              onClick={() => router.push("/zastavy")}
              className="text-xs text-slate-400 hover:text-amber-300 transition"
            >
              ← Назад
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">{title}</div>
              <div className="text-[11px] text-slate-400 truncate">
                {fortId ? `Форт #${fortId}` : "Лише для учасників застави"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="text-[11px] px-2 py-1 rounded-full border border-white/10 bg-black/20 text-slate-200/90 hover:text-amber-200 hover:border-amber-400/40 transition"
            >
              ↓ вниз
            </button>
          </header>

          {/* BODY */}
          <div className="flex-1 flex flex-col px-3 pb-2 pt-2">
            {loading && (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                Завантаження чату…
              </div>
            )}

            {!loading && err && (
              <div className="flex-1 flex flex-col items-center justify-center text-sm text-rose-300 px-4 text-center whitespace-pre-line">
                {err}
              </div>
            )}

            {!loading && !err && list.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-400 px-4 text-center">
                Тут ще тихо.
              </div>
            )}

            {!loading && !err && list.length > 0 && (
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-2 pr-1 pt-1"
              >
                {list.map((m: any, idx: number) => (
                  <ChatBubble
                    key={m.local_id ? `p-${m.local_id}` : `${m.tg_id}-${m.ts}-${idx}`}
                    msg={m}
                    currentTgId={tgId}
                  />
                ))}
              </div>
            )}

            {/* INPUT */}
            <div className="mt-2 pt-2 border-t border-slate-800/70 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Написати в чат застави…"
                  className="flex-1 rounded-2xl bg-slate-900/90 border border-slate-700/80 px-3 py-2 text-sm outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400/40"
                  disabled={!!err && (err.includes("не в заставі") || err.includes("не в заставі"))}
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || !input.trim() || !!err || !tgId}
                  className="rounded-2xl px-3 py-2 text-xs font-semibold bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 disabled:opacity-50 disabled:shadow-none transition"
                >
                  {sending ? "…" : "✉️"}
                </button>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 text-right">
                Enter — надіслати
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-center text-[11px] text-slate-500">
          Чат оновлюється автоматично.
        </div>
      </div>
    </main>
  );
}

function ChatBubble({
  msg,
  currentTgId,
}: {
  msg: ChatMessage & Partial<PendingMsg>;
  currentTgId: number | null;
}) {
  const mine = currentTgId != null && msg.tg_id === currentTgId;
  const time = formatTimeFromUnix(msg.ts);

  const role = (msg.role || "").trim();
  const showRole = role.length > 0;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={
          "max-w-[82%] rounded-2xl px-3 py-2 text-xs shadow-md " +
          (mine
            ? "bg-emerald-600/85 text-slate-50 rounded-br-sm"
            : "bg-slate-800/90 text-slate-50 rounded-bl-sm border border-slate-700/70")
        }
      >
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <div className="min-w-0 flex items-baseline gap-1">
            <span
              className={
                "text-[11px] font-semibold truncate " +
                (mine ? "text-emerald-100/90" : "text-amber-200/90")
              }
            >
              {msg.name || "Гравець"}
            </span>

            {showRole && (
              <span className={"text-[10px] truncate " + (mine ? "text-emerald-100/70" : "text-slate-300/80")}>
                · {role}
              </span>
            )}
          </div>

          <span className={"text-[10px] font-mono " + (mine ? "text-emerald-100/65" : "text-slate-400")}>
            {time}
          </span>
        </div>

        <div className="whitespace-pre-wrap break-words text-[13px]">{msg.text}</div>
      </div>
    </div>
  );
}