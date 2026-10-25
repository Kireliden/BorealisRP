import { useEffect, useRef, useState, type RefObject } from "react";
import { Smile } from "lucide-react";
import "./EmojiPicker.css";

type EmojiItem = { emoji: string; name: string; image: string };

const openMojiItems: EmojiItem[] = [
  { emoji: "😀", name: "Grinning face", image: "/node_modules/openmoji/color/svg/1F600.svg" },
  { emoji: "😂", name: "Face with tears of joy", image: "/node_modules/openmoji/color/svg/1F602.svg" },
  { emoji: "🥹", name: "Face holding back tears", image: "/node_modules/openmoji/color/svg/1F979.svg" },
  { emoji: "😍", name: "Heart eyes", image: "/node_modules/openmoji/color/svg/1F60D.svg" },
  { emoji: "🥰", name: "Smiling with hearts", image: "/node_modules/openmoji/color/svg/1F970.svg" },
  { emoji: "😭", name: "Loudly crying", image: "/node_modules/openmoji/color/svg/1F62D.svg" },
  { emoji: "😳", name: "Flushed face", image: "/node_modules/openmoji/color/svg/1F633.svg" },
  { emoji: "😎", name: "Smiling with sunglasses", image: "/node_modules/openmoji/color/svg/1F60E.svg" },
  { emoji: "🤔", name: "Thinking face", image: "/node_modules/openmoji/color/svg/1F914.svg" },
  { emoji: "👀", name: "Eyes", image: "/node_modules/openmoji/color/svg/1F440.svg" },
  { emoji: "💜", name: "Purple heart", image: "/node_modules/openmoji/color/svg/1F49C.svg" },
  { emoji: "❤️", name: "Red heart", image: "/node_modules/openmoji/color/svg/2764-FE0F.svg" },
  { emoji: "✨", name: "Sparkles", image: "/node_modules/openmoji/color/svg/2728.svg" },
  { emoji: "🌙", name: "Crescent moon", image: "/node_modules/openmoji/color/svg/1F319.svg" },
  { emoji: "⭐", name: "Star", image: "/node_modules/openmoji/color/svg/2B50.svg" },
  { emoji: "🐈", name: "Cat", image: "/node_modules/openmoji/color/svg/1F408.svg" },
  { emoji: "🐈‍⬛", name: "Black cat", image: "/node_modules/openmoji/color/svg/1F408-200D-2B1B.svg" },
  { emoji: "🫂", name: "People hugging", image: "/node_modules/openmoji/color/svg/1FAC2.svg" },
  { emoji: "🎮", name: "Video game", image: "/node_modules/openmoji/color/svg/1F3AE.svg" },
  { emoji: "🎨", name: "Artist palette", image: "/node_modules/openmoji/color/svg/1F3A8.svg" },
  { emoji: "☕", name: "Hot beverage", image: "/node_modules/openmoji/color/svg/2615.svg" },
  { emoji: "🌸", name: "Cherry blossom", image: "/node_modules/openmoji/color/svg/1F338.svg" },
  { emoji: "🔥", name: "Fire", image: "/node_modules/openmoji/color/svg/1F525.svg" },
  { emoji: "👍", name: "Thumbs up", image: "/node_modules/openmoji/color/svg/1F44D.svg" },
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
                {source === "openmoji" ? <img src={item.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span aria-hidden="true">{item.emoji}</span>}
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
