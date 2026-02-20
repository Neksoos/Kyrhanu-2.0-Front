"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CITY_HREF = "/"; // місто = app/page.tsx

export default function GlobalBackToCity() {
  const pathname = usePathname();

  // ❌ не показуємо:
  // - у місті
  // - у будь-якому бою
  if (pathname === "/" || pathname.startsWith("/battle")) {
    return null;
  }

  return (
    <div
      className="
        fixed left-0 right-0 z-[999]
        bottom-0
        bg-gradient-to-t from-black via-slate-950/95 to-transparent
      "
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)",
      }}
    >
      <div className="max-w-md mx-auto px-3 pt-2">
        <Link
          href={CITY_HREF}
          className="
            w-full inline-flex items-center justify-center gap-2
            rounded-xl
            bg-slate-900/80 border border-slate-700/70
            px-3 py-2
            text-sm font-semibold text-slate-100
            active:scale-[0.99]
            transition
          "
        >
          <span className="text-lg leading-none">←</span>
          <span>Повернутися у місто</span>
        </Link>
      </div>
    </div>
  );
}