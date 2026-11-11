import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { registerDiscovery } from "../collection/collectionStorage";
import { getEditableText } from "../engine/textTrigger";
import "./LambdaEgg.css";

const LAMBDA_ID = "lambda-signal";
const WORD_PATTERN = /\blambda\b/i;
const DURATION_MS = 9500;
const FADE_IN_MS = 1900;
const FADE_OUT_MS = 1500;
const MAX_VOLUME = 0.65;

/**
 * Optional, user-provided excerpt. Put the clip in
 * public/easter-eggs/path_of_borealis_clip.mp3 (10 seconds or less).
 * Keep the visual egg functional even when that file isn't present.
 */
const LAMBDA_AUDIO_URL = `${import.meta.env.BASE_URL}easter-eggs/path_of_borealis_clip.mp3`;

type WordPosition = { x: number; y: number; fontSize: number };

function wordPosition(target: EventTarget | null, text: string): WordPosition {
  const fallback = { x: window.innerWidth / 2, y: window.innerHeight / 3, fontSize: 22 };
  if (!(target instanceof HTMLElement)) return fallback;
  const match = WORD_PATTERN.exec(text);
  if (!match) return fallback;

  const editable = target.closest<HTMLElement>("[contenteditable='true']");
  if (editable) {
    const nodes = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
    while (nodes.nextNode()) {
      const node = nodes.currentNode;
      const found = WORD_PATTERN.exec(node.textContent ?? "");
      if (!found) continue;
      const range = document.createRange();
      range.setStart(node, found.index);
      range.setEnd(node, found.index + found[0].length);
      const rectangle = range.getBoundingClientRect();
      if (rectangle.width > 0 && rectangle.height > 0) {
        return {
          x: rectangle.left,
          y: rectangle.top,
          fontSize: parseFloat(getComputedStyle(node.parentElement ?? editable).fontSize) || 17,
        };
      }
    }
    const rect = editable.getBoundingClientRect();
    return { x: rect.left + 18, y: rect.top + 12, fontSize: parseFloat(getComputedStyle(editable).fontSize) || 17 };
  }

  if (target instanceof HTMLInputElement) {
    const rect = target.getBoundingClientRect();
    const style = getComputedStyle(target);
    const context = document.createElement("canvas").getContext("2d");
    if (context) {
      context.font = style.font;
      const before = target.value.slice(0, match.index);
      const advance = context.measureText(before).width;
      return {
        x: Math.min(rect.right - 55, Math.max(rect.left + 6, rect.left + parseFloat(style.paddingLeft) + advance - target.scrollLeft)),
        y: rect.top + (rect.height - (parseFloat(style.fontSize) || 17)) / 2,
        fontSize: parseFloat(style.fontSize) || 17,
      };
    }
  }

  const rect = target.getBoundingClientRect();
  return { x: rect.left + 10, y: rect.top + 8, fontSize: parseFloat(getComputedStyle(target).fontSize) || 17 };
}

export default function LambdaEgg() {
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState<WordPosition>({ x: 0, y: 0, fontSize: 17 });
  const activeRef = useRef(false);
  const discoveryRef = useRef(false);
  const textPresenceRef = useRef<WeakMap<EventTarget, boolean>>(new WeakMap());
  const timerRef = useRef<number | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const endSequence = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (fadeFrameRef.current !== null) window.cancelAnimationFrame(fadeFrameRef.current);
    timerRef.current = null;
    fadeFrameRef.current = null;
    activeRef.current = false;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
    }
    setActive(false);
  }, []);

  const beginSequence = useCallback((position: WordPosition) => {
    if (activeRef.current) return;
    activeRef.current = true;
    setOrigin(position);
    setActive(true);

    if (!discoveryRef.current) {
      discoveryRef.current = true;
      void registerDiscovery(LAMBDA_ID).catch((reason: unknown) => {
        console.error("Could not save THE LAMBDA discovery:", reason);
        discoveryRef.current = false;
      });
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0;
      void audio.play().catch(() => {
        // The clip is supplied by the user later; the cinematic must still play silently.
      });
      const startedAt = performance.now();
      const fadeAudio = (now: number) => {
        if (!activeRef.current || !audioRef.current) return;
        const elapsed = now - startedAt;
        const inGain = Math.min(1, Math.max(0, elapsed / FADE_IN_MS));
        const outGain = Math.min(1, Math.max(0, (DURATION_MS - elapsed) / FADE_OUT_MS));
        audio.volume = Math.min(1, MAX_VOLUME * inGain * outGain);
        if (elapsed < DURATION_MS) fadeFrameRef.current = window.requestAnimationFrame(fadeAudio);
      };
      fadeFrameRef.current = window.requestAnimationFrame(fadeAudio);
    }
    timerRef.current = window.setTimeout(endSequence, DURATION_MS);
  }, [endSequence]);

  useEffect(() => {
    const audio = new Audio(LAMBDA_AUDIO_URL);
    audio.preload = "none";
    audioRef.current = audio;

    const onInput = (event: Event) => {
      if (event instanceof InputEvent && event.isComposing) return;
      const text = getEditableText(event.target);
      if (text === null || event.target === null) return;
      const hasWord = WORD_PATTERN.test(text);
      const wasPresent = textPresenceRef.current.get(event.target) ?? false;
      textPresenceRef.current.set(event.target, hasWord);
      if (!hasWord || wasPresent || activeRef.current) return;
      beginSequence(wordPosition(event.target, text));
    };
    document.addEventListener("input", onInput);

    return () => {
      document.removeEventListener("input", onInput);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (fadeFrameRef.current !== null) window.cancelAnimationFrame(fadeFrameRef.current);
      audio.pause();
      audioRef.current = null;
      activeRef.current = false;
    };
  }, [beginSequence]);

  useEffect(() => {
    if (!active) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      endSequence();
    };
    window.addEventListener("keydown", onEscape, true);
    return () => window.removeEventListener("keydown", onEscape, true);
  }, [active, endSequence]);

  if (!active) return null;

  return createPortal(
    <div className="lambda-egg" role="dialog" aria-modal="true" aria-label="The Lambda easter egg"
      onMouseDown={(event) => { if (event.target === event.currentTarget) endSequence(); }}>
      <div className="lambda-egg-veil" aria-hidden="true" />
      <span className="lambda-egg-glitch" data-word="LAMBDA" aria-hidden="true"
        style={{
          left: origin.x, top: origin.y,
          fontSize: origin.fontSize,
        } as CSSProperties}>LAMBDA</span>
      <div className="lambda-egg-centre">
        <div className="lambda-egg-halo" aria-hidden="true" />
        <div className="lambda-egg-emblem" aria-hidden="true"><span>λ</span></div>
        <span className="lambda-egg-signal">SIGNAL DETECTED</span>
      </div>
      <button type="button" className="lambda-egg-skip" onClick={endSequence} aria-label="Close Lambda easter egg">Skip <span>Esc</span></button>
    </div>, document.body,
  );
}
