"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { LoadingRune } from "@/components/LoadingRune";
import { api } from "@/lib/api";
import { Toast } from "@/components/Toast";

export default function PlayPage() {
  const [data, setData] = useState<any>(null);
  const [run, setRun] = useState<any>(null);
  const [toast, setToast] = useState<{ kind: "info" | "error"; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setData(me);
      } catch (e: any) {
        window.location.href = "/login";
      }
    })();
  }, []);

  if (!data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <LoadingRune />
      </div>
    );
  }

  const ch = data.today?.character;

  return (
    <div className="min-h-screen p-4 space-y-4 max-w-5xl mx-auto">
      <NavBar />

      <div className="grid md:grid-cols-2 gap-4">
        <PixelCard title="Фатальний Герой (сьогодні)">
          <div className="text-lg font-black">{ch.generated_stats?.archetype_name ?? ch.archetype}</div>
          <div className="text-sm text-[var(--muted)] mt-1">{ch.generated_stats?.passive}</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            {Object.entries(ch.generated_stats?.stats ?? {}).map(([k, v]: any) => (
              <div key={k} className="pixel-border bg-black/30 p-2">
                <div className="text-[var(--muted)] text-xs uppercase">{k}</div>
                <div className="font-bold">{String(v)}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            <PixelButton
              onClick={async () => {
                try {
                  const res = await api.generateCharacter(true);
                  setToast({ kind: "info", msg: "Рерол виконано (коштує осколки)!" });
                  setData((d: any) => ({ ...d, today: { ...d.today, character: res.character } }));
                } catch (e: any) {
                  setToast({ kind: "error", msg: e.message ?? "Reroll failed" });
                }
              }}
            >
              Рерол (2 осколки)
            </PixelButton>
          </div>
        </PixelCard>

        <PixelCard title="Забіг у Курган (швидка сесія)">
          {!run ? (
            <PixelButton
              onClick={async () => {
                try {
                  const r = await api.runStart();
                  setRun(r.run);
                } catch (e: any) {
                  setToast({ kind: "error", msg: e.message ?? "Run start failed" });
                }
              }}
            >
              Почати забіг
            </PixelButton>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-[var(--muted)]">Run: {run.id}</div>
              <div className="flex gap-2 flex-wrap">
                <PixelButton
                  onClick={async () => {
                    const r = await api.runAct(run.id, "ATTACK");
                    if (r.status === "finished") {
                      setToast({ kind: "info", msg: "Забіг завершено! Нагорода видана." });
                      setRun(null);
                    } else {
                      setToast({ kind: "info", msg: "Крок вперед у туман…" });
                    }
                  }}
                >
                  Бій
                </PixelButton>
                <PixelButton variant="ghost" onClick={() => setRun(null)}>
                  Скинути UI
                </PixelButton>
              </div>
            </div>
          )}
        </PixelCard>
      </div>

      {toast ? <Toast kind={toast.kind} message={toast.msg} onDone={() => setToast(null)} /> : null}
    </div>
  );
}