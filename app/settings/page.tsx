"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useGameAudio } from "../_components/AudioProvider";

const LANG_OPTIONS = [
  { code: "uk", label: "Українська" },
  { code: "en", label: "English" },
  // Можеш додати ще мови пізніше
];

export default function SettingsPage() {
  const router = useRouter();
  const { playing, toggle, volume, setVolume } = useGameAudio();

  const [language, setLanguage] = useState<string>("uk");

  // читаємо мову з localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("lang");
    if (saved) setLanguage(saved);
  }, []);

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lang", code);
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value); // 0..100
    setVolume(value / 100);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-md space-y-6">
        <header>
          <h1 className="text-xl font-semibold mb-1">Налаштування</h1>
          <p className="text-sm text-slate-400">
            Обери мову гри та налаштуй фонову музику.
          </p>
        </header>

        {/* МОВА */}
        <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Мова інтерфейсу</h2>
          <div className="space-y-2">
            {LANG_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition ${
                  language === lang.code
                    ? "border-emerald-400 bg-emerald-500/10"
                    : "border-slate-600 bg-slate-800/60"
                }`}
              >
                {language === lang.code ? "✅ " : ""}
                {lang.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Поки що мова зберігається в налаштуваннях. Звідси можна буде
            керувати локалізацією всієї гри.
          </p>
        </section>

        {/* МУЗИКА */}
        <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 space-y-4">
          <h2 className="text-sm font-semibold">Музика</h2>

          <button
            type="button"
            onClick={toggle}
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 transition"
          >
            {playing ? "🔊 Вимкнути музику" : "🔈 Увімкнути музику"}
          </button>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Гучність</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={handleVolumeChange}
              className="w-full"
            />
          </div>

          <p className="text-[11px] text-slate-400">
            Гучність застосовується до всієї фонової музики в грі.
          </p>
        </section>

        <button
          type="button"
          onClick={() => router.back()}
          className="w-full text-center text-xs text-slate-300 underline underline-offset-2"
        >
          ← Повернутися до міста
        </button>
      </div>
    </main>
  );
}
