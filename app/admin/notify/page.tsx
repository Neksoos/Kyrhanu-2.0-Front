"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "../admin-token-key";

type ApiResponse = {
  ok: boolean;
  sent?: number;
  error?: string;
};

export default function AdminNotifyPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [segment, setSegment] = useState<"all" | "inactive">("all");
  const [inactiveDays, setInactiveDays] = useState<number>(7);
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Перевіряємо адмін-токен
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!saved) {
      router.replace("/admin/login");
      return;
    }

    setToken(saved);
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-zinc-100">
        <p className="text-sm text-zinc-400">Перевірка доступу…</p>
      </main>
    );
  }

  if (!token) return null;

  const handleSend = async () => {
    setError(null);
    setResult(null);

    const trimmed = message.trim();
    if (!trimmed) {
      setError("Введи текст повідомлення.");
      return;
    }

    setLoading(true);
    try {
      // ⚠️ Ходимо через проксі, як на інших адмін-сторінках
      const url =
        segment === "all"
          ? "/api/proxy/api/admin/notify/all"
          : "/api/proxy/api/admin/notify/inactive";

      // Тіло, яке очікує бекенд
      const payload: any = { text: trimmed };
      if (segment === "inactive") {
        payload.days_inactive = inactiveDays;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !data.ok) {
        const msg =
          data?.error ||
          (typeof data === "object" ? JSON.stringify(data) : "Unknown error");
        setError(`Помилка: ${msg}`);
      } else {
        const count = data.sent ?? 0;
        setResult(`✅ Повідомлення відправлено приблизно ${count} гравцям.`);
      }
    } catch (e: any) {
      setError(`Помилка мережі: ${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs tracking-[0.3em] text-pink-400 uppercase">
              Admin
            </div>
            <h1 className="text-2xl font-semibold">Розсилки</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Швидка відправка повідомлень гравцям.
            </p>
          </div>

          <button
            className="text-xs px-3 py-1 rounded-lg border border-zinc-700 hover:bg-zinc-900"
            onClick={() => router.push("/admin")}
          >
            ⬅ Назад
          </button>
        </header>

        <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
          {/* Сегмент аудиторії */}
          <div>
            <h2 className="text-sm font-medium mb-2">Кому відправляємо?</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setSegment("all")}
                className={`flex-1 text-left rounded-lg border px-3 py-2 text-sm transition ${
                  segment === "all"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900"
                }`}
              >
                <div className="font-medium mb-0.5">Усім гравцям</div>
                <div className="text-xs text-zinc-400">
                  Максимальний охват. Корисно для великих оновлень.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSegment("inactive")}
                className={`flex-1 text-left rounded-lg border px-3 py-2 text-sm transition ${
                  segment === "inactive"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900"
                }`}
              >
                <div className="font-medium mb-0.5">Неактивним</div>
                <div className="text-xs text-zinc-400">
                  Тим, хто не заходив певну кількість днів.
                </div>
              </button>
            </div>

            {segment === "inactive" && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-zinc-300">Неактивні більше ніж</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={inactiveDays}
                  onChange={(e) =>
                    setInactiveDays(
                      Math.max(1, Number(e.target.value) || 1),
                    )
                  }
                  className="w-20 rounded-md bg-black/60 border border-zinc-700 px-2 py-1 text-sm"
                />
                <span className="text-zinc-300">днів</span>
              </div>
            )}
          </div>

          {/* Текст повідомлення */}
          <div>
            <h2 className="text-sm font-medium mb-2">Текст повідомлення</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-lg bg-black/60 border border-zinc-700 px-3 py-2 text-sm resize-vertical focus:outline-none focus:ring-1 focus:ring-pink-500"
              placeholder={
                segment === "inactive"
                  ? "Приклад: Привіт, вартовий! Ми додали нові квести та лут у Проклятих Курганах. Зазирни в гру — тобі буде чим здивуватись ✨"
                  : "Приклад: Оновлення гри: нові боси, квести й система професій. Дякуємо, що граєш у Прокляті Кургани!"
              }
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              У повідомленні не використовуй персональні дані — тільки нікнейми,
              якщо бекенд їх сам підставляє.
            </p>
          </div>

          {/* Кнопка відправки */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleSend}
              className="inline-flex items-center gap-2 rounded-lg bg-pink-600 hover:bg-pink-500 disabled:bg-pink-900 px-4 py-2 text-sm font-medium shadow-lg shadow-pink-900/40 transition"
            >
              {loading ? "Відправляємо…" : "Відправити розсилку"}
            </button>

            {loading && (
              <span className="text-xs text-zinc-400">
                Це може зайняти трохи часу, якщо гравців багато.
              </span>
            )}
          </div>

          {/* Результат / помилки */}
          {result && (
            <div className="mt-2 text-sm text-emerald-400 border border-emerald-500/40 bg-emerald-500/5 rounded-lg px-3 py-2">
              {result}
            </div>
          )}

          {error && (
            <div className="mt-2 text-sm text-red-400 border border-red-500/40 bg-red-500/5 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}