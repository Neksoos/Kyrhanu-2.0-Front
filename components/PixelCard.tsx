import React from "react";

export function PixelCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="pixel-border bg-white/5 p-4">
      {title ? <div className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">{title}</div> : null}
      {children}
    </div>
  );
}