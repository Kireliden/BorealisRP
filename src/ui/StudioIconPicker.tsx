import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Smile, X } from "lucide-react";
import openMojiData from "openmoji/data/openmoji.json";
import "./StudioIconPicker.css";

type OpenMojiRecord = { hexcode: string; emoji: string; annotation: string; tags?: string; group?: string };
type IconOption = { emoji: string; hex: string; label: string; search: string };
const options: IconOption[] = (openMojiData as OpenMojiRecord[])
  .filter((item) => item.emoji && item.hexcode)
  .map((item) => ({
    emoji: item.emoji, hex: item.hexcode.toUpperCase(),
    label: item.annotation || item.emoji,
    search: (item.annotation + " " + (item.tags ?? "") + " " + item.emoji).toLocaleLowerCase(),
  }));
const LIMIT = 112;
const isOpenMoji = (value: string) => value.startsWith("om:") && /^[A-F0-9-]+$/i.test(value.slice(3));

export function StudioIcon({ value, className = "" }: { value?: string | null; className?: string }) {
  const icon = value || "📁";
  return isOpenMoji(icon)
    ? <img className={"studio-icon-image " + className} src={`/openmoji/color/svg/${icon.slice(3)}.svg`} alt="" draggable={false} />
    : <span className={"studio-icon-emoji " + className} aria-hidden="true">{icon}</span>;
}

type Props = {
  value?: string | null;
  onChange: (value: string) => void;
  title?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export default function StudioIconPicker({
  value, onChange, title = "Choose icon", disabled, compact, className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"openmoji" | "emoji">("openmoji");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(LIMIT);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 326, maxHeight: 385 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return q ? options.filter((item) => item.search.includes(q)) : options;
  }, [query]);

  const place = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(326, window.innerWidth - 16);
    const maxHeight = Math.min(385, window.innerHeight - 20);
    const below = window.innerHeight - rect.bottom;
    const top = below < 250 && rect.top > below
      ? Math.max(8, rect.top - maxHeight - 5)
      : Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - maxHeight - 8));
    setPosition({ top, width, maxHeight,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) });
  };

  useEffect(() => { setLimit(LIMIT); }, [query, mode]);

  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node) &&
          !panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopImmediatePropagation();
        setOpen(false); buttonRef.current?.focus();
      }
    };
    const scroll = (event: Event) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", escape, true);
    document.addEventListener("pointerdown", pointer, true);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", place);
    searchRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", escape, true);
      document.removeEventListener("pointerdown", pointer, true);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  return (
    <span className={"studio-icon-picker " + className}>
      <button ref={buttonRef} className={"studio-icon-trigger" + (compact ? " is-compact" : "")}
        type="button" title={title} aria-label={title} aria-haspopup="dialog" aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (open) setOpen(false);
          else { place(); setMode(isOpenMoji(value ?? "") ? "openmoji" : "emoji"); setOpen(true); }
        }}>
        <StudioIcon value={value} />
        {!compact && <ChevronDown size={12} aria-hidden="true" />}
      </button>
      {open && createPortal(
        <div className="studio-icon-panel" ref={panelRef} role="dialog"
          aria-label={title} style={{ position: "fixed", ...position } as CSSProperties}
          onPointerDown={(event) => event.stopPropagation()}>
          <header><strong>Choose an icon</strong>
            <button type="button" onClick={() => setOpen(false)} title="Close picker" aria-label="Close picker"><X size={15}/></button>
          </header>
          <div className="studio-icon-picker-modes" role="group" aria-label="Icon style">
            <button type="button" className={mode === "openmoji" ? "active" : ""}
              aria-pressed={mode === "openmoji"} onClick={() => setMode("openmoji")}>OpenMoji</button>
            <button type="button" className={mode === "emoji" ? "active" : ""}
              aria-pressed={mode === "emoji"} onClick={() => setMode("emoji")}>System emoji</button>
          </div>
          <label className="studio-icon-search"><Search size={14} aria-hidden="true" />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons…" aria-label="Search icons" />
          </label>
          <div className="studio-icon-grid" role="group" aria-label="Available icons">
            {filtered.slice(0,limit).map((item) => (
              <button key={item.hex} type="button" title={item.label}
                className={(mode === "openmoji" ? "openmoji" : "emoji") +
                  ((value === (mode === "openmoji" ? "om:" + item.hex : item.emoji)) ? " selected" : "")}
                onClick={() => { onChange(mode === "openmoji" ? "om:" + item.hex : item.emoji); setOpen(false); }}>
                {mode === "openmoji"
                  ? <img src={`/openmoji/color/svg/${item.hex}.svg`} alt="" loading="lazy" />
                  : <span>{item.emoji}</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="studio-icon-empty">No matching icons found.</p>}
          </div>
          {filtered.length > limit &&
            <button type="button" className="studio-icon-more" onClick={() => setLimit((n) => n + LIMIT)}>
              Show more ({filtered.length - limit} remaining)
            </button>}
          <small><Smile size={12} /> {mode === "openmoji" ? "Colour artwork by OpenMoji" : "Uses your system emoji font"}</small>
        </div>, document.body,
      )}
    </span>
  );
}
