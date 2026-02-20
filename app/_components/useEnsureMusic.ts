"use client";

import { useCallback } from "react";
import { useGameAudio } from "./AudioProvider";

export function useEnsureMusic() {
  const { playing, toggle } = useGameAudio();

  // повертаємо функцію, яку можна викликати в onClick
  return useCallback(() => {
    if (!playing) {
      toggle(); // перший раз — увімкне музику
    }
  }, [playing, toggle]);
}