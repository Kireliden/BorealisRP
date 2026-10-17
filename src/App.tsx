import { useEffect, useRef, useState, type FormEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import SettingsModal from "./settings/SettingsModal";
import CollectionsModal from "./collection/CollectionModal";
import PotatoEgg from "./easter-eggs/PotatoEgg";
import NudgeEgg from "./easter-eggs/NudgeEgg";
import { Cog, Trophy } from "lucide-react";
import "./themes/themes.css";
import "./App.css";

const appWindow = getCurrentWindow();

type Role = "Narration" | "Dialogue";
type Character = { name: string; initials: string; avatar: string; description: string };
type Message = {
  id: number;
  author: string;
  initials: string;
  role: Role;
  time: string;
  content: string;
  avatar: string;
  expression?: string;
};

const characters: Character[] = [
  { name: "Keira", initials: "KR", avatar: "mauve", description: "Neon Requiem · Main character" },
  { name: "You", initials: "Y", avatar: "blue", description: "Write as yourself" },
];

const initialMessages: Message[] = [
  {
    id: 1,
    author: "Keira",
    initials: "KR",
    role: "Dialogue",
    time: "21:42",
    content: "The rain had turned the streets into a mirror of neon lights. Mara stopped beneath the awning, watching the silhouette across the road. She knew that coat.",
    avatar: "mauve",
    expression: "😐",
  },
  {
    id: 2,
    author: "You",
    initials: "Y",
    role: "Narration",
    time: "21:44",
    content: "For a moment, neither of them moved. The city carried on around them, oblivious to the history standing between two people.",
    avatar: "blue",
  },
];

const scenes = [
  { name: "The Neon District", detail: "Last night · 24 messages", icon: "◈" },
  { name: "A Familiar Stranger", detail: "Yesterday · 12 messages", icon: "◇" },
  { name: "The Aftermath", detail: "12 October · 8 messages", icon: "◌" },
];

const expressions = ["😐", "🙂", "😏", "😠", "😢", "😳"];

function sanitiseHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "SPAN", "BR", "DIV", "P"]);
  const cleanNode = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child instanceof Element) {
        if (!allowedTags.has(child.tagName)) {
          cleanNode(child);
          child.replaceWith(...child.childNodes);
          return;
        }
        [...child.attributes].forEach((attribute) => {
          if (child.tagName !== "SPAN" || attribute.name !== "style") {
            child.removeAttribute(attribute.name);
          } else {
            const colour = (child as HTMLElement).style.color;
            child.removeAttribute("style");
            if (/^(#[0-9a-f]{3,8}|rgb\([\d\s,%]+\)|rgba\([\d\s,.%]+\)|[a-z]+)$/i.test(colour)) {
              (child as HTMLElement).style.color;
            }
          }
        });
        cleanNode(child);
      }
    });
  };
  cleanNode(parsed.body);
  return parsed.body.innerHTML;
}

function App() {
  const [activeScene, setActiveScene] = useState("The Neon District");
  const [messages, setMessages] = useState(initialMessages);
  const [draftHtml, setDraftHtml] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState("Keira");
  const [selectedRole, setSelectedRole] = useState<Role>("Narration");
  const [selectedExpression, setSelectedExpression] = useState("😐");
  const [showExpressions, setShowExpressions] = useState(false);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);


  const character = characters.find((item) => item.name === selectedCharacter) ?? characters[0];
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    appWindow.isMaximized().then(setIsMaximized);
    appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    }).then((stopListening) => {
      if (cancelled) stopListening();
      else unlisten = stopListening;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  async function toggleMaximize() {
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  }

  function formatText(command: "bold" | "italic" | "underline") {
    editorRef.current?.focus();
    document.execCommand(command, false);
    if (editorRef.current) setDraftHtml(editorRef.current.innerHTML);
  }

  function changeTextColour(colour: string) {
    if (!colour) return;
    editorRef.current?.focus();
    document.execCommand("foreColor", false, colour);
    if (editorRef.current) setDraftHtml(editorRef.current.innerHTML);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const editor = editorRef.current;
    const plainText = editor?.innerText.trim() ?? "";
    if (!plainText) return;

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        author: character.name,
        initials: character.initials,
        role: selectedRole,
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        content: sanitiseHtml(editor?.innerHTML ?? plainText),
        avatar: character.avatar,
        expression: selectedExpression,
      },
    ]);
    setDraftHtml("");
    if (editor) editor.innerHTML = "";
  }

  return (
    <main className="app-shell">
      <div className="custom-titlebar" data-tauri-drag-region>
        <div className="titlebar-brand" data-tauri-drag-region>
        <PotatoEgg />
        
        <span data-tauri-drag-region>Borealis Roleplay Den</span>
    </div>
        <div className="titlebar-controls">
          <button className="titlebar-control" type="button" title="Minimize" aria-label="Minimize" onClick={() => void appWindow.minimize()}><span className="minimize-icon" /></button>
          <button className="titlebar-control" type="button" title={isMaximized ? "Restore" : "Maximize"} aria-label={isMaximized ? "Restore window" : "Maximize window"} onClick={() => void toggleMaximize()}><span className={isMaximized ? "restore-icon" : "maximize-icon"} /></button>
          <button className="titlebar-control close-control" type="button" title="Close" aria-label="Close application" onClick={() => void appWindow.close()}><span className="close-icon" /></button>
        </div>
      </div>

      <div className="app-content">
        <aside className="sidebar">
          <div className="brand"><div className="brand-mark">✦</div><div><div className="brand-name">Borealis</div><div className="brand-subtitle">ROLEPLAY STUDIO</div></div><button className="icon-button brand-menu" title="Workspace menu">⋯</button></div>
          <button className="workspace-button"><span className="workspace-dot" /><span>My workspace</span><span className="chevron">⌄</span></button>
          <div className="sidebar-section"><div className="section-heading"><span>WORKSPACE</span></div><button className="nav-item"><span className="nav-icon">▦</span>Projects<span className="nav-count">1</span></button><button className="nav-item"><span className="nav-icon">♧</span>Characters</button><button className="nav-item"><span className="nav-icon">▧</span>Resources</button></div>
          <div className="sidebar-section scenes-section"><div className="section-heading"><span>YOUR PROJECTS</span><button className="tiny-button" title="Add project">＋</button></div><div className="project-label"><span className="project-chevron">⌄</span><span className="project-symbol">✦</span><span>Neon Requiem</span></div>
            <div className="scene-list">{scenes.map((scene) => <button key={scene.name} className={`scene-item ${activeScene === scene.name ? "selected" : ""}`} onClick={() => setActiveScene(scene.name)}><span className="scene-icon">{scene.icon}</span><span className="scene-copy"><span className="scene-name">{scene.name}</span><span className="scene-detail">{scene.detail}</span></span></button>)}</div>
            <button className="new-scene-button"><span>＋</span> New scene</button>
          </div>
          
<div className="sidebar-spacer" />

<div className="sidebar-footer">
  <div className="profile-avatar">K</div>

  <div className="profile-copy">
    <span className="profile-name">Your profile</span>
    <span className="profile-status">Local workspace</span>
  </div>

  <button
    className="icon-button"
    type="button"
    title="Collections"
    aria-label="Collections"
    onClick={() => setIsCollectionsOpen(true)}
  >
  <Trophy size={18} strokeWidth={1.8} />
  </button>

  <button
    className="icon-button"
    type="button"
    title="Settings"
    aria-label="Settings"
    onClick={() => setIsSettingsOpen(true)}
  >
  <Cog size={18} strokeWidth={1.8} />
  </button>
</div>

        </aside>

        <section className="main-panel">
          <header className="topbar"><div className="breadcrumbs"><span>Neon Requiem</span><span className="breadcrumb-divider">/</span><span className="current-crumb">{activeScene}</span></div><div className="topbar-actions"><span className="local-badge"><span className="status-dot" />Local mode</span><button className="icon-button" title="More options">⋯</button></div></header>
          <div className="scene-toolbar"><div className="scene-heading"><div className="scene-heading-icon">◈</div><div><h1>{activeScene}</h1><p>Neon Requiem <span>·</span> Roleplay scene</p></div></div><div className="scene-actions"><button className="secondary-button">♡ <span>Favourite</span></button><button className="secondary-button">↗ <span>Share</span></button></div></div>
          <div className="demo-notice"><span className="notice-icon">i</span><span><strong>Preview mode.</strong> These messages are temporary and will reset when the app restarts.</span></div>

          <section className="conversation" aria-label="Scene conversation">
            <div className="date-divider"><span /><p>15 OCTOBER 2026</p><span /></div>
            {messages.map((message) => <article className="message" key={message.id}><div className={`message-avatar avatar-${message.avatar}`}>{message.initials}</div><div className="message-body"><div className="message-meta"><strong>{message.author}</strong>{message.expression && <span className="message-expression" title="Character expression">{message.expression}</span>}<span className={`role-tag role-${message.role.toLowerCase()}`}>{message.role}</span><time>{message.time}</time></div><div className="message-rich-content" dangerouslySetInnerHTML={{ __html: message.content }} /></div><button className="message-menu" title="Message options">⋯</button></article>)}
          </section>

          <footer className="composer-area">
            <div className="composer-context"><span className="composer-context-dot" />Writing in <strong>{activeScene}</strong></div>
            <div className="composer-layout">
              <aside className="character-panel">
                <div className={`character-portrait avatar-${character.avatar}`}>
                  <span>{character.initials}</span>
                  <button className="portrait-picker-button character-picker-button" type="button" aria-label="Choose character" title={`Writing as ${character.name}`} aria-expanded={showCharacterPicker} onClick={() => { setShowCharacterPicker((visible) => !visible); setShowExpressions(false); }}>👤</button>
                  <button className="portrait-picker-button expression-picker-button" type="button" aria-label="Choose expression" title={`Expression: ${selectedExpression}`} aria-expanded={showExpressions} onClick={() => { setShowExpressions((visible) => !visible); setShowCharacterPicker(false); }}>{selectedExpression}</button>
                </div>
                {showCharacterPicker && <div className="portrait-popover character-picker-popover">
                  <span className="portrait-popover-label">WRITING AS</span>
                  <select id="character-select" className="character-select" aria-label="Choose character" value={selectedCharacter} onChange={(event) => { setSelectedCharacter(event.target.value); setShowCharacterPicker(false); }}>{characters.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select>
                </div>}
                {showExpressions && <div className="portrait-popover expression-picker-popover">
                  <span className="portrait-popover-label">EXPRESSION</span>
                  <div className="expression-grid" aria-label="Choose character expression">{expressions.map((expression) => <button key={expression} type="button" className={`expression-button ${selectedExpression === expression ? "active" : ""}`} title={`Use expression ${expression}`} aria-pressed={selectedExpression === expression} onClick={() => { setSelectedExpression(expression); setShowExpressions(false); }}>{expression}</button>)}</div>
                </div>}
              </aside>

              <form className="composer" onSubmit={sendMessage}>
                <div className="composer-tools">
                  <label className="toolbar-select-wrap" title="Passage type"><span className="toolbar-symbol">¶</span><select aria-label="Passage type" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as Role)}><option value="Narration">Narration</option><option value="Dialogue">Dialogue</option></select></label>
                  <span className="toolbar-divider" />
                  <button type="button" title="Bold" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => formatText("bold")}><strong>B</strong></button>
                  <button type="button" title="Italic" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => formatText("italic")}><em>I</em></button>
                  <button type="button" title="Underline" aria-label="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => formatText("underline")}><u>U</u></button>
                  <span className="toolbar-divider" />
                  <label className="colour-picker" title="Text colour"><span>A</span><input aria-label="Text colour" type="color" defaultValue="#babbf1" onChange={(event) => changeTextColour(event.target.value)} /></label>
                  <span className="toolbar-divider" />
                  <button
                    type="button"
                    title="Insert image (coming soon)"
                    aria-label="Insert image"
                    disabled
                  >
                  ▧
                  </button>

<NudgeEgg />

<span className="toolbar-spacer" />
<span className="toolbar-spacer" />
                  <span className="editor-mode-label">RICH TEXT</span>
                </div>
                <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label="Write a roleplay message" aria-multiline="true" data-placeholder="Write your next passage..." onInput={(event) => setDraftHtml(event.currentTarget.innerHTML)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.closest("form")?.requestSubmit(); } }} />
                <div className="composer-bottom"><span className="composer-hint"><kbd>Enter</kbd> to send <span>·</span> <kbd>Shift + Enter</kbd> for a new line</span><button className="send-button" type="submit" disabled={!draftHtml.replace(/<[^>]*>/g, "").trim()}>Send passage <span>↑</span></button></div>
              </form>
            </div>
            <p className="composer-footnote">Your story, your pace. Take it one passage at a time.</p>
          </footer>
        </section>
            </div>
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
      {isCollectionsOpen && (
        <CollectionsModal onClose={() => setIsCollectionsOpen(false)} />
      )}
    </main>
  );
}

export default App;
