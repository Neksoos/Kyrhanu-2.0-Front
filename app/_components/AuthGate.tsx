"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { waitTgId } from "@/lib/tg";
import { getJSON } from "@/lib/api";

/**
 * Гейт: один раз на старті перевіряє наявність гравця.
 * Якщо не знайдено — редіректить на /register.
 * Пропускає саму реєстрацію та службові сторінки.
 */
export default function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  const once = useRef(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    (async () => {
      // сторінки, що не потребують перевірки
      const whitelist = [
        "/register",
        "/register/name",
        "/register/race",
        "/register/class",
        "/register/gender",
      ];
      if (whitelist.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        setChecked(true);
        return;
      }

      // 1) Отримуємо tg_id з Mini App (чекаємо до 3с)
      const tgId = await waitTgId(3000);
      if (!tgId) {
        router.replace("/register");
        return;
      }

      // 2) Перевіряємо, чи існує профіль
      try {
        // очікується 200, якщо гравець існує; 404 — якщо ні
        await getJSON(`/api/me?tg_id=${tgId}`);
        setChecked(true); // все ок, дозволяємо рендер інших сторінок
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (msg.includes("404") || msg.includes("Not found")) {
          router.replace(`/register?tg_id=${tgId}`);
          return;
        }
        // будь-яка інша помилка — теж у реєстрацію
        router.replace(`/register?tg_id=${tgId}`);
      }
    })();
  }, [pathname, router]);

  // Поки перевіряємо — нічого не рендеримо
  if (!checked) return null;
  return null;
}