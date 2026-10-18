import { useEffect, useRef, useState, type FormEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./themes/themes.css";
import "./App.css";
import "./composer/Composer.css";
import "./composer/AvatarComp.css";
import SettingsModal from "./settings/SettingsModal";
import CollectionsModal from "./collection/CollectionModal";
import PotatoEgg from "./easter-eggs/PotatoEgg";
import NudgeEgg from "./easter-eggs/NudgeEgg";
import { Cog, Trophy } from "lucide-react";
import { expressions, defaultExpression } from "./composer/expressions";
import avatarPlaceholder from "./assets/Avatar_placeholder.png";
import WorkspaceManagerModal from "./workspace/WorkspaceManagerModal";
import type { WorkspaceInfo } from "./workspace/workspaceTypes";

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
  history?: string[];
  source?: string;
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

function markdownSourceFromHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");

  function convert(node: Node): Node[] {
    if (node.nodeType === Node.TEXT_NODE) {
      return [document.createTextNode(node.textContent ?? "")];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [...node.childNodes].flatMap(convert);
    }

    const source = node as HTMLElement;
    const tag = source.tagName;
    const wrappers: Record<string, string> = {
      B: "**", STRONG: "**", I: "*", EM: "*", U: "__",
      S: "~~", DEL: "~~", CODE: "`",
    };

    if (wrappers[tag]) {
      return [
        document.createTextNode(wrappers[tag]),
        ...[...source.childNodes].flatMap(convert),
        document.createTextNode(wrappers[tag]),
      ];
    }

    if (tag === "SPAN" && source.style.color) {
      const span = document.createElement("span");
      span.style.color = source.style.color;
      [...source.childNodes].forEach((child) => span.append(...convert(child)));
      return [span];
    }

    if (tag === "BR") return [document.createElement("br")];
    if (tag === "DIV" || tag === "P") {
      const block = document.createElement(tag.toLowerCase());
      [...source.childNodes].forEach((child) => block.append(...convert(child)));
      return [block];
    }

    return [...source.childNodes].flatMap(convert);
  }

  const output = document.createElement("div");
  [...parsed.body.childNodes].forEach((child) => output.append(...convert(child)));
  return output.innerHTML;
}

function applyMarkdownToTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  const pattern = /\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*(.+?)\*|_(.+?)_|\`([^\`]+)\`/g;

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? "";
    pattern.lastIndex = 0;
    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > lastIndex) fragment.append(document.createTextNode(text.slice(lastIndex, index)));

      const tag = match[1] !== undefined ? "strong"
        : match[2] !== undefined ? "u"
        : match[3] !== undefined ? "s"
        : match[4] !== undefined ? "em"
        : match[5] !== undefined ? "em"
        : "code";
      const element = document.createElement(tag);
      element.textContent = match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5] ?? match[6] ?? "";
      fragment.append(element);
      lastIndex = index + match[0].length;
    }
    if (lastIndex < text.length) fragment.append(document.createTextNode(text.slice(lastIndex)));
    textNode.replaceWith(fragment);
  }
}

function sanitiseHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "S", "DEL", "CODE", "SPAN", "BR", "DIV", "P"]);
  const validColour = /^(#[0-9a-f]{3,8}|rgb\([\d\s,%]+\)|rgba\([\d\s,.%]+\)|[a-z]+)$/i;

  function cleanNode(node: Node): Node[] {
    if (node.nodeType === Node.TEXT_NODE) {
      return [document.createTextNode(node.textContent ?? "")];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [...node.childNodes].flatMap(cleanNode);
    }

    const source = node as HTMLElement;
    if (source.tagName === "FONT") {
      const span = document.createElement("span");
      const colour = source.getAttribute("color") ?? "";
      if (validColour.test(colour)) span.style.color = colour;
      [...source.childNodes].forEach((child) => span.append(...cleanNode(child)));
      return [span];
    }

    if (!allowedTags.has(source.tagName)) {
      return [...source.childNodes].flatMap(cleanNode);
    }

    const clean = document.createElement(source.tagName.toLowerCase());
    if (source.tagName === "SPAN") {
      const colour = source.style.color;
      if (validColour.test(colour)) clean.style.color = colour;
    }

    [...source.childNodes].forEach((child) => {
      clean.append(...cleanNode(child));
    });
    return [clean];
  }

  const output = document.createElement("div");
  [...parsed.body.childNodes].forEach((child) => {
    output.append(...cleanNode(child));
  });
  return output.innerHTML;
}function App() {
  const [activeScene, setActiveScene] = useState("The Neon District");
  const [messages, setMessages] = useState(initialMessages);
  const [draftHtml, setDraftHtml] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState("Keira");
  const [selectedRole, setSelectedRole] = useState<Role>("Narration");
  const [selectedExpression, setSelectedExpression] = useState<string>(defaultExpression.emoji);
  const [showExpressions, setShowExpressions] = useState(false);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [avatarTilt, setAvatarTilt] = useState({ x: 0, y: 0, shineX: 50, shineY: 35 });
  const [isMaximized, setIsMaximized] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLElement>(null);
  const previousMessageCountRef = useRef(messages.length);
  const [isAtLatestMessage, setIsAtLatestMessage] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>(null);


  const character = characters.find((item) => item.name === selectedCharacter) ?? characters[0];

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, []);

  useEffect(() => {
    if (!showAvatarPreview) return;
    function handlePreviewKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowAvatarPreview(false);
    }
    window.addEventListener("keydown", handlePreviewKeyDown);
    return () => window.removeEventListener("keydown", handlePreviewKeyDown);
  }, [showAvatarPreview]);

  useEffect(() => {
    if (messages.length <= previousMessageCountRef.current) {
      previousMessageCountRef.current = messages.length;
      return;
    }
    previousMessageCountRef.current = messages.length;

    if (isAtLatestMessage) {
      const conversation = conversationRef.current;
      if (conversation) conversation.scrollTop = conversation.scrollHeight;
      setHasNewMessages(false);
    } else {
      setHasNewMessages(true);
    }
  }, [messages.length, isAtLatestMessage]);

  function handleConversationScroll() {
    const conversation = conversationRef.current;
    if (!conversation) return;
    const atBottom = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 80;
    setIsAtLatestMessage(atBottom);
    if (atBottom) setHasNewMessages(false);
  }

  function scrollToLatestMessage() {
    const conversation = conversationRef.current;
    if (!conversation) return;
    conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
    setIsAtLatestMessage(true);
    setHasNewMessages(false);
  }
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

  function beginEditingMessage(message: Message) {
    setEditingMessageId(message.id);
    const editableSource = message.source ?? markdownSourceFromHtml(message.content);
    setDraftHtml(editableSource);
    setShowCharacterPicker(false);
    setShowExpressions(false);

    if (editorRef.current) {
      editorRef.current.innerHTML = editableSource;
      editorRef.current.focus();
    }
  }

  function cancelEditingMessage() {
    setEditingMessageId(null);
    setDraftHtml("");
    if (editorRef.current) editorRef.current.innerHTML = "";
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const editor = editorRef.current;
    const plainText = editor?.innerText.trim() ?? "";
    if (!plainText) return;

    const source = markdownSourceFromHtml(editor?.innerHTML ?? plainText);
    const contentRoot = document.createElement("div");
    contentRoot.innerHTML = source;
    applyMarkdownToTextNodes(contentRoot);
    const content = sanitiseHtml(contentRoot.innerHTML);

    if (editingMessageId !== null) {
      setMessages((current) =>
        current.map((message) =>
          message.id === editingMessageId
            ? {
                ...message,
                content,
                source,
                history: [...(message.history ?? []), message.content],
              }
            : message,
        ),
      );
      setEditingMessageId(null);
    } else {
      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          author: character.name,
          initials: character.initials,
          role: selectedRole,
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          content,
          source,
          avatar: character.avatar,
          expression: selectedExpression,
        },
      ]);
    }

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
          <div className="brand"><div className="brand-mark">✦</div><div><div className="brand-name">Borealis</div><div className="brand-subtitle">ROLEPLAY STUDIO</div></div><button className="icon-button brand-menu" type="button" title="Workspace menu" aria-label="Open workspace manager" onClick={() => setIsWorkspaceManagerOpen(true)}>⋯</button></div>
          <button className="workspace-button" type="button" onClick={() => setIsWorkspaceManagerOpen(true)} aria-label="Manage workspaces"><span className="workspace-dot" /><span className="workspace-button-name">{activeWorkspace?.manifest.name ?? "Choose workspace"}</span><span className="chevron">⌄</span></button>
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
    <span className="profile-status">{activeWorkspace ? "Workspace selected" : "No workspace selected"}</span>
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

          <section ref={conversationRef} className="conversation" aria-label="Scene conversation" onScroll={handleConversationScroll}>
            <div className="date-divider"><span /><p>15 OCTOBER 2026</p><span /></div>
            {messages.map((message) => <article className="message" key={message.id}><div className={`message-avatar avatar-${message.avatar}`}>{message.initials}</div><div className="message-body"><div className="message-meta"><strong>{message.author}</strong>{message.expression && (
                      <span
                        className="message-expression"
                        title="Character expression"
                        aria-label="Character expression"
                        style={{
                          maskImage: `url("${expressions.find(
                            (expression) => expression.emoji === message.expression
                          )?.image ?? ""}")`,
                          WebkitMaskImage: `url("${expressions.find(
                            (expression) => expression.emoji === message.expression
                          )?.image ?? ""}")`,
                        }}
                      />
                    )}<span className={`role-tag role-${message.role.toLowerCase()}`}>{message.role}</span><time>{message.time}</time></div><div className="message-rich-content" dangerouslySetInnerHTML={{ __html: message.content }} /></div><button className="message-menu" type="button" title="Edit message" aria-label={`Edit message by ${message.author}`} onClick={() => beginEditingMessage(message)}>✎</button></article>)}
            {hasNewMessages && <button className="scroll-to-latest" type="button" onClick={scrollToLatestMessage}>↓ New messages · Jump to latest</button>}
          </section>

          <footer className="composer-area">
            <div className="composer-context"><span className="composer-context-dot" />Writing in <strong>{activeScene}</strong></div>
            <div className="composer-layout">
              <aside className="character-panel">
                <div className={`character-portrait avatar-${character.avatar}`}>
                  <button
                    className="character-portrait-preview"
                    type="button"
                    aria-label={`View ${character.name}'s avatar`}
                    title={`View ${character.name}'s avatar`}
                    onClick={() => { setShowAvatarPreview(true); setShowCharacterPicker(false); setShowExpressions(false); }}
                  >
                    <span className="character-portrait-initials">{character.initials}</span>
                    <span
                      className="character-portrait-expression"
                      aria-hidden="true"
                      style={{
                        maskImage: `url("${expressions.find((expression) => expression.emoji === selectedExpression)?.image ?? ""}")`,
                        WebkitMaskImage: `url("${expressions.find((expression) => expression.emoji === selectedExpression)?.image ?? ""}")`,
                      }}
                    />
                  </button>
                  <button className="portrait-picker-button character-picker-button" type="button" aria-label="Choose character" title={`Writing as ${character.name}`} aria-expanded={showCharacterPicker} onClick={() => { setShowCharacterPicker((visible) => !visible); setShowExpressions(false); }}>👤</button>
                  <button
                    className="portrait-picker-button expression-picker-button"
                    type="button"
                    aria-label="Choose expression"
                    title={`Expression: ${selectedExpression}`}
                    aria-expanded={showExpressions}
                    onClick={() => {
                      setShowExpressions((visible) => !visible);
                      setShowCharacterPicker(false);
                    }}
                  >
                    <span
                      className="expression-image"
                      style={{
                        maskImage: `url("${expressions.find(
                          (expression) => expression.emoji === selectedExpression
                        )?.image}")`,
                        WebkitMaskImage: `url("${expressions.find(
                          (expression) => expression.emoji === selectedExpression
                        )?.image}")`,
                      }}
                      aria-hidden="true"
                    />
                  </button>
                </div>
                {showCharacterPicker && <div className="portrait-popover character-picker-popover">
                  <span className="portrait-popover-label">WRITING AS</span>
                  <select id="character-select" className="character-select" aria-label="Choose character" value={selectedCharacter} onChange={(event) => { setSelectedCharacter(event.target.value); setShowCharacterPicker(false); }}>{characters.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select>
                </div>}
                {showExpressions && <div className="portrait-popover expression-picker-popover">
                  <span className="portrait-popover-label">EXPRESSION</span>
                  <div className="expression-grid" aria-label="Choose character expression">
                    {expressions.map((expression) => (
                      <button
                        key={expression.emoji}
                        type="button"
                        className={`expression-button ${
                          selectedExpression === expression.emoji ? "active" : ""
                        }`}
                        title={`Use expression ${expression.label}`}
                        aria-label={`Use expression ${expression.label}`}
                        aria-pressed={selectedExpression === expression.emoji}
                        onClick={() => {
                          setSelectedExpression(expression.emoji);
                          setShowExpressions(false);
                        }}
                      >
                        <span
                          className="expression-image"
                          style={{
                            maskImage: `url("${expression.image}")`,
                            WebkitMaskImage: `url("${expression.image}")`,
                          }}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                                  </div>}
              </aside>

              <form className="composer" onSubmit={sendMessage}>
                <div className="composer-tools">
                  <div className="composer-role-switch" role="group" aria-label="Passage type">
                    <button
                      type="button"
                      className={`role-switch-option ${selectedRole === "Narration" ? "active" : ""}`}
                      aria-pressed={selectedRole === "Narration"}
                      onClick={() => setSelectedRole("Narration")}
                      title="Switch to narration"
                    >
                      <span className="role-switch-icon" aria-hidden="true">¶</span>
                      <span>Narration</span>
                    </button>
                    <button
                      type="button"
                      className={`role-switch-option ${selectedRole === "Dialogue" ? "active" : ""}`}
                      aria-pressed={selectedRole === "Dialogue"}
                      onClick={() => setSelectedRole("Dialogue")}
                      title="Switch to dialogue"
                    >
                      {/* Adapted from OpenMoji Speech Balloon (U+1F4AC), CC BY-SA 4.0: https://openmoji.org/ */}
                      <span className="role-switch-icon role-switch-openmoji" aria-hidden="true">
                        <svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
                          <path d="M31.54 58.56c1.442.2858 2.93.4391 4.455.4391 12.68 0 23-10.32 23-23s-10.32-23-23-23-23 10.32-23 23c0 4.913 1.552 9.467 4.187 13.21M16.18 49.21c-1.1 2.5-2.8 4.4-5.1 5.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="26.79" cy="36" r="2" fill="currentColor" />
                          <circle cx="36" cy="36" r="2" fill="currentColor" />
                          <circle cx="45.21" cy="36" r="2" fill="currentColor" />
                        </svg>
                      </span>
                      <span>Dialogue</span>
                    </button>
                  </div>
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
                <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label={editingMessageId !== null ? "Edit roleplay message" : "Write a roleplay message"} aria-multiline="true" data-placeholder={editingMessageId !== null ? "Edit your passage..." : "Write your next passage..."} onInput={(event) => setDraftHtml(event.currentTarget.innerHTML)} onKeyDown={(event) => { if (event.key === "ArrowUp" && !(event.currentTarget.innerText ?? "").trim()) { const latestMessage = messages[messages.length - 1]; if (latestMessage) { event.preventDefault(); beginEditingMessage(latestMessage); } return; } if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.closest("form")?.requestSubmit(); } }} />
                <div className="composer-bottom"><span className="composer-hint">{editingMessageId !== null ? <>Editing message <span>·</span> <kbd>Enter</kbd> to save</> : <><kbd>Enter</kbd> to send <span>·</span> <kbd>Shift + Enter</kbd> for a new line <span>·</span> <kbd>↑</kbd> to edit latest</>}</span>{editingMessageId !== null && <button className="cancel-edit-button" type="button" onClick={cancelEditingMessage}>Cancel</button>}<button className="send-button" type="submit" disabled={!draftHtml.replace(/<[^>]*>/g, "").trim()}>{editingMessageId !== null ? "Save changes" : "Send passage"} <span>↑</span></button></div>
              </form>
            </div>
            <p className="composer-footnote">Your story, your pace. Take it one passage at a time.</p>
          </footer>
        </section>
            </div>
      {showAvatarPreview && (
        <div
          className="avatar-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAvatarPreview(false);
          }}
        >
          <section
            className={`avatar-preview-card avatar-preview-${character.avatar}`}
            role="dialog"
            aria-modal="true"
            aria-label={`${character.name} avatar preview`}
            style={{
              transform: `perspective(1100px) rotateX(${avatarTilt.x}deg) rotateY(${avatarTilt.y}deg)`,
              "--shine-x": `${avatarTilt.shineX}%`,
              "--shine-y": `${avatarTilt.shineY}%`,
            } as React.CSSProperties}
            onMouseMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / bounds.width;
              const y = (event.clientY - bounds.top) / bounds.height;
              setAvatarTilt({ x: (0.5 - y) * 18, y: (x - 0.5) * 18, shineX: x * 100, shineY: y * 100 });
            }}
            onMouseLeave={() => setAvatarTilt({ x: 0, y: 0, shineX: 50, shineY: 35 })}
          >
            <button
              className="avatar-preview-close"
              type="button"
              aria-label="Close avatar preview"
              title="Close"
              onClick={() => setShowAvatarPreview(false)}
            >×</button>
            <div className="avatar-preview-card-inner">
              <div className="avatar-preview-topline">BOREALIS · CHARACTER FILE</div>
              <div className="avatar-preview-art">
                <div className="avatar-preview-orbit avatar-preview-orbit-one" />
                <div className="avatar-preview-orbit avatar-preview-orbit-two" />
                {character.name === "Keira" ? (
                  <img className="avatar-preview-image" src={avatarPlaceholder} alt="Keira" />
                ) : (
                  <span className="avatar-preview-initials">{character.initials}</span>
                )}
                <span
                  className="avatar-preview-expression"
                  aria-label={expressions.find((expression) => expression.emoji === selectedExpression)?.label ?? "Character expression"}
                  style={{
                    maskImage: `url("${expressions.find((expression) => expression.emoji === selectedExpression)?.image ?? ""}")`,
                    WebkitMaskImage: `url("${expressions.find((expression) => expression.emoji === selectedExpression)?.image ?? ""}")`,
                  }}
                />
              </div>
              <div className="avatar-preview-details">
                <h2>{character.name}</h2>
              </div>
              <div className="avatar-preview-footer"><span>BRD</span><span>HOLOGRAPHIC EDITION</span></div>
            </div>
          </section>
        </div>
      )}
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
