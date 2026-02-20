"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "./admin-token-key";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    // Для сторінки логіну нічого не перевіряємо
    if (isLoginPage) {
      setIsReady(true);
      setHasToken(false);
      return;
    }

    // Для всіх інших /admin/* сторінок перевіряємо токен
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;

    if (!token) {
      router.replace("/admin/login");
      return;
    }

    setHasToken(true);
    setIsReady(true);
  }, [isLoginPage, router]);

  // Поки не знаємо, є токен чи ні – показуємо лоадер
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-200">
        <div className="animate-pulse text-sm tracking-wide">
          Завантаження адмінки Проклятих Курганів…
        </div>
      </div>
    );
  }

  // Логін-сторінка – окремий простий лейаут без сайдбару
  if (isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-slate-950 to-zinc-900 text-gray-100">
        {children}
      </div>
    );
  }

  // На всякий випадок, якщо токен пропав
  if (!hasToken) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-zinc-900 to-black text-gray-100">
      {/* Ліва панель (desktop) */}
      <aside className="hidden md:flex w-64 flex-col border-r border-zinc-800 bg-black/60 backdrop-blur-xl">
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="text-xs uppercase tracking-[0.25em] text-amber-500/70">
            ADMIN
          </div>
          <div className="mt-1 text-lg font-semibold">Прокляті Кургани</div>
          <div className="mt-1 text-xs text-zinc-400">
            Сторожовий пост при вогнищі
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          {[
            { href: "/admin", label: "Огляд", emoji: "🏕️" },
            { href: "/admin/players", label: "Гравці", emoji: "🧙" },
            { href: "/admin/forts", label: "Застави", emoji: "🛡️" },
            { href: "/admin/economy", label: "Економіка", emoji: "💰" },
            { href: "/admin/content", label: "Контент", emoji: "📜" },
            { href: "/admin/logs", label: "Логи", emoji: "📖" },
          ].map((link) => {
            const active =
              pathname === link.href || pathname?.startsWith(link.href + "/");

            return (
              <button
                key={link.href}
                type="button"
                onClick={() => router.push(link.href)}
                className={[
                  "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left transition",
                  active
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                    : "text-zinc-300/80 hover:text-amber-200 hover:bg-zinc-800/70",
                ].join(" ")}
              >
                <span className="text-lg">{link.emoji}</span>
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-zinc-800 text-xs text-zinc-500 flex items-center justify-between gap-2">
          <span>Адмін-панель v1</span>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.localStorage.removeItem(ADMIN_TOKEN_KEY);
              }
              router.replace("/admin/login");
            }}
            className="px-2 py-1 rounded-lg border border-zinc-700 hover:border-red-500/70 hover:text-red-300 text-[11px]"
          >
            Вийти
          </button>
        </div>
      </aside>

      {/* Основна область */}
      <main className="flex-1 min-h-screen flex flex-col">
        {/* Mobile-header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-black/70 backdrop-blur-xl">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-amber-500/70">
              ADMIN
            </div>
            <div className="text-sm font-semibold">Прокляті Кургани</div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.localStorage.removeItem(ADMIN_TOKEN_KEY);
              }
              router.replace("/admin/login");
            }}
            className="px-2 py-1 rounded-lg border border-zinc-700 hover:border-red-500/70 hover:text-red-300 text-[11px]"
          >
            Вийти
          </button>
        </header>

        <div className="flex-1 p-3 md:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}