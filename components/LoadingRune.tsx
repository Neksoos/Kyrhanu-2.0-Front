"use client";

export function LoadingRune({ label = "Завантаження…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-[var(--muted)]">
      <div className="w-6 h-6 border-2 border-white/30 border-t-white animate-spin" />
      <div className="text-sm">{label}</div>
    </div>
  );
}