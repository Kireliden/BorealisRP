import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronDown, FolderOpen, Pencil, Plus, Search, Smile, X } from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import openMojiData from "openmoji/data/openmoji.json";
import "./StudioIconPicker.css";

type OpenMojiRecord = { hexcode: string; emoji: string; annotation: string; tags?: string; group?: string };
type EmojiOption = { kind: "emoji"; emoji: string; hex: string; label: string; search: string };
type LucideOption = { kind: "lucide"; name: IconName; label: string; search: string };
const emojiOptions: EmojiOption[] = (openMojiData as OpenMojiRecord[])
  .filter((item) => item.emoji && item.hexcode)
  .map((item) => ({
    kind: "emoji", emoji: item.emoji, hex: item.hexcode.toUpperCase(),
    label: item.annotation || item.emoji,
    search: (item.annotation + " " + (item.tags ?? "") + " " + item.emoji).toLocaleLowerCase(),
  }));

// Keep the complete Lucide catalogue searchable without eagerly bundling every SVG.
const LUCIDE_PREFIX = "lucide:";
const featuredLucideNames = [
  "moon", "star", "sparkles", "book-open", "folder", "heart", "compass",
  "feather", "wand-sparkles", "cloud", "sun", "cat", "paw-print",
];
const lucideNameSet = new Set<string>(iconNames);
const lucideOptions: LucideOption[] = [...iconNames]
  .sort((a, b) => {
    const first = featuredLucideNames.indexOf(a);
    const second = featuredLucideNames.indexOf(b);
    if (first !== -1 || second !== -1) return first === -1 ? 1 : second === -1 ? -1 : first - second;
    return a.localeCompare(b);
  })
  .map((name) => ({ kind: "lucide", name, label: name.replaceAll("-", " "), search: name.replaceAll("-", " ") }));
const LIMIT = 112;
const LUCIDE_LIMIT = 56;
const isOpenMoji = (value: string) => value.startsWith("om:") && /^[A-F0-9-]+$/i.test(value.slice(3));
const getLucideName = (value: string): IconName | null => {
  if (!value.startsWith(LUCIDE_PREFIX)) return null;
  const name = value.slice(LUCIDE_PREFIX.length);
  return lucideNameSet.has(name) ? name as IconName : null;
};

export function StudioIcon({ value, className = "" }: { value?: string | null; className?: string }) {
  const icon = value || "📁";
  const lucideName = getLucideName(icon);
  if (lucideName) {
    return <DynamicIcon name={lucideName} size={18} strokeWidth={1.9}
      className={"studio-icon-lucide " + className} aria-hidden="true" />;
  }
  if (isOpenMoji(icon)) {
    return <img className={"studio-icon-image " + className}
      src={`/openmoji/color/svg/${icon.slice(3)}.svg`} alt="" draggable={false} />;
  }
  return <span className={"studio-icon-emoji " + className} aria-hidden="true">
    {icon.startsWith(LUCIDE_PREFIX) ? "📁" : icon}
  </span>;
}

type Props = {
  value?: string | null;
  onChange: (value: string) => void;
  title?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  /** In the workspace hero, open actions first, then reuse this icon picker. */
  workspaceActions?: { onSwitchWorkspace: () => void; onCreateWorkspace: () => void; canChangeIcon: boolean };
};

export default function StudioIconPicker({
  value, onChange, title = "Choose icon", disabled, compact, className = "", workspaceActions,
}: Props) {
  const [open, setOpen] = useState(false);
  const [panelView, setPanelView] = useState<"actions" | "icons">("icons");
  const [mode, setMode] = useState<"openmoji" | "emoji" | "lucide">("openmoji");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(LIMIT);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 326, maxHeight: 385 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const switchActionRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (mode === "lucide") return q ? lucideOptions.filter((item) => item.search.includes(q)) : lucideOptions;
    return q ? emojiOptions.filter((item) => item.search.includes(q)) : emojiOptions;
  }, [query, mode]);

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

  useEffect(() => { setLimit(mode === "lucide" ? LUCIDE_LIMIT : LIMIT); }, [query, mode]);

  useEffect(() => {
    if (!open) return;
    if (panelView === "icons") searchRef.current?.focus();
    else if (workspaceActions?.canChangeIcon) firstActionRef.current?.focus();
    else switchActionRef.current?.focus();
  }, [open, panelView, workspaceActions?.canChangeIcon]);

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
          else { place(); setPanelView(workspaceActions ? "actions" : "icons"); setMode(getLucideName(value ?? "") ? "lucide" : isOpenMoji(value ?? "") ? "openmoji" : "emoji"); setQuery(""); setOpen(true); }
        }}>
        <StudioIcon value={value} />
        {!compact && <ChevronDown size={12} aria-hidden="true" />}
      </button>
      {open && createPortal(
        <div className="studio-icon-panel" ref={panelRef} role="dialog"
          aria-label={title} style={{ position: "fixed", ...position } as CSSProperties}
          onPointerDown={(event) => event.stopPropagation()}>
          <header>
            {workspaceActions && panelView === "icons" && (
              <button type="button" onClick={() => setPanelView("actions")}
                title="Back to workspace options" aria-label="Back to workspace options"><ArrowLeft size={15}/></button>
            )}
            <strong>{workspaceActions && panelView === "actions" ? "Workspace options" : "Choose an icon"}</strong>
            <button type="button" onClick={() => setOpen(false)} title="Close picker" aria-label="Close picker"><X size={15}/></button>
          </header>
          {workspaceActions && panelView === "actions" && (
            <div className="studio-workspace-actions">
              <button ref={firstActionRef} type="button" disabled={!workspaceActions.canChangeIcon}
                onClick={() => setPanelView("icons")}>
                <Pencil size={16} /><span>Change icon</span>
              </button>
              <button ref={switchActionRef} type="button" onClick={() => {
                setOpen(false);
                workspaceActions.onSwitchWorkspace();
              }}>
                <FolderOpen size={16} /><span>Switch workspace</span>
              </button>
              <button type="button" onClick={() => {
                setOpen(false);
                workspaceActions.onCreateWorkspace();
              }}>
                <Plus size={16} /><span>Create workspace</span>
              </button>
            </div>
          )}
          {panelView === "icons" && <div className="studio-icon-picker-modes" role="group" aria-label="Icon style">
            <button type="button" className={mode === "openmoji" ? "active" : ""}
              aria-pressed={mode === "openmoji"} onClick={() => setMode("openmoji")}>OpenMoji</button>
            <button type="button" className={mode === "emoji" ? "active" : ""}
              aria-pressed={mode === "emoji"} onClick={() => setMode("emoji")}>System emoji</button>
            <button type="button" className={mode === "lucide" ? "active" : ""}
              aria-pressed={mode === "lucide"} onClick={() => setMode("lucide")}>Lucide</button>
          </div>}
          {panelView === "icons" && <label className="studio-icon-search"><Search size={14} aria-hidden="true" />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons…" aria-label="Search icons" />
          </label>}
          {panelView === "icons" && <div className="studio-icon-grid" role="group" aria-label="Available icons">
            {filtered.slice(0, limit).map((item) => {
              const nextValue = item.kind === "lucide" ? LUCIDE_PREFIX + item.name
                : mode === "openmoji" ? "om:" + item.hex : item.emoji;
              return <button key={item.kind === "lucide" ? item.name : item.hex} type="button"
                title={item.label} aria-label={item.label}
                className={mode + (value === nextValue ? " selected" : "")}
                onClick={() => { onChange(nextValue); setOpen(false); }}>
                {item.kind === "lucide"
                  ? <DynamicIcon name={item.name} size={24} strokeWidth={1.8} aria-hidden="true" />
                  : mode === "openmoji"
                    ? <img src={`/openmoji/color/svg/${item.hex}.svg`} alt="" loading="lazy" />
                    : <span>{item.emoji}</span>}
              </button>;
            })}
            {filtered.length === 0 && <p className="studio-icon-empty">No matching icons found.</p>}
          </div>}
          {panelView === "icons" && filtered.length > limit &&
            <button type="button" className="studio-icon-more" onClick={() => setLimit((n) => n + (mode === "lucide" ? LUCIDE_LIMIT : LIMIT))}>
              Show more ({filtered.length - limit} remaining)
            </button>}
          {panelView === "icons" && <small><Smile size={12} /> {mode === "openmoji"
            ? "Colour artwork by OpenMoji"
            : mode === "emoji" ? "Uses your system emoji font" : "Vector icons that follow the theme colours"}</small>}
        </div>, document.body,
      )}
    </span>
  );
}
