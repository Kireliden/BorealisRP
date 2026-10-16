
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

const SECRET_WORD = "nostalgia";
const NUDGE_SOUND_URL = new URL("./assets/msn_nudge_sound.mp3", import.meta.url).href;

export default function NudgeEgg() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const audio = new Audio(NUDGE_SOUND_URL);
    audio.preload = "auto";
    audioRef.current = audio;

    const handleFinished = () => {
      isPlayingRef.current = false;
    };

    audio.addEventListener("ended", handleFinished);

    const handleInput = (event: Event) => {
      const target = event.target;

      if (!(target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLElement && target.isContentEditable))) {
        return;
      }

      const text = "value" in target && typeof target.value === "string"
        ? target.value
        : target.textContent ?? "";

      if (!text.toLowerCase().includes(SECRET_WORD)) {
        return;
      }

      if (isPlayingRef.current) {
        return;
      }

      isPlayingRef.current = true;

      void (async () => {
        try {
          await invoke("shake_window");
          audio.currentTime = 0;
          await audio.play();
        } catch (error) {
          isPlayingRef.current = false;
          console.error("THE NUDGE could not be played:", error);
        }
      })();
    };

    document.addEventListener("input", handleInput);

    return () => {
      document.removeEventListener("input", handleInput);
      audio.removeEventListener("ended", handleFinished);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  return null;
}
