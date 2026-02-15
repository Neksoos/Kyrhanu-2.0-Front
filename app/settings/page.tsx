"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { PixelCard } from "@/components/PixelCard";
import { LoadingRune } from "@/components/LoadingRune";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await api.me();
        setMe(m);
      } catch {
        window.location.href = "/login";
      }
    })();
  }, []);

  if (!me) return <div className="p-6 max-w-5xl mx-auto"><LoadingRune /></div>;

  return (
    <div className="min-h-screen p-4 space-y-4 max-w-5xl mx-auto">
      <NavBar />
      <PixelCard title="Профіль">
        <div className="text-sm text-[var(--muted)]">ID: {me.user.id}</div>
        <div className="text-sm">Telegram: {me.user.telegram_id ? `#${me.user.telegram_id}` : "не прив’язано"}</div>
        <div className="text-sm">Email: {me.user.email ?? "нема"}</div>

        <div className="text-xs text-[var(--muted)] mt-3">
          Linking працює так: якщо ти залогінився email/password, потім на /login натиснеш Telegram Widget — бекенд прив’яже telegram_id до цього ж user.
        </div>
      </PixelCard>
    </div>
  );
}