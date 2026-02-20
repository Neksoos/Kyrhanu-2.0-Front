"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { postJSON } from "@/lib/api";
import { useRoamingNpc } from "./useRoamingNpc";

type Props = {
  tgId: number;
  level: number;
  screenKey: string; // напр. "city", "areas", "zastava"
};

function normalizeKeyForFile(k: string) {
  // "Berehynia Oksana" -> "berehynia_oksana"
  return String(k || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function buildNpcImageCandidates(npcKey: string) {
  const raw = String(npcKey || "").trim();
  const norm = normalizeKeyForFile(raw);

  const uniq = new Set<string>();

  // якщо бек вже віддає з .png
  if (raw && raw.toLowerCase().endsWith(".png")) {
    uniq.add(`/npc/${encodeURIComponent(raw)}`);
  }

  // базові варіанти
  if (raw) {
    uniq.add(`/npc/${encodeURIComponent(raw)}.png`);
    uniq.add(`/npc/${encodeURIComponent(raw)}`);
  }

  // нормалізовані варіанти (часто саме так названі файли)
  if (norm) {
    uniq.add(`/npc/${encodeURIComponent(norm)}.png`);
    uniq.add(`/npc/${encodeURIComponent(norm)}`);
  }

  // на випадок, якщо бек шле "npc/berehynia_oksana" або "/npc/..."
  const stripped = raw.replace(/^\/+/, "").replace(/^npc\//i, "").replace(/^\/?npc\//i, "");
  const strippedNorm = normalizeKeyForFile(stripped);

  if (stripped) {
    if (stripped.toLowerCase().endsWith(".png")) uniq.add(`/npc/${encodeURIComponent(stripped)}`);
    uniq.add(`/npc/${encodeURIComponent(stripped)}.png`);
    uniq.add(`/npc/${encodeURIComponent(stripped)}`);
  }

  if (strippedNorm) {
    uniq.add(`/npc/${encodeURIComponent(strippedNorm)}.png`);
    uniq.add(`/npc/${encodeURIComponent(strippedNorm)}`);
  }

  return Array.from(uniq);
}

/**
 * Плаваюча панель з мандрівним NPC:
 * - автоматично викликає useRoamingNpc()
 * - показує картку з іменем / регіоном / фразами
 * - кнопки: «Прийняти», «Відмовитись», «Закрити»
 * - ✅ показує фото NPC з /public/npc/*
 * - ✅ не ламається, якщо npc.key не 1-в-1 як назва файлу
 */
export default function RoamingNpcOverlay({ tgId, level, screenKey }: Props) {
  const { npc, loading, clearNpc } = useRoamingNpc({ tgId, level, screenKey });
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  // img fallback chain
  const [imgIdx, setImgIdx] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  // якщо нічого не заспавнилось — нічого не малюємо
  if (!npc) return null;

  const candidates = useMemo(() => buildNpcImageCandidates(npc.key), [npc.key]);
  const activeSrc = candidates[imgIdx] || "";

  useEffect(() => {
    // коли приходить інший npc — скидаємо стан картинки
    setImgIdx(0);
    setImgFailed(false);
  }, [npc.key]);

  const fallbackLetter = useMemo(() => {
    const s = (npc.name || npc.key || "?").trim();
    return (s[0] || "?").toUpperCase();
  }, [npc.name, npc.key]);

  const handleAccept = async () => {
    if (busy || resultMsg) return;
    setBusy(true);
    try {
      const resp: any = await postJSON(`/api/npc/${encodeURIComponent(npc.key)}/accept`, {
        tg_id: tgId,
      });
      setResultMsg(resp?.message || "Квест прийнято.");
    } catch (e) {
      console.error("npc accept error", e);
      setResultMsg("Не вдалось прийняти квест.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (busy || resultMsg) return;
    setBusy(true);
    try {
      const resp: any = await postJSON(`/api/npc/${encodeURIComponent(npc.key)}/decline`, {
        tg_id: tgId,
      });
      setResultMsg(resp?.message || "Ти відмовився.");
    } catch (e) {
      console.error("npc decline error", e);
      setResultMsg("Не вдалось відмовитись.");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setResultMsg(null);
    setImgIdx(0);
    setImgFailed(false);
    clearNpc();
  };

  const onImgError = () => {
    const nextIdx = imgIdx + 1;
    if (nextIdx < candidates.length) {
      setImgIdx(nextIdx);
      return;
    }
    setImgFailed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-end justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* фон (клікабельний) */}
        <div
          className="absolute inset-0 bg-black/40 pointer-events-auto"
          onClick={busy ? undefined : handleClose}
        />

        {/* картка NPC */}
        <motion.div
          className="relative mb-4 mx-2 w-full max-w-md pointer-events-auto rounded-2xl bg-slate-900/95 border border-slate-700 shadow-xl p-4 text-slate-100"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-start gap-3 min-w-0">
              {/* ✅ Фото NPC */}
              <div className="shrink-0">
                {!imgFailed && activeSrc ? (
                  <Image
                    src={activeSrc}
                    alt={npc.name || "NPC"}
                    width={56}
                    height={56}
                    className="rounded-xl object-cover border border-slate-700/80 bg-black/20"
                    onError={onImgError}
                    priority={false}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-slate-700/80 bg-black/20 flex items-center justify-center text-slate-200 font-semibold">
                    {fallbackLetter}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-emerald-400/80">
                  Мандрівний NPC
                </div>

                <div className="text-lg font-semibold truncate">
                  {npc.name}
                  {npc.region ? (
                    <span className="ml-2 text-xs font-normal text-slate-300/70">
                      · {npc.region}
                    </span>
                  ) : null}
                </div>

                {/* для дебагу (можеш прибрати): який шлях пробуємо */}
                {/* <div className="text-[10px] opacity-50 mt-1 truncate">{activeSrc}</div> */}
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="text-xs text-slate-400 hover:text-slate-200 shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-sm leading-relaxed">
            {npc.greet && <p className="text-emerald-200/90">«{npc.greet}»</p>}
            {npc.offer && <p className="text-slate-100/90">«{npc.offer}»</p>}

            {resultMsg && (
              <p className="mt-1 text-xs text-amber-300/90 border-t border-slate-700/60 pt-2">
                {resultMsg}
              </p>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={busy || !!resultMsg}
              className="flex-1 rounded-xl py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              ✅ Прийняти
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={busy || !!resultMsg}
              className="flex-1 rounded-xl py-2 text-sm font-semibold bg-slate-700 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              ❌ Відмовитись
            </button>
          </div>

          {loading && !resultMsg && (
            <div className="mt-2 text-[11px] text-slate-400 text-right">Шукаю квест…</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}