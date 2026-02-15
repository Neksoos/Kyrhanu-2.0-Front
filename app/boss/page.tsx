"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { PixelCard } from "@/components/PixelCard";
import { PixelButton } from "@/components/PixelButton";
import { LoadingRune } from "@/components/LoadingRune";
import { api } from "@/lib/api";
import { Toast } from "@/components/Toast";

export default function BossPage() {
  const [boss, setBoss] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        await api.me();
        const r = await api.bossesActive();
        setBoss(r.boss);
      } catch {
        window.location.href = "/login";
      }
    })();
  }, []);

  if (boss === null) return <div className="p-6 max-w-5xl mx-auto"><LoadingRune label="Шукаємо Боса…" /></div>;

  return (
    <div className="min-h-screen p-4 space-y-4 max-w-5xl mx-auto">
      <NavBar />
      <PixelCard title="Світовий Бос">
        <div className="text-lg font-black">{boss.template_name}</div>
        <div className="text-sm text-[var(--muted)] mt-1">{boss.description}</div>

        <div className="mt-3 pixel-border bg-black/30 p-3">
          <div className="text-xs text-[var(--muted)] mb-1">HP</div>
          <div className="font-bold">{boss.hp} / {boss.max_hp}</div>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          <PixelButton
            onClick={async () => {
              const r = await api.bossesAttack(boss.id);
              setToast({ kind: "info", msg: `Ти завдав ${r.damage} шкоди${r.crit ? " (CRIT!)" : ""}` });
              setBoss((b: any) => ({ ...b, hp: r.boss.hp }));
            }}
          >
            Атакувати
          </PixelButton>
        </div>
      </PixelCard>

      {toast ? <Toast kind={toast.kind} message={toast.msg} onDone={() => setToast(null)} /> : null}
    </div>
  );
}