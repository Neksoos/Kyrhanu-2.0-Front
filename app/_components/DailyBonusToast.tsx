"use client";

import { motion } from "framer-motion";

export type DailyBonusPayload = {
  daily_applied?: boolean;
  daily_xp?: number;
  daily_chervontsi?: number;
  daily_kleynod?: boolean;
} | null;

export default function DailyBonusToast({
  payload,
  onClose,
}: {
  payload: DailyBonusPayload;
  onClose: () => void;
}) {
  if (!payload || !payload.daily_applied) return null;

  const { daily_xp, daily_chervontsi, daily_kleynod } = payload;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      onClick={onClose}
      className="
        fixed bottom-4 left-1/2 -translate-x-1/2
        bg-slate-900/90 border border-amber-500/40
        px-4 py-3 rounded-2xl text-sm text-amber-200 shadow-xl
        backdrop-blur-md cursor-pointer
        w-[90%] max-w-sm
      "
    >
      <p className="font-semibold mb-1">Щоденний бонус отримано!</p>

      {daily_chervontsi ? (
        <p className="text-amber-300">+{daily_chervontsi} червонців</p>
      ) : null}

      {daily_xp ? <p className="text-cyan-300">+{daily_xp} XP</p> : null}

      {daily_kleynod ? (
        <p className="text-purple-300">+1 клейнод 💎</p>
      ) : null}

      <p className="mt-2 text-xs text-slate-400">Натисни, щоб закрити</p>
    </motion.div>
  );
} 
