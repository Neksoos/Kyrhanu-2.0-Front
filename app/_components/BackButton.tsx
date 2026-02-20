"use client";

import { useRouter } from "next/navigation";

type Props = {
  href?: string;          // куди вести (якщо задано)
  fallbackHref?: string;  // якщо нема history
  label?: string;         // aria-label
  title?: string;         // tooltip
  className?: string;     // доп. класи
};

export default function BackButton({
  href,
  fallbackHref = "/profile",
  label = "Назад",
  title = "Назад",
  className = "",
}: Props) {
  const router = useRouter();

  function goBack() {
    // Якщо задано явний шлях — йдемо туди
    if (href) {
      router.push(href);
      return;
    }

    // Якщо є історія — назад
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    // Фолбек
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      title={title}
      className={`flex items-center justify-center w-10 h-10 rounded-full
                  bg-slate-800/80 border border-slate-700
                  text-slate-200 text-lg
                  active:scale-95 hover:bg-slate-700 transition
                  ${className}`}
    >
      ←
    </button>
  );
}