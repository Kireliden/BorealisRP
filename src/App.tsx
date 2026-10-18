import { useEffect, useRef, useState, type FormEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { usePreferences } from "./preferences/PreferencesContext";
import ProfileModal from "./profile/ProfileModal";
import { profileMediaSource } from "./profile/profileMedia";
import "./themes/themes.css";
import "./App.css";
import "./composer/Composer.css";
import "./composer/AvatarComp.css";
import SettingsModal from "./settings/SettingsModal";
import CollectionsModal from "./collection/CollectionModal";
import PotatoEgg from "./easter-eggs/PotatoEgg";
import NudgeEgg from "./easter-eggs/NudgeEgg";
import { Cog, Trophy, MoreHorizontal, Pencil, ArrowLeftRight, Trash2, Share2, Broom, Folder, FolderPlus, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { expressions, defaultExpression } from "./composer/expressions";
import avatarPlaceholder from "./assets/Avatar_placeholder.png";
import WorkspaceManagerModal from "./workspace/WorkspaceManagerModal";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import type { WorkspaceInfo } from "./workspace/workspaceTypes";
import { loadWorkspaceContent, saveWorkspaceContent, type WorkspaceContent, type WorkspaceMessage, type WorkspaceScene, type WorkspaceFolder } from "./workspace/workspaceContent";
import { clearLastWorkspacePath, getLastWorkspacePath, inspectWorkspace, rememberLastWorkspacePath } from "./workspace/workspaceStorage";
import "./popup-motion.css";

const appWindow = getCurrentWindow();

type Role = "Narration" | "Dialogue";
type Character = { name: string; initials: string; avatar: string; description: string; avatarAssetPath?: string | null };
type AvatarPreviewCharacter = Character & { expression?: string };
type Message = WorkspaceMessage;

const characters: Character[] = [
  { name: "Keira", initials: "KR", avatar: "mauve", description: "Neon Requiem · Main character" },
  { name: "You", initials: "Y", avatar: "blue", description: "Write as yourself" },
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
  const [scenes, setScenes] = useState<WorkspaceScene[]>([]);
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [isScenesCollapsed, setIsScenesCollapsed] = useState(false);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [scenePendingDeletion, setScenePendingDeletion] = useState<WorkspaceScene | null>(null);
  const [folderPendingDeletion, setFolderPendingDeletion] = useState<WorkspaceFolder | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [draftHtml, setDraftHtml] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [openMessageActionsId, setOpenMessageActionsId] = useState<number | null>(null);
  const [isSceneOptionsOpen, setIsSceneOptionsOpen] = useState(false);
  const [cleanConfirmationStep, setCleanConfirmationStep] = useState<1 | 2 | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState("Keira");
  const [selectedRole, setSelectedRole] = useState<Role>("Narration");
  const [selectedExpression, setSelectedExpression] = useState<string>(defaultExpression.emoji);
  const [showExpressions, setShowExpressions] = useState(false);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [avatarPreviewCharacter, setAvatarPreviewCharacter] = useState<AvatarPreviewCharacter | null>(null);
  const [avatarTilt, setAvatarTilt] = useState({ x: 0, y: 0, shineX: 50, shineY: 35 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [enteringMessageId, setEnteringMessageId] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const characterPanelRef = useRef<HTMLElement>(null);
  const conversationRef = useRef<HTMLElement>(null);
  const previousMessageCountRef = useRef(messages.length);
  const [isAtLatestMessage, setIsAtLatestMessage] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialCategory, setSettingsInitialCategory] = useState<"appearance" | "accessibility" | "themes" | "profile" | "chat" | "characters" | "roleplay" | "editor" | "data">("appearance");
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { preferences, updatePreferences } = usePreferences();
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>(null);
  const [workspaceRestoreComplete, setWorkspaceRestoreComplete] = useState(false);
  const workspaceSelectionMadeRef = useRef(false);

  const selectedCharacterBase = characters.find((item) => item.name === selectedCharacter) ?? characters[0];
  // "You" always uses the saved user profile portrait (including animated GIFs).
  // Character portraits will be managed through the dedicated character workflow later.
  const character: Character = {
    ...selectedCharacterBase,
    avatarAssetPath: selectedCharacter === "You" ? preferences.profile.avatarAssetPath : null,
  };
  const previewCharacter = avatarPreviewCharacter ?? character;
  const previewExpression = avatarPreviewCharacter?.expression ?? selectedExpression;
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? null;

  // Restore the last active workspace once, before persisting later selections.
  useEffect(() => {
    let cancelled = false;

    async function restoreLastWorkspace() {
      let savedPath: string | null = null;
      try {
        savedPath = await getLastWorkspacePath();
        if (savedPath) {
          const workspace = await inspectWorkspace(savedPath);
          if (!cancelled && !workspaceSelectionMadeRef.current) {
            setActiveWorkspace(workspace);
          }
        }
      } catch (reason) {
        if (savedPath) {
          try { await clearLastWorkspacePath(); } catch { /* Best effort: allow manual selection. */ }
          if (!cancelled && !workspaceSelectionMadeRef.current) {
            setWorkspaceError("Your last workspace could not be opened. Please choose a workspace or create a new one.");
            setIsWorkspaceManagerOpen(true);
          }
        }
      } finally {
        if (!cancelled) setWorkspaceRestoreComplete(true);
      }
    }

    void restoreLastWorkspace();
    return () => { cancelled = true; };
  }, []);

  // Store the active path only after restoration has finished, so the initial
  // empty state cannot overwrite the path we're trying to restore.
  useEffect(() => {
    if (!workspaceRestoreComplete) return;
    if (!activeWorkspace) return;
    void rememberLastWorkspacePath(activeWorkspace.path).catch((reason: unknown) => {
      console.error("Could not remember the active workspace:", reason);
    });
  }, [activeWorkspace?.path, workspaceRestoreComplete]);

  useEffect(() => {
    let cancelled = false;
    setWorkspaceError("");
    setDraftHtml("");
    setEditingMessageId(null);
    if (!activeWorkspace) {
      setScenes([]);
      setFolders([]);
      setExpandedFolderIds([]);
      setActiveFolderId(null);
      setActiveSceneId(null);
      setMessages([]);
      setWorkspaceLoading(false);
      return;
    }

    setWorkspaceLoading(true);
    setScenes([]);
    setFolders([]);
    setExpandedFolderIds([]);
    setActiveFolderId(null);
    setActiveSceneId(null);
    setMessages([]);
    loadWorkspaceContent(activeWorkspace.path)
      .then((content) => {
        if (cancelled) return;
        const validScenes = Array.isArray(content.scenes) ? content.scenes : [];
        setScenes(validScenes);
        const validFolders = Array.isArray(content.folders) ? content.folders : [];
        setFolders(validFolders);
        setExpandedFolderIds(validFolders.map((folder) => folder.id));
        setActiveFolderId(null);
        setActiveSceneId(validScenes[0]?.id ?? null);
        setMessages(validScenes[0]?.messages ?? []);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!cancelled) setWorkspaceLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeWorkspace?.path]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, []);

  useEffect(() => {
    if (!isSceneOptionsOpen) return;
    function closeSceneOptions(event: PointerEvent) {
      if (!(event.target as Element | null)?.closest(".scene-options-menu")) setIsSceneOptionsOpen(false);
    }
    function closeSceneOptionsOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsSceneOptionsOpen(false);
    }
    document.addEventListener("pointerdown", closeSceneOptions);
    window.addEventListener("keydown", closeSceneOptionsOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeSceneOptions);
      window.removeEventListener("keydown", closeSceneOptionsOnEscape);
    };
  }, [isSceneOptionsOpen]);

  useEffect(() => {
    if (openMessageActionsId === null) return;
    function closeMessageActions(event: PointerEvent) {
      if (!(event.target as Element | null)?.closest(".message-actions")) {
        setOpenMessageActionsId(null);
      }
    }
    function closeMessageActionsOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMessageActionsId(null);
    }
    document.addEventListener("pointerdown", closeMessageActions);
    window.addEventListener("keydown", closeMessageActionsOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMessageActions);
      window.removeEventListener("keydown", closeMessageActionsOnEscape);
    };
  }, [openMessageActionsId]);

  useEffect(() => {
    if (!showCharacterPicker && !showExpressions) return;

    function handlePopoverPointerDown(event: PointerEvent) {
      if (!characterPanelRef.current?.contains(event.target as Node)) {
        setShowCharacterPicker(false);
        setShowExpressions(false);
      }
    }

    function handlePopoverKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowCharacterPicker(false);
        setShowExpressions(false);
      }
    }

    document.addEventListener("pointerdown", handlePopoverPointerDown);
    window.addEventListener("keydown", handlePopoverKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePopoverPointerDown);
      window.removeEventListener("keydown", handlePopoverKeyDown);
    };
  }, [showCharacterPicker, showExpressions]);

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
    let stopResize: (() => void) | undefined;
    let cancelled = false;
    void appWindow.isMaximized().then((value) => { if (!cancelled) setIsMaximized(value); }).catch((error) => console.warn("Could not check maximised state:", error));
    void appWindow.onResized(() => {
      void appWindow.isMaximized().then((value) => { if (!cancelled) setIsMaximized(value); }).catch(() => undefined);
    }).then((unlisten) => { if (cancelled) unlisten(); else stopResize = unlisten; });
    return () => { cancelled = true; stopResize?.(); };
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

  function canDeleteMessage(message: Message) {
    if (typeof message.sentAt !== "number") return false;
    const age = Date.now() - message.sentAt;
    return age >= 0 && age <= 24 * 60 * 60 * 1000;
  }

  async function changeMessageRole(message: Message) {
    const nextMessages = messages.map((item) =>
      item.id === message.id
        ? { ...item, role: item.role === "Narration" ? "Dialogue" as const : "Narration" as const }
        : item,
    );
    setOpenMessageActionsId(null);
    await persistSceneMessages(nextMessages);
  }

  async function deleteMessage(message: Message) {
    if (!canDeleteMessage(message)) return;
    const confirmed = window.confirm("Delete this message? This cannot be undone.");
    if (!confirmed) return;
    const nextMessages = messages.filter((item) => item.id !== message.id);
    setOpenMessageActionsId(null);
    if (editingMessageId === message.id) cancelEditingMessage();
    await persistSceneMessages(nextMessages);
  }

  function requestCleanConversation() {
    if (!activeWorkspace || !activeSceneId || workspaceLoading || !activeScene || !messages.length) return;
    setIsSceneOptionsOpen(false);
    setCleanConfirmationStep(1);
  }

  async function confirmCleanConversation() {
    if (cleanConfirmationStep === 1) {
      setCleanConfirmationStep(2);
      return;
    }
    if (cleanConfirmationStep !== 2 || !activeWorkspace || !activeSceneId || workspaceLoading || !activeScene) return;
    setCleanConfirmationStep(null);
    setOpenMessageActionsId(null);
    cancelEditingMessage();
    setHasNewMessages(false);
    setIsAtLatestMessage(true);
    await persistSceneMessages([]);
  }

  async function persistSceneMessages(nextMessages: Message[]) {
    if (!activeWorkspace || !activeSceneId) return;
    const nextScenes = scenes.map((scene) =>
      scene.id === activeSceneId ? { ...scene, messages: nextMessages } : scene,
    );
    const content: WorkspaceContent = { schemaVersion: 1, scenes: nextScenes, folders };
    setScenes(nextScenes);
    setMessages(nextMessages);
    try {
      await saveWorkspaceContent(activeWorkspace.path, content);
      setWorkspaceError("");
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function createScene() {
    if (!activeWorkspace || workspaceLoading) return;
    const name = window.prompt("Name your new scene")?.trim();
    if (!name) return;
    if (scenes.some((scene) => scene.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A scene with that name already exists in this workspace.");
      return;
    }
    const scene: WorkspaceScene = { id: crypto.randomUUID(), name, icon: "◈", messages: [], folderId: activeFolderId };
    const nextScenes = [...scenes, scene];
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders });
      setScenes(nextScenes);
      setActiveSceneId(scene.id);
      setMessages([]);
      setDraftHtml("");
      setEditingMessageId(null);
      setWorkspaceError("");
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function deleteScene(scene: WorkspaceScene) {
    if (!activeWorkspace || workspaceLoading) return;
    setScenePendingDeletion(scene);
  }

  async function confirmDeleteScene() {
    const scene = scenePendingDeletion;
    if (!scene || !activeWorkspace || workspaceLoading) return;
    const nextScenes = scenes.filter((item) => item.id !== scene.id);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders });
      setScenes(nextScenes);
      if (activeSceneId === scene.id) {
        const nextActiveScene = nextScenes[0] ?? null;
        setActiveSceneId(nextActiveScene?.id ?? null);
        setMessages(nextActiveScene?.messages ?? []);
        setDraftHtml("");
        setEditingMessageId(null);
        setOpenMessageActionsId(null);
      }
      setWorkspaceError("");
      setScenePendingDeletion(null);
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function createFolder() {
    if (!activeWorkspace || workspaceLoading) return;
    const name = folderNameDraft.trim();
    if (!name) return;
    if (folders.some((folder) => folder.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A folder with that name already exists in this roleplay space.");
      return;
    }
    const folder: WorkspaceFolder = { id: crypto.randomUUID(), name };
    const nextFolders = [...folders, folder];
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders: nextFolders });
      setFolders(nextFolders);
      setExpandedFolderIds((current) => [...current, folder.id]);
      setActiveFolderId(folder.id);
      setFolderNameDraft("");
      setIsCreatingFolder(false);
      setWorkspaceError("");
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function confirmDeleteFolder() {
    const folder = folderPendingDeletion;
    if (!folder || !activeWorkspace || workspaceLoading) return;
    const nextFolders = folders.filter((item) => item.id !== folder.id);
    const nextScenes = scenes.map((scene) => scene.folderId === folder.id ? { ...scene, folderId: null } : scene);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders: nextFolders });
      setFolders(nextFolders);
      setScenes(nextScenes);
      setExpandedFolderIds((current) => current.filter((id) => id !== folder.id));
      if (activeFolderId === folder.id) setActiveFolderId(null);
      setFolderPendingDeletion(null);
      setWorkspaceError("");
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  function selectScene(scene: WorkspaceScene) {
    setActiveSceneId(scene.id);
    setMessages(scene.messages);
    setDraftHtml("");
    setEditingMessageId(null);
    setWorkspaceError("");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !activeSceneId || workspaceLoading) return;
    const editor = editorRef.current;
    const plainText = editor?.innerText.trim() ?? "";
    if (!plainText) return;

    const source = markdownSourceFromHtml(editor?.innerHTML ?? plainText);
    const contentRoot = document.createElement("div");
    contentRoot.innerHTML = source;
    applyMarkdownToTextNodes(contentRoot);
    const content = sanitiseHtml(contentRoot.innerHTML);

    let nextMessages: Message[];
    if (editingMessageId !== null) {
      nextMessages = messages.map((message) =>
        message.id === editingMessageId
          ? { ...message, content, source, history: [...(message.history ?? []), message.content] }
          : message,
      );
      setEditingMessageId(null);
    } else {
      const newMessageId = Date.now();
      nextMessages = [
        ...messages,
        {
          id: newMessageId,
          sentAt: Date.now(),
          author: character.name,
          initials: character.initials,
          role: selectedRole,
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          content,
          source,
          avatar: character.avatar,
          expression: selectedCharacter === "You" ? "" : selectedExpression,
          avatarAssetPath: character.avatarAssetPath ?? null,
        },
      ];
    }

    await persistSceneMessages(nextMessages);
    if (editingMessageId === null) {
      const newMessageId = nextMessages[nextMessages.length - 1]?.id;
      if (typeof newMessageId === "number") {
        setEnteringMessageId(newMessageId);
        window.setTimeout(() => setEnteringMessageId((current) => current === newMessageId ? null : current), 900);
      }
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
          <WorkspaceSwitcher activeWorkspace={activeWorkspace} onSelect={(workspace) => { workspaceSelectionMadeRef.current = true; setActiveWorkspace(workspace); }} onAddNew={() => setIsWorkspaceManagerOpen(true)} />
          <div className="sidebar-section"><div className="section-heading"><span>WORKSPACE</span></div><button className="nav-item"><span className="nav-icon">▦</span>Projects<span className="nav-count">1</span></button><button className="nav-item"><span className="nav-icon">♧</span>Characters</button><button className="nav-item"><span className="nav-icon">▧</span>Resources</button></div>
          <div className={`sidebar-section scenes-section ${isScenesCollapsed ? "scenes-collapsed" : ""}`}>
            <div className="section-heading roleplay-space-heading">
              <button type="button" className="scenes-collapse-button" aria-expanded={!isScenesCollapsed} onClick={() => setIsScenesCollapsed((collapsed) => !collapsed)}>
                <span>ROLEPLAY SPACE</span>{isScenesCollapsed ? <ChevronRight size={14} className="scenes-collapse-chevron" /> : <ChevronDown size={14} className="scenes-collapse-chevron" />}
              </button>
            </div>
            {!isScenesCollapsed && <>
              <button type="button" className="project-label project-label-button" aria-expanded={!isScenesCollapsed} onClick={() => setIsScenesCollapsed(true)} disabled={!activeWorkspace}>
                <ChevronDown size={14} className="project-chevron" /><span className="project-symbol">✦</span><span className="project-label-name">{activeWorkspace?.manifest.name ?? "Choose a roleplay"}</span>
              </button>
              <div className="roleplay-tree">
                {folders.map((folder) => {
                  const folderScenes = scenes.filter((scene) => scene.folderId === folder.id);
                  const expanded = expandedFolderIds.includes(folder.id);
                  return <div className={`folder-group ${activeFolderId === folder.id ? "folder-active" : ""}`} key={folder.id}>
                    <div className="folder-row">
                      <button type="button" className="folder-expand-button" aria-label={`${expanded ? "Collapse" : "Expand"} folder ${folder.name}`} aria-expanded={expanded} onClick={() => setExpandedFolderIds((current) => expanded ? current.filter((id) => id !== folder.id) : [...current, folder.id])}>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
                      <button type="button" className="folder-select-button" onClick={() => { setActiveFolderId(folder.id); setExpandedFolderIds((current) => current.includes(folder.id) ? current : [...current, folder.id]); }}><Folder size={14} /><span>{folder.name}</span><small>{folderScenes.length}</small></button>
                      <button type="button" className="folder-delete-button" title={`Delete folder ${folder.name}`} aria-label={`Delete folder ${folder.name}`} onClick={() => setFolderPendingDeletion(folder)}><Trash2 size={13} /></button>
                    </div>
                    {expanded && <div className="folder-scenes">{folderScenes.map((scene) => <div key={scene.id} className={`scene-row ${activeSceneId === scene.id ? "selected" : ""}`}><button type="button" className="scene-item" onClick={() => selectScene(scene)}><span className="scene-icon">{scene.icon}</span><span className="scene-copy"><span className="scene-name">{scene.name}</span><span className="scene-detail">{scene.messages.length} {scene.messages.length === 1 ? "message" : "messages"}</span></span></button><button type="button" className="scene-delete-button" title={`Delete scene ${scene.name}`} aria-label={`Delete scene ${scene.name}`} disabled={!activeWorkspace || workspaceLoading} onClick={() => setScenePendingDeletion(scene)}><Trash2 size={14} /></button></div>)}</div>}
                  </div>;
                })}
                <div className="folder-group unfiled-scenes">
                  <div className="folder-row"><Folder size={14} className="unfiled-folder-icon" /><span className="unfiled-label">Scenes</span><small>{scenes.filter((scene) => !scene.folderId || !folders.some((folder) => folder.id === scene.folderId)).length}</small></div>
                  <div className="folder-scenes">{scenes.filter((scene) => !scene.folderId || !folders.some((folder) => folder.id === scene.folderId)).map((scene) => <div key={scene.id} className={`scene-row ${activeSceneId === scene.id ? "selected" : ""}`}><button type="button" className="scene-item" onClick={() => selectScene(scene)}><span className="scene-icon">{scene.icon}</span><span className="scene-copy"><span className="scene-name">{scene.name}</span><span className="scene-detail">{scene.messages.length} {scene.messages.length === 1 ? "message" : "messages"}</span></span></button><button type="button" className="scene-delete-button" title={`Delete scene ${scene.name}`} aria-label={`Delete scene ${scene.name}`} disabled={!activeWorkspace || workspaceLoading} onClick={() => setScenePendingDeletion(scene)}><Trash2 size={14} /></button></div>)}</div>
                </div>
              </div>
              <div className="scene-creation-actions">
                <button className="new-scene-button" onClick={() => void createScene()} disabled={!activeWorkspace || workspaceLoading}><span>＋</span> New scene</button>
                <button className="new-folder-button" type="button" title="Create folder" aria-label="Create folder" onClick={() => { setFolderNameDraft(""); setIsCreatingFolder(true); }} disabled={!activeWorkspace || workspaceLoading}><FolderPlus size={16} /></button>
              </div>
            </>}
          </div>
          
<div className="sidebar-spacer" />

<div className="sidebar-footer">
  <button className="sidebar-profile-trigger" type="button" onClick={() => setIsProfileOpen(true)} title="Open your profile" aria-label="Open your profile">
    <div className={`profile-avatar frame-border-${preferences.profile.frameStyle}`}>
      {profileMediaSource(preferences.profile.avatarAssetPath) ? <img src={profileMediaSource(preferences.profile.avatarAssetPath) ?? undefined} alt="" /> : <span>{preferences.profile.displayName.trim().charAt(0).toUpperCase() || "K"}</span>}
    </div>
    <div className="profile-copy">
      <span className="profile-name">{preferences.profile.displayName || "Your profile"}</span>
      <span className="profile-status">{preferences.profile.title || "Personal profile"}</span>
    </div>
  </button>

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
          <header className="topbar"><div className="breadcrumbs"><span>{activeWorkspace?.manifest.name ?? "No workspace"}</span><span className="breadcrumb-divider">/</span><span className="current-crumb">{activeScene?.name ?? "No scene selected"}</span></div><div className="topbar-actions"><span className="local-badge"><span className="status-dot" />Local mode</span><div className="scene-options-menu"><button className="icon-button" type="button" title="Scene options" aria-label="Scene options" aria-expanded={isSceneOptionsOpen} disabled={!activeScene || !activeWorkspace || workspaceLoading} onClick={() => setIsSceneOptionsOpen((open) => !open)}>⋯</button>{isSceneOptionsOpen && <div className="scene-options-popover" role="menu"><button type="button" role="menuitem" onClick={() => setIsSceneOptionsOpen(false)}><Share2 size={15} /><span>Share</span></button><div className="scene-options-divider" /><button type="button" role="menuitem" className="scene-clean-action" disabled={!activeScene || !messages.length} title={!messages.length ? "This conversation is already empty." : "Delete all messages in this scene"} onClick={requestCleanConversation}><Broom size={15} /><span>Clean conversation</span></button></div>}</div></div></header>
          <div className="scene-toolbar"><div className="scene-heading"><div className="scene-heading-icon">{activeScene?.icon ?? "◈"}</div><div><h1>{activeScene?.name ?? "Your next scene"}</h1><p>{activeWorkspace?.manifest.name ?? "Create or choose a workspace"} <span>·</span> Roleplay scene</p></div></div><div className="scene-actions"><button className="secondary-button">♡ <span>Favourite</span></button></div></div>
          <div className="demo-notice"><span className="notice-icon">i</span><span><strong>{!activeWorkspace ? "No workspace selected." : workspaceLoading ? "Loading workspace…" : workspaceError ? "Workspace issue." : !activeScene ? "No scene yet." : "Workspace saved locally."}</strong> {!activeWorkspace ? "Choose or create a workspace to begin." : workspaceLoading ? "Your workspace content is being loaded." : workspaceError ? workspaceError : !activeScene ? "Create your first scene with the New scene button." : "Messages are saved to this workspace as you send or edit them."}</span></div>

          <section ref={conversationRef} className={`conversation chat-spacing-${preferences.characterDisplayDefaults.messageSpacing}`} aria-label="Scene conversation" onScroll={handleConversationScroll}>
            {activeScene && <div className="date-divider"><span /><p>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</p><span /></div>}
            {activeScene && !messages.length && !workspaceLoading && <div className="scene-empty-state"><strong>This scene is ready.</strong><span>Your first passage will appear here.</span></div>}
            {messages.map((message) => <article className={`message ${enteringMessageId === message.id ? "message-entering" : ""} ${message.role === "Narration" ? "message-role-narration" : "message-role-dialogue"} chat-avatar-${preferences.characterDisplayDefaults.avatarSize} chat-spacing-${preferences.characterDisplayDefaults.messageSpacing} ${preferences.characterDisplayDefaults.showAvatar ? "" : "message-no-avatar"}`} key={message.id}><button type="button" className={`message-avatar message-avatar-button avatar-${message.avatar}`} aria-label={`View portrait of ${message.author}`} title={`View ${message.author} portrait`} onClick={() => { setAvatarPreviewCharacter({ name: message.author, initials: message.initials, avatar: message.avatar, description: "", avatarAssetPath: message.avatarAssetPath ?? (message.author === "You" ? preferences.profile.avatarAssetPath : null), expression: message.expression }); setAvatarTilt({ x: 0, y: 0, shineX: 50, shineY: 35 }); setShowAvatarPreview(true); }} >{(message.avatarAssetPath ?? (message.author === "You" ? preferences.profile.avatarAssetPath : null)) && profileMediaSource(message.avatarAssetPath ?? (message.author === "You" ? preferences.profile.avatarAssetPath : null)) ? <img className={message.avatarAssetPath || message.author === "You" ? "message-avatar-profile-image" : undefined} src={profileMediaSource(message.avatarAssetPath ?? (message.author === "You" ? preferences.profile.avatarAssetPath : null)) ?? undefined} alt="" /> : message.author === "Keira" ? <img src={avatarPlaceholder} alt="" /> : message.initials}</button><div className="message-body"><div className="message-meta"><strong className={message.author === "You" ? "message-author-user" : undefined}>{message.author}</strong>{message.author !== "You" && preferences.characterDisplayDefaults.showExpression && message.expression && (
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
                    )}{preferences.characterDisplayDefaults.showRoleLabel && <span className={`role-tag role-${message.role.toLowerCase()}`}>{message.role}</span>}<time>{message.time}</time></div>{message.role === "Narration" ? <div className="message-narration-block"><span className="narration-label">✦ NARRATION</span><div className="message-rich-content" dangerouslySetInnerHTML={{ __html: message.content }} /></div> : <div className="message-rich-content" dangerouslySetInnerHTML={{ __html: message.content }} />}</div><div className="message-actions">
                <button className="message-menu" type="button" title="Message actions" aria-label={`Message actions for ${message.author}`} aria-expanded={openMessageActionsId === message.id} onClick={() => setOpenMessageActionsId((current) => current === message.id ? null : message.id)}><MoreHorizontal size={17} /></button>
                {openMessageActionsId === message.id && <div className="message-actions-popover" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setOpenMessageActionsId(null); beginEditingMessage(message); }}><Pencil size={14} /><span>Edit message</span></button>
                  <button type="button" role="menuitem" onClick={() => void changeMessageRole(message)}><ArrowLeftRight size={14} /><span>Change to {message.role === "Narration" ? "dialogue" : "narration"}</span></button>
                  <button type="button" role="menuitem" className="message-delete-action" disabled={!canDeleteMessage(message)} title={!canDeleteMessage(message) ? "Messages can only be deleted within 24 hours of sending; older messages without a timestamp cannot be deleted." : "Delete message"} onClick={() => void deleteMessage(message)}><Trash2 size={14} /><span>Delete message</span>{!canDeleteMessage(message) && <small>24h limit</small>}</button>
                </div>}
              </div></article>)}
            {hasNewMessages && <button className="scroll-to-latest" type="button" onClick={scrollToLatestMessage}>↓ New messages · Jump to latest</button>}
          </section>

          <footer className="composer-area">
            <div className="composer-context"><span className="composer-context-dot" />Writing in <strong>{activeScene?.name ?? "no scene selected"}</strong></div>
            <div className="composer-layout">
              <aside className="character-panel" ref={characterPanelRef}>
                <div className={`character-portrait avatar-${character.avatar}`}>
                  <button
                    className="character-portrait-preview"
                    type="button"
                    aria-label={`View ${character.name}'s avatar`}
                    title={`View ${character.name}'s avatar`}
                    onClick={() => { setAvatarPreviewCharacter(null); setShowAvatarPreview(true); setShowCharacterPicker(false); setShowExpressions(false); }}
                  >
                    {character.avatarAssetPath ? <img className="character-portrait-image" src={profileMediaSource(character.avatarAssetPath) ?? undefined} alt="" /> : <span className="character-portrait-initials">{character.initials}</span>}
                    {selectedCharacter !== "You" && <span
                      className="character-portrait-expression"
                      aria-hidden="true"
                      style={{
                        maskImage: `url("${expressions.find((expression) => expression.emoji === selectedExpression)?.image ?? ""}")`,
                        WebkitMaskImage: `url("${expressions.find((expression) => expression.emoji === selectedExpression)?.image ?? ""}")`,
                      }}
                    />}
                  </button>
                  <button className="portrait-picker-button character-picker-button" type="button" aria-label="Choose character" title={`Writing as ${character.name}`} aria-expanded={showCharacterPicker} onClick={() => { setShowCharacterPicker((visible) => !visible); setShowExpressions(false); }}>👤</button>
                  {selectedCharacter !== "You" && <button
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
                  </button>}
                </div>
                {showCharacterPicker && <div className="portrait-popover character-picker-popover">
                  <span className="portrait-popover-label">WRITING AS</span>
                  <select id="character-select" className="character-select" aria-label="Choose character" value={selectedCharacter} onChange={(event) => { setSelectedCharacter(event.target.value); setShowExpressions(false); }}>{characters.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select>
                </div>}
                {showExpressions && selectedCharacter !== "You" && <div className="portrait-popover expression-picker-popover">
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

              <form className="composer" onSubmit={(event) => void sendMessage(event)}>
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
                <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label={editingMessageId !== null ? "Edit roleplay message" : "Write a roleplay message"} aria-multiline="true" data-placeholder={editingMessageId !== null ? "Edit your passage..." : !activeWorkspace ? "Choose a workspace first..." : !activeScene ? "Create a scene before writing..." : "Write your next passage..."} onInput={(event) => setDraftHtml(event.currentTarget.innerHTML)} onKeyDown={(event) => { if (!activeWorkspace || !activeSceneId || workspaceLoading) return; if (event.key === "ArrowUp" && !(event.currentTarget.innerText ?? "").trim()) { const latestMessage = messages[messages.length - 1]; if (latestMessage) { event.preventDefault(); beginEditingMessage(latestMessage); } return; } if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.closest("form")?.requestSubmit(); } }} />
                <div className="composer-bottom"><span className="composer-hint">{editingMessageId !== null ? <>Editing message <span>·</span> <kbd>Enter</kbd> to save</> : <><kbd>Enter</kbd> to send <span>·</span> <kbd>Shift + Enter</kbd> for a new line <span>·</span> <kbd>↑</kbd> to edit latest</>}</span>{editingMessageId !== null && <button className="cancel-edit-button" type="button" onClick={cancelEditingMessage}>Cancel</button>}<button className="send-button" type="submit" disabled={!activeWorkspace || !activeSceneId || workspaceLoading || !draftHtml.replace(/<[^>]*>/g, "").trim()}>{editingMessageId !== null ? "Save changes" : "Send passage"} <span>↑</span></button></div>
              </form>
            </div>
            <p className="composer-footnote">Your story, your pace. Take it one passage at a time.</p>
          </footer>
        </section>
            </div>
      {scenePendingDeletion && (
        <div className="clean-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setScenePendingDeletion(null); }}>
          <section className="clean-confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-scene-title" aria-describedby="delete-scene-description">
            <div className="clean-confirmation-icon"><AlertTriangle size={21} /></div>
            <span className="clean-confirmation-eyebrow">ROLEPLAY SPACE · DELETE SCENE</span>
            <h2 id="delete-scene-title">Delete “{scenePendingDeletion.name}”?</h2>
            <p id="delete-scene-description">This permanently deletes the scene and all {scenePendingDeletion.messages.length} message(s) inside it. This action cannot be undone.</p>
            <div className="clean-confirmation-actions">
              <button type="button" className="clean-cancel-button" onClick={() => setScenePendingDeletion(null)}>Cancel</button>
              <button type="button" className="clean-continue-button" onClick={() => void confirmDeleteScene()}>Delete scene</button>
            </div>
          </section>
        </div>
      )}
      {folderPendingDeletion && (
        <div className="clean-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFolderPendingDeletion(null); }}>
          <section className="clean-confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-folder-title" aria-describedby="delete-folder-description">
            <div className="clean-confirmation-icon"><AlertTriangle size={21} /></div>
            <span className="clean-confirmation-eyebrow">ROLEPLAY SPACE · DELETE FOLDER</span>
            <h2 id="delete-folder-title">Delete “{folderPendingDeletion.name}”?</h2>
            <p id="delete-folder-description">The folder will be removed. Scenes inside it will be moved back to the general Scenes list; their messages will be kept.</p>
            <div className="clean-confirmation-actions">
              <button type="button" className="clean-cancel-button" onClick={() => setFolderPendingDeletion(null)}>Cancel</button>
              <button type="button" className="clean-continue-button" onClick={() => void confirmDeleteFolder()}>Delete folder</button>
            </div>
          </section>
        </div>
      )}
      {isCreatingFolder && (
        <div className="clean-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreatingFolder(false); }}>
          <form className="clean-confirmation-dialog folder-create-dialog" onSubmit={(event) => { event.preventDefault(); void createFolder(); }}>
            <div className="clean-confirmation-icon"><FolderPlus size={21} /></div>
            <span className="clean-confirmation-eyebrow">ROLEPLAY SPACE · ORGANISATION</span>
            <h2>Create a folder</h2>
            <p>Use folders for acts, arcs, chapters, or any structure that helps organise your roleplay.</p>
            <input autoFocus className="folder-name-input" value={folderNameDraft} onChange={(event) => setFolderNameDraft(event.target.value)} placeholder="e.g. Act I" aria-label="Folder name" maxLength={80} />
            <div className="clean-confirmation-actions">
              <button type="button" className="clean-cancel-button" onClick={() => setIsCreatingFolder(false)}>Cancel</button>
              <button type="submit" className="clean-continue-button" disabled={!folderNameDraft.trim()}>Create folder</button>
            </div>
          </form>
        </div>
      )}
      {cleanConfirmationStep !== null && (
        <div className="clean-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCleanConfirmationStep(null); }}>
          <section className="clean-confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="clean-confirmation-title" aria-describedby="clean-confirmation-description">
            <div className="clean-confirmation-icon"><Broom size={21} /></div>
            <span className="clean-confirmation-eyebrow">SCENE MAINTENANCE · {cleanConfirmationStep === 1 ? "STEP 1 OF 2" : "STEP 2 OF 2"}</span>
            <h2 id="clean-confirmation-title">{cleanConfirmationStep === 1 ? "Clean this conversation?" : "Are you absolutely sure?"}</h2>
            <p id="clean-confirmation-description">{cleanConfirmationStep === 1 ? `All messages in “${activeScene?.name ?? "this scene"}” will be removed. The scene and all other scenes will remain.` : "This permanently deletes every message in this scene. This action cannot be undone."}</p>
            <div className="clean-confirmation-actions">
              <button type="button" className="clean-cancel-button" onClick={() => setCleanConfirmationStep(null)}>Cancel</button>
              <button type="button" className="clean-continue-button" onClick={() => void confirmCleanConversation()}>{cleanConfirmationStep === 1 ? "Continue" : "Yes, clean conversation"}</button>
            </div>
          </section>
        </div>
      )}
      {showAvatarPreview && (
        <div
          className="avatar-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAvatarPreview(false);
          }}
        >
          <section
            className={`avatar-preview-card avatar-preview-${previewCharacter.avatar}`}
            role="dialog"
            aria-modal="true"
            aria-label={`${previewCharacter.name} avatar preview`}
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
              onClick={() => { setShowAvatarPreview(false); setAvatarPreviewCharacter(null); }}
            >×</button>
            <div className="avatar-preview-card-inner">
              <div className="avatar-preview-topline">BOREALIS · CHARACTER FILE</div>
              <div className="avatar-preview-art">
                <div className="avatar-preview-orbit avatar-preview-orbit-one" />
                <div className="avatar-preview-orbit avatar-preview-orbit-two" />
                {previewCharacter.avatarAssetPath ? (
                  <img className="avatar-preview-image profile-media-image" src={profileMediaSource(previewCharacter.avatarAssetPath) ?? undefined} alt={previewCharacter.name} />
                ) : previewCharacter.name === "Keira" ? (
                  <img className="avatar-preview-image" src={avatarPlaceholder} alt="Keira" />
                ) : (
                  <span className="avatar-preview-initials">{previewCharacter.initials}</span>
                )}
                {previewCharacter.name !== "You" && previewExpression && (
                  <span
                    className="avatar-preview-expression"
                    aria-label={expressions.find((expression) => expression.emoji === previewExpression)?.label ?? "Character expression"}
                    style={{
                      maskImage: `url("${expressions.find((expression) => expression.emoji === previewExpression)?.image ?? ""}")`,
                      WebkitMaskImage: `url("${expressions.find((expression) => expression.emoji === previewExpression)?.image ?? ""}")`,
                    }}
                  />
                )}
              </div>
              <div className="avatar-preview-details">
                <h2>{previewCharacter.name}</h2>
              </div>
              <div className="avatar-preview-footer"><span>BRD</span><span>HOLOGRAPHIC EDITION</span></div>
            </div>
          </section>
        </div>
      )}
      {isSettingsOpen && (
        <SettingsModal initialCategory={settingsInitialCategory} onClose={() => setIsSettingsOpen(false)} />
      )}
      {isCollectionsOpen && (
        <CollectionsModal onClose={() => setIsCollectionsOpen(false)} />
      )}
      {isProfileOpen && (
        <ProfileModal
          profile={preferences.profile}
          onEdit={() => {
            setIsProfileOpen(false);
            setSettingsInitialCategory("profile");
            setIsSettingsOpen(true);
          }}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
      {isWorkspaceManagerOpen && (
        <WorkspaceManagerModal
          onClose={() => setIsWorkspaceManagerOpen(false)}
          activeWorkspace={activeWorkspace}
          onSelect={(workspace: WorkspaceInfo) => { workspaceSelectionMadeRef.current = true; setActiveWorkspace(workspace); }}
        />
      )}
    </main>
  );
}

export default App;
