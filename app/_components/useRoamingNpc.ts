"use client";

import { useEffect, useRef, useState } from "react";
import { getJSON, postJSON } from "@/lib/api";

type SpawnNpcDTO = {
  key: string;
  name: string;
  region?: string | null;
};

type EncounterNpcDTO = {
  greet?: string | null;
  offer?: string | null;
};

export type RoamingNpc = {
  key: string;
  name: string;
  region?: string | null;
  greet?: string | null;
  offer?: string | null;
};

type Args = {
  tgId: number;
  level: number;
  screenKey: string;
};

type SpawnResponse =
  | { ok: true; npc: SpawnNpcDTO }
  | { ok: true; npc: null }
  | { ok: false; error?: string; detail?: any };

type EncounterResponse =
  | { ok: true; npc: EncounterNpcDTO }
  | { ok: false; error?: string; detail?: any };

const COOLDOWN_MS = 60_000; // 1 хв, щоб не спамити запитами

export function useRoamingNpc({ tgId, level, screenKey }: Args) {
  const [npc, setNpc] = useState<RoamingNpc | null>(null);
  const [loading, setLoading] = useState(false);

  const lastTryRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(false);

  const clearNpc = () => setNpc(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!tgId || tgId <= 0) return;

    let cancelled = false;

    async function run() {
      const now = Date.now();
      if (now - lastTryRef.current < COOLDOWN_MS) return;
      lastTryRef.current = now;

      setLoading(true);
      try {
        // 1) spawn roll
        const hour = new Date().getHours();
        const spawn = await postJSON<SpawnResponse>("/api/npc/spawn", {
          tg_id: tgId,
          level,
          screen_key: screenKey,
          hour,
        });

        if (cancelled || !mountedRef.current) return;

        if (!spawn?.ok) return;
        if (!spawn.npc) return;

        const baseNpc: RoamingNpc = {
          key: spawn.npc.key,
          name: spawn.npc.name,
          region: spawn.npc.region ?? null,
        };

        // 2) encounter text (greet/offer)
        const enc = await getJSON<EncounterResponse>(
          `/api/npc/${encodeURIComponent(baseNpc.key)}/encounter?tg_id=${tgId}`,
          {
            headers: { "X-Tg-Id": String(tgId) },
            cache: "no-store",
          }
        );

        if (cancelled || !mountedRef.current) return;

        if (enc?.ok) {
          setNpc({
            ...baseNpc,
            greet: enc.npc?.greet ?? null,
            offer: enc.npc?.offer ?? null,
          });
        } else {
          setNpc(baseNpc);
        }
      } catch (e) {
        // тихо, щоб не ламати UI міста
        console.error("useRoamingNpc error", e);
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    }

    run();

    // можна ще періодично пробувати (раз на 30-60с)
    const t = setInterval(run, 45_000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [tgId, level, screenKey]);

  return { npc, loading, clearNpc };
}