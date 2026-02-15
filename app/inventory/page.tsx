"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { PixelCard } from "@/components/PixelCard";
import { LoadingRune } from "@/components/LoadingRune";
import { api } from "@/lib/api";

export default function InventoryPage() {
  const [inv, setInv] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        await api.me();
        const r = await api.inventory();
        setInv(r);
      } catch {
        window.location.href = "/login";
      }
    })();
  }, []);

  if (!inv) return <div className="p-6 max-w-5xl mx-auto"><LoadingRune /></div>;

  return (
    <div className="min-h-screen p-4 space-y-4 max-w-5xl mx-auto">
      <NavBar />
      <PixelCard title="Інвентар">
        <div className="text-sm text-[var(--muted)] mb-3">
          Слоти: {inv.items.length}/{inv.inventory.capacity}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {inv.items.map((it: any) => (
            <div key={it.instance_id} className="pixel-border bg-black/30 p-3">
              <div className="font-bold">{it.name}</div>
              <div className="text-xs text-[var(--muted)]">{it.code} • {it.slot} • ⭐{it.rarity}</div>
            </div>
          ))}
        </div>
      </PixelCard>
    </div>
  );
}