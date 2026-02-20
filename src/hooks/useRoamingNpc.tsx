"use client";

import { useCallback, useEffect, useState } from "react";
import { postJSON } from "@/lib/api";

// ───────────────────────────────────────────────────────────────
// Типи під відповіді бекенду
// ───────────────────────────────────────────────────────────────

type SpawnNPC = {
  key: string;
  name: string;
  region?: string | null;
  tags: string[];
  accent_notes?: string | null;
};

type SpawnResponse = {
  ok: boolean;
  npc: SpawnNPC | null;
};

type EncounterNPCInfo = {
  key: string;
  name: string;
  region?: string | null;
};

type EncounterResponse = {
  npc: EncounterNPCInfo;
  greet: string;
  offer: string;
};

type ResultResponse = {
  ok: boolean;
  message: string;
};

type TipResponse = {
  tip: string;
};

// ───────────────────────────────────────────────────────────────
// ХУК: useRoamingNpc
// ───────────────────────────────────────────────────────────────

type UseRoamingNpcArgs = {
  tgId: number;          // Telegram ID гравця
  level: number;         // поточний рівень
  screenKey: string;     // логічний екран: "city", "areas", "zastava", "tavern" і т.д.
};

export function useRoamingNpc({ tgId, level, screenKey }: UseRoamingNpcArgs) {
  const [spawnedNpc, setSpawnedNpc] = useState<SpawnNPC | null>(null);
  const [dialog, setDialog] = useState<EncounterResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── запрос на спавн NPC при оновленні екрана ─────────────────

  const checkSpawn = useCallback(async () => {
    setError(null);
    try {
      const body = {
        tg_id: tgId,
        level,
        screen_key: screenKey,
      };

      const res = await postJSON<SpawnResponse>("/api/npc/spawn", body);
      if (res?.ok && res.npc) {
        setSpawnedNpc(res.npc);
      } else {
        setSpawnedNpc(null);
      }
    } catch (e) {
      console.error("npc spawn error", e);
      setError("Не вийшло під’єднатися до мандрівних NPC.");
    }
  }, [tgId, level, screenKey]);

  // викликаємо при зміні екрану
  useEffect(() => {
    setLoading(true);
    checkSpawn().finally(() => setLoading(false));
  }, [checkSpawn]);

  // ── старт діалогу з NPC ─────────────────────────────────────

  const startEncounter = useCallback(async () => {
    if (!spawnedNpc) return;
    setActionLoading(true);
    setError(null);
    try {
      const body = { tg_id: tgId };
      const res = await postJSON<EncounterResponse>(
        `/api/npc/${encodeURIComponent(spawnedNpc.key)}/encounter`,
        body
      );
      setDialog(res);
    } catch (e) {
      console.error("npc encounter error", e);
      setError("NPC раптом зник у натовпі.");
    } finally {
      setActionLoading(false);
    }
  }, [spawnedNpc, tgId]);

  // ── прийняти / відмовитись / ще фраза ────────────────────────

  const acceptNpc = useCallback(
    async (): Promise<string | null> => {
      if (!spawnedNpc) return null;
      setActionLoading(true);
      setError(null);
      try {
        const res = await postJSON<ResultResponse>(
          `/api/npc/${encodeURIComponent(spawnedNpc.key)}/accept`,
          { tg_id: tgId }
        );
        return res?.message ?? "Прийнято.";
      } catch (e) {
        console.error("npc accept error", e);
        setError("Не вдалось прийняти завдання.");
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [spawnedNpc, tgId]
  );

  const declineNpc = useCallback(
    async (): Promise<string | null> => {
      if (!spawnedNpc) return null;
      setActionLoading(true);
      setError(null);
      try {
        const res = await postJSON<ResultResponse>(
          `/api/npc/${encodeURIComponent(spawnedNpc.key)}/decline`,
          { tg_id: tgId }
        );
        return res?.message ?? "Відмовився.";
      } catch (e) {
        console.error("npc decline error", e);
        setError("Не вдалось відмовитись.");
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [spawnedNpc, tgId]
  );

  const moreFromNpc = useCallback(
    async (): Promise<string | null> => {
      if (!spawnedNpc) return null;
      setActionLoading(true);
      setError(null);
      try {
        const res = await postJSON<TipResponse>(
          `/api/npc/${encodeURIComponent(spawnedNpc.key)}/more`,
          { tg_id: tgId }
        );
        return res?.tip ?? "— Та що там ще казати…";
      } catch (e) {
        console.error("npc more error", e);
        setError("NPC замовк.");
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [spawnedNpc, tgId]
  );

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const clearNpc = useCallback(() => {
    setSpawnedNpc(null);
  }, []);

  return {
    spawnedNpc,
    dialog,
    loading,
    actionLoading,
    error,

    // дії
    checkSpawn,
    startEncounter,
    acceptNpc,
    declineNpc,
    moreFromNpc,
    closeDialog,
    clearNpc,
  };
}

// ───────────────────────────────────────────────────────────────
// Компонент модалки + кнопки «✨ Зустріти {NPC}»
// ───────────────────────────────────────────────────────────────

type RoamingNpcOverlayProps = {
  hook: ReturnType<typeof useRoamingNpc>;
};

/**
 * Виносиш це на будь-який екран (city / areas / zastava / tavern).
 * При наявності spawnedNpc показує плаваючу кнопку.
 * При startEncounter показує модалку з діалогом.
 */
export function RoamingNpcOverlay({ hook }: RoamingNpcOverlayProps) {
  const {
    spawnedNpc,
    dialog,
    loading,
    actionLoading,
    error,
    startEncounter,
    acceptNpc,
    declineNpc,
    moreFromNpc,
    closeDialog,
    clearNpc,
  } = hook;

  const handleStart = async () => {
    await startEncounter();
  };

  const handleAccept = async () => {
    const msg = await acceptNpc();
    if (msg) {
      // можна показати тост, але поки просто закриємо
      closeDialog();
      clearNpc();
    }
  };

  const handleDecline = async () => {
    const msg = await declineNpc();
    if (msg) {
      closeDialog();
      clearNpc();
    }
  };

  const handleMore = async () => {
    const tip = await moreFromNpc();
    if (!tip || !dialog) return;
    // оновимо текст діалогу ще однією реплікою
    const merged = {
      ...dialog,
      offer: dialog.offer + "\n\n" + tip,
    };
    // тупо перезаписуємо через локальний стейт:
    // тут невеличкий лайфхак: reuse setDialog через кастом
    // але ми не маємо прямого доступу → просто alert як MVP
    alert(tip);
  };

  return (
    <>
      {/* Плаваюча кнопка зустрічі */}
      {spawnedNpc && !dialog && (
        <button
          type="button"
          onClick={handleStart}
          disabled={actionLoading}
          className="fixed bottom-4 right-4 z-40 rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-amber-50 shadow-lg shadow-black/40 border border-amber-300/60 active:scale-95 transition-transform"
        >
          {actionLoading ? "..." : `✨ Зустріти ${spawnedNpc.name}`}
        </button>
      )}

      {/* Простий вивід помилок (кут екрана) */}
      {error && (
        <div className="fixed bottom-2 left-2 z-40 rounded bg-red-900/90 px-3 py-1 text-xs text-red-100 border border-red-500/60">
          {error}
        </div>
      )}

      {/* Модалка діалогу з NPC */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-[90%] max-w-md rounded-2xl border border-amber-500/40 bg-slate-950/95 p-4 shadow-xl shadow-black/70">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm uppercase tracking-wide text-amber-400/90">
                  Мандрівний NPC
                </div>
                <div className="text-lg font-semibold text-amber-50">
                  {dialog.npc.name}
                </div>
                {dialog.npc.region && (
                  <div className="text-xs text-amber-200/70">
                    {dialog.npc.region}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  closeDialog();
                }}
                className="rounded-full border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 space-y-2 rounded-xl bg-slate-900/80 p-3 text-sm leading-relaxed text-slate-100">
              <p className="text-amber-200">
                {dialog.greet}
              </p>
              <p>{dialog.offer}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAccept}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-600 disabled:opacity-60"
              >
                ✅ Прийняти
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600 disabled:opacity-60"
              >
                ❌ Відмовитись
              </button>
              <button
                type="button"
                onClick={handleMore}
                disabled={actionLoading}
                className="w-full rounded-lg border border-amber-500/60 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-900/40 disabled:opacity-60"
              >
                ℹ Ще слово
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}