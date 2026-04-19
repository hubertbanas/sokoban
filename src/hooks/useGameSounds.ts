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

type WebAudioResources = {
  context: AudioContext;
  masterGain: GainNode;
};

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext;

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

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const webkitWindow = window as Window & {
    webkitAudioContext?: AudioContextConstructor;
  };

  return (window.AudioContext as AudioContextConstructor | undefined)
    ?? webkitWindow.webkitAudioContext
    ?? null;
}

export function useGameSounds() {
  const webAudioRef = useRef<WebAudioResources | null>(null);
  const decodedBuffersRef = useRef<Partial<Record<GameSoundName, AudioBuffer>>>({});
  const loadingBuffersRef = useRef<Partial<Record<GameSoundName, Promise<void>>>>({});
  const unlockedWebAudioRef = useRef(false);
  const activeSoundsRef = useRef(new Set<HTMLAudioElement>());
  const [settings, setSettings] = useState<SfxSettings>(readStoredSfxSettings);
  const settingsRef = useRef(settings);

  const ensureWebAudio = useCallback((): WebAudioResources | null => {
    if (webAudioRef.current) {
      return webAudioRef.current;
    }

    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) {
      return null;
    }

    let context: AudioContext;
    try {
      context = new AudioContextCtor({ latencyHint: "interactive" });
    } catch {
      context = new AudioContextCtor();
    }

    const masterGain = context.createGain();
    masterGain.connect(context.destination);

    webAudioRef.current = {
      context,
      masterGain,
    };

    return webAudioRef.current;
  }, []);

  const setMasterGainFromSettings = useCallback((nextSettings: SfxSettings) => {
    const webAudio = webAudioRef.current;
    if (!webAudio) {
      return;
    }

    const nextGain = nextSettings.muted ? 0 : clampVolume(nextSettings.volume);
    webAudio.masterGain.gain.setTargetAtTime(nextGain, webAudio.context.currentTime, 0.01);
  }, []);

  const loadDecodedBuffer = useCallback(
    (name: GameSoundName): Promise<void> => {
      if (decodedBuffersRef.current[name]) {
        return Promise.resolve();
      }

      const existingTask = loadingBuffersRef.current[name];
      if (existingTask) {
        return existingTask;
      }

      const webAudio = ensureWebAudio();
      if (!webAudio) {
        return Promise.resolve();
      }

      const task = fetch(SOUND_SOURCES[name], { cache: "force-cache" })
        .then((response) => response.arrayBuffer())
        .then((audioData) => webAudio.context.decodeAudioData(audioData.slice(0)))
        .then((decodedBuffer) => {
          decodedBuffersRef.current[name] = decodedBuffer;
        })
        .catch(() => undefined)
        .finally(() => {
          delete loadingBuffersRef.current[name];
        });

      loadingBuffersRef.current[name] = task;
      return task;
    },
    [ensureWebAudio]
  );

  const preloadDecodedBuffers = useCallback(() => {
    (Object.keys(SOUND_SOURCES) as GameSoundName[]).forEach((name) => {
      void loadDecodedBuffer(name);
    });
  }, [loadDecodedBuffer]);

  const unlockWebAudio = useCallback(() => {
    if (unlockedWebAudioRef.current) {
      return;
    }

    const webAudio = ensureWebAudio();
    if (!webAudio) {
      unlockedWebAudioRef.current = true;
      return;
    }

    if (webAudio.context.state === "suspended") {
      void webAudio.context.resume().then(() => {
        unlockedWebAudioRef.current = true;
        preloadDecodedBuffers();
      }).catch(() => undefined);
      return;
    }

    unlockedWebAudioRef.current = true;
    preloadDecodedBuffers();
  }, [ensureWebAudio, preloadDecodedBuffers]);

  useEffect(() => {
    settingsRef.current = settings;
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SFX_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setMasterGainFromSettings(settings);
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
    ensureWebAudio();
    setMasterGainFromSettings(settingsRef.current);
    preloadDecodedBuffers();
  }, [ensureWebAudio, preloadDecodedBuffers, setMasterGainFromSettings]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const unlock = () => {
      unlockWebAudio();
    };

    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, [unlockWebAudio]);

  useEffect(() => {
    return () => {
      const webAudio = webAudioRef.current;
      if (webAudio) {
        void webAudio.context.close().catch(() => undefined);
        webAudioRef.current = null;
      }

      activeSoundsRef.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      activeSoundsRef.current.clear();
    };
  }, []);

  const playViaWebAudio = useCallback(
    (name: GameSoundName): boolean => {
      const webAudio = ensureWebAudio();
      if (!webAudio) {
        return false;
      }

      const decodedBuffer = decodedBuffersRef.current[name];
      if (!decodedBuffer) {
        void loadDecodedBuffer(name);
        return false;
      }

      if (webAudio.context.state === "suspended") {
        void webAudio.context.resume().catch(() => undefined);
      }

      if (webAudio.context.state !== "running") {
        return false;
      }

      const source = webAudio.context.createBufferSource();
      source.buffer = decodedBuffer;

      const sourceGain = webAudio.context.createGain();
      sourceGain.gain.value = SOUND_VOLUMES[name];

      source.connect(sourceGain);
      sourceGain.connect(webAudio.masterGain);
      source.start();

      return true;
    },
    [ensureWebAudio, loadDecodedBuffer]
  );

  const play = useCallback((name: GameSoundName) => {
    const currentSettings = settingsRef.current;
    if (currentSettings.muted || currentSettings.volume <= 0) {
      return;
    }

    if (playViaWebAudio(name)) {
      return;
    }

    if (typeof Audio === "undefined") {
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
  }, [playViaWebAudio]);

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
