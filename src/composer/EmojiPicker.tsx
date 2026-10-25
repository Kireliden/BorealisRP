import { useEffect, useRef, useState, type RefObject } from "react";
import { Smile } from "lucide-react";
import openMoji0 from "openmoji/color/svg/1F600.svg?url";
import openMoji1 from "openmoji/color/svg/1F602.svg?url";
import openMoji2 from "openmoji/color/svg/1F979.svg?url";
import openMoji3 from "openmoji/color/svg/1F60D.svg?url";
import openMoji4 from "openmoji/color/svg/1F970.svg?url";
import openMoji5 from "openmoji/color/svg/1F62D.svg?url";
import openMoji6 from "openmoji/color/svg/1F633.svg?url";
import openMoji7 from "openmoji/color/svg/1F60E.svg?url";
import openMoji8 from "openmoji/color/svg/1F914.svg?url";
import openMoji9 from "openmoji/color/svg/1F440.svg?url";
import openMoji10 from "openmoji/color/svg/1F49C.svg?url";
import openMoji11 from "openmoji/color/svg/2764-FE0F.svg?url";
import openMoji12 from "openmoji/color/svg/2728.svg?url";
import openMoji13 from "openmoji/color/svg/1F319.svg?url";
import openMoji14 from "openmoji/color/svg/2B50.svg?url";
import openMoji15 from "openmoji/color/svg/1F408.svg?url";
import openMoji16 from "openmoji/color/svg/1F408-200D-2B1B.svg?url";
import openMoji17 from "openmoji/color/svg/1FAC2.svg?url";
import openMoji18 from "openmoji/color/svg/1F3AE.svg?url";
import openMoji19 from "openmoji/color/svg/1F3A8.svg?url";
import openMoji20 from "openmoji/color/svg/2615.svg?url";
import openMoji21 from "openmoji/color/svg/1F338.svg?url";
import openMoji22 from "openmoji/color/svg/1F525.svg?url";
import openMoji23 from "openmoji/color/svg/1F44D.svg?url";
import "./EmojiPicker.css";

type EmojiItem = { emoji: string; name: string; image: string };

const openMojiItems: EmojiItem[] = [
  { emoji: "😀", name: "Grinning face", image: openMoji0 },
  { emoji: "😂", name: "Face with tears of joy", image: openMoji1 },
  { emoji: "🥹", name: "Face holding back tears", image: openMoji2 },
  { emoji: "😍", name: "Heart eyes", image: openMoji3 },
  { emoji: "🥰", name: "Smiling with hearts", image: openMoji4 },
  { emoji: "😭", name: "Loudly crying", image: openMoji5 },
  { emoji: "😳", name: "Flushed face", image: openMoji6 },
  { emoji: "😎", name: "Smiling with sunglasses", image: openMoji7 },
  { emoji: "🤔", name: "Thinking face", image: openMoji8 },
  { emoji: "👀", name: "Eyes", image: openMoji9 },
  { emoji: "💜", name: "Purple heart", image: openMoji10 },
  { emoji: "❤️", name: "Red heart", image: openMoji11 },
  { emoji: "✨", name: "Sparkles", image: openMoji12 },
  { emoji: "🌙", name: "Crescent moon", image: openMoji13 },
  { emoji: "⭐", name: "Star", image: openMoji14 },
  { emoji: "🐈", name: "Cat", image: openMoji15 },
  { emoji: "🐈‍⬛", name: "Black cat", image: openMoji16 },
  { emoji: "🫂", name: "People hugging", image: openMoji17 },
  { emoji: "🎮", name: "Video game", image: openMoji18 },
  { emoji: "🎨", name: "Artist palette", image: openMoji19 },
  { emoji: "☕", name: "Hot beverage", image: openMoji20 },
  { emoji: "🌸", name: "Cherry blossom", image: openMoji21 },
  { emoji: "🔥", name: "Fire", image: openMoji22 },
  { emoji: "👍", name: "Thumbs up", image: openMoji23 },
];

type Props = { editorRef: RefObject<HTMLDivElement | null> };

export default function EmojiPicker({ editorRef }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<"openmoji" | "system">("openmoji");
  const [query, setQuery] = useState("");
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

  function insertEmoji(item: EmojiItem) {
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
    const node = document.createTextNode(item.emoji);
    activeRange.insertNode(node);
    activeRange.setStartAfter(node);
    activeRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(activeRange);
    savedRangeRef.current = activeRange.cloneRange();
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: item.emoji }));
    setIsOpen(false);
    setQuery("");
  }

  const filteredItems = openMojiItems.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()) || item.emoji.includes(query.trim())
  );

  return (
    <div className="emoji-picker-anchor" ref={rootRef}>
      <button
        className={`emoji-picker-trigger ${isOpen ? "active" : ""}`}
        type="button"
        title="Insert emoji"
        aria-label="Insert emoji"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onMouseDown={rememberSelection}
        onClick={() => { rememberSelection(); setIsOpen((open) => !open); }}
      >
        <Smile size={16} />
      </button>
      {isOpen && (
        <section className="emoji-picker-popover" role="dialog" aria-label="Emoji picker">
          <div className="emoji-picker-heading">
            <strong>Emojis</strong>
            <span>Choose a style</span>
          </div>
          <div className="emoji-picker-source" role="group" aria-label="Emoji style">
            <button type="button" className={source === "openmoji" ? "active" : ""} aria-pressed={source === "openmoji"} onClick={() => setSource("openmoji")}>OpenMoji</button>
            <button type="button" className={source === "system" ? "active" : ""} aria-pressed={source === "system"} onClick={() => setSource("system")}>System</button>
          </div>
          <input className="emoji-picker-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emojis…" aria-label="Search emojis" autoFocus />
          <div className="emoji-picker-grid" aria-label="Available emojis">
            {filteredItems.map((item) => (
              <button key={item.name} type="button" className="emoji-picker-item" title={item.name} aria-label={item.name} onMouseDown={(event) => event.preventDefault()} onClick={() => insertEmoji(item)}>
                {source === "openmoji" ? <><img src={item.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.style.display = "inline"; }} /><span className="emoji-picker-fallback" aria-hidden="true">{item.emoji}</span></> : <span aria-hidden="true">{item.emoji}</span>}
              </button>
            ))}
            {!filteredItems.length && <p className="emoji-picker-empty">No emojis found.</p>}
          </div>
          <p className="emoji-picker-footnote">{source === "openmoji" ? "OpenMoji illustrations" : "Your system's emoji style"}</p>
        </section>
      )}
    </div>
  );
}
