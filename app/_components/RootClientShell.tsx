"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { initTg, waitTgId } from "@/lib/tg";
import { getJSON } from "@/lib/api";
import { useRoamingNpc, RoamingNpcOverlay } from "@/hooks/useRoamingNpc";

/**
 * A client shell that initializes Telegram WebApp context and player profile.
 *
 * This version has been adapted for the admin area: if the current pathname
 * starts with `/admin`, it bypasses the Telegram initialization entirely.
 * Without this change, the default implementation attempts to obtain a
 * Telegram ID and shows a fatal error when accessed outside of Telegram,
 * which prevents the admin panel from loading in a regular browser.
 */
type Props = {
  children: ReactNode;
};

// Shape of the profile API response used to fetch player level
interface ProfileResponse {
  ok: boolean;
  player: {
    tg_id: number;
    level: number;
  };
}

/**
 * Detects whether an error returned from the API indicates that the user
 * needs to register (HTTP 409 with code NEED_REGISTER). In such cases we
 * redirect the user to the registration page.
 */
function isNeedRegisterError(e: any): boolean {
  const msg = String(e?.message || "");
  return msg.includes("409") || msg.includes("NEED_REGISTER");
}

export default function RootClientShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  // Extract the first segment of the pathname, defaulting to "city"
  const segment = pathname.split("/")[1] || "";
  const screenKey = segment || "city";

  /**
   * Only some screens require the roaming NPC overlay. The admin area does
   * not, so it remains disabled for `/admin` pages. Added `quests` to
   * the list to enable roaming NPCs on the quests page as well.
   */
  const enabled = useMemo(
    () =>
      [
        "city",
        "areas",
        "battle",
        "zastava",
        "tavern",
        "inventory",
        "quests",
      ].includes(screenKey),
    [screenKey]
  );

  // Local state for the current Telegram ID and player level
  const [tgId, setTgId] = useState<number | null>(null);
  const [level, setLevel] = useState<number>(1);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  // Determine if we are currently rendering an admin page
  const isAdminPath = pathname.startsWith("/admin");

  /**
   * Effect: initialize Telegram and obtain the tg_id. If we are on an
   * admin page, skip this initialization and mark the shell as ready
   * immediately. Otherwise, attempt to resolve the tg_id via Telegram
   * WebApp, and set an error if it cannot be obtained.
   */
  useEffect(() => {
    let alive = true;
    if (isAdminPath) {
      // Skip Telegram initialization for admin pages. Without this, the
      // default implementation would attempt to access the Telegram WebApp
      // and show a fatal error about a missing tg_id when the admin panel
      // is opened in a regular browser.
      setReady(true);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        initTg();
        const id = await waitTgId(5000);

        if (!alive) return;

        if (!id) {
          setFatal(
            "Не знайдено Telegram ID. Відкрий мініап із чату бота."
          );
          setReady(true);
          return;
        }

        localStorage.setItem("tg_id", String(id));
        setTgId(id);
        setReady(true);
      } catch {
        if (!alive) return;
        setFatal("Помилка ініціалізації Telegram WebApp.");
        setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAdminPath]);

  /**
   * Effect: fetch the player's profile to determine their level. This is
   * skipped for admin pages (which don't have a tgId) and when tgId is
   * null. If the API indicates that registration is required, we redirect
   * to the registration page with the tg_id as a query parameter.
   */
  useEffect(() => {
    let alive = true;
    if (isAdminPath || !tgId) return;

    (async () => {
      try {
        const r = await getJSON<ProfileResponse>("/api/profile");
        if (!alive) return;
        if (r?.ok && r?.player?.level != null) {
          setLevel(Number(r.player.level) || 1);
        }
      } catch (e: any) {
        if (!alive) return;
        if (isNeedRegisterError(e)) {
          router.replace(`/register?tg_id=${tgId}`);
          return;
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAdminPath, tgId, router]);

  // Hook for roaming NPC overlay. Only active on enabled screens and
  // when we have a valid tgId. Admin pages never show the overlay.
  const npcHook = useRoamingNpc({
    tgId: tgId ?? 0,
    level,
    screenKey,
  });

  // Loading state: show a loading screen until initialization is complete
  if (!ready) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Завантаження…
      </main>
    );
  }

  // Fatal error: show the fatal error message for non-admin pages only
  if (fatal && !isAdminPath) {
    return (
      <main className="min-h-screen bg-black text-red-400 flex items-center justify-center px-4 text-center text-sm">
        {fatal}
      </main>
    );
  }

  // Render children and optional roaming NPC overlay
  return (
    <>
      {children}
      {!isAdminPath && enabled && tgId && <RoamingNpcOverlay hook={npcHook} />}
    </>
  );
}
