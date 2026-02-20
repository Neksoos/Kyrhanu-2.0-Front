"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { getJSON, postJSON } from "@/lib/api";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type BattleMob = {
  code: string;
  name: string;
  hp: number;
  hp_max: number;
  level: number;
  phys_attack: number;
  magic_attack: number;
  phys_defense: number;
  magic_defense: number;
  image_url?: string;
  atk?: number;
  video_url?: string;
};

type BattleHero = {
  name: string;
  hp: number;
  hp_max: number;
  mp: number;
  mp_max: number;
  phys_attack: number;
  magic_attack: number;
  phys_defense: number;
  magic_defense: number;
  atk: number;
  def_?: number;
  def?: number;
  energy: number;
  energy_max: number;
};

type BattleDTO = {
  id: number;
  state: "active" | "won" | "lost" | "fled";
  turn: number;
  area_key: string;
  mob: BattleMob;
  hero: BattleHero;
  note: string;
  loot: string[];
};

function hasInitData(): boolean {
  try {
    return !!window.Telegram?.WebApp?.initData;
  } catch {
    return false;
  }
}

function getTgIdFromTelegram(): number | null {
  try {
    const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function areaName(key: string): string {
  switch (key) {
    case "slums":
      return "Нетриця";
    case "suburbs":
      return "Передмістя";
    case "swamp":
      return "Болота Чорнолісся";
    case "ruins":
      return "Руїни Форпосту";
    case "quarry":
      return "Занедбаний карʼєр";
    case "ridge":
      return "Вітряний Хребет";
    case "crown":
      return "Крижана Корона";
    default:
      return "Околиці";
  }
}

function mobImageUrl(mob: BattleMob | null): string {
  if (!mob) return "/mobs/placeholder.png";
  if (mob.image_url) return mob.image_url;
  return `/mobs/${mob.code}.png`;
}

function mobVideoUrl(mob: BattleMob | null): string {
  if (!mob) return "";
  if (mob.video_url) return mob.video_url;
  return `/mobs/${mob.code}.mp4`;
}

function getHeroLegacyDef(hero: BattleHero): number {
  return Number(hero.def_ ?? hero.def ?? hero.phys_defense ?? 0);
}

function getMobLegacyAtk(mob: BattleMob): number {
  return Number(mob.atk ?? mob.phys_attack ?? 0);
}

function isLootLine(line: string): boolean {
  const s = (line || "").toLowerCase();
  return (
    s.startsWith("xp") ||
    s.includes("червонці") ||
    s.includes("застава") ||
    s.includes("🏅") ||
    s.includes("трофей") ||
    s.includes("loot") ||
    s.includes("+")
  );
}

type InvItem = {
  item_code: string;
  name: string;
  qty: number;
  stats?: Record<string, any>;
};

type InventoryListResponse = {
  items: InvItem[];
};

function isHpConsumable(it: InvItem): boolean {
  const code = (it.item_code || "").toLowerCase();
  const name = (it.name || "").toLowerCase();
  const hpStat = Number((it.stats as any)?.hp ?? 0);

  const codeIsConsumable =
    code.startsWith("food_") ||
    code.startsWith("potion_") ||
    code.startsWith("elixir_") ||
    code.startsWith("tincture_") ||
    code.startsWith("decoction_") ||
    code.startsWith("bandage_") ||
    code.startsWith("med_") ||
    code.includes("_potion") ||
    code.includes("_elixir");

  const nameLooksConsumable =
    name.includes("борщ") ||
    name.includes("варен") ||
    name.includes("сало") ||
    name.includes("юшк") ||
    name.includes("хліб") ||
    name.includes("зіл") ||
    name.includes("елік") ||
    name.includes("наст") ||
    name.includes("відвар") ||
    name.includes("припарка") ||
    name.includes("бинт") ||
    name.includes("ліку");

  return it.qty > 0 && hpStat > 0 && (codeIsConsumable || nameLooksConsumable);
}

function isMpConsumable(it: InvItem): boolean {
  const code = (it.item_code || "").toLowerCase();
  const name = (it.name || "").toLowerCase();
  const mpStat = Number((it.stats as any)?.mp ?? 0);

  const codeIsConsumable =
    code.startsWith("drink_") ||
    code.startsWith("potion_") ||
    code.startsWith("elixir_") ||
    code.startsWith("tincture_") ||
    code.startsWith("decoction_") ||
    code.includes("_potion") ||
    code.includes("_elixir");

  const nameLooksConsumable =
    name.includes("квас") ||
    name.includes("компот") ||
    name.includes("сік") ||
    name.includes("напій") ||
    name.includes("зіл") ||
    name.includes("елік") ||
    name.includes("наст") ||
    name.includes("відвар") ||
    name.includes("дух") ||
    name.includes("мана");

  return it.qty > 0 && mpStat > 0 && (codeIsConsumable || nameLooksConsumable);
}

type FloatNum = {
  id: string;
  side: "hero" | "mob";
  text: string;
  kind: "dmg" | "heal";
};

type LineEvent = {
  side: "hero" | "mob";
  text: string;
  kind: "dmg" | "heal";
  raw: number;
};

function parseLineEvents(line: string): LineEvent[] {
  const s = String(line || "");
  const out: LineEvent[] = [];

  // "Ти ... на 31"
  const youRe = /(?:^|\s)ти\b[\s\S]{0,140}?\bна\s+(\d+)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = youRe.exec(s))) {
    const dmg = Number(m[1]);
    if (Number.isFinite(dmg) && dmg > 0) out.push({ side: "mob", text: `-${dmg}`, kind: "dmg", raw: dmg });
  }

  // "... завдає 12"
  const mobRe =
    /(?:завдає|завдав|наносить|наніс|вдаряє|вдарив|б['’]є|бив|жалить|стріляє|кус[а-яіїєґ]*)\s+(\d+)\b/gi;
  while ((m = mobRe.exec(s))) {
    const dmg = Number(m[1]);
    if (Number.isFinite(dmg) && dmg > 0) out.push({ side: "hero", text: `-${dmg}`, kind: "dmg", raw: dmg });
  }

  // "+12" (XP/лут/хіл)
  const plusRe = /\+(\d+)\b/g;
  while ((m = plusRe.exec(s))) {
    const plus = Number(m[1]);
    if (Number.isFinite(plus) && plus > 0) out.push({ side: "hero", text: `+${plus}`, kind: "heal", raw: plus });
  }

  return out;
}

type VBarProps = {
  value: number;
  max: number;
  type: "hp" | "mp" | "energy";
  height?: number;
  showValue?: boolean;
};

function VBar({ value, max, type, height = 130, showValue = false }: VBarProps) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  const fill =
    type === "hp"
      ? "bg-gradient-to-t from-red-600 to-rose-300"
      : type === "mp"
      ? "bg-gradient-to-t from-sky-600 to-cyan-300"
      : "bg-gradient-to-t from-amber-500 to-yellow-200";

  const icon = type === "hp" ? "❤️" : type === "mp" ? "💧" : "⚡";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[11px] opacity-90">{icon}</div>
      <div
        className="w-[12px] rounded-full bg-black/45 border border-white/10 overflow-hidden relative"
        style={{ height }}
        aria-label={`${type} ${value}/${max}`}
      >
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 22 }}
          className={"absolute bottom-0 left-0 right-0 " + fill}
        />
      </div>
      {showValue && <div className="text-[10px] font-mono opacity-75">{value}/{max}</div>}
    </div>
  );
}

// SFX (можеш прибрати, якщо не треба)
const ATTACK_SFX = ["/audio/attack.mp3", "/audio/attack1.mp3", "/audio/attack2.mp3", "/audio/attack3.mp3"] as const;

// ✅ фонова музика (твій файл)
const BGM_SRC = "/audio/Shadows_of_the_Step.mp3";

export default function BattlePage() {
  const router = useRouter();
  const params = useParams<{ mobId: string }>();
  const search = useSearchParams();
  const fromTravel = search.get("from") === "travel";

  const mobId = useMemo(() => {
    const n = Number(params?.mobId);
    return Number.isNaN(n) ? null : n;
  }, [params]);

  const [tgReady, setTgReady] = useState(false);

  const [battle, setBattle] = useState<BattleDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [log, setLog] = useState<string[]>([]);
  const [itemsOpen, setItemsOpen] = useState(false);

  const [healQty, setHealQty] = useState(0);
  const [healLabel, setHealLabel] = useState<string>("");
  const [mpQty, setMpQty] = useState(0);
  const [mpLabel, setMpLabel] = useState<string>("");

  const [hpItemsShort, setHpItemsShort] = useState<InvItem[]>([]);
  const [mpItemsShort, setMpItemsShort] = useState<InvItem[]>([]);

  const [floats, setFloats] = useState<FloatNum[]>([]);

  const pageRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const shakeControls = useAnimationControls();
  const heroCardControls = useAnimationControls();
  const mobCardControls = useAnimationControls();

  const MP_COST_CAST = 6;
  const IMG_H = "min(560px, 62dvh)";
  const LOG_GUTTER_PX = 66;

  // ─────────────────────────────────────────────
  // BGM (зелений плей)
  // ─────────────────────────────────────────────
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [bgmOn, setBgmOn] = useState(false);

  function toggleBgm() {
    const a = bgmRef.current;
    if (!a) return;

    setBgmOn((on) => {
      const next = !on;
      if (next) {
        try {
          a.play().catch(() => {});
        } catch {}
      } else {
        try {
          a.pause();
        } catch {}
      }
      return next;
    });
  }

  // ─────────────────────────────────────────────
  // SFX pool (опційно)
  // ─────────────────────────────────────────────
  const attackPoolRef = useRef<HTMLAudioElement[]>([]);
  const lastAttackIdxRef = useRef<number>(-1);

  function playRandomAttackSfx() {
    const pool = attackPoolRef.current;
    if (!pool.length) return;

    let idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && idx === lastAttackIdxRef.current) idx = (idx + 1) % pool.length;
    lastAttackIdxRef.current = idx;

    const a = pool[idx];
    try {
      a.pause();
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }

  // ─────────────────────────────────────────────
  // MOB VIDEO: крутиться циклічно від зустрічі до кінця бою.
  // Зупиняємо, коли HP героя або моба = 0 (або battle.state !== active)
  // ─────────────────────────────────────────────
  const mobVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoBlocked, setVideoBlocked] = useState(false);

  const mobVideoSrc = useMemo(() => mobVideoUrl(battle?.mob ?? null), [battle?.mob?.code, battle?.mob?.video_url]);

  const shouldRunMobVideo = useMemo(() => {
    if (!battle) return false;
    if (battle.state !== "active") return false;
    if ((battle.hero?.hp ?? 0) <= 0) return false;
    if ((battle.mob?.hp ?? 0) <= 0) return false;
    return !!mobVideoSrc;
  }, [battle, mobVideoSrc]);

  const tryPlayMobVideo = (fromGesture = false) => {
    const v = mobVideoRef.current;
    if (!v) return;

    if (!shouldRunMobVideo) {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {}
      setVideoBlocked(false);
      return;
    }

    try {
      // важливо для WebView
      v.muted = true;
      (v as any).playsInline = true;
      v.setAttribute("playsinline", "true");
      v.setAttribute("webkit-playsinline", "true");
      v.loop = true;
    } catch {}

    // якщо src ще не підхопився — підставимо і перезавантажимо
    try {
      if (mobVideoSrc && v.src !== location.origin + mobVideoSrc) {
        v.src = mobVideoSrc;
        v.load();
      }
    } catch {}

    try {
      const p = v.play();
      if (p && typeof (p as any).catch === "function") {
        (p as Promise<void>).catch(() => {
          // якщо автоплей заблоковано — покажемо підказку.
          // fromGesture тут не рятує, але на практиці gesture часто вирішує.
          setVideoBlocked(true);
        });
      }
      setVideoBlocked(false);
    } catch {
      setVideoBlocked(true);
    }
  };

  // коли прийшов бій/змінився моб/змінився стан — керуємо відео
  useEffect(() => {
    const v = mobVideoRef.current;
    if (!v) return;

    if (!mobVideoSrc) {
      try {
        v.pause();
        v.removeAttribute("src");
        v.load();
      } catch {}
      setVideoBlocked(false);
      return;
    }

    // підставляємо src одразу, щоб почало крутитись "від зустрічі"
    try {
      v.src = mobVideoSrc;
      v.load();
    } catch {}

    tryPlayMobVideo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobVideoSrc, shouldRunMobVideo]);

  // якщо Telegram/браузер "приспав" медіа — при поверненні пробуємо знову
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      tryPlayMobVideo(false);
      if (bgmOn) bgmRef.current?.play?.().catch?.(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgmOn, shouldRunMobVideo]);

  // "жест" для відео: будь-який тап по екрану, якщо автоплей заблокований
  const onAnyPointerDown = () => {
    if (videoBlocked) tryPlayMobVideo(true);
  };

  // ─────────────────────────────────────────────
  // init audio elements
  // ─────────────────────────────────────────────
  useEffect(() => {
    // SFX
    attackPoolRef.current = ATTACK_SFX.map((src) => {
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = 0.55;
      return a;
    });

    // BGM
    const bgm = new Audio(BGM_SRC);
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.volume = 0.35;
    bgmRef.current = bgm;

    return () => {
      attackPoolRef.current.forEach((a) => {
        try {
          a.pause();
          a.src = "";
        } catch {}
      });
      attackPoolRef.current = [];

      try {
        bgm.pause();
        bgm.src = "";
      } catch {}
      bgmRef.current = null;
    };
  }, []);

  // ─────────────────────────────────────────────
  // Telegram ready
  // ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const wa = (window as any)?.Telegram?.WebApp;
    try {
      wa?.ready?.();
      wa?.expand?.();
    } catch {}

    const tick = () => {
      if (cancelled) return;
      setTgReady(hasInitData());
    };

    tick();
    const t = setInterval(tick, 200);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  async function refreshConsumables() {
    const tgId = getTgIdFromTelegram();
    if (!tgId) {
      setHealQty(0);
      setHealLabel("");
      setMpQty(0);
      setMpLabel("");
      setHpItemsShort([]);
      setMpItemsShort([]);
      return;
    }

    try {
      const data = await getJSON<InventoryListResponse>(`/inventory?tg_id=${tgId}`);
      const items = data.items || [];

      const hpItems = items.filter(isHpConsumable);
      const hpQty = hpItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
      setHealQty(hpQty);
      setHealLabel(hpQty > 0 ? hpItems[0]?.name || "" : "");
      setHpItemsShort(hpItems.slice(0, 4));

      const mpItems = items.filter(isMpConsumable);
      const mQty = mpItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
      setMpQty(mQty);
      setMpLabel(mQty > 0 ? mpItems[0]?.name || "" : "");
      setMpItemsShort(mpItems.slice(0, 4));
    } catch {
      setHealQty(0);
      setHealLabel("");
      setMpQty(0);
      setMpLabel("");
      setHpItemsShort([]);
      setMpItemsShort([]);
    }
  }

  // start battle
  useEffect(() => {
    if (!mobId || !tgReady) return;
    let cancelled = false;

    (async () => {
      try {
        setStarting(true);
        setError(null);

        const data = await postJSON<BattleDTO>("/battle/start", { mob_id: mobId });

        if (!cancelled) {
          setBattle(data);
          if (data.note) setLog([data.note].slice(-30));
          refreshConsumables();
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Помилка старту бою.");
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobId, tgReady]);

  // lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const ended = !!battle && battle.state !== "active";

  const [stickyTopBtn, setStickyTopBtn] = useState(false);
  useEffect(() => {
    if (ended) setStickyTopBtn(true);
  }, [ended]);

  const canAct = battle && battle.state === "active" && !loading;

  const canCast = useMemo(() => {
    if (!battle || battle.state !== "active" || loading) return false;
    if ((battle.hero.magic_attack ?? 0) <= 0) return false;
    if ((battle.hero.mp ?? 0) < MP_COST_CAST) return false;
    return true;
  }, [battle, loading]);

  const canHeal = useMemo(() => {
    if (!battle || battle.state !== "active" || loading) return false;
    return healQty > 0 && battle.hero.hp < battle.hero.hp_max;
  }, [battle, loading, healQty]);

  const canRestore = useMemo(() => {
    if (!battle || battle.state !== "active" || loading) return false;
    return mpQty > 0 && battle.hero.mp < battle.hero.mp_max;
  }, [battle, loading, mpQty]);

  function pushFloatsFromLine(line: string): LineEvent[] {
    const events = parseLineEvents(line);
    if (!events.length) return [];

    const baseId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fs: FloatNum[] = events.map((ev, i) => ({
      id: `${baseId}-${i}`,
      side: ev.side,
      text: ev.text,
      kind: ev.kind,
    }));

    setFloats((p) => [...p, ...fs]);

    fs.forEach((f) => {
      setTimeout(() => {
        setFloats((p) => p.filter((x) => x.id !== f.id));
      }, 900);
    });

    return events;
  }

  async function shake(kind: "hit_mob" | "hit_hero" | "heal") {
    await shakeControls.start({
      x: [0, -12, 12, -10, 10, -6, 6, 0],
      y: [0, 4, -4, 3, -3, 2, -2, 0],
      transition: { duration: 0.48, ease: "easeInOut" },
    });

    if (kind === "hit_mob") {
      mobCardControls.start({
        x: [0, 9, -9, 6, -6, 0],
        transition: { duration: 0.44, ease: "easeInOut" },
      });
    } else if (kind === "hit_hero") {
      heroCardControls.start({
        x: [0, -9, 9, -6, 6, 0],
        transition: { duration: 0.44, ease: "easeInOut" },
      });
    } else if (kind === "heal") {
      heroCardControls.start({
        y: [0, -2, 0],
        transition: { duration: 0.35, ease: "easeOut" },
      });
    }
  }

  async function doAction(kind: "attack" | "cast" | "heal" | "restore" | "flee") {
    if (!battle || !tgReady) return;
    if (!canAct && kind !== "flee") return;
    if (kind === "cast" && !canCast) return;
    if (kind === "heal" && !canHeal) return;
    if (kind === "restore" && !canRestore) return;

    // якщо відео було заблоковане — цей тап може його розблокувати (без звуку)
    if (videoBlocked) tryPlayMobVideo(true);

    if (kind === "attack") playRandomAttackSfx();

    setLoading(true);
    setError(null);

    try {
      const apiKind = kind === "restore" ? "heal" : kind;

      const data = await postJSON<BattleDTO>(`/battle/${apiKind}`, {
        battle_id: battle.id,
        ...(kind === "restore" ? { mode: "mp" } : kind === "heal" ? { mode: "hp" } : {}),
      });

      setBattle(data);

      if (data.note) {
        setLog((p) => [...p, data.note].slice(-30));

        const events = pushFloatsFromLine(data.note);
        const heroDmg = events.some((e) => e.kind === "dmg" && e.side === "hero");
        const mobDmg = events.some((e) => e.kind === "dmg" && e.side === "mob");
        const healed = events.some((e) => e.kind === "heal");

        if (heroDmg) await shake("hit_hero");
        else if (mobDmg) await shake("hit_mob");
        else if (healed) await shake("heal");
      }

      if (data.loot?.length) {
        setLog((p) => [...p, ...data.loot].slice(-30));
        data.loot.forEach((ln) => pushFloatsFromLine(ln));
      }

      if (kind === "heal" || kind === "restore") {
        refreshConsumables();
        setItemsOpen(false);
      }

      if (fromTravel && data.state === "fled") router.push("/areas");
    } catch (e: any) {
      setError(e?.message || "Помилка дії.");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    router.push("/areas");
  }

  if (!tgReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-slate-100 px-4 text-center">
        Підключення до Telegram…
      </div>
    );
  }

  const mobImgUrl = mobImageUrl(battle?.mob ?? null);
  const heroLegacyDef = battle ? getHeroLegacyDef(battle.hero) : 0;
  const mobLegacyAtk = battle ? getMobLegacyAtk(battle.mob) : 0;
  const overlayLog = log.slice(-3);

  const stateBadge =
    battle?.state === "won"
      ? "✅ Перемога"
      : battle?.state === "lost"
      ? "💀 Поразка"
      : battle?.state === "fled"
      ? "🏃 Втеча"
      : null;

  return (
    <motion.div
      ref={pageRef}
      onPointerDown={onAnyPointerDown}
      animate={shakeControls}
      className="h-[100dvh] overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 flex flex-col"
    >
      {/* HEADER */}
      <div className="px-4 pt-4 pb-3 flex items-end justify-between border-b border-white/5 bg-black/40 shrink-0 relative">
        <div>
          <div className="text-[11px] uppercase text-emerald-400/80">
            {battle ? areaName(battle.area_key) : "Пошук моба"}
          </div>
          <div className="text-lg font-semibold leading-tight">{battle?.mob.name ?? "Супротивник"}</div>
          <div className="text-[12px] opacity-70">
            {starting ? "Старт бою…" : battle ? `Хід: ${battle.turn}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {stateBadge ? (
            <div className="text-[12px] px-3 py-1 rounded-full bg-black/50 border border-white/10">{stateBadge}</div>
          ) : null}

          {stickyTopBtn && (
            <button
              type="button"
              onClick={goBack}
              className="h-9 px-3 rounded-full bg-emerald-600/90 border border-emerald-200/20 shadow-lg shadow-emerald-950/35 backdrop-blur text-[12px] font-semibold"
            >
              {fromTravel ? "Перейти далі →" : "Повернутися →"}
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div ref={contentScrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 flex flex-col gap-3">
        <div className="relative rounded-3xl border border-emerald-500/25 bg-slate-950 overflow-hidden">
          <div className="relative flex items-center justify-center px-2 pt-3">
            <motion.div
              animate={{ height: IMG_H }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="w-full overflow-hidden rounded-3xl relative"
            >
              {/* фон */}
              <Image src={mobImgUrl} alt="mob" width={900} height={1200} className="w-full h-full object-cover" priority />

              {/* ✅ відео моба (циклічно, без звуку), працює від зустрічі до кінця бою */}
              <video
                ref={mobVideoRef}
                className={
                  "pointer-events-none absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-150 " +
                  (shouldRunMobVideo ? "opacity-100" : "opacity-0")
                }
                muted
                playsInline
                preload="auto"
                loop
                autoPlay
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/28 via-black/5 to-transparent z-20" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-20" />

              {/* ✅ Великий зелений плей — фонова музика */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBgm();
                }}
                className="absolute right-3 top-3 z-40 w-14 h-14 rounded-full bg-emerald-500/95 border border-emerald-100/30 shadow-xl shadow-emerald-950/40 backdrop-blur flex items-center justify-center active:scale-[0.98]"
                aria-label={bgmOn ? "Вимкнути музику" : "Увімкнути музику"}
              >
                <span className="text-black text-xl font-extrabold">{bgmOn ? "⏸" : "▶"}</span>
              </button>

              {/* якщо автоплей відео заблокувався — підказка (без привʼязки до звуку) */}
              {videoBlocked && shouldRunMobVideo ? (
                <div className="absolute right-3 top-[74px] z-40 text-[11px] px-2 py-1 rounded-xl bg-black/55 border border-white/10">
                  Торкнись екрана, щоб активувати відео
                </div>
              ) : null}

              {battle && (
                <>
                  <motion.div
                    animate={heroCardControls}
                    className="absolute left-2 top-2 bottom-2 z-30 flex flex-col justify-between"
                  >
                    <div className="rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm px-2 py-1.5 max-w-[160px]">
                      <div className="text-[12px] font-semibold truncate">{battle.hero.name}</div>
                      <div className="text-[11px] opacity-90 whitespace-nowrap">
                        ⚔ {battle.hero.atk} · 🛡 {heroLegacyDef}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-black/22 border border-white/10 backdrop-blur-sm px-2 py-2">
                      <div className="flex items-end gap-2">
                        <VBar value={battle.hero.hp} max={battle.hero.hp_max} type="hp" height={140} />
                        <VBar value={battle.hero.mp} max={battle.hero.mp_max} type="mp" height={140} />
                        <VBar value={battle.hero.energy} max={battle.hero.energy_max} type="energy" height={140} />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    animate={mobCardControls}
                    className="absolute right-2 top-2 bottom-2 z-30 flex flex-col justify-between items-end"
                  >
                    <div className="rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm px-2 py-1.5 max-w-[170px] text-right">
                      <div className="text-[12px] font-semibold truncate">{battle.mob.name}</div>
                      <div className="text-[11px] opacity-90 whitespace-nowrap">
                        ⚔ {mobLegacyAtk} · Lvl {battle.mob.level}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-black/22 border border-white/10 backdrop-blur-sm px-2 py-2">
                      <div className="flex items-end gap-2">
                        <VBar value={battle.mob.hp} max={battle.mob.hp_max} type="hp" height={150} />
                      </div>
                    </div>
                  </motion.div>
                </>
              )}

              <div className="pointer-events-none absolute bottom-2 z-20 px-2" style={{ left: LOG_GUTTER_PX, right: LOG_GUTTER_PX }}>
                <AnimatePresence initial={false}>
                  {overlayLog.map((line, idx) => (
                    <motion.div
                      key={`${idx}-${line}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className={
                        "mt-1 rounded-xl px-3 py-2 text-[12px] leading-snug bg-black/45 border border-white/10 backdrop-blur " +
                        (isLootLine(line) ? "text-emerald-200" : "text-slate-100")
                      }
                    >
                      {line}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="pointer-events-none absolute inset-0 z-30">
                <AnimatePresence>
                  {floats.map((f) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: -18, scale: 1 }}
                      exit={{ opacity: 0, y: -38, scale: 0.95 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className={
                        "absolute top-[26%] text-lg font-semibold drop-shadow " +
                        (f.kind === "heal" ? "text-emerald-200" : "text-red-200")
                      }
                      style={{ left: f.side === "hero" ? "18%" : "62%" }}
                    >
                      {f.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-[12px]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pb-3">
          <button
            onClick={() => doAction("attack")}
            disabled={!canAct}
            className="h-11 rounded-2xl bg-red-600 disabled:opacity-50"
          >
            ⚔ Атакувати
          </button>

          <button
            onClick={() => doAction("cast")}
            disabled={!canCast}
            className="h-11 rounded-2xl bg-indigo-600 disabled:opacity-50"
          >
            ✨ Чари
          </button>

          <button
            onClick={() => setItemsOpen(true)}
            disabled={!battle || battle.state !== "active" || loading}
            className="h-11 rounded-2xl bg-slate-800 border border-white/10 disabled:opacity-50 flex flex-col items-center justify-center leading-none"
          >
            <span className="text-[13px]">🎒 Предмети</span>
            <span className="text-[10px] opacity-80">
              {healQty > 0 || mpQty > 0 ? `HP×${healQty} · MP×${mpQty}` : "немає"}
            </span>
          </button>

          <button
            onClick={() => doAction("flee")}
            disabled={!battle || loading}
            className="h-11 rounded-2xl bg-slate-600 disabled:opacity-50"
          >
            🏃 Втекти
          </button>
        </div>
      </div>

      <AnimatePresence>
        {itemsOpen && (
          <>
            <motion.button
              type="button"
              onClick={() => setItemsOpen(false)}
              className="fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label="Close items"
            />
            <motion.div
              className="fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-slate-950 shadow-2xl"
              initial={{ y: 420 }}
              animate={{ y: 0 }}
              exit={{ y: 520 }}
              transition={{ type: "spring", stiffness: 140, damping: 22 }}
            >
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">🎒 Предмети</div>
                <button
                  type="button"
                  onClick={() => setItemsOpen(false)}
                  className="text-[12px] opacity-80 hover:opacity-100"
                >
                  Закрити ✕
                </button>
              </div>

              <div className="px-4 pb-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="text-[12px] font-semibold mb-2">🩹 Лікування (HP)</div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => doAction("heal")}
                      disabled={!canHeal}
                      className="h-10 flex-1 rounded-2xl bg-emerald-600 disabled:opacity-50"
                    >
                      Використати
                    </button>
                    <div className="text-[11px] opacity-80 text-right min-w-[92px]">
                      {healQty > 0 ? `×${healQty}` : "немає"}
                      <div className="opacity-70 truncate max-w-[120px]">{healLabel || ""}</div>
                    </div>
                  </div>

                  {hpItemsShort.length > 0 && (
                    <div className="mt-2 text-[11px] opacity-70 space-y-1">
                      {hpItemsShort.map((it) => (
                        <div key={it.item_code} className="flex items-center justify-between">
                          <span className="truncate">{it.name}</span>
                          <span className="font-mono opacity-80">×{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="text-[12px] font-semibold mb-2">💠 Відновити дух (MP)</div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => doAction("restore")}
                      disabled={!canRestore}
                      className="h-10 flex-1 rounded-2xl bg-sky-600 disabled:opacity-50"
                    >
                      Використати
                    </button>
                    <div className="text-[11px] opacity-80 text-right min-w-[92px]">
                      {mpQty > 0 ? `×${mpQty}` : "немає"}
                      <div className="opacity-70 truncate max-w-[120px]">{mpLabel || ""}</div>
                    </div>
                  </div>

                  {mpItemsShort.length > 0 && (
                    <div className="mt-2 text-[11px] opacity-70 space-y-1">
                      {mpItemsShort.map((it) => (
                        <div key={it.item_code} className="flex items-center justify-between">
                          <span className="truncate">{it.name}</span>
                          <span className="font-mono opacity-80">×{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-[11px] opacity-60">
                  * Зараз сервер сам вибирає, що саме “з’їсти” для HP/MP (бо в API не передаємо item_code).
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}