import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, Palette, X } from "lucide-react";
import "./AppColorPicker.css";

type Props = {
  value?: string;
  defaultValue?: string;
  onChange: (event: { target: { value: string } }) => void;
  "aria-label"?: string;
  disabled?: boolean;
};
const SWATCHES = [
  "#babbf1", "#ca9ee6", "#777bd1", "#8588ed", "#ff91a4", "#d94f70",
  "#ff244f", "#a91e45", "#278b60", "#63d99a", "#81c8be", "#8caaee",
  "#e5c890", "#ffffff", "#999999", "#24273a",
];
const safeHex = (value: string) =>
  /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : "#babbf1";

function asHsl(hex: string): [number, number, number] {
  const value = safeHex(hex);
  const r = parseInt(value.slice(1, 3), 16) / 255;
  const g = parseInt(value.slice(3, 5), 16) / 255;
  const b = parseInt(value.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), diff = max - min;
  let hue = 0;
  const lightness = (max + min) / 2;
  let saturation = 0;
  if (diff !== 0) {
    saturation = diff / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case r: hue = ((g - b) / diff) % 6; break;
      case g: hue = (b - r) / diff + 2; break;
      default: hue = (r - g) / diff + 4;
    }
    hue *= 60;
  }
  return [Math.round((hue + 360) % 360), Math.round(saturation * 100), Math.round(lightness * 100)];
}

function hslHex(h: number, s: number, l: number): string {
  const sat = s / 100, light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255)
    .toString(16).padStart(2, "0")).join("");
}

/** App-rendered replacement for browser's platform-dependent input[type=color] dialog. */
export default function AppColorPicker({ value, defaultValue = "#babbf1", onChange, "aria-label": ariaLabel = "Choose colour", disabled }: Props) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const currentValue = value ?? uncontrolledValue;
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(currentValue);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [hue, sat, light] = asHsl(currentValue);

  const move = (newColor: string) => {
    const next = safeHex(newColor);
    if (value === undefined) setUncontrolledValue(next);
    onChange({ target: { value: next } });
  };
  const placement = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(280, window.innerWidth - 16);
    const top = window.innerHeight - rect.bottom < 345 && rect.top > 345
      ? rect.top - 342 : rect.bottom + 6;
    setPos({ top: Math.max(8, Math.min(top, window.innerHeight - 330)),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) });
  };

  useEffect(() => { if (!open) setHexDraft(currentValue.toUpperCase()); }, [currentValue, open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) &&
          !panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); event.stopImmediatePropagation();
      setOpen(false); triggerRef.current?.focus();
    };
    const scroll = (event: Event) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", esc, true);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", placement);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", esc, true);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", placement);
    };
  }, [open]);

  return (
    <span className="app-color-picker">
      <button type="button" className="app-color-trigger" ref={triggerRef}
        disabled={disabled} aria-label={ariaLabel} title={ariaLabel}
        aria-haspopup="dialog" aria-expanded={open}
        onClick={() => { if (open) setOpen(false); else { placement(); setOpen(true); } }}>
        <span style={{ background: safeHex(currentValue) }} />
        <Palette size={11} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div ref={panelRef} className="app-color-panel" role="dialog" aria-label={ariaLabel}
          style={{ position: "fixed", top: pos.top, left: pos.left } as CSSProperties}
          onPointerDown={(event) => event.stopPropagation()}>
          <div className="app-color-heading"><strong>{ariaLabel}</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close colour picker"><X size={15} /></button>
          </div>
          <div className="app-color-swatches">
            {SWATCHES.map((color) => (
              <button type="button" key={color} title={color} aria-label={"Select " + color}
                aria-pressed={safeHex(currentValue) === color}
                style={{ background: color }} onClick={() => move(color)}>
                {safeHex(currentValue) === color && <Check size={14} />}
              </button>
            ))}
          </div>
          <div className="app-color-slider-list">
            {([
              ["Hue", hue, 360, (v: number) => hslHex(v, sat, light)],
              ["Saturation", sat, 100, (v: number) => hslHex(hue, v, light)],
              ["Lightness", light, 100, (v: number) => hslHex(hue, sat, v)],
            ] as const).map(([label, current, max, calculate]) => (
              <label key={label}>
                <span>{label}<output>{current}</output></span>
                <input type="range" min="0" max={max} value={current}
                  onChange={(event) => move(calculate(Number(event.target.value)))} />
              </label>
            ))}
          </div>
          <div className="app-color-hex">
            <span className="app-color-current" style={{ background: safeHex(currentValue) }} />
            <span>#</span>
            <input value={hexDraft.replace(/^#/, "")} maxLength={6} spellCheck={false}
              aria-label="Hexadecimal colour" onChange={(event) => {
                const next = "#" + event.target.value.replace(/[^0-9a-f]/gi, "");
                setHexDraft(next);
                if (/^#[0-9a-f]{6}$/i.test(next)) move(next);
              }} onBlur={() => setHexDraft(safeHex(currentValue).toUpperCase())} />
          </div>
        </div>, document.body,
      )}
    </span>
  );
}
