// app/admin/page.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "./admin-token-key";

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;

    if (!token) router.replace("/admin/login");
  }, [router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-amber-300">Адмін-панель</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          className="rounded-xl border border-zinc-800 bg-black/60 p-4 text-left hover:bg-zinc-900/60"
          onClick={() => router.push("/admin/players")}
        >
          <div className="text-amber-300 font-medium">👥 Гравці</div>
          <div className="text-xs text-zinc-400 mt-1">Пошук, картка, інвентар</div>
        </button>

        <button
          className="rounded-xl border border-zinc-800 bg-black/60 p-4 text-left hover:bg-zinc-900/60"
          onClick={() => router.push("/admin/items")}
        >
          <div className="text-amber-300 font-medium">🎒 Предмети</div>
          <div className="text-xs text-zinc-400 mt-1">Список, створення, редагування</div>
        </button>

        <button
          className="rounded-xl border border-zinc-800 bg-black/60 p-4 text-left hover:bg-zinc-900/60"
          onClick={() => router.push("/admin/audit")}
        >
          <div className="text-amber-300 font-medium">📜 Журнал дій</div>
          <div className="text-xs text-zinc-400 mt-1">Фільтри, сортування, пошук</div>
        </button>

        {/* ✅ Повернули розсилки/сповіщення */}
        <button
          className="rounded-xl border border-zinc-800 bg-black/60 p-4 text-left hover:bg-zinc-900/60"
          onClick={() => router.push("/admin/notify")}
        >
          <div className="text-amber-300 font-medium">🔔 Розсилки</div>
          <div className="text-xs text-zinc-400 mt-1">Усім / неактивним</div>
        </button>

        <button
          className="rounded-xl border border-zinc-800 bg-black/60 p-4 text-left hover:bg-zinc-900/60"
          onClick={() => router.push("/admin/login")}
        >
          <div className="text-amber-300 font-medium">🔑 Логін</div>
          <div className="text-xs text-zinc-400 mt-1">Змінити адмін-токен</div>
        </button>
      </div>
    </div>
  );
}