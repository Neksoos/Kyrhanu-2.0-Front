// src/hooks/useTgId.ts
"use client";
import { useEffect, useState } from "react";
import { waitTgId } from "@/lib/tg";

export function useTgId() {
  const [tgId, setTgId] = useState<number | null | "loading">("loading");
  useEffect(() => {
    let ok = true;
    waitTgId().then(id => ok && setTgId(id ?? null));
    return () => { ok = false };
  }, []);
  return tgId; // "loading" | number | null
}