"use client";

import { useEffect, useState } from "react";

export function Toast({ message, kind = "info", onDone }: { message: string; kind?: "info" | "error"; onDone?: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 flex justify-center">
      <div className={`pixel-border px-4 py-3 ${kind === "error" ? "bg-[var(--danger)] text-black" : "bg-white/10"}`}>
        <div className="text-sm">{message}</div>
      </div>
    </div>
  );
}