"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getJSON, postJSON, ApiError } from "@/lib/api";
import { resolveTgId } from "@/lib/tg";

// Types representing the quest progress as returned by the backend
interface QuestRecord {
  quest_key: string;
  npc_key: string;
  title: string;
  stage: number;
  stage_lines: string[];
  choices: Record<string, string>;
  is_final: boolean;
  done: boolean;
}

interface PlayerQuests {
  active: QuestRecord[];
  completed: QuestRecord[];
}

/**
 * Page component for displaying a player's quests. The page shows active and
 * completed quests grouped by their associated NPCs. Active quests can be
 * progressed by selecting one of the available choices. Completed quests
 * are displayed separately.
 */
export default function QuestsPage() {
  const [tgId, setTgId] = useState<number | null>(null);
  const [quests, setQuests] = useState<PlayerQuests | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Helper to load quests from the backend. Invoked on mount and whenever
   * quest state changes (e.g. after progressing a quest).
   */
  async function loadQuests(id: number) {
    try {
      setLoading(true);
      const data = await getJSON<PlayerQuests>(`/quests/player/${id}`);
      setQuests(data);
      setLoading(false);
      setError(null);
    } catch (e: any) {
      const msg = String(e?.message || "Помилка завантаження квестів.");
      setError(msg);
      setLoading(false);
    }
  }

  useEffect(() => {
    // Resolve tgId from Telegram or localStorage
    let id: number | null = null;
    try {
      id = resolveTgId();
    } catch {
      /* ignore */
    }
    if (!id) {
      try {
        const raw = localStorage.getItem("tg_id");
        if (raw) {
          const n = Number(raw);
          if (!Number.isNaN(n) && n > 0) id = n;
        }
      } catch {
        /* ignore */
      }
    }
    if (id) {
      setTgId(id);
      loadQuests(id);
    } else {
      setError("Не знайдено Telegram ID. Відкрий мініап із чату бота.");
      setLoading(false);
    }
  }, []);

  // When no tgId or still loading
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Завантаження…
      </main>
    );
  }
  if (error) {
    return (
      <main className="min-h-screen bg-black text-red-400 flex items-center justify-center px-4 text-center text-sm">
        {error}
      </main>
    );
  }
  if (!quests || !tgId) {
    return null;
  }

  /**
   * Group quests by their NPC key. Returns an object where each key is an
   * NPC key and the value is an array of quest records.
   */
  const groupByNpc = (list: QuestRecord[]) => {
    return list.reduce<Record<string, QuestRecord[]>>((acc, q) => {
      acc[q.npc_key] = acc[q.npc_key] || [];
      acc[q.npc_key].push(q);
      return acc;
    }, {});
  };

  const activeByNpc = groupByNpc(quests.active);
  const completedByNpc = groupByNpc(quests.completed);

  /**
   * Handler to refresh quests after an update. Will reload the quest list
   * from the backend.
   */
  const refresh = () => {
    if (tgId) loadQuests(tgId);
  };

  return (
    <main className="min-h-screen bg-black text-slate-100 p-4">
      <h1 className="text-2xl font-semibold mb-4">Квести</h1>
      {/* Active quests */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Активні квести</h2>
        {Object.keys(activeByNpc).length === 0 && (
          <p className="text-sm opacity-70">Немає активних квестів.</p>
        )}
        {Object.entries(activeByNpc).map(([npcKey, qs]) => (
          <div key={npcKey} className="mb-6">
            <div className="flex items-center mb-2 gap-3">
              <div className="w-10 h-10 relative">
                <Image
                  src={`/npc/${npcKey}.png`}
                  alt={npcKey}
                  fill
                  className="object-cover rounded-md border border-white/20"
                />
              </div>
              <h3 className="text-lg font-medium capitalize">{npcKey.replace(/_/g, " ")}</h3>
            </div>
            {qs.map((q) => (
              <QuestItem key={q.quest_key} q={q} tgId={tgId} onUpdate={refresh} />
            ))}
          </div>
        ))}
      </section>

      {/* Completed quests */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Завершені квести</h2>
        {Object.keys(completedByNpc).length === 0 && (
          <p className="text-sm opacity-70">Завершених квестів поки немає.</p>
        )}
        {Object.entries(completedByNpc).map(([npcKey, qs]) => (
          <div key={npcKey} className="mb-6">
            <div className="flex items-center mb-2 gap-3">
              <div className="w-10 h-10 relative">
                <Image
                  src={`/npc/${npcKey}.png`}
                  alt={npcKey}
                  fill
                  className="object-cover rounded-md border border-white/20"
                />
              </div>
              <h3 className="text-lg font-medium capitalize">{npcKey.replace(/_/g, " ")}</h3>
            </div>
            {qs.map((q) => (
              <div
                key={q.quest_key}
                className="mb-3 p-3 rounded-lg bg-black/35 border border-green-600/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{q.title}</span>
                  <span className="text-green-400 text-sm">✅ Завершено</span>
                </div>
                <p className="text-xs opacity-70">
                  Завдання виконано та нагороду отримано.
                </p>
              </div>
            ))}
          </div>
        ))}
      </section>
    </main>
  );
}

/**
 * Component representing a single active quest with interactive progression.
 * Displays the current stage text and renders buttons for each available
 * choice. When a choice is selected, a POST request is sent to the backend
 * and the component updates its local state accordingly. If the quest
 * completes, the parent component is notified via `onUpdate`.
 */
function QuestItem({
  q,
  tgId,
  onUpdate,
}: {
  q: QuestRecord;
  tgId: number;
  onUpdate: () => void;
}) {
  const [lines, setLines] = useState<string[]>(q.stage_lines);
  const [choices, setChoices] = useState<Record<string, string>>(q.choices);
  const [isFinal, setIsFinal] = useState<boolean>(q.is_final);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function makeChoice(label: string) {
    if (sending) return;
    setSending(true);
    setErr(null);
    try {
      const res = await postJSON<{
        stage: number;
        text_lines: string[];
        choices: Record<string, string>;
        is_final: boolean;
      }>(`/quests/choice/${q.quest_key}`, {
        tg_id: tgId,
        choice_label: label,
      });
      setLines(res.text_lines);
      setChoices(res.choices);
      setIsFinal(res.is_final);
      setSending(false);
      // If the quest has just completed, refresh the parent list
      if (res.is_final) {
        onUpdate();
      }
    } catch (e: any) {
      setErr(String(e?.message || "Помилка обробки вибору"));
      setSending(false);
    }
  }

  return (
    <div className="mb-3 p-3 rounded-lg bg-black/30 border border-yellow-600/40">
      <div className="font-semibold mb-1">{q.title}</div>
      {lines.map((line, idx) => (
        <p key={idx} className="text-sm mb-1">
          {line}
        </p>
      ))}
      {err && (
        <div className="text-red-400 text-xs mb-1">{err}</div>
      )}
      {!isFinal && Object.keys(choices).length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {Object.keys(choices).map((label) => (
            <button
              key={label}
              onClick={() => makeChoice(label)}
              disabled={sending}
              className="px-3 py-2 rounded-md bg-amber-500/80 hover:bg-amber-600/90 text-sm font-medium"
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {isFinal && (
        <div className="text-green-400 text-sm mt-1">Квест завершено!</div>
      )}
    </div>
  );
}
