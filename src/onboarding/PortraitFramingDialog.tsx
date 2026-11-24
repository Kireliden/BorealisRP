import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { profileMediaSource } from "../profile/profileMedia";
import "./PortraitFramingDialog.css";

export type PortraitFraming = {
  avatarPositionX: number;
  avatarPositionY: number;
  avatarZoom: number;
};

const DEFAULT_FRAME: PortraitFraming = {
  avatarPositionX: 50,
  avatarPositionY: 50,
  avatarZoom: 100,
};

interface PortraitFramingDialogProps {
  imagePath: string;
  initial: PortraitFraming;
  onApply: (framing: PortraitFraming) => void;
  onCancel: () => void;
}

/** Same 4:5 crop, positioning and zoom semantics used by Settings > Profile. */
export default function PortraitFramingDialog({
  imagePath, initial, onApply, onCancel,
}: PortraitFramingDialogProps) {
  const [framing, setFraming] = useState<PortraitFraming>(initial);
  const panelRef = useRef<HTMLElement>(null);
  const applyRef = useRef<HTMLButtonElement>(null);
  const src = profileMediaSource(imagePath);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    applyRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCancel();
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
      ));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      previous?.focus();
    };
  }, [onCancel]);

  function handleApply(event: FormEvent) {
    event.preventDefault();
    onApply(framing);
  }

  function control(key: keyof PortraitFraming, label: string, min: number, max: number) {
    return (
      <label className="first-run-crop-slider" htmlFor={`first-run-crop-${key}`} key={key}>
        <span>{label} <output>{framing[key]}%</output></span>
        <input type="range" id={`first-run-crop-${key}`}
          min={min} max={max} step={1} value={framing[key]}
          onChange={(event) => setFraming((current) => ({
            ...current, [key]: Number(event.target.value),
          }))} />
      </label>
    );
  }

  return createPortal(
    <div className="first-run-crop-backdrop">
      <section className="first-run-crop-dialog" ref={panelRef} role="dialog"
        aria-modal="true" aria-labelledby="first-run-crop-title">
        <header className="first-run-crop-heading">
          <div className="first-run-crop-heading-icon"><SlidersHorizontal size={19}/></div>
          <div>
            <span>PROFILE PORTRAIT</span>
            <h2 id="first-run-crop-title">Adjust your portrait</h2>
          </div>
          <button type="button" onClick={onCancel}
            className="first-run-crop-close" aria-label="Close portrait editor">
            <X size={17}/>
          </button>
        </header>
        <p className="first-run-crop-help">
          Position and zoom the image inside the same 4:5 portrait frame used by your profile.
          Animated GIFs will stay animated.
        </p>
        <form onSubmit={handleApply} className="first-run-crop-form">
          <div className="first-run-crop-preview">
            {src && <img src={src} alt="Live portrait preview"
              style={{
                objectPosition: `${framing.avatarPositionX}% ${framing.avatarPositionY}%`,
                transform: `scale(${framing.avatarZoom / 100})`,
                transformOrigin: `${framing.avatarPositionX}% ${framing.avatarPositionY}%`,
              }}/>}
          </div>
          <div className="first-run-crop-controls">
            {control("avatarPositionX", "Horizontal", 0, 100)}
            {control("avatarPositionY", "Vertical", 0, 100)}
            {control("avatarZoom", "Zoom", 100, 200)}
            <button type="button" className="first-run-crop-reset"
              onClick={() => setFraming(DEFAULT_FRAME)}>
              <RotateCcw size={14}/> Reset framing
            </button>
          </div>
          <footer className="first-run-crop-actions">
            <button type="button" className="first-run-crop-cancel" onClick={onCancel}>Cancel</button>
            <button type="submit" ref={applyRef} className="first-run-crop-apply">Apply framing</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
