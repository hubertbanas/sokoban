import { useCallback, useEffect, useRef, useState } from "react";
import cratePushUrl from "../assets/audio/crate-push.ogg";
import crateDockedUrl from "../assets/audio/crate-docked.ogg";
import playerStepUrl from "../assets/audio/player-step.ogg";
import playerBumpUrl from "../assets/audio/player-bump.ogg";
import levelCompleteUrl from "../assets/audio/level-complete.ogg";

export type GameSoundName =
  | "crate-push"
  | "crate-docked"
  | "player-step"
  | "player-bump"
  | "level-complete";

type SfxSettings = {
  muted: boolean;
  volume: number;
};

const SFX_SETTINGS_STORAGE_KEY = "sokoban.sfx.settings";

const DEFAULT_SFX_SETTINGS: SfxSettings = {
  muted: false,
  volume: 1,
};

const SOUND_SOURCES: Record<GameSoundName, string> = {
  "crate-push": cratePushUrl,
  "crate-docked": crateDockedUrl,
  "player-step": playerStepUrl,
  "player-bump": playerBumpUrl,
  "level-complete": levelCompleteUrl,
};

const SOUND_VOLUMES: Record<GameSoundName, number> = {
  "crate-push": 0.45,
  "crate-docked": 0.6,
  "player-step": 0.35,
  "player-bump": 0.5,
  "level-complete": 0.7,
};

function clampVolume(value: number) {
  return Math.max(0, Math.min(1, value));
}

function readStoredSfxSettings(): SfxSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SFX_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SFX_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SFX_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<SfxSettings>;
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_SFX_SETTINGS.muted,
      volume:
        typeof parsed.volume === "number"
          ? clampVolume(parsed.volume)
          : DEFAULT_SFX_SETTINGS.volume,
    };
  } catch {
    return DEFAULT_SFX_SETTINGS;
  }
}

export function useGameSounds() {
  const activeSoundsRef = useRef(new Set<HTMLAudioElement>());
  const [settings, setSettings] = useState<SfxSettings>(readStoredSfxSettings);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SFX_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SFX_SETTINGS_STORAGE_KEY) {
        return;
      }

      setSettings(readStoredSfxSettings());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    return () => {
      activeSoundsRef.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      activeSoundsRef.current.clear();
    };
  }, []);

  const play = useCallback((name: GameSoundName) => {
    if (typeof Audio === "undefined") {
      return;
    }

    const currentSettings = settingsRef.current;
    if (currentSettings.muted || currentSettings.volume <= 0) {
      return;
    }

    const audio = new Audio(SOUND_SOURCES[name]);
    audio.preload = "auto";
    audio.volume = clampVolume(SOUND_VOLUMES[name] * currentSettings.volume);

    const cleanup = () => {
      activeSoundsRef.current.delete(audio);
      audio.removeEventListener("ended", cleanup);
      audio.removeEventListener("error", cleanup);
    };

    audio.addEventListener("ended", cleanup);
    audio.addEventListener("error", cleanup);
    activeSoundsRef.current.add(audio);

    void audio.play().catch(() => {
      cleanup();
    });
  }, []);

  const playCratePush = useCallback(() => {
    play("crate-push");
  }, [play]);

  const playCrateDocked = useCallback(() => {
    play("crate-docked");
  }, [play]);

  const playPlayerStep = useCallback(() => {
    play("player-step");
  }, [play]);

  const playPlayerBump = useCallback(() => {
    play("player-bump");
  }, [play]);

  const playLevelComplete = useCallback(() => {
    play("level-complete");
  }, [play]);

  const setMuted = useCallback((muted: boolean) => {
    setSettings((current) => {
      if (current.muted === muted) {
        return current;
      }

      return { ...current, muted };
    });
  }, []);

  const toggleMuted = useCallback(() => {
    setSettings((current) => ({ ...current, muted: !current.muted }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = clampVolume(volume);
    setSettings((current) => {
      if (current.volume === clampedVolume) {
        return current;
      }

      return { ...current, volume: clampedVolume };
    });
  }, []);

  return {
    play,
    playCratePush,
    playCrateDocked,
    playPlayerStep,
    playPlayerBump,
    playLevelComplete,
    muted: settings.muted,
    volume: settings.volume,
    setMuted,
    toggleMuted,
    setVolume,
  };
}
