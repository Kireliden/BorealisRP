import AppSelect from "../ui/AppSelect";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Smile } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { LUCIDE_PAGE_SIZE, lucideOptions } from "../ui/lucideCatalogue";
import { hydrateLucideInlineIcons, makeLucideInlineIcon } from "./lucideInline";
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
  image: string;
  colorImage: string;
  searchText: string;
};

type EmojiStyle = "color" | "linework" | "system" | "lucide";
type Props = { editorRef: RefObject<HTMLDivElement | null> };
const RECENT_LIMIT = 32;
const EMOJI_PAGE_SIZE = 140;
const RECENT_KEY: Record<EmojiStyle, string> = {
  color: "borealis.emoji-recent.color",
  linework: "borealis.emoji-recent.linework",
  system: "borealis.emoji-recent.system",
  lucide: "borealis.emoji-recent.lucide",
};

// OpenMoji SVGs are copied to public/openmoji by the predev/prebuild script.
// Referencing public URLs avoids asking Vite to process thousands of SVG files.
const assetByHex = (directory: string) => {
  const map = new Map<string, string>();
  for (const entry of openMojiData as OpenMojiRecord[]) {
    if (entry.hexcode) map.set(entry.hexcode.toUpperCase(), `/openmoji/${directory}/svg/${entry.hexcode.toUpperCase()}.svg`);
  }
  return map;
};
const blackByHex = assetByHex("black");
const colorByHex = assetByHex("color");

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
  const [visibleLimit, setVisibleLimit] = useState(EMOJI_PAGE_SIZE);
  const [recent, setRecent] = useState<Record<EmojiStyle, string[]>>(() => ({
    color: readRecent("color"),
    linework: readRecent("linework"),
    system: readRecent("system"),
    lucide: readRecent("lucide"),
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

  function trackRecent(id: string) {
    setRecent((current) => {
      const nextForStyle = [id, ...current[source].filter((recentId) => recentId !== id)].slice(0, RECENT_LIMIT);
      const next = { ...current, [source]: nextForStyle };
      try {
        localStorage.setItem(RECENT_KEY[source], JSON.stringify(nextForStyle));
      } catch {
        // Recent emojis remain usable if browser storage is unavailable.
      }
      return next;
    });
  }

  function insertNode(node: HTMLElement, recentId: string, eventData: string) {
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
    activeRange.insertNode(node);
    activeRange.setStartAfter(node);
    activeRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(activeRange);
    savedRangeRef.current = activeRange.cloneRange();
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: eventData }));
    trackRecent(recentId);
    setIsOpen(false);
    setQuery("");
  }

  function insertEmoji(item: EmojiItem) {
    const node = document.createElement(source === "system" || source === "linework" ? "span" : "img");
    if (source === "color") {
      node.setAttribute("src", item.colorImage);
      node.setAttribute("alt", item.emoji);
      node.setAttribute("title", item.name);
      node.className = "message-openmoji-emoji message-openmoji-color";
      node.setAttribute("contenteditable", "false");
    } else if (source === "linework") {
      node.setAttribute("data-openmoji-src", item.image);
      node.style.maskImage = `url("${item.image}")`;
      node.style.webkitMaskImage = `url("${item.image}")`;
      node.setAttribute("aria-label", item.emoji);
      node.setAttribute("title", item.name);
      node.className = "message-openmoji-linework";
      node.setAttribute("contenteditable", "false");
    } else {
      node.textContent = item.emoji;
      node.className = "message-system-emoji";
    }
    insertNode(node, item.hexcode, item.emoji);
  }

  function insertLucide(name: IconName) {
    insertNode(makeLucideInlineIcon(name), name, name);
    if (editorRef.current) hydrateLucideInlineIcons(editorRef.current);
  }

  const filteredItems = useMemo(() => openMojiItems.filter((item) => {
    const matchesQuery = !query.trim() || item.searchText.includes(query.trim().toLocaleLowerCase());
    const matchesGroup = selectedGroup === "All" || item.group === selectedGroup;
    return matchesQuery && matchesGroup;
  }), [query, selectedGroup]);

  useEffect(() => {
    setVisibleLimit(source === "lucide" ? LUCIDE_PAGE_SIZE : EMOJI_PAGE_SIZE);
  }, [isOpen, source, query, selectedGroup]);

  const recentItems = recent[source]
    .map((hex) => openMojiItems.find((item) => item.hexcode === hex))
    .filter((item): item is EmojiItem => Boolean(item));
  const visibleRecent = recentItems.filter((item) => {
    const matchesQuery = !query.trim() || item.searchText.includes(query.trim().toLocaleLowerCase());
    const matchesGroup = selectedGroup === "All" || item.group === selectedGroup;
    return matchesQuery && matchesGroup;
  });

  const nonRecentItems = filteredItems.filter((item) => !visibleRecent.some((recentItem) => recentItem.hexcode === item.hexcode));
  const displayedItems = nonRecentItems.slice(0, visibleLimit);

  const filteredLucideItems = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return q ? lucideOptions.filter((item) => item.search.includes(q)) : lucideOptions;
  }, [query]);
  const recentLucideItems = recent.lucide
    .map((name) => lucideOptions.find((item) => item.name === name))
    .filter((item): item is (typeof lucideOptions)[number] => Boolean(item))
    .filter((item) => !query.trim() || item.search.includes(query.trim().toLocaleLowerCase()));
  const nonRecentLucideItems = filteredLucideItems.filter((item) =>
    !recentLucideItems.some((recentItem) => recentItem.name === item.name));
  const displayedLucideItems = nonRecentLucideItems.slice(0, visibleLimit);

  function renderLucide(item: (typeof lucideOptions)[number]) {
    return (
      <button key={item.name} type="button" className="emoji-picker-item" title={item.label}
        aria-label={item.label} onMouseDown={(event) => event.preventDefault()}
        onClick={() => insertLucide(item.name)}>
        <DynamicIcon name={item.name} className="emoji-picker-lucide" size={28} strokeWidth={1.8} aria-hidden="true" />
      </button>
    );
  }

  function renderEmoji(item: EmojiItem) {
    return (
      <button key={item.hexcode} type="button" className="emoji-picker-item" title={item.name} aria-label={item.name}
        onMouseDown={(event) => event.preventDefault()} onClick={() => insertEmoji(item)}>
        {source === "color"
          ? <img className="emoji-picker-color" src={item.colorImage} alt="" loading="lazy" />
          : source === "linework"
            ? <span className="emoji-picker-openmoji" aria-hidden="true" style={{ maskImage: `url("${item.image}")`, WebkitMaskImage: `url("${item.image}")` }} />
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
          <div className="emoji-picker-heading"><strong>Emojis & icons</strong><span>{(source === "lucide" ? lucideOptions.length : openMojiItems.length).toLocaleString()} available</span></div>
          <div className="emoji-picker-source" role="group" aria-label="Emoji style">
            <button type="button" className={source === "color" ? "active" : ""} aria-pressed={source === "color"} onClick={() => setSource("color")}>Color</button>
            <button type="button" className={source === "linework" ? "active" : ""} aria-pressed={source === "linework"} onClick={() => setSource("linework")}>Linework</button>
            <button type="button" className={source === "system" ? "active" : ""} aria-pressed={source === "system"} onClick={() => setSource("system")}>System</button>
            <button type="button" className={source === "lucide" ? "active" : ""} aria-pressed={source === "lucide"} onClick={() => setSource("lucide")}>Lucide</button>
          </div>
          <input className="emoji-picker-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emojis…" aria-label="Search emojis" autoFocus />
          {source !== "lucide" && <>
            <label className="emoji-picker-category-label" htmlFor="emoji-picker-category">Category</label>
            <AppSelect id="emoji-picker-category" className="emoji-picker-category" value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
              <option value="All">All categories</option>
              {groups.map((group) => <option key={group} value={group}>{group}</option>)}
            </AppSelect>
          </>}
          <div className="emoji-picker-grid-wrap">
            {(source === "lucide" ? recentLucideItems.length > 0 : visibleRecent.length > 0) && (
              <div className="emoji-picker-section">
                <h3>Recently used</h3>
                <div className="emoji-picker-grid">
                  {source === "lucide" ? recentLucideItems.map(renderLucide) : visibleRecent.map(renderEmoji)}
                </div>
              </div>
            )}
            <div className="emoji-picker-section">
              <h3>{source === "lucide" ? "All icons" : selectedGroup === "All" ? "All emojis" : selectedGroup}</h3>
              <div className="emoji-picker-grid">
                {source === "lucide" ? displayedLucideItems.map(renderLucide) : displayedItems.map(renderEmoji)}
                {(source === "lucide" ? !filteredLucideItems.length : !filteredItems.length) &&
                  <p className="emoji-picker-empty">No icons found.</p>}
                {(source === "lucide"
                  ? nonRecentLucideItems.length > displayedLucideItems.length
                  : nonRecentItems.length > displayedItems.length) && (
                  <button type="button" className="emoji-picker-load-more"
                    onClick={() => setVisibleLimit((limit) => limit + (source === "lucide" ? LUCIDE_PAGE_SIZE : EMOJI_PAGE_SIZE))}>
                    Load more ({(source === "lucide"
                      ? nonRecentLucideItems.length - displayedLucideItems.length
                      : nonRecentItems.length - displayedItems.length).toLocaleString()} remaining)
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="emoji-picker-footnote">{source === "color" ? "Full-colour OpenMoji illustrations"
            : source === "linework" ? "Accent-tinted OpenMoji linework"
            : source === "lucide" ? "Lucide vector icons, tinted to the message text" : "System emoji style"}</p>
        </section>
      )}
    </div>
  );
}

