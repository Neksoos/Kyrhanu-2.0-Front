"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { PixelCard } from "@/components/PixelCard";
import { LoadingRune } from "@/components/LoadingRune";
import { api } from "@/lib/api";
import { PixelButton } from "@/components/PixelButton";
import { Toast } from "@/components/Toast";

export default function SeasonPage() {
  const [season, setSeason] = useState<any>(null);
  const [quests, setQuests] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        await api.me();
        const s = await api.seasonActive();
        setSeason(s.season);
        const q = await api.questsToday();
        setQuests(q);
      } catch {
        window.location.href = "/login";
      }
    })();
  }, []);

  if (!quests) return <div className="p-6 max-w-5xl mx-auto"><LoadingRune /></div>;

  return (
    <div className="min-h-screen p-4 space-y-4 max-w-5xl mx-auto">
      <NavBar />
      <PixelCard title="Сезон (банер — painted key art)">
        {season ? (
          <div className="space-y-2">
            <div className="text-lg font-black">{season.name}</div>
            <div className="text-sm text-[var(--muted)]">{season.theme}</div>
          </div>
        ) : (
          <div className="text-sm text-[var(--muted)]">Нема активного сезону.</div>
        )}
      </PixelCard>

      <PixelCard title="Квести сьогодні">
        <div className="text-xs text-[var(--muted)] mb-2">Day: {quests.day_key}</div>
        <div className="grid gap-3">
          {quests.quests.map((q: any) => (
            <div key={q.id} className="pixel-border bg-black/30 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">{q.name}</div>
                <div className="text-xs text-[var(--muted)]">{q.description}</div>
              </div>
              <PixelButton
                variant="ghost"
                onClick={async () => {
                  try {
                    const r = await api.rewardClaim(q.id);
                    setToast({ kind: "info", msg: `Нагорода: ${JSON.stringify(r.reward)}` });
                  } catch (e: any) {
                    setToast({ kind: "error", msg: e.message ?? "Claim failed" });
                  }
                }}
              >
                Забрати
              </PixelButton>
            </div>
          ))}
        </div>
      </PixelCard>

      {toast ? <Toast kind={toast.kind} message={toast.msg} onDone={() => setToast(null)} /> : null}
    </div>
  );
}