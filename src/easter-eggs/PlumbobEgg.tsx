import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { registerDiscovery } from "../collection/collectionStorage";
import { getEditableText } from "../engine/textTrigger";
import plumbobArtwork from "./assets/egg_004.png";
import "./PlumbobEgg.css";

const EGG_ID = "the-plumbob";
const SECRET_WORD = /\btiranipeuti\b/i;
const DURATION_MS = 6200;

/**
 * Easter egg 004: a deliberately obscure in-joke.
 * The trigger listens to ordinary user editing, never modifies text,
 * and requires the word to appear anew before replaying.
 */
export default function PlumbobEgg() {
  const [visible, setVisible] = useState(false);
  const playingRef = useRef(false);
  const seenTextRef = useRef<WeakMap<EventTarget, boolean>>(new WeakMap());
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
    playingRef.current = false;
    setVisible(false);
  }, []);

  const reveal = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    setVisible(true);

    void registerDiscovery(EGG_ID).catch((error: unknown) => {
      console.error("Failed to save THE PLUMBOB discovery:", error);
    });

    hideTimerRef.current = setTimeout(dismiss, DURATION_MS);
  }, [dismiss]);

  useEffect(() => {
    const onInput = (event: Event) => {
      if (event instanceof InputEvent && event.isComposing) return;
      const text = getEditableText(event.target);
      if (text === null || event.target === null) return;

      const containsWord = SECRET_WORD.test(text);
      const wasPresent = seenTextRef.current.get(event.target) ?? false;
      seenTextRef.current.set(event.target, containsWord);
      if (containsWord && !wasPresent && !playingRef.current) reveal();
    };

    document.addEventListener("input", onInput);
    return () => {
      document.removeEventListener("input", onInput);
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
      playingRef.current = false;
    };
  }, [reveal]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dismiss();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [visible, dismiss]);

  if (!visible) return null;

  return createPortal(
    <div
      className="plumbob-egg"
      role="dialog"
      aria-modal="true"
      aria-label="The Plumbob easter egg"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="plumbob-egg-veil" aria-hidden="true" />
      <div className="plumbob-egg-reveal">
        <div className="plumbob-egg-aura" aria-hidden="true" />
        <span className="plumbob-egg-kicker">A SECRET DISCOVERED</span>
        <div className="plumbob-egg-artwork">
          <img src={plumbobArtwork} alt="" draggable={false} />
        </div>
        <h2>THE PLUMBOB</h2>
        <p>Sul sul!</p>
      </div>
      <button className="plumbob-egg-skip" type="button" onClick={dismiss}>
        Skip <span>Esc</span>
      </button>
    </div>,
    document.body,
  );
}
