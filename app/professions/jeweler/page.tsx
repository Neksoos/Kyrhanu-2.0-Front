"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getJSON, postJSON } from "@/lib/api";
import { resolveTgId } from "@/lib/tg";

type Ingredient = { material_code: string; qty: number };
type Recipe = { code: string; name: string; descr?: string; level_required?: number; level_req?: number; energy_cost?: number; output_item_code?: string; ingredients?: Ingredient[] };
type RecipesResponse = { recipes?: Recipe[] } | Recipe[];
type ProfessionApi = { id: number; code: string; name: string; descr: string; kind: "gathering" | "craft"; min_level: number };
type PlayerProfessionDTO = { profession: ProfessionApi; level: number; xp: number; next_level_xp?: number };
type MeResponse = { ok: boolean; professions: PlayerProfessionDTO[] };
type MaterialBrief = { code: string; name: string; qty?: number; amount?: number };
type ItemBrief = { code: string; name: string };
type CraftResp = { crafted?: number; qty?: number; item_code?: string; xp_gained?: number; energy_spent?: number };

const normalizeRecipes = (payload: RecipesResponse): Recipe[] => (Array.isArray(payload) ? payload : payload?.recipes ?? []);

export default function JewelerPage() {
  const router = useRouter();
  const [tgId, setTgId] = useState<number | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [materials, setMaterials] = useState<Record<string, number>>({});
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prof, setProf] = useState<PlayerProfessionDTO | null>(null);

  useEffect(() => {
    const id = resolveTgId();
    if (id) setTgId(id);
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [recipesRaw, me, matsRaw, itemsRaw] = await Promise.all([
        getJSON<RecipesResponse>("/api/craft/recipes?profession=jeweler"),
        getJSON<MeResponse>("/api/professions/me"),
        getJSON<MaterialBrief[] | { items: MaterialBrief[] }>("/api/craft_materials/list"),
        getJSON<ItemBrief[] | { items: ItemBrief[] }>("/api/items/brief"),
      ]);
      const mats = Array.isArray(matsRaw) ? matsRaw : matsRaw.items ?? [];
      const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw.items ?? [];
      setRecipes(normalizeRecipes(recipesRaw));
      setMaterials(Object.fromEntries(mats.map((m) => [m.code, Number(m.qty ?? m.amount ?? 0)])));
      setItemNames(Object.fromEntries(items.map((it) => [it.code, it.name])));
      setProf(me.professions.find((p) => p.profession.code === "jeweler") ?? null);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Не вдалося завантажити ювеліра");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tgId) void loadAll();
  }, [tgId]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return recipes;
    return recipes.filter((r) => `${r.name} ${r.code} ${r.descr || ""}`.toLowerCase().includes(q));
  }, [recipes, query]);

  const level = prof?.level ?? 1;
  const xp = prof?.xp ?? 0;
  const next = prof?.next_level_xp ?? level * 100;
  const progress = Math.round((xp / Math.max(next, 1)) * 100);

  async function craft(recipe: Recipe) {
    setBusyCode(recipe.code);
    setMessage(null);
    setError(null);
    try {
      const resp = await postJSON<CraftResp>("/api/craft/craft", { recipe_code: recipe.code, qty: 1 });
      const crafted = resp.crafted ?? resp.qty ?? 1;
      const itemCode = resp.item_code || recipe.output_item_code || "item";
      setMessage(`Створено ${crafted}× ${itemNames[itemCode] || itemCode}. XP +${resp.xp_gained ?? 0}`);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Крафт не вдався");
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <button onClick={() => router.push("/professions")} className="text-sm text-slate-300">← Назад</button>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h1 className="text-xl font-semibold">💎 Ювелір</h1>
          <p className="text-sm text-slate-300">Крафт кілець, амулетів та прикрас.</p>
          <div className="mt-2 text-xs text-slate-300">Рівень {level} · XP {xp}/{next}</div>
          <div className="mt-1 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-cyan-400" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
        </section>

        <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 p-2 text-sm" placeholder="Пошук рецепта..." />

        {error && <div className="rounded-xl border border-rose-500/50 bg-rose-900/20 p-2 text-sm text-rose-200">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-500/50 bg-emerald-900/20 p-2 text-sm text-emerald-200">{message}</div>}

        {loading ? <div>Завантаження...</div> : (
          <div className="grid gap-3">
            {filtered.map((r) => {
              const req = r.level_required ?? r.level_req ?? 1;
              const locked = level < req;
              const miss = (r.ingredients ?? []).some((i) => (materials[i.material_code] ?? 0) < i.qty);
              const disabled = locked || miss || busyCode === r.code;
              return (
                <div key={r.code} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-slate-300">Lv {req} · Енергія {r.energy_cost ?? 0}</div>
                    </div>
                    <button disabled={disabled} onClick={() => craft(r)} className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-40">
                      {busyCode === r.code ? "..." : locked ? "Замкнено" : miss ? "Нема мат." : "Створити"}
                    </button>
                  </div>
                  <ul className="mt-2 text-xs">
                    {(r.ingredients ?? []).map((i) => (
                      <li key={`${r.code}-${i.material_code}`} className={(materials[i.material_code] ?? 0) >= i.qty ? "text-emerald-300" : "text-rose-300"}>
                        {i.material_code}: {materials[i.material_code] ?? 0}/{i.qty}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
