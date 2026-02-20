"use client";

import { useEffect, useState } from "react";

import BackButton from "../../_components/BackButton";
import { resolveTgId } from "@/lib/tg";

type MaterialDTO = {
  material_id: number;
  code: string;
  name: string;
  rarity?: string | null;
  qty: number;
  profession?: string | null;
  source_type?: string | null;
};

type MaterialsResponse = {
  ok: boolean;
  items?: MaterialDTO[];
  materials?: MaterialDTO[];
  detail?: string;
  error?: string;
};

function iconPath(code?: string | null) {
  if (!code) return "/items/default.png";
  return `/items/${code}.png`;
}

export default function ResourcesPage() {
  const [materials, setMaterials] = useState<MaterialDTO[]>([]);
  const [tgId, setTgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────
  // tg_id
  // ─────────────────────────────
  useEffect(() => {
    let id = resolveTgId() ?? null;

    if (!id && typeof window !== "undefined") {
      const raw = localStorage.getItem("tg_id");
      if (raw) {
        const n = Number(raw);
        if (!Number.isNaN(n) && n > 0) id = n;
      }
    }

    if (!id) {
      setError("Не вдалося визначити Telegram ID.");
      setLoading(false);
      return;
    }

    setTgId(id);
    localStorage.setItem("tg_id", String(id));
  }, []);

  // ─────────────────────────────
  // load materials
  // ─────────────────────────────
  async function loadMaterials(id: number) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/proxy/api/materials?tg_id=${id}`, {
        cache: "no-store",
      });

      const data = (await res.json()) as MaterialsResponse;

      if (!res.ok || !data.ok) {
        setError(data.detail || data.error || "Помилка завантаження ресурсів");
        setMaterials([]);
        return;
      }

      const list = data.items ?? data.materials ?? [];
      setMaterials(Array.isArray(list) ? list : []);
    } catch (e) {
      setError("Не вдалося завантажити ресурси.");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tgId) loadMaterials(tgId);
  }, [tgId]);

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  if (loading && !materials.length && !error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        Завантаження ресурсів…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center px-4 text-center text-sm">
        {error}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-md">
        <header
          className="
            sticky top-0 z-20 mb-4
            bg-gradient-to-b from-slate-950 via-slate-900 to-transparent
            pt-[calc(env(safe-area-inset-top)+12px)] pb-3
          "
        >
          <div className="flex items-center gap-3 px-1">
            <BackButton
              href="/inventory"
              label="Назад в інвентар"
              title="Інвентар"
            />

            <div className="flex-1">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <span>🧺</span> Ресурси
              </h1>
              <p className="text-sm text-slate-400">
                Зібрані матеріали для крафту та професій.
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-slate-900/80 border border-slate-700/70 px-3 py-3 shadow-md">
          {materials.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">
              У тебе поки немає ресурсів.
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/60">
              {materials.map((m) => (
                <li
                  key={m.material_id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                      <img
                        src={iconPath(m.code)}
                        alt={m.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/items/default.png";
                        }}
                      />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{m.name}</span>
                      <span className="text-xs text-slate-400">
                        {m.rarity}
                      </span>
                    </div>
                  </div>

                  <div className="font-semibold text-amber-300">
                    ×{m.qty}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}