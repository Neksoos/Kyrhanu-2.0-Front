"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolveTgId } from "@/lib/tg";
import { getJSON } from "@/lib/api";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-3 text-center">Завантаження…</div>}>
      <RegisterInner />
    </Suspense>
  );
}

// ─────────────────────────────────────
// Типи / константи
// ─────────────────────────────────────
type Gender = "m" | "f" | "x" | "";

type RaceKey =
  | "human"
  | "vovkulak"
  | "naviy"
  | "mavchyn"
  | "chugaister"
  | "upyr"
  | "";

type ClassKey = "molfar" | "kozak" | "kharyk" | "vatazhok" | "";

// порядок рас + метадані
const RACES: {
  key: Exclude<RaceKey, "">;
  label: string;
  desc: string;
  imgBase: string; // без _m/_f
}[] = [
  {
    key: "human",
    label: "Людина",
    desc: "Стійкий, впертий і винахідливий нащадок козацького роду.",
    imgBase: "race_human",
  },
  {
    key: "vovkulak",
    label: "Вовкулак",
    desc: "Мисливець між світом людей і звірів, швидкий та лютий.",
    imgBase: "race_vovkulak",
  },
  {
    key: "naviy",
    label: "Навій",
    desc: "Душа, що повернулася з-за Зони Наві, холодна і небезпечна.",
    imgBase: "race_naviy",
  },
  {
    key: "mavchyn",
    label: "Мавчин Рід",
    desc: "Лісові чарівники й чарівниці, що танцюють із вітром.",
    imgBase: "race_mavchyn",
  },
  {
    key: "chugaister",
    label: "Чугайстерів Рід",
    desc: "Дикий сторож гір та лісів, що полює на нечисть.",
    imgBase: "race_chugaister",
  },
  {
    key: "upyr",
    label: "Опир",
    desc: "Проклятий воїн ночі, що черпає силу з темряви.",
    imgBase: "race_upyr",
  },
];

// класи
const CLASSES: {
  key: Exclude<ClassKey, "">;
  label: string;
  desc: string;
  img: string;
}[] = [
  {
    key: "molfar",
    label: "Мольфар",
    desc: "Маг стихій, руни, бурі та лікувальні обереги.",
    img: "/classes/class_molfar.png",
  },
  {
    key: "kozak",
    label: "Козак",
    desc: "Майстер шаблі та мушкета, фронтовий боєць.",
    img: "/classes/class_kozak.png",
  },
  {
    key: "kharyk",
    label: "Характерник",
    desc: "Воїн-заклинач, що перекручує долю й ворожі удари.",
    img: "/classes/class_kharyk.png",
  },
  {
    key: "vatazhok",
    label: "Ватажок",
    desc: "Польовий отаман, бафери й аури підсилюють усю чоту.",
    img: "/classes/class_vatazhok.png",
  },
];

// ─────────────────────────────────────
// Компонент
// ─────────────────────────────────────
function RegisterInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [tgId, setTgId] = useState<number | undefined>(undefined);
  const [initData, setInitData] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [race, setRace] = useState<RaceKey>("");
  const [cls, setCls] = useState<ClassKey>("");

  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // ─────────────────────────────────────
  // Визначаємо tg_id + initData
  // ─────────────────────────────────────
  useEffect(() => {
    let id: number | undefined;

    const tgIdParam = sp.get("tg_id");
    if (tgIdParam) {
      const n = Number(tgIdParam);
      if (!Number.isNaN(n) && n > 0) id = n;
    }

    if (!id) {
      const fromTg = resolveTgId();
      if (fromTg) id = fromTg;
    }

    if (!id) {
      try {
        const raw = localStorage.getItem("tg_id");
        if (raw) {
          const n = Number(raw);
          if (!Number.isNaN(n) && n > 0) id = n;
        }
      } catch {
        //
      }
    }

    if (id) {
      setTgId(id);
      try {
        localStorage.setItem("tg_id", String(id));
      } catch {
        //
      }
      setErr(null);
    } else {
      setErr(
        "Не знайдено Telegram ID. Увійди через Telegram або відкрий мініап із чату бота."
      );
    }

    // Telegram initData (ВАЖЛИВО: нам потрібен рядок для X-Init-Data)
    try {
      const tgInit =
        (window as any)?.Telegram?.WebApp?.initData ??
        (window as any)?.Telegram?.WebApp?.initDataUnsafe;

      if (tgInit) {
        if (typeof tgInit === "string") {
          setInitData(tgInit);
        } else if (tgInit && typeof tgInit === "object") {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(tgInit)) {
            if (v != null) params.append(k, String(v));
          }
          setInitData(params.toString());
        }
      }
    } catch {
      //
    }
  }, [sp]);

  // ─────────────────────────────────────
  // Перевірка ніку
  // ─────────────────────────────────────
  async function checkName(nm: string): Promise<boolean> {
    const clean = nm.trim();
    if (clean.length < 3) {
      setErr("Ім’я має містити мінімум 3 символи.");
      setAvailable(null);
      return false;
    }

    setChecking(true);
    setErr(null);
    try {
      const r = await getJSON<{
        ok: boolean;
        available: boolean;
        reason?: string;
      }>(`/api/proxy/api/name-available?name=${encodeURIComponent(clean)}`);

      setAvailable(r.available);

      if (!r.available) {
        if (r.reason === "invalid") {
          setErr("Некоректне ім’я (3–16, без заборонених слів).");
        } else {
          setErr("Ім’я вже зайняте.");
        }
        return false;
      }
      return true;
    } catch (e: any) {
      setErr(`Помилка перевірки імені: ${String(e?.message || e)}`);
      return false;
    } finally {
      setChecking(false);
    }
  }

  // ─────────────────────────────────────
  // Сабміт реєстрації
  // ─────────────────────────────────────
  async function submit() {
    if (!tgId) return;

    // Без initData бек впаде на авторизації (або дасть 401/403)
    if (!initData) {
      setErr(
        "Не знайдено Telegram initData. Відкрий гру з Telegram (Mini App), а не просто з браузера."
      );
      return;
    }

    setSending(true);
    setErr(null);

    try {
      const res = await fetch("/api/proxy/api/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Init-Data": initData, // ✅ ОЦЕ ВАЖЛИВО
        },
        body: JSON.stringify({
          name: name.trim(),
          gender: gender || null,
          race_key: race || null,
          class_key: cls || null,
          locale: "uk",
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const j = await res.json();
          detail =
            j?.detail
              ? `: ${typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail)}`
              : j?.message
              ? `: ${String(j.message)}`
              : "";
        } catch {
          // якщо не JSON
        }
        throw new Error(`HTTP ${res.status}${detail}`);
      }

      // після реєстрації — одразу в місто
      router.replace("/");
    } catch (e: any) {
      setErr(`Не вдалося зареєструвати: ${String(e?.message || e)}`);
    } finally {
      setSending(false);
    }
  }

  // ─────────────────────────────────────
  // Навігація по кроках
  // ─────────────────────────────────────
  async function nextStep() {
    if (step === 1) {
      if (!name.trim()) {
        setErr("Вкажи ім’я героя.");
        return;
      }
      if (!gender) {
        setErr("Оберіть стать героя.");
        return;
      }
      const ok = await checkName(name);
      if (!ok) return;
      setErr(null);
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!race) {
        setErr("Можеш обрати расу або продовжити з людиною за замовчуванням.");
        setRace("human");
      } else {
        setErr(null);
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      await submit();
    }
  }

  function prevStep() {
    if (step > 1) {
      setErr(null);
      setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)));
    }
  }

  const canSubmit =
    step === 3 &&
    !!tgId &&
    !!name.trim() &&
    !!initData && // ✅ без initData не сабмітимо
    !checking &&
    !sending &&
    available !== false &&
    name.trim().length >= 3;

  function raceImgSrc(raceKey: Exclude<RaceKey, "">): string {
    const base = RACES.find((r) => r.key === raceKey)?.imgBase ?? raceKey;
    const suffix = gender === "f" ? "_f" : "_m";
    return `/races/${base}${suffix}.png`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-md relative">
        <div className="pointer-events-none absolute inset-0 blur-3xl opacity-30 bg-[radial-gradient(circle_at_10%_0%,rgba(251,191,36,0.25),transparent_55%),radial-gradient(circle_at_90%_100%,rgba(56,189,248,0.3),transparent_60%)]" />

        <section className="relative z-10 rounded-3xl border border-amber-500/20 bg-slate-950/80 shadow-xl shadow-black/60 px-4 py-4 space-y-4">
          <header className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-wide">
                Створення героя
              </h1>
              <p className="text-xs text-slate-400">
                Крок {step} з 3 • Прокляті кургани
              </p>
            </div>
            <div className="text-2xl">🕯️</div>
          </header>

          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all"
              style={{
                width: step === 1 ? "33%" : step === 2 ? "66%" : "100%",
              }}
            />
          </div>

          {step === 1 && (
            <Step1Basic
              name={name}
              setName={(v) => {
                setName(v);
                setAvailable(null);
              }}
              gender={gender}
              setGender={(g) => {
                setGender(g);
                setAvailable(null);
              }}
              onBlurName={() =>
                name.trim().length >= 3 && checkName(name.trim())
              }
              available={available}
              checking={checking}
            />
          )}

          {step === 2 && (
            <Step2Race
              race={race}
              setRace={setRace}
              gender={gender}
              raceImgSrc={raceImgSrc}
            />
          )}

          {step === 3 && <Step3Class cls={cls} setCls={setCls} />}

          {!initData && (
            <div className="text-[11px] text-amber-300/90 bg-amber-900/20 border border-amber-500/30 rounded-xl px-3 py-2">
              initData не знайдено. Реєстрація працює тільки коли гра відкрита як Telegram Mini App.
            </div>
          )}

          {err && (
            <div className="text-xs text-rose-400 bg-rose-900/30 border border-rose-500/40 rounded-xl px-3 py-2">
              {err}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 gap-2">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1}
              className="px-3 py-2 rounded-xl border border-slate-600/70 bg-slate-900/80 text-xs font-medium text-slate-200 disabled:opacity-40 disabled:border-slate-800"
            >
              ← Назад
            </button>

            <button
              type="button"
              onClick={nextStep}
              disabled={
                step === 1
                  ? checking || !name.trim()
                  : step === 3
                  ? !canSubmit
                  : sending
              }
              className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-xs font-semibold shadow-lg shadow-amber-500/40 disabled:opacity-40 disabled:shadow-none"
            >
              {step < 3
                ? "Далі"
                : sending
                ? "Створюємо…"
                : "Завершити реєстрацію"}
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center pt-1">
            Телеграм ID: {tgId ?? "невідомо"}
          </p>
        </section>
      </div>
    </main>
  );
}

function Step1Basic(props: {
  name: string;
  setName: (v: string) => void;
  gender: Gender;
  setGender: (g: Gender) => void;
  onBlurName: () => void;
  available: boolean | null;
  checking: boolean;
}) {
  const { name, setName, gender, setGender, onBlurName, available, checking } =
    props;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Ім’я героя
        </label>
        <input
          className="mt-1 w-full rounded-xl bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/70"
          placeholder="3–16 символів"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={onBlurName}
          maxLength={16}
        />
        <div className="mt-1 text-[11px] text-slate-500">
          Ім’я буде видно іншим гравцям.
        </div>
        {available === true && (
          <div className="mt-1 text-[11px] text-emerald-400">Ім’я вільне ✅</div>
        )}
        {available === false && (
          <div className="mt-1 text-[11px] text-rose-400">
            Ім’я зайняте або заборонене.
          </div>
        )}
        {checking && (
          <div className="mt-1 text-[11px] text-sky-400">
            Перевіряю доступність…
          </div>
        )}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
          Стать героя
        </div>
        <div className="grid grid-cols-3 gap-2">
          <GenderBtn
            active={gender === "m"}
            onClick={() => setGender("m")}
            label="Чоловік"
            icon="🛡️"
          />
          <GenderBtn
            active={gender === "f"}
            onClick={() => setGender("f")}
            label="Жінка"
            icon="⚔️"
          />
          <GenderBtn
            active={gender === "x"}
            onClick={() => setGender("x")}
            label="Інше"
            icon="✨"
          />
        </div>
      </div>
    </div>
  );
}

function GenderBtn(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  const { active, onClick, label, icon } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-2 py-2 text-xs font-semibold flex flex-col items-center justify-center border ${
        active
          ? "bg-amber-500/90 border-amber-400 text-black shadow-md shadow-amber-500/40"
          : "bg-slate-900/80 border-slate-700 text-slate-100"
      }`}
    >
      <span className="text-lg mb-0.5">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Step2Race(props: {
  race: RaceKey;
  setRace: (k: RaceKey) => void;
  gender: Gender;
  raceImgSrc: (k: Exclude<RaceKey, "">) => string;
}) {
  const { race, setRace, gender, raceImgSrc } = props;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
          Обери свій рід
        </div>
        <p className="text-xs text-slate-300 mb-2">
          Раса впливатиме на атмосферу та можливі події в історії (баланс можна
          буде крутити пізніше).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {RACES.map((r) => {
          const active = race === r.key;
          const src = raceImgSrc(r.key);
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRace(r.key)}
              className={`group rounded-2xl overflow-hidden border text-left text-xs bg-slate-900/80 ${
                active
                  ? "border-amber-400 shadow-md shadow-amber-500/40"
                  : "border-slate-700/80"
              }`}
            >
              <div className="relative h-28 w-full">
                <Image src={src} alt={r.label} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {active && (
                  <div className="absolute top-1.5 right-1.5 text-[11px] bg-amber-500 text-black px-2 py-0.5 rounded-full">
                    Обрано
                  </div>
                )}
              </div>
              <div className="px-2.5 py-2 space-y-0.5">
                <div className="font-semibold text-[13px]">{r.label}</div>
                <div className="text-[11px] text-slate-300 line-clamp-2">
                  {r.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!gender && (
        <div className="text-[11px] text-slate-500">
          Під стать героя автоматично підбираються портрети рас.
        </div>
      )}
    </div>
  );
}

function Step3Class(props: { cls: ClassKey; setCls: (k: ClassKey) => void }) {
  const { cls, setCls } = props;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
          Обери шлях
        </div>
        <p className="text-xs text-slate-300 mb-2">
          Клас визначає стартовий стиль бою та майбутні таланти. Можна буде
          розширювати й міксувати пізніше.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CLASSES.map((c) => {
          const active = cls === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCls(c.key)}
              className={`group rounded-2xl border bg-slate-900/80 text-xs px-3 py-3 flex flex-col items-center ${
                active
                  ? "border-emerald-400 shadow-md shadow-emerald-500/40"
                  : "border-slate-700/80"
              }`}
            >
              <div className="relative h-20 w-20 mb-2">
                <Image
                  src={c.img}
                  alt={c.label}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="font-semibold text-[13px] mb-1 text-center">
                {c.label}
              </div>
              <div className="text-[11px] text-slate-300 text-center line-clamp-3">
                {c.desc}
              </div>
            </button>
          );
        })}
      </div>

      {!cls && (
        <div className="text-[11px] text-slate-500">
          Якщо не обереш клас, герой стартуватиме як «безрідний» з базовими
          характеристиками.
        </div>
      )}
    </div>
  );
}