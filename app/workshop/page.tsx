"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";

import {
  Hammer,
  FlaskConical,
  Gem,
  ChevronLeft,
  ShoppingBag,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  Zap,
} from "lucide-react";

import { resolveTgId } from "@/lib/tg";

// ================= TYPES =================
type ProfessionKind = "gathering" | "craft";

type ProfessionApi = {
  id: number;
  code: string;
  name: string;
  descr: string;
  kind: ProfessionKind;
  min_level: number;
};

type PlayerProfessionDTO = {
  profession: ProfessionApi;
  level: number;
  xp: number;
};

type MeResponse = {
  ok: boolean;
  player_level: number;
  professions: PlayerProfessionDTO[];
};

type Recipe = {
  code: string;
  name: string;
  descr?: string;
  level_required?: number;
  energy_cost?: number;
};

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

// ================= COMPONENT =================
export default function WorkshopPage() {
  const router = useRouter();

  const [tgId, setTgId] = useState<number | null>(null);
  const [view, setView] = useState<"menu" | "craft">("menu");
  const [activeProf, setActiveProf] = useState<string>("blacksmith");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ================= TG ID =================
  useEffect(() => {
    (async () => {
      try {
        const id = await resolveTgId();
        if (id) setTgId(id);
      } catch {}
    })();
  }, []);

  // ================= PROFESSIONS =================
  const { data: meData } = useSWR<MeResponse>(
    tgId ? [`/api/proxy/api/professions/me`, tgId] : null,
    async ([url, id]) => {
      const res = await fetch(url, {
        headers: { "X-Tg-Id": String(id) },
      });
      return res.json();
    }
  );

  const owned = useMemo(() => {
    return new Set(
      meData?.professions
        .filter((p) => p.profession.kind === "craft")
        .map((p) => p.profession.code)
    );
  }, [meData]);

  const levelOf = (code: string) =>
    meData?.professions.find((p) => p.profession.code === code)?.level ?? 1;

  // ================= LOAD RECIPES =================
  async function loadRecipes(prof: string) {
    setLoadingRecipes(true);
    setError(null);

    try {
      const endpoint =
        prof === "alchemist"
          ? "/api/proxy/api/alchemy/recipes"
          : `/api/proxy/api/craft/recipes?profession=${prof}`;

      const res = await fetch(endpoint, {
        headers: { "X-Tg-Id": String(tgId) },
      });

      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (e: any) {
      setError("Помилка завантаження рецептів");
    }

    setLoadingRecipes(false);
  }

  useEffect(() => {
    if (view === "craft") {
      loadRecipes(activeProf);
    }
  }, [view, activeProf]);

  // ================= CRAFT =================
  async function handleCraft(code: string) {
    setError(null);
    setMessage(null);

    try {
      if (activeProf === "alchemist") {
        const res = await fetch("/api/proxy/api/alchemy/brew", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tg-Id": String(tgId),
          },
          body: JSON.stringify({ recipe_code: code }),
        });

        if (!res.ok) throw new Error("Помилка варіння");
        setMessage("🧪 Зілля поставлено в чергу.");
      } else {
        const res = await fetch("/api/proxy/api/craft/craft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tg-Id": String(tgId),
          },
          body: JSON.stringify({ recipe_code: code, qty: 1 }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || "Craft error");

        setMessage(`✨ Створено ${data.crafted} • XP +${data.xp_gained}`);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <main className="min-h-screen text-white flex justify-center px-4 py-6 bg-black">
      <div className="w-full max-w-3xl space-y-4">

        {/* HEADER */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">🏚️ Майстерня</h1>
            <button
              onClick={() => router.push("/city")}
              className="px-3 py-2 bg-white/10 rounded-xl"
            >
              Місто
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ================= MENU ================= */}
          {view === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3"
            >
              <button
                onClick={() => setView("craft")}
                className="w-full py-3 rounded-2xl bg-emerald-500 font-semibold"
              >
                🔨 Крафт
              </button>

              <button
                onClick={() => router.push("/workshop/shop")}
                className="w-full py-3 rounded-2xl bg-amber-500 font-semibold"
              >
                🛒 Реміснича лавка
              </button>
            </motion.div>
          )}

          {/* ================= CRAFT VIEW ================= */}
          {view === "craft" && (
            <motion.div
              key="craft"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Крафт</h2>
                <button
                  onClick={() => setView("menu")}
                  className="px-3 py-2 bg-white/10 rounded-xl"
                >
                  Назад
                </button>
              </div>

              {/* PROF TABS */}
              <div className="flex gap-2 flex-wrap">
                {["blacksmith", "jeweler", "weaver", "alchemist"].map(
                  (code) => (
                    <button
                      key={code}
                      disabled={!owned.has(code)}
                      onClick={() => setActiveProf(code)}
                      className={cx(
                        "px-3 py-2 rounded-xl text-sm",
                        activeProf === code
                          ? "bg-emerald-600"
                          : "bg-white/10",
                        !owned.has(code) && "opacity-40 cursor-not-allowed"
                      )}
                    >
                      {code} • Lv {levelOf(code)}
                    </button>
                  )
                )}
              </div>

              {error && (
                <div className="text-rose-400 text-sm">{error}</div>
              )}
              {message && (
                <div className="text-emerald-400 text-sm">{message}</div>
              )}

              {loadingRecipes ? (
                <div>Завантаження...</div>
              ) : (
                <div className="grid gap-3">
                  {recipes.map((r) => (
                    <div
                      key={r.code}
                      className="border border-white/10 rounded-2xl p-4 bg-black/30"
                    >
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-slate-300">
                        {r.descr}
                      </div>
                      {r.level_required && (
                        <div className="text-xs mt-1">
                          Рівень: {r.level_required}
                        </div>
                      )}
                      <button
                        onClick={() => handleCraft(r.code)}
                        className="mt-2 px-3 py-2 bg-emerald-500 rounded-xl"
                      >
                        Створити
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}