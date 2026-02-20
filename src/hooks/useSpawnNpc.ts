"use client";

import { useEffect, useRef, useState } from "react";
import { postJSON } from "@/lib/api";

export type SpawnedNpc = {
  key: string;
  name: string;
  region?: string | null;
  tags: string[];
  accent_notes?: string | null;
};

type UseSpawnNpcOptions = {
  tgId: number;
  level: number;
  screenKey: string;
  enabled?: boolean;
};

// тип відповіді бекенду /api/npc/spawn
type SpawnNpcApiResponse = {
  ok: boolean;
  npc: SpawnedNpc | null;
};

export function useSpawnNpc(options: UseSpawnNpcOptions) {
  const { tgId, level, screenKey, enabled = true } = options;

  const [npc, setNpc] = useState<SpawnedNpc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastScreenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (lastScreenRef.current === screenKey && npc) return;
    lastScreenRef.current = screenKey;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const resp = (await postJSON("/api/npc/spawn", {
          tg_id: tgId,
          level,
          screen_key: screenKey,
        })) as SpawnNpcApiResponse;

        if (cancelled) return;

        if (resp && resp.npc) setNpc(resp.npc);
        else setNpc(null);
      } catch (_e) {
        if (!cancelled) setError("spawn_failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [tgId, level, screenKey, enabled, npc]);

  const clearNpc = () => setNpc(null);

  return { npc, loading, error, clearNpc };
}