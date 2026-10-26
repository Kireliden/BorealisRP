import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Smile } from "lucide-react";
import openMojiData from "openmoji/data/openmoji.json";
import "./EmojiPicker.css";

type OpenMojiRecord = {
  hexcode: string;
  emoji: string;
  annotation: string;
  tags?: string;
  group?: string;
  subgroup?: string;
};

type EmojiItem = {
  emoji: string;
  name: string;
  hexcode: string;
  group: string;
  image: () => Promise<string>;
  colorImage: () => Promise<string>;
  searchText: string;
};

type EmojiStyle = "color" | "linework" | "system";
type Props = { editorRef: RefObject<HTMLDivElement | null> };
const RECENT_LIMIT = 32;
const RECENT_KEY: Record<EmojiStyle, string> = {
  color: "borealis.emoji-recent.color",
  linework: "borealis.emoji-recent.linework",
  system: "borealis.emoji-recent.system",
};

// Keep SVGs as lazy URL imports: eagerly processing thousands of illustrations can
// exhaust Windows file handles during production builds.
const blackAssets = import.meta.glob("../../node_modules/openmoji/black/svg/*.svg", {
  query: "?url",
  import: "default",
}) as Record<string, () => Promise<string>>;
const colorAssets = import.meta.glob("../../node_modules/openmoji/color/svg/*.svg", {
  query: "?url",
  import: "default",
}) as Record<string, () => Promise<string>>;

const assetByHex = (assets: Record<string, () => Promise<string>>) => {
  const map = new Map<string, () => Promise<string>>();
  for (const [path, loader] of Object.entries(assets)) {
    const match = path.match(/\\/([\\w-]+)\\.svg$/);
    if (match) map.set(match[1].toUpperCase(), loader);
  }
  return map;
};
const blackByHex = assetByHex(blackAssets);
const colorByHex = assetByHex(colorAssets);

const openMojiItems: EmojiItem[] = (openMojiData as OpenMojiRecord[])
  .filter((entry) => entry.emoji && entry.hexcode && blackByHex.has(entry.hexcode.toUpperCase()) && colorByHex.has(entry.hexcode.toUpperCase()))
  .map((entry) => ({
    emoji: entry.emoji,
    name: entry.annotation || entry.hexcode,
    hexcode: entry.hexcode.toUpperCase(),
    group: entry.group || "Other",
    image: blackByHex.get(entry.hexcode.toUpperCase())!,
    colorImage: colorByHex.get(entry.hexcode.toUpperCase())!,
    searchText: `${entry.annotation} ${entry.tags ?? ""} ${entry.hexcode} ${entry.emoji}`.toLocaleLowerCase(),
  }));

const groups = [...new Set(openMojiItems.map((item) => item.group))].sort((a, b) => a.localeCompare(b));

function readRecent(style: EmojiStyle): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_KEY[style]) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export default function EmojiPicker({ editorRef }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<EmojiStyle>("color");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [recent, setRecent] = useState<Record<EmojiStyle, string[]>>(() => ({
    color: readRecent("color"),
    linework: readRecent("linework"),
    system: readRecent("system"),
  }));
  const rootRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) savedRangeRef.current = range.cloneRange();
  }

  function trackRecent(item: EmojiItem) {
    setRecent((current) => {
      const nextForStyle = [item.hexcode, ...current[source].filter((hex) => hex !== item.hexcode)].slice(0, RECENT_LIMIT);
      const next = { ...current, [source]: nextForStyle };
      try {
        localStorage.setItem(RECENT_KEY[source], JSON.stringify(nextForStyle));
      } catch {
        // Recent emojis remain usable if browser storage is unavailable.
      }
      return next;
    });
  }

  async function insertEmoji(item: EmojiItem) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    const range = savedRangeRef.current;
    if (selection && range && editor.contains(range.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (selection) {
      const endRange = document.createRange();
      endRange.selectNodeContents(editor);
      endRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(endRange);
    }
    const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!activeRange) return;
    activeRange.deleteContents();
    const node = document.createElement(source === "system" || source === "linework" ? "span" : "img");
    if (source === "color") {
      node.setAttribute("src", await item.colorImage());
      node.setAttribute("alt", item.emoji);
      node.setAttribute("title", item.name);
      node.className = "message-openmoji-emoji message-openmoji-color";
      node.setAttribute("contenteditable", "false");
    } else if (source === "linework") {
      const imageUrl = await item.image();
      node.setAttribute("data-openmoji-src", imageUrl);
      (node as HTMLElement).style.maskImage = `url("${imageUrl}")`;
      (node as HTMLElement).style.webkitMaskImage = `url("${imageUrl}")`;
      node.setAttribute("aria-label", item.emoji);
      node.setAttribute("title", item.name);
      node.className = "message-openmoji-linework";
      node.setAttribute("contenteditable", "false");
    } else {
      node.textContent = item.emoji;
      node.className = "message-system-emoji";
    }
    activeRange.insertNode(node);
    activeRange.setStartAfter(node);
    activeRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(activeRange);
    savedRangeRef.current = activeRange.cloneRange();
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: item.emoji }));
    trackRecent(item);
    setIsOpen(false);
    setQuery("");
  }

  const filteredItems = useMemo(() => openMojiItems.filter((item) => {
    const matchesQuery = !query.trim() || item.searchText.includes(query.trim().toLocaleLowerCase());
    const matchesGroup = selectedGroup === "All" || item.group === selectedGroup;
    return matchesQuery && matchesGroup;
  }), [query, selectedGroup]);

  const recentItems = recent[source]
    .map((hex) => openMojiItems.find((item) => item.hexcode === hex))
    .filter((item): item is EmojiItem => Boolean(item));
  const visibleRecent = recentItems.filter((item) => {
    const matchesQuery = !query.trim() || item.searchText.includes(query.trim().toLocaleLowerCase());
    const matchesGroup = selectedGroup === "All" || item.group === selectedGroup;
    return matchesQuery && matchesGroup;
  });

  function renderEmoji(item: EmojiItem) {
    return (
      <button key={item.hexcode} type="button" className="emoji-picker-item" title={item.name} aria-label={item.name}
        onMouseDown={(event) => event.preventDefault()} onClick={() => insertEmoji(item)}>
        {source === "color"
          ? <LazyOpenMoji loader={item.colorImage} className="emoji-picker-color" />
          : source === "linework"
            ? <LazyOpenMoji loader={item.image} className="emoji-picker-openmoji" masked />
            : <span className="emoji-picker-system" aria-hidden="true">{item.emoji}</span>}
      </button>
    );
  }

  return (
    <div className="emoji-picker-anchor" ref={rootRef}>
      <button className={`emoji-picker-trigger ${isOpen ? "active" : ""}`} type="button" title="Insert emoji"
        aria-label="Insert emoji" aria-haspopup="dialog" aria-expanded={isOpen}
        onMouseDown={rememberSelection} onClick={() => { rememberSelection(); setIsOpen((open) => !open); }}>
        <Smile size={16} />
      </button>
      {isOpen && (
        <section className="emoji-picker-popover" role="dialog" aria-label="Emoji picker">
          <div className="emoji-picker-heading"><strong>Emojis</strong><span>{openMojiItems.length.toLocaleString()} available</span></div>
          <div className="emoji-picker-source" role="group" aria-label="Emoji style">
            <button type="button" className={source === "color" ? "active" : ""} aria-pressed={source === "color"} onClick={() => setSource("color")}>Color</button>
            <button type="button" className={source === "linework" ? "active" : ""} aria-pressed={source === "linework"} onClick={() => setSource("linework")}>Linework</button>
            <button type="button" className={source === "system" ? "active" : ""} aria-pressed={source === "system"} onClick={() => setSource("system")}>System</button>
          </div>
          <input className="emoji-picker-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emojis…" aria-label="Search emojis" autoFocus />
          <label className="emoji-picker-category-label" htmlFor="emoji-picker-category">Category</label>
          <select id="emoji-picker-category" className="emoji-picker-category" value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
            <option value="All">All categories</option>
            {groups.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
          <div className="emoji-picker-grid-wrap">
            {visibleRecent.length > 0 && (
              <div className="emoji-picker-section">
                <h3>Recently used</h3>
                <div className="emoji-picker-grid">{visibleRecent.map(renderEmoji)}</div>
              </div>
            )}
            <div className="emoji-picker-section">
              <h3>{selectedGroup === "All" ? "All emojis" : selectedGroup}</h3>
              <div className="emoji-picker-grid">
                {filteredItems.filter((item) => !visibleRecent.some((recentItem) => recentItem.hexcode === item.hexcode)).map(renderEmoji)}
                {!filteredItems.length && <p className="emoji-picker-empty">No emojis found.</p>}
              </div>
            </div>
          </div>
          <p className="emoji-picker-footnote">{source === "color" ? "Full-colour OpenMoji illustrations" : source === "linework" ? "Accent-tinted OpenMoji linework" : "System emoji style"}</p>
        </section>
      )}
    </div>
  );
}


function LazyOpenMoji({ loader, className, masked = false }: { loader: () => Promise<string>; className: string; masked?: boolean }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    loader().then((value) => { if (active) setUrl(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [loader]);
  if (masked) return <span className={className} aria-hidden="true" style={url ? { maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")` } : undefined} />;
  return <img className={className} src={url || undefined} alt="" loading="lazy" />;
}


function LazyOpenMoji({ loader, className, masked = false }: { loader: () => Promise<string>; className: string; masked?: boolean }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    loader().then((value) => { if (active) setUrl(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [loader]);
  if (masked) return <span className={className} aria-hidden="true" style={url ? { maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")` } : undefined} />;
  return <img className={className} src={url || undefined} alt="" loading="lazy" />;
}
