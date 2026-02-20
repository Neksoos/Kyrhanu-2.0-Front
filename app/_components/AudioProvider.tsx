"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Типи
export type Track = {
  id: string;
  src: string;
  title: string;
};

type AudioContextValue = {
  playing: boolean;
  currentTrack: Track | null;
  volume: number; // 0..1
  setVolume: (v: number) => void;
  setTrack: (id: string) => void;
  nextRandom: () => void;
  toggle: () => void;
};

// 🎵 ТРЕКИ (файли з /public/audio)
const TRACKS: Track[] = [
  { id: "steppes", src: "/audio/Shadows of the Steppes.mp3", title: "Shadows of the Steppes" },
  { id: "peaks1", src: "/audio/Shadow of the Peaks.mp3", title: "Shadow of the Peaks" },
  { id: "peaks2", src: "/audio/Shadow of theол Peaks.mp3", title: "Shadow of theол Peaks" },
  { id: "weird1", src: "/audio/Shadows of the Stepgjgfpes.mp3", title: "Shadows of the Stepgjgfpes" },
  { id: "untitled", src: "/audio/Untitled.mp3", title: "Untitled" },
  { id: "untitled2", src: "/audio/Untiольtled.mp3", title: "Untiольtled" },
];

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function getRandomTrack(exceptId?: string): Track {
  const pool = exceptId ? TRACKS.filter((t) => t.id !== exceptId) : TRACKS;
  return pool[Math.floor(Math.random() * pool.length)];
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track>(() => getRandomTrack());
  const [playing, setPlaying] = useState(false);
  const [volumeState, setVolumeState] = useState(0.5);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // гучність із localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("music_volume");
    if (!raw) return;
    const v = Number(raw);
    if (!Number.isNaN(v)) setVolumeState(clamp01(v));
  }, []);

  // створюємо <audio> ОДИН РАЗ (не перевідтворюємо при зміні volume)
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = clamp01(volumeState);
    audio.src = currentTrack?.src || "";
    audioRef.current = audio;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    const onError = () => {
      const next = getRandomTrack(currentTrack?.id);
      setCurrentTrack(next);
    };
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // volume → audio + localStorage
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = clamp01(volumeState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("music_volume", String(clamp01(volumeState)));
    }
  }, [volumeState]);

  // коли міняється трек — міняємо src (якщо грало, продовжуємо)
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;

    const wasPlaying = playing;
    a.src = currentTrack.src;

    if (wasPlaying) {
      a.play().catch((err) => {
        console.warn("Audio play error:", err);
        setPlaying(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  const setVolume = (v: number) => setVolumeState(clamp01(v));

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;

    if (playing) {
      a.pause();
      return;
    }

    a.play().catch((err) => {
      console.warn("Toggle play error:", err);
      setPlaying(false);
    });
  };

  const nextRandom = () => {
    const next = getRandomTrack(currentTrack?.id);
    setCurrentTrack(next);

    const a = audioRef.current;
    if (!a) return;

    a.src = next.src;
    a.play().catch((err) => {
      console.warn("Next random play error:", err);
      setPlaying(false);
    });
  };

  const setTrack = (id: string) => {
    const track = TRACKS.find((t) => t.id === id);
    if (!track) return;

    setCurrentTrack(track);

    const a = audioRef.current;
    if (!a) return;

    a.src = track.src;
    a.play().catch((err) => {
      console.warn("Set track play error:", err);
      setPlaying(false);
    });
  };

  const value = useMemo<AudioContextValue>(
    () => ({
      playing,
      currentTrack,
      volume: volumeState,
      setVolume,
      setTrack,
      nextRandom,
      toggle,
    }),
    [playing, currentTrack, volumeState]
  );

  return (
    <AudioContext.Provider value={value}>
      {children}

      {/* ✅ ФІКСОВАНА КНОПКА в обведеній зоні (точно буде видно) */}
      <div
        className={[
          "fixed z-[9999]",
          // підганяй тільки ці 2 числа, якщо треба:
          "right-5",
          "top-[calc(env(safe-area-inset-top,0px)+140px)]",
          "pointer-events-auto",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Stop music" : "Play music"}
          className={[
            "grid h-11 w-11 place-items-center rounded-full",
            "shadow-lg active:scale-95 transition",
            "border border-white/20",
            "bg-gradient-to-b from-emerald-300/90 via-emerald-500/90 to-emerald-700/90",
            "ring-1 ring-black/30 backdrop-blur",
          ].join(" ")}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/12 ring-1 ring-white/10">
            {playing ? (
              // stop (квадрат)
              <span className="block h-[14px] w-[14px] rounded-[3px] bg-white" />
            ) : (
              // play (трикутник)
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l12-7z" fill="white" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </AudioContext.Provider>
  );
}

export function useGameAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useGameAudio must be used inside <AudioProvider>");
  return ctx;
}
