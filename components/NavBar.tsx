"use client";

import Link from "next/link";
import { PixelButton } from "./PixelButton";
import { api, setAccessToken } from "@/lib/api";

export function NavBar() {
  return (
    <div className="flex items-center justify-between gap-3 pixel-border bg-black/30 p-3">
      <div className="flex items-center gap-2">
        <span className="font-black tracking-wider">ПРОКЛЯТІ КУРГАНИ</span>
        <span className="text-xs text-[var(--muted)] hidden sm:inline">pixel ethno MMORPG</span>
      </div>
      <div className="flex gap-2 flex-wrap justify-end">
        <Link className="text-sm hover:underline" href="/play">Грати</Link>
        <Link className="text-sm hover:underline" href="/inventory">Інвентар</Link>
        <Link className="text-sm hover:underline" href="/boss">Бос</Link>
        <Link className="text-sm hover:underline" href="/guild">Гільдія</Link>
        <Link className="text-sm hover:underline" href="/season">Сезон</Link>
        <Link className="text-sm hover:underline" href="/shop">Крамниця</Link>
        <Link className="text-sm hover:underline" href="/settings">Налаштування</Link>
        <PixelButton
          variant="ghost"
          onClick={async () => {
            try {
              await api.auth.logout();
            } finally {
              setAccessToken(null);
              window.location.href = "/login";
            }
          }}
        >
          Вийти
        </PixelButton>
      </div>
    </div>
  );
}