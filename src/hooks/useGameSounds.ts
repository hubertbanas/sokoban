import { useCallback, useEffect, useRef } from "react";
import cratePushUrl from "../assets/audio/crate-push.ogg";
import crateDockedUrl from "../assets/audio/crate-docked.ogg";

export type GameSoundName = "crate-push" | "crate-docked";

const SOUND_SOURCES: Record<GameSoundName, string> = {
  "crate-push": cratePushUrl,
  "crate-docked": crateDockedUrl,
};

const SOUND_VOLUMES: Record<GameSoundName, number> = {
  "crate-push": 0.45,
  "crate-docked": 0.6,
};

export function useGameSounds() {
  const activeSoundsRef = useRef(new Set<HTMLAudioElement>());

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

    const audio = new Audio(SOUND_SOURCES[name]);
    audio.preload = "auto";
    audio.volume = SOUND_VOLUMES[name];

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

  return {
    play,
    playCratePush,
    playCrateDocked,
  };
}
