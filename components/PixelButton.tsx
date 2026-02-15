"use client";

import React from "react";

export function PixelButton({
  children,
  onClick,
  variant = "primary",
  disabled
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const base =
    "select-none px-4 py-3 font-bold uppercase tracking-wide text-sm pixel-border rounded-none active:translate-y-[2px] transition-transform";
  const styles =
    variant === "primary"
      ? "bg-[var(--accent)] text-black hover:brightness-110"
      : variant === "danger"
      ? "bg-[var(--danger)] text-black hover:brightness-110"
      : "bg-transparent text-[var(--fg)] hover:bg-white/5";

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${styles} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}