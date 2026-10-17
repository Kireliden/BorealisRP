
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Waves } from "lucide-react";
import {
  loadCollection,
  registerDiscovery,
} from "../collection/collectionStorage";
import {
  containsTriggerPhrase,
  getEditableText,
} from "../engine/textTrigger";

const NUDGE_ID = "the-nudge";
const SECRET_WORD = "Nostalgia";

const NUDGE_SOUND_URL = new URL(
  "./assets/msn_nudge_sound.mp3",
  import.meta.url,
).href;

export default function NudgeEgg() {
  const [isReady, setIsReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const audio = new Audio(NUDGE_SOUND_URL);
    audio.preload = "auto";
    audioRef.current = audio;

    const handleFinished = () => {
      isPlayingRef.current = false;
    };

    audio.addEventListener("ended", handleFinished);

    void loadCollection()
      .then((collection) => {
        if (cancelled) return;

        const discovered = collection.discovered.some(
          (entry) => entry.id === NUDGE_ID,
        );

        setIsUnlocked(discovered);
        setIsReady(true);
      })
      .catch((error) => {
        console.error("Failed to load THE NUDGE discovery:", error);
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
      audio.removeEventListener("ended", handleFinished);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  async function playNudge() {
    const audio = audioRef.current;

    if (!audio || isPlayingRef.current) return;

    isPlayingRef.current = true;

    try {
      await invoke("shake_window");
    } catch (error) {
      console.error("THE NUDGE could not shake the window:", error);
    }

    try {
      audio.volume = 0.7
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      isPlayingRef.current = false;
      console.error("THE NUDGE sound could not be played:", error);
    }
  }

  useEffect(() => {
    if (!isReady || isUnlocked) return;

    const handleInput = (event: Event) => {
      const text = getEditableText(event.target);

      if (
        text === null ||
        !containsTriggerPhrase(text, SECRET_WORD) ||
        hasTriggeredRef.current
      ) {
        return;
      }

      hasTriggeredRef.current = true;
      setIsUnlocked(true);

      void registerDiscovery(NUDGE_ID).catch((error) => {
        console.error("Failed to save THE NUDGE discovery:", error);
      });

      void playNudge();
    };

    document.addEventListener("input", handleInput);

    return () => {
      document.removeEventListener("input", handleInput);
    };
  }, [isReady, isUnlocked]);

  if (!isReady || !isUnlocked) return null;

  return (
    <button
      type="button"
      title="THE NUDGE — Shake the window"
      aria-label="Play THE NUDGE"
      onClick={() => void playNudge()}
    >
      <Waves size={15} />
    </button>
  );
}
