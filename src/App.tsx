import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { convertFileSrc } from "@tauri-apps/api/core";
import { usePreferences } from "./preferences/PreferencesContext";
import ProfileModal from "./profile/ProfileModal";
import { getSidebarAvatarThumbnailPath, profileMediaSource } from "./profile/profileMedia";
import "./themes/themes.css";
import "./App.css";
import "./composer/Composer.css";
import "./composer/AvatarComp.css";
import SettingsModal from "./settings/SettingsModal";
import CollectionsModal from "./collection/CollectionModal";
import PotatoEgg from "./easter-eggs/PotatoEgg";
import NudgeEgg from "./easter-eggs/NudgeEgg";
import { Cog, Trophy, MoreHorizontal, Pencil, ArrowLeftRight, Trash2, Share2, Broom, Folder, FolderPlus, Layers, Plus, ChevronDown, ChevronRight, AlertTriangle, GripVertical, Search } from "lucide-react";
import { expressions, defaultExpression } from "./composer/expressions";
import personSilhouette from "openmoji/black/svg/1F464.svg?url";
import avatarPlaceholder from "./assets/Avatar_placeholder.png";
import WorkspaceManagerModal from "./workspace/WorkspaceManagerModal";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import CharactersPage from "./characters/CharactersPage";
import { loadCharacters } from "./characters/characters.storage";
import { loadWorkspaceCharacters } from "./characters/workspaceCharacters.storage";
import { characterAccentColor } from "./characters/characters.types";
import { getResourceBlob } from "./resources/resources.storage";
import { getWorkspaceResourceBlob } from "./resources/workspaceResources.storage";
import { CHARACTER_EXPRESSION_SLOTS, getCharacterExpressionBlob } from "./characters/characterExpressions.storage";
import { ensureWorkspaceCharacterExpressions, getWorkspaceCharacterExpressionBlob } from "./characters/workspaceCharacterExpressions.storage";
import CharacterPortraitArt from "./characters/CharacterPortraitArt";
import EffectLayer from "./effects/components/EffectLayer";
import EmojiPicker from "./composer/EmojiPicker";
import ResourcesPage from "./resources/ResourcesPage";
import GlobalSearch from "./GlobalSearch";
import type { WorkspaceInfo } from "./workspace/workspaceTypes";
import { loadWorkspaceContent, saveWorkspaceContent, type WorkspaceContent, type WorkspaceMessage, type WorkspaceScene, type WorkspaceFolder, type WorkspaceCategory } from "./workspace/workspaceContent";
import { clearLastWorkspacePath, getLastWorkspacePath, inspectWorkspace, rememberLastWorkspacePath } from "./workspace/workspaceStorage";
import { loadWorkspaceDraft, saveWorkspaceDraft } from "./workspace/workspaceDrafts.storage";
import "./popup-motion.css";

const appWindow = getCurrentWindow();

type Role = "Narration" | "Dialogue";
type Character = { id?: string; name: string; initials: string; avatar: string; description: string; avatarAssetPath?: string | null; portraitResourceId?: string | null; portraitFit?: "cover" | "contain"; portraitPositionX?: number; portraitPositionY?: number; portraitZoom?: number };
type AvatarPreviewCharacter = Character & { expression?: string };
type Message = WorkspaceMessage;

function charactersFromLibrary(): Character[] {
  const libraryCharacters = loadCharacters().map((item) => ({
    id: item.id,
    name: item.name,
    initials: item.initials,
    avatar: characterAccentColor(item.accent),
    description: item.subtitle || item.description,
    avatarAssetPath: null,
    portraitResourceId: item.portraitResourceId,
    portraitFit: item.portraitFit ?? "cover",
    portraitPositionX: item.portraitPositionX ?? 50,
    portraitPositionY: item.portraitPositionY ?? 50,
    portraitZoom: item.portraitZoom ?? 100,
  }));
  return [...libraryCharacters, { name: "You", initials: "Y", avatar: "blue", description: "Write as yourself" }];
}

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

    if (tag === "IMG" && source.classList.contains("message-openmoji-emoji")) {
      const image = document.createElement("img");
      image.src = source.getAttribute("src") ?? "";
      image.alt = source.getAttribute("alt") ?? "";
      image.title = source.getAttribute("title") ?? "";
      image.className = "message-openmoji-emoji";
      image.setAttribute("contenteditable", "false");
      return [image];
    }

    if (tag === "SPAN" && source.classList.contains("message-openmoji-linework")) {
      const linework = document.createElement("span");
      const src = source.getAttribute("data-openmoji-src") ?? "";
      linework.setAttribute("data-openmoji-src", src);
      linework.style.maskImage = `url("${src}")`;
      linework.style.webkitMaskImage = `url("${src}")`;
      linework.setAttribute("aria-label", source.getAttribute("aria-label") ?? "");
      linework.title = source.title;
      linework.className = "message-openmoji-linework";
      linework.setAttribute("contenteditable", "false");
      return [linework];
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
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "S", "DEL", "CODE", "SPAN", "BR", "DIV", "P", "IMG"]);
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

    if (source.tagName === "IMG" && source.classList.contains("message-openmoji-emoji")) {
      const src = source.getAttribute("src") ?? "";
      if (!/^(?:\.\/|\/)?assets\/[\w.-]+\.svg(?:\?.*)?$/.test(src)) return [];
      const image = document.createElement("img");
      image.src = src;
      image.alt = source.getAttribute("alt") ?? "";
      image.title = source.getAttribute("title") ?? "";
      image.className = "message-openmoji-emoji message-openmoji-color";
      image.setAttribute("contenteditable", "false");
      return [image];
    }

    if (source.tagName === "SPAN" && source.classList.contains("message-openmoji-linework")) {
      const src = source.getAttribute("data-openmoji-src") ?? "";
      if (!/^(?:\.\/|\/)?assets\/[\w.-]+\.svg(?:\?.*)?$/.test(src)) return [];
      const linework = document.createElement("span");
      linework.setAttribute("data-openmoji-src", src);
      linework.style.maskImage = `url("${src}")`;
      linework.style.webkitMaskImage = `url("${src}")`;
      linework.setAttribute("aria-label", source.getAttribute("aria-label") ?? "");
      linework.title = source.title;
      linework.className = "message-openmoji-linework";
      linework.setAttribute("contenteditable", "false");
      return [linework];
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
  const [sidebarAvatarThumbnailUrl, setSidebarAvatarThumbnailUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const applyThumbnail = (path: string) => setSidebarAvatarThumbnailUrl(path ? `${convertFileSrc(path)}?v=${Date.now()}` : null);
    void getSidebarAvatarThumbnailPath().then((path) => { if (!cancelled) applyThumbnail(path); }).catch(() => { if (!cancelled) setSidebarAvatarThumbnailUrl(null); });
    const handleThumbnailUpdate = (event: Event) => applyThumbnail((event as CustomEvent<string>).detail);
    window.addEventListener("brd-sidebar-avatar-thumbnail-updated", handleThumbnailUpdate);
    return () => { cancelled = true; window.removeEventListener("brd-sidebar-avatar-thumbnail-updated", handleThumbnailUpdate); };
  }, []);
  const [scenes, setScenes] = useState<WorkspaceScene[]>([]);
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [categories, setCategories] = useState<WorkspaceCategory[]>([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryNameDraft, setCategoryNameDraft] = useState("");
  const [isCreatingScene, setIsCreatingScene] = useState(false);
  const [sceneNameDraft, setSceneNameDraft] = useState("");
  const [draggingNode, setDraggingNode] = useState<{ type: "scene" | "folder" | "category"; id: string } | null>(null);
  const pointerDragRef = useRef<{ type: "scene" | "folder" | "category"; id: string; startX: number; startY: number; active: boolean } | null>(null);
  const [pendingSceneMoveId, setPendingSceneMoveId] = useState<string | null>(null);
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = pointerDragRef.current;
      if (!drag) return;
      if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 5) {
        drag.active = true;
        setDraggingNode({ type: drag.type, id: drag.id });
        if (drag.type === "scene") setDraggingSceneId(drag.id);
      }
      if (drag.active) {
        event.preventDefault();
        document.querySelectorAll(".drag-over-target").forEach((element) => element.classList.remove("drag-over-target"));
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-drop-type]");
        if (target && !(target.dataset.dropType === drag.type && target.dataset.dropId === drag.id)) {
          target.classList.add("drag-over-target");
        }
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      const drag = pointerDragRef.current;
      pointerDragRef.current = null;
      document.querySelectorAll(".drag-over-target").forEach((element) => element.classList.remove("drag-over-target"));
      if (!drag) return;
      if (drag.active) {
        event.preventDefault();
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-drop-type]");
        const dropType = target?.dataset.dropType;
        const targetId = target?.dataset.dropId ?? null;
        if (drag.type === "category" && dropType === "category" && targetId) {
          void reorderCategories(drag.id, targetId);
        } else if (drag.type === "folder") {
          if (dropType === "category" && targetId) void moveFolder(drag.id, targetId);
          else if (dropType === "folder" && targetId) {
            const targetFolder = folders.find((folder) => folder.id === targetId);
            if (targetFolder) void reorderFolders(drag.id, targetId, targetFolder.categoryId ?? null);
          } else if (dropType === "tree") void moveFolder(drag.id, null);
        } else if (drag.type === "scene") {
          if (dropType === "scene" && targetId) void reorderScenes(drag.id, targetId);
          else if (dropType === "folder" && targetId) void moveSceneToFolder(drag.id, targetId);
          else if (dropType === "category" && targetId) {
            const firstFolder = folders.find((folder) => (folder.categoryId ?? null) === targetId);
            if (firstFolder) void moveSceneToFolder(drag.id, firstFolder.id);
            else {
              setActiveCategoryId(targetId);
              setPendingSceneMoveId(drag.id);
              setFolderNameDraft(`Scenes ${folders.length + 1}`);
              setIsCreatingFolder(true);
            }
          } else if (dropType === "unfiled" || dropType === "tree") void moveSceneToFolder(drag.id, null);
        }
      }
      setDraggingNode(null);
      setDraggingSceneId(null);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  });

  const [isScenesCollapsed, setIsScenesCollapsed] = useState(false);
  const [isUnfiledScenesCollapsed, setIsUnfiledScenesCollapsed] = useState(false);
  const [draggingSceneId, setDraggingSceneId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [scenePendingDeletion, setScenePendingDeletion] = useState<WorkspaceScene | null>(null);
  const [folderPendingDeletion, setFolderPendingDeletion] = useState<WorkspaceFolder | null>(null);
  const [categoryPendingDeletion, setCategoryPendingDeletion] = useState<WorkspaceCategory | null>(null);
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
  const [characters, setCharacters] = useState<Character[]>(charactersFromLibrary);


  const [selectedCharacter, setSelectedCharacter] = useState("Keira");
  const [selectedRole, setSelectedRole] = useState<Role>("Narration");
  const [selectedExpression, setSelectedExpression] = useState<string>(defaultExpression.emoji);
  const [customExpressionUrls, setCustomExpressionUrls] = useState<Record<string, string>>({});
  const [showExpressions, setShowExpressions] = useState(false);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [avatarPreviewCharacter, setAvatarPreviewCharacter] = useState<AvatarPreviewCharacter | null>(null);
  const [avatarTilt, setAvatarTilt] = useState({ x: 0, y: 0, shineX: 50, shineY: 35 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(272);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [enteringMessageId, setEnteringMessageId] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftLoadRequestRef = useRef(0);
  const characterPanelRef = useRef<HTMLElement>(null);
  const conversationRef = useRef<HTMLElement>(null);
  const previousMessageCountRef = useRef(messages.length);
  const [isAtLatestMessage, setIsAtLatestMessage] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialCategory, setSettingsInitialCategory] = useState<"appearance" | "accessibility" | "themes" | "profile" | "chat" | "characters" | "roleplay" | "editor" | "data">("appearance");
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { preferences } = usePreferences();


  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [activeLibraryPage, setActiveLibraryPage] = useState<"projects" | "characters" | "resources" | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>(null);
  const [workspaceRestoreComplete, setWorkspaceRestoreComplete] = useState(false);
  const workspaceSelectionMadeRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let activeUrls: string[] = [];
    async function loadCustomExpressions() {
      const urls: Record<string, string> = {};
      try {
        const libraryCharacterIds = activeWorkspace
          ? (await loadWorkspaceCharacters(activeWorkspace.path)).map((item) => item.id)
          : loadCharacters().map((item) => item.id);
        if (activeWorkspace) {
          await ensureWorkspaceCharacterExpressions(activeWorkspace.path, libraryCharacterIds);
        }
        await Promise.all(libraryCharacterIds.map(async (characterId) => {
          await Promise.all(CHARACTER_EXPRESSION_SLOTS.map(async (slot, index) => {
            const blob = await (activeWorkspace ? getWorkspaceCharacterExpressionBlob(activeWorkspace.path, characterId, slot.key) : getCharacterExpressionBlob(characterId, slot.key)).catch(() => null);
            if (blob) urls[`${characterId}:${expressions[index].emoji}`] = URL.createObjectURL(blob);
          }));
        }));
        if (cancelled) {
          Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        activeUrls.forEach((url) => URL.revokeObjectURL(url));
        activeUrls = Object.values(urls);
        setCustomExpressionUrls(urls);
      } catch (reason) {
        Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
        console.error("Could not load custom character expressions.", reason);
      }
    }
    const refreshExpressions = () => { void loadCustomExpressions(); };
    window.addEventListener("brd-character-expressions-updated", refreshExpressions);
    void loadCustomExpressions();
    return () => {
      cancelled = true;
      window.removeEventListener("brd-character-expressions-updated", refreshExpressions);
      activeUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [activeWorkspace?.path]);

  useEffect(() => {
    let cancelled = false;
    const loadCast = async () => {
      const library = activeWorkspace
        ? await loadWorkspaceCharacters(activeWorkspace.path)
        : loadCharacters();
      if (cancelled) return;
      const refreshed: Character[] = [
        ...library.map((item) => ({
          id: item.id,
          name: item.name,
          initials: item.initials,
          avatar: characterAccentColor(item.accent),
          description: item.subtitle || item.description,
          avatarAssetPath: null,
          portraitResourceId: item.portraitResourceId,
          portraitFit: item.portraitFit ?? "cover" as const,
          portraitPositionX: item.portraitPositionX ?? 50,
          portraitPositionY: item.portraitPositionY ?? 50,
          portraitZoom: item.portraitZoom ?? 100,
        })),
        { name: "You", initials: "Y", avatar: "blue", description: "Write as yourself" },
      ];
      setCharacters(refreshed);
      if (!refreshed.some((item) => item.name === selectedCharacter)) {
        setSelectedCharacter(refreshed[0]?.name ?? "You");
      }
    };
    void loadCast().catch((reason) => {
      if (!cancelled) console.error("Could not load workspace characters:", reason);
    });
    return () => { cancelled = true; };
  }, [activeWorkspace?.path]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = sidebarResizeRef.current;
      if (!drag) return;
      const nextWidth = Math.min(420, Math.max(220, drag.startWidth + event.clientX - drag.startX));
      setSidebarWidth(nextWidth);
    };
    const onPointerUp = () => {
      if (!sidebarResizeRef.current) return;
      sidebarResizeRef.current = null;
      document.body.classList.remove("sidebar-resizing");
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.body.classList.remove("sidebar-resizing");
    };
  }, []);

  useEffect(() => { if (!characters.some((item) => item.name === selectedCharacter)) setSelectedCharacter(characters[0]?.name ?? "You"); }, [characters, selectedCharacter]);
  const selectedCharacterBase = characters.find((item) => item.name === selectedCharacter) ?? characters[0];
  const [characterPortraitUrls, setCharacterPortraitUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const portraitIds = [...new Set(characters.map((item) => item.portraitResourceId).filter((id): id is string => Boolean(id)))];
    void Promise.all(portraitIds.map(async (id) => {
      try {
        const blob = activeWorkspace
          ? await getWorkspaceResourceBlob(activeWorkspace.path, id)
          : await getResourceBlob(id);
        if (!blob || cancelled) return [id, ""] as const;
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        return [id, url] as const;
      } catch {
        return [id, ""] as const;
      }
    })).then((entries) => {
      if (!cancelled) setCharacterPortraitUrls(Object.fromEntries(entries.filter(([, url]) => Boolean(url))));
    });
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [characters, activeWorkspace?.path]);
  const characterResourcePortraitUrl = selectedCharacter === "You" || !selectedCharacterBase?.portraitResourceId
    ? null
    : characterPortraitUrls[selectedCharacterBase.portraitResourceId] ?? null;
  // "You" always uses the saved user profile portrait (including animated GIFs).
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
      setCategories([]);
      setExpandedCategoryIds([]);
      setActiveCategoryId(null);
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
    setCategories([]);
    setExpandedCategoryIds([]);
    setActiveCategoryId(null);
    setExpandedFolderIds([]);
    setActiveFolderId(null);
    setActiveSceneId(null);
    setMessages([]);
    loadWorkspaceContent(activeWorkspace.path)
      .then(async (content) => {
        if (cancelled) return;
        const validScenes = Array.isArray(content.scenes) ? content.scenes : [];
        setScenes(validScenes);
        const validFolders = Array.isArray(content.folders) ? content.folders : [];
        setFolders(validFolders);
        let validCategories = Array.isArray(content.categories) ? content.categories : [];
        // The selected roleplay's name is the default root category, not a parent
        // node above another category. Promote the single provisional category
        // from the previous tree layout, or create that root category for older
        // workspaces that have not created one yet.
        if (activeWorkspace && validCategories.length === 1 && validCategories[0].name.trim().toLocaleLowerCase() === "category") {
          const rootCategory = { ...validCategories[0], name: activeWorkspace.manifest.name };
          validCategories = [rootCategory];
          const migratedFolders = validFolders.map((folder) =>
            folder.categoryId ? folder : { ...folder, categoryId: rootCategory.id },
          );
          if (migratedFolders.some((folder, index) => folder.categoryId !== validFolders[index]?.categoryId)) {
            validFolders.splice(0, validFolders.length, ...migratedFolders);
            setFolders(validFolders);
          }
          await saveWorkspaceContent(activeWorkspace.path, {
            schemaVersion: 1,
            scenes: validScenes,
            folders: validFolders,
            categories: validCategories,
          });
        }
        setCategories(validCategories);
        setExpandedCategoryIds(validCategories.map((category) => category.id));
        setExpandedFolderIds(validFolders.map((folder) => folder.id));
        setActiveFolderId(null);
        setActiveSceneId(validScenes[0]?.id ?? null);
        setMessages(validScenes[0]?.messages ?? []);
        const firstScene = validScenes[0];
        if (firstScene) {
          try {
            const savedDraft = await loadWorkspaceDraft(activeWorkspace.path, firstScene.id);
            if (!cancelled) {
              setDraftHtml(savedDraft);
              if (editorRef.current) editorRef.current.innerHTML = savedDraft;
            }
          } catch (reason) {
            if (!cancelled) setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
          }
        }
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
    const content: WorkspaceContent = { schemaVersion: 1, scenes: nextScenes, folders, categories };
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
    const name = sceneNameDraft.trim();
    if (!name) return;
    if (scenes.some((scene) => scene.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A scene with that name already exists in this workspace.");
      return;
    }
    const scene: WorkspaceScene = { id: crypto.randomUUID(), name, icon: "◈", messages: [], folderId: activeFolderId };
    const nextScenes = [...scenes, scene];
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders, categories });
      setScenes(nextScenes);
      setActiveSceneId(scene.id);
      setMessages([]);
      setDraftHtml("");
      setEditingMessageId(null);
      setWorkspaceError("");
      setSceneNameDraft("");
      setIsCreatingScene(false);
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
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders, categories });
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

  async function renameFolder(folder: WorkspaceFolder) {
    if (!activeWorkspace || workspaceLoading) return;
    const name = window.prompt("Rename folder", folder.name)?.trim();
    if (!name || name === folder.name) return;
    if (folders.some((item) => item.id !== folder.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A folder with that name already exists in this roleplay space.");
      return;
    }
    const nextFolders = folders.map((item) => item.id === folder.id ? { ...item, name } : item);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders: nextFolders, categories });
      setFolders(nextFolders);
      setWorkspaceError("");
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function renameScene(scene: WorkspaceScene) {
    if (!activeWorkspace || workspaceLoading) return;
    const name = window.prompt("Rename scene", scene.name)?.trim();
    if (!name || name === scene.name) return;
    if (scenes.some((item) => item.id !== scene.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A scene with that name already exists in this workspace.");
      return;
    }
    const nextScenes = scenes.map((item) => item.id === scene.id ? { ...item, name } : item);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders, categories });
      setScenes(nextScenes);
      setWorkspaceError("");
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function reorderScenes(draggedId: string, targetId: string) {
    if (!activeWorkspace || workspaceLoading || draggedId === targetId) return;
    const dragged = scenes.find((scene) => scene.id === draggedId);
    const target = scenes.find((scene) => scene.id === targetId);
    if (!dragged || !target) return;
    const targetFolderId = target.folderId ?? null;
    const siblings = scenes.filter((scene) => scene.id !== draggedId && (scene.folderId ?? null) === targetFolderId);
    const targetIndex = siblings.findIndex((scene) => scene.id === targetId);
    siblings.splice(Math.max(0, targetIndex), 0, { ...dragged, folderId: targetFolderId });
    const nextScenes = scenes.filter((scene) => (scene.folderId ?? null) !== targetFolderId && scene.id !== draggedId).concat(siblings);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders, categories });
      setScenes(nextScenes);
      setWorkspaceError("");
    } catch (reason) { setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function moveSceneToFolder(sceneId: string, folderId: string | null) {
    if (!activeWorkspace || workspaceLoading) return;
    const nextScenes = scenes.map((scene) => scene.id === sceneId ? { ...scene, folderId } : scene);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders, categories });
      setScenes(nextScenes);
      if (folderId) {
        setExpandedFolderIds((current) => current.includes(folderId) ? current : [...current, folderId]);
        setActiveFolderId(folderId);
      } else {
        setActiveFolderId(null);
      }
      setWorkspaceError("");
    } catch (reason) { setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function createCategory() {
    if (!activeWorkspace || workspaceLoading) return;
    const name = categoryNameDraft.trim();
    if (!name) return;
    if (categories.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A category with that name already exists in this roleplay space.");
      return;
    }
    const category: WorkspaceCategory = { id: crypto.randomUUID(), name };
    const nextCategories = [...categories, category];
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders, categories: nextCategories });
      setCategories(nextCategories);
      setExpandedCategoryIds((current) => [...current, category.id]);
      setActiveCategoryId(category.id);
      setCategoryNameDraft("");
      setIsCreatingCategory(false);
      setWorkspaceError("");
    } catch (reason) { setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function renameCategory(category: WorkspaceCategory) {
    if (!activeWorkspace || workspaceLoading) return;
    const name = window.prompt("Rename category", category.name)?.trim();
    if (!name || name === category.name) return;
    if (categories.some((item) => item.id !== category.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A category with that name already exists in this roleplay space.");
      return;
    }
    const nextCategories = categories.map((item) => item.id === category.id ? { ...item, name } : item);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders, categories: nextCategories });
      setCategories(nextCategories);
      setWorkspaceError("");
    } catch (reason) { setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function moveFolder(folderId: string, categoryId: string | null) {
    if (!activeWorkspace || workspaceLoading) return;
    const nextFolders = folders.map((folder) => folder.id === folderId ? { ...folder, categoryId } : folder);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders: nextFolders, categories });
      setFolders(nextFolders);
      setWorkspaceError("");
    } catch (reason) { setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function reorderFolders(draggedId: string, targetId: string, categoryId: string | null) {
    if (!activeWorkspace || workspaceLoading || draggedId === targetId) return;
    const dragged = folders.find((item) => item.id === draggedId);
    const target = folders.find((item) => item.id === targetId);
    if (!dragged || !target) return;
    const siblings = folders.filter((item) => item.id !== draggedId && (item.categoryId ?? null) === categoryId);
    const targetIndex = siblings.findIndex((item) => item.id === targetId);
    siblings.splice(Math.max(0, targetIndex), 0, { ...dragged, categoryId });
    const nextFolders = folders.filter((item) => (item.categoryId ?? null) !== categoryId && item.id !== draggedId).concat(siblings);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders: nextFolders, categories });
      setFolders(nextFolders);
      setWorkspaceError("");
    } catch (reason) { setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function reorderCategories(draggedId: string, targetId: string) {
    if (!activeWorkspace || workspaceLoading || draggedId === targetId) return;
    const from = categories.findIndex((item) => item.id === draggedId), to = categories.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const nextCategories = [...categories], [moved] = nextCategories.splice(from, 1);
    nextCategories.splice(to, 0, moved);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders, categories: nextCategories });
      setCategories(nextCategories);
      setWorkspaceError("");
    } catch (reason) { setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function createFolder() {
    if (!activeWorkspace || workspaceLoading) return;
    const name = folderNameDraft.trim();
    if (!name) return;
    if (folders.some((folder) => folder.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A folder with that name already exists in this roleplay space.");
      return;
    }
    const folder: WorkspaceFolder = { id: crypto.randomUUID(), name, categoryId: activeCategoryId };
    const nextFolders = [...folders, folder];
    const nextScenes = pendingSceneMoveId
      ? scenes.map((scene) => scene.id === pendingSceneMoveId ? { ...scene, folderId: folder.id } : scene)
      : scenes;
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders: nextFolders, categories });
      setFolders(nextFolders);
      setScenes(nextScenes);
      setPendingSceneMoveId(null);
      setExpandedFolderIds((current) => [...current, folder.id]);
      setActiveFolderId(folder.id);
      setFolderNameDraft("");
      setIsCreatingFolder(false);
      setWorkspaceError("");
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function confirmDeleteCategory() {
    const category = categoryPendingDeletion;
    if (!category || !activeWorkspace || workspaceLoading) return;
    const nextFolders = folders.map((folder) =>
      folder.categoryId === category.id ? { ...folder, categoryId: null } : folder,
    );
    const nextCategories = categories.filter((item) => item.id !== category.id);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders: nextFolders, categories: nextCategories });
      setFolders(nextFolders);
      setCategories(nextCategories);
      setExpandedCategoryIds((current) => current.filter((id) => id !== category.id));
      if (activeCategoryId === category.id) setActiveCategoryId(null);
      setCategoryPendingDeletion(null);
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
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders: nextFolders, categories });
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

  async function selectScene(scene: WorkspaceScene) {
    setActiveLibraryPage(null);
    const requestId = ++draftLoadRequestRef.current;
    setActiveSceneId(scene.id);
    setMessages(scene.messages);
    setDraftHtml("");
    if (editorRef.current) editorRef.current.innerHTML = "";
    setEditingMessageId(null);
    setWorkspaceError("");
    if (!activeWorkspace) return;
    try {
      const savedDraft = await loadWorkspaceDraft(activeWorkspace.path, scene.id);
      if (requestId !== draftLoadRequestRef.current) return;
      setDraftHtml(savedDraft);
      if (editorRef.current) editorRef.current.innerHTML = savedDraft;
    } catch (reason) {
      if (requestId === draftLoadRequestRef.current) setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  function handleDraftInput(html: string) {
    setDraftHtml(html);
    if (!activeWorkspace || !activeSceneId || editingMessageId !== null || workspaceLoading) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    const workspacePath = activeWorkspace.path;
    const sceneId = activeSceneId;
    draftSaveTimerRef.current = setTimeout(() => {
      void saveWorkspaceDraft(workspacePath, sceneId, html)
        .then(() => setWorkspaceError((current) => current.startsWith("Could not save draft:") ? "" : current))
        .catch((reason: unknown) => setWorkspaceError(`Could not save draft: ${reason instanceof Error ? reason.message : String(reason)}`));
    }, 500);
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
          characterId: selectedCharacter === "You" ? undefined : character.id,
        },
      ];
    }

    const enteringId = editingMessageId === null ? nextMessages[nextMessages.length - 1]?.id : null;
    if (typeof enteringId === "number") setEnteringMessageId(null);
    await persistSceneMessages(nextMessages);
    if (editingMessageId === null) {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
      try {
        await saveWorkspaceDraft(activeWorkspace.path, activeSceneId, "");
      } catch (reason) {
        setWorkspaceError(`Could not clear saved draft: ${reason instanceof Error ? reason.message : String(reason)}`);
      }
    }
    if (typeof enteringId === "number") {
      // Let React mount the message first, then apply the animation class on a later frame.
      // This reliably restarts the keyframes instead of mounting the element already animated.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        setEnteringMessageId(enteringId);
        window.setTimeout(() => setEnteringMessageId((current) => current === enteringId ? null : current), 900);
      }));
    }
    setDraftHtml("");
    if (editor) editor.innerHTML = "";
  }
  return (
    <main className="app-shell" style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <div className="custom-titlebar" data-tauri-drag-region>
        <div className="titlebar-brand" data-tauri-drag-region>
        <span className="titlebar-easter-egg"><PotatoEgg /></span>
        
        <span data-tauri-drag-region>Borealis Roleplay Studio</span>
    </div>
        <div className="titlebar-controls">
          <button className="titlebar-control" type="button" title="Minimize" aria-label="Minimize" onClick={() => void appWindow.minimize()}><span className="minimize-icon" /></button>
          <button className="titlebar-control" type="button" title={isMaximized ? "Restore" : "Maximize"} aria-label={isMaximized ? "Restore window" : "Maximize window"} onClick={() => void toggleMaximize()}><span className={isMaximized ? "restore-icon" : "maximize-icon"} /></button>
          <button className="titlebar-control close-control" type="button" title="Close" aria-label="Close application" onClick={() => void appWindow.close()}><span className="close-icon" /></button>
        </div>
      </div>

      <div className="app-content" style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
        <aside className="sidebar">
          <div className="brand"><div className="brand-mark" aria-label="Borealis moon"><svg className="borealis-moon-mark" viewBox="0 0 72 72" role="img" aria-hidden="true"><path d="M48.7 8.8a27.5 27.5 0 1 0 14.5 48.6A29.4 29.4 0 0 1 48.7 8.8Z" fill="#c4b5fd" stroke="#1e1e2e" strokeWidth="2.5" strokeLinejoin="round"/></svg></div><div><div className="brand-name">Borealis</div><div className="brand-subtitle">ROLEPLAY STUDIO</div></div><button className="icon-button brand-menu" type="button" title="Workspace menu" aria-label="Open workspace manager" onClick={() => setIsWorkspaceManagerOpen(true)}>⋯</button></div>
          <div className="workspace-switcher-row"><div className="workspace-switcher-slot"><WorkspaceSwitcher activeWorkspace={activeWorkspace} onSelect={(workspace) => { workspaceSelectionMadeRef.current = true; setActiveWorkspace(workspace); }} onAddNew={() => setIsWorkspaceManagerOpen(true)} /></div><button type="button" className="workspace-search-button" title="Search characters and resources" aria-label="Search global libraries" onClick={() => setIsGlobalSearchOpen(true)}><Search size={16} /></button></div>
          <div className="sidebar-section"><div className="section-heading"><span>WORKSPACE</span></div><button className={`nav-item ${activeLibraryPage === "projects" ? "active" : ""}`} type="button" onClick={() => setActiveLibraryPage("projects")}><span className="nav-icon">▦</span>Projects<span className="nav-count">1</span></button><button className="nav-item" type="button" onClick={() => setActiveLibraryPage("characters")}><span className="nav-icon">♧</span>Characters</button><button className="nav-item" type="button" onClick={() => setActiveLibraryPage("resources")}><span className="nav-icon">▧</span>Resources</button></div>
          <div className={`sidebar-section scenes-section ${isScenesCollapsed ? "scenes-collapsed" : ""}`}>
            <div className="section-heading roleplay-space-heading">
              <button type="button" className="scenes-collapse-button" aria-expanded={!isScenesCollapsed} onClick={() => setIsScenesCollapsed((collapsed) => !collapsed)}>
                <span>ROLEPLAY SPACE</span>{isScenesCollapsed ? <ChevronRight size={14} className="scenes-collapse-chevron" /> : <ChevronDown size={14} className="scenes-collapse-chevron" />}
              </button>
              <button type="button" className="tiny-button roleplay-create-button" title="Create category" aria-label="Create category" onClick={() => { setCategoryNameDraft(""); setIsCreatingCategory(true); }}><Plus size={15} /></button>
            </div>
            {!isScenesCollapsed && <>
              <div className="roleplay-tree" data-drop-type="tree" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); if (draggingNode?.type === "folder") void moveFolder(draggingNode.id, null); if (draggingNode?.type === "scene") void moveSceneToFolder(draggingNode.id, null); setDraggingNode(null); }}>
                {categories.map((category) => {
                  const expanded = expandedCategoryIds.includes(category.id);
                  const categoryFolders = folders.filter((folder) => folder.categoryId === category.id);
                  return <div key={category.id} className={`category-group ${draggingNode?.type === "category" && draggingNode.id === category.id ? "tree-node-dragging" : ""}`} data-drop-type="category" data-drop-id={category.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "folder") void moveFolder(draggingNode.id, category.id); if (draggingNode?.type === "scene") { const firstFolder = categoryFolders[0]; if (firstFolder) void moveSceneToFolder(draggingNode.id, firstFolder.id); else { setActiveCategoryId(category.id); setPendingSceneMoveId(draggingNode.id); setFolderNameDraft(`Scenes ${folders.length + 1}`); setIsCreatingFolder(true); } } if (draggingNode?.type === "category") void reorderCategories(draggingNode.id, category.id); setDraggingNode(null); }}>
                    <div className="category-row"><span className="tree-drag-handle" title="Drag category" aria-label={`Drag ${category.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "category", id: category.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span>
                      <button type="button" className="folder-expand-button" aria-expanded={expanded} onClick={() => setExpandedCategoryIds((current) => expanded ? current.filter((id) => id !== category.id) : [...current, category.id])}>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
                      <button type="button" className="folder-select-button category-select-button" onClick={() => { setActiveLibraryPage(null); setActiveCategoryId(category.id); setActiveFolderId(null); }}><Layers size={14} /><span>{category.name}</span></button>
                      <button type="button" className="rename-node-button" title="Rename category" aria-label="Rename category" onClick={() => void renameCategory(category)}><Pencil size={12} /></button>
                      <button type="button" className="folder-delete-button" title="Delete category" aria-label="Delete category" onClick={() => setCategoryPendingDeletion(category)}><Trash2 size={13} /></button>
                    </div>
                    {expanded && <div className="category-children">
                      {categoryFolders.map((folder) => {
                        const folderScenes = scenes.filter((scene) => scene.folderId === folder.id);
                        const folderExpanded = expandedFolderIds.includes(folder.id);
                        return <div key={folder.id} className={`folder-group ${draggingNode?.type === "folder" && draggingNode.id === folder.id ? "tree-node-dragging" : ""}`} data-drop-type="folder" data-drop-id={folder.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "folder") void reorderFolders(draggingNode.id, folder.id, category.id); if (draggingNode?.type === "scene") void moveSceneToFolder(draggingNode.id, folder.id); setDraggingNode(null); }}>
                          <div className="folder-row"><span className="tree-drag-handle" title="Drag folder" aria-label={`Drag ${folder.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "folder", id: folder.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span>
                            <button type="button" className="folder-expand-button" onClick={() => setExpandedFolderIds((current) => folderExpanded ? current.filter((id) => id !== folder.id) : [...current, folder.id])}>{folderExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
                            <button type="button" className="folder-select-button" onClick={() => { setActiveFolderId(folder.id); setActiveCategoryId(category.id); }}><Folder size={14} /><span>{folder.name}</span><small>{folderScenes.length}</small></button>
                            <button type="button" className="rename-node-button folder-rename-button" title="Rename folder" aria-label="Rename folder" onClick={() => void renameFolder(folder)}><Pencil size={12} /></button>
                            <button type="button" className="folder-delete-button" title="Delete folder" aria-label="Delete folder" onClick={() => setFolderPendingDeletion(folder)}><Trash2 size={13} /></button>
                          </div>
                          {folderExpanded && <div className="folder-scenes">{folderScenes.map((scene) => (<div key={scene.id} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData("text/plain", scene.id); setDraggingNode({ type: "scene", id: scene.id }); setDraggingSceneId(scene.id); }} onDragEnd={() => { setDraggingNode(null); setDraggingSceneId(null); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "scene") void reorderScenes(draggingNode.id, scene.id); setDraggingNode(null); setDraggingSceneId(null); }} data-drop-type="scene" data-drop-id={scene.id} className={`scene-row ${activeSceneId === scene.id ? "selected" : ""} ${draggingSceneId === scene.id ? "scene-dragging" : ""}`}><span className="tree-drag-handle" title="Drag scene" aria-label={`Drag ${scene.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "scene", id: scene.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span><button type="button" className="scene-item" onClick={() => selectScene(scene)}><span className="scene-icon">{scene.icon}</span><span className="scene-copy"><span className="scene-name">{scene.name}</span><span className="scene-detail">{scene.messages.length} {scene.messages.length === 1 ? "message" : "messages"}</span></span></button><button type="button" className="rename-node-button scene-rename-button" title="Rename scene" aria-label="Rename scene" onClick={() => void renameScene(scene)}><Pencil size={12} /></button><button type="button" className="scene-delete-button" title="Delete scene" aria-label="Delete scene" onClick={() => void deleteScene(scene)}><Trash2 size={14} /></button></div>))}</div>}
                        </div>;
                      })}
                      <button type="button" className="category-add-folder" onClick={() => { setActiveCategoryId(category.id); setActiveFolderId(null); setPendingSceneMoveId(null); setFolderNameDraft(""); setIsCreatingFolder(true); }}><FolderPlus size={13} /> New folder</button>
                    </div>}
                  </div>;
                })}
                {folders.filter((folder) => !folder.categoryId || !categories.some((category) => category.id === folder.categoryId)).map((folder) => {
                  const folderScenes = scenes.filter((scene) => scene.folderId === folder.id);
                  const expanded = expandedFolderIds.includes(folder.id);
                  return <div key={folder.id} className={`folder-group ${draggingNode?.type === "folder" && draggingNode.id === folder.id ? "tree-node-dragging" : ""}`} data-drop-type="folder" data-drop-id={folder.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "folder") void reorderFolders(draggingNode.id, folder.id, null); if (draggingNode?.type === "scene") void moveSceneToFolder(draggingNode.id, folder.id); setDraggingNode(null); }}>
                    <div className="folder-row"><span className="tree-drag-handle" title="Drag folder" aria-label={`Drag ${folder.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "folder", id: folder.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span><button type="button" className="folder-expand-button" onClick={() => setExpandedFolderIds((current) => expanded ? current.filter((id) => id !== folder.id) : [...current, folder.id])}>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button><button type="button" className="folder-select-button" onClick={() => { setActiveFolderId(folder.id); setActiveCategoryId(null); }}><Folder size={14} /><span>{folder.name}</span><small>{folderScenes.length}</small></button><button type="button" className="rename-node-button folder-rename-button" title="Rename folder" aria-label="Rename folder" onClick={() => void renameFolder(folder)}><Pencil size={12} /></button><button type="button" className="folder-delete-button" title="Delete folder" aria-label="Delete folder" onClick={() => setFolderPendingDeletion(folder)}><Trash2 size={13} /></button></div>
                    {expanded && <div className="folder-scenes">{folderScenes.map((scene) => (<div key={scene.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "scene") void reorderScenes(draggingNode.id, scene.id); setDraggingNode(null); setDraggingSceneId(null); }} data-drop-type="scene" data-drop-id={scene.id} className={`scene-row ${activeSceneId === scene.id ? "selected" : ""} ${draggingSceneId === scene.id ? "scene-dragging" : ""}`}><span className="tree-drag-handle" title="Drag scene" aria-label={`Drag ${scene.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "scene", id: scene.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span><button type="button" className="scene-item" onClick={() => selectScene(scene)}><span className="scene-icon">{scene.icon}</span><span className="scene-copy"><span className="scene-name">{scene.name}</span><span className="scene-detail">{scene.messages.length} {scene.messages.length === 1 ? "message" : "messages"}</span></span></button><button type="button" className="rename-node-button scene-rename-button" title="Rename scene" aria-label="Rename scene" onClick={() => void renameScene(scene)}><Pencil size={12} /></button><button type="button" className="scene-delete-button" title="Delete scene" aria-label="Delete scene" onClick={() => void deleteScene(scene)}><Trash2 size={14} /></button></div>))}</div>}
                  </div>;
                })}
                <div className="folder-group unfiled-scenes" data-drop-type="unfiled" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "scene") void moveSceneToFolder(draggingNode.id, null); setDraggingNode(null); }}>
                  <div className="folder-row" onClick={() => setActiveFolderId(null)}><button type="button" className="folder-expand-button" onClick={() => setIsUnfiledScenesCollapsed((collapsed) => !collapsed)}>{isUnfiledScenesCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button><Folder size={14} className="unfiled-folder-icon" /><span className="unfiled-label">No category</span><small>{scenes.filter((scene) => !scene.folderId || !folders.some((folder) => folder.id === scene.folderId)).length}</small></div>
                  {!isUnfiledScenesCollapsed && <div className="folder-scenes">{scenes.filter((scene) => !scene.folderId || !folders.some((folder) => folder.id === scene.folderId)).map((scene) => (<div key={scene.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "scene") void reorderScenes(draggingNode.id, scene.id); setDraggingNode(null); setDraggingSceneId(null); }} data-drop-type="scene" data-drop-id={scene.id} className={`scene-row ${activeSceneId === scene.id ? "selected" : ""} ${draggingSceneId === scene.id ? "scene-dragging" : ""}`}><span className="tree-drag-handle" title="Drag scene" aria-label={`Drag ${scene.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "scene", id: scene.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span><button type="button" className="scene-item" onClick={() => selectScene(scene)}><span className="scene-icon">{scene.icon}</span><span className="scene-copy"><span className="scene-name">{scene.name}</span><span className="scene-detail">{scene.messages.length} {scene.messages.length === 1 ? "message" : "messages"}</span></span></button><button type="button" className="rename-node-button scene-rename-button" title="Rename scene" aria-label="Rename scene" onClick={() => void renameScene(scene)}><Pencil size={12} /></button><button type="button" className="scene-delete-button" title="Delete scene" aria-label="Delete scene" onClick={() => void deleteScene(scene)}><Trash2 size={14} /></button></div>))}</div>}
                </div>
              </div>
              <div className="scene-creation-actions">
                <button className="new-scene-button" onClick={() => { setSceneNameDraft(""); setIsCreatingScene(true); }} disabled={!activeWorkspace || workspaceLoading}><span>＋</span> New scene</button>
                <button className="new-folder-button" type="button" title="Create folder" aria-label="Create folder" onClick={() => { setActiveCategoryId(null); setPendingSceneMoveId(null); setFolderNameDraft(""); setIsCreatingFolder(true); }} disabled={!activeWorkspace || workspaceLoading}><FolderPlus size={16} /></button>
              </div>
            </>}
          </div>
          
<div className="sidebar-spacer" />

<div className="sidebar-footer">
  <button className="sidebar-profile-trigger" type="button" onClick={() => setIsProfileOpen(true)} title="Open your profile" aria-label="Open your profile">
    <div className={`profile-avatar frame-border-${preferences.profile.frameStyle}`}>
      {profileMediaSource(preferences.profile.avatarAssetPath) ? <img src={sidebarAvatarThumbnailUrl ?? profileMediaSource(preferences.profile.avatarAssetPath) ?? undefined} alt="" /> : <span>{preferences.profile.displayName.trim().charAt(0).toUpperCase() || "K"}</span>}
    </div>
    <div className="profile-copy">
      <span className="profile-name">{preferences.profile.displayName || "Your profile"}</span>
      <span className="profile-status">{preferences.profile.showSpecialTitle ? <span className={`special-title-badge sidebar-special-title ${preferences.profile.displayName.trim().toLocaleLowerCase() === "zero" ? "special-title-star" : "special-title-moon"}`}><span className="special-title-symbol" aria-hidden="true">{preferences.profile.displayName.trim().toLocaleLowerCase() === "zero" ? "✦" : <svg className="special-title-moon-icon" viewBox="0 0 72 72" aria-hidden="true"><path d="M48.7 8.8a27.5 27.5 0 1 0 14.5 48.6A29.4 29.4 0 0 1 48.7 8.8Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>}</span><span>{preferences.profile.displayName.trim().toLocaleLowerCase() === "zero" ? "Star Developer" : "Moon Developer"}</span><EffectLayer effect="particles" intensity="bold" particleCount={12} className="special-title-particles" /></span> : preferences.profile.title || "Personal profile"}</span>
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

        <div
          className="sidebar-resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          title="Drag to resize sidebar"
          tabIndex={0}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            sidebarResizeRef.current = { startX: event.clientX, startWidth: sidebarWidth };
            document.body.classList.add("sidebar-resizing");
          }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            setSidebarWidth((width) => Math.min(420, Math.max(220, width + (event.key === "ArrowRight" ? 12 : -12))));
          }}
        />

        <section className="main-panel">
          <header className="topbar"><div className="breadcrumbs"><span>{activeWorkspace?.manifest.name ?? "No workspace"}</span><span className="breadcrumb-divider">/</span><span className="current-crumb">{activeScene?.name ?? "No scene selected"}</span></div><div className="topbar-actions"><span className="local-badge"><span className="status-dot" />Local mode</span><div className="scene-options-menu"><button className="icon-button" type="button" title="Scene options" aria-label="Scene options" aria-expanded={isSceneOptionsOpen} disabled={!activeScene || !activeWorkspace || workspaceLoading} onClick={() => setIsSceneOptionsOpen((open) => !open)}>⋯</button>{isSceneOptionsOpen && <div className="scene-options-popover" role="menu"><button type="button" role="menuitem" onClick={() => setIsSceneOptionsOpen(false)}><Share2 size={15} /><span>Share</span></button><div className="scene-options-divider" /><button type="button" role="menuitem" className="scene-clean-action" disabled={!activeScene || !messages.length} title={!messages.length ? "This conversation is already empty." : "Delete all messages in this scene"} onClick={requestCleanConversation}><Broom size={15} /><span>Clean conversation</span></button></div>}</div></div></header>
          <div className="scene-toolbar"><div className="scene-heading"><div className="scene-heading-icon">{activeScene?.icon ?? "◈"}</div><div><h1>{activeScene?.name ?? "Your next scene"}</h1><p>{activeWorkspace?.manifest.name ?? "Create or choose a workspace"} <span>·</span> Roleplay scene</p></div></div><div className="scene-actions"><button className="secondary-button">♡ <span>Favourite</span></button></div></div>
          <div className="demo-notice"><span className="notice-icon">i</span><span><strong>{!activeWorkspace ? "No workspace selected." : workspaceLoading ? "Loading workspace…" : workspaceError ? "Workspace issue." : !activeScene ? "No scene yet." : "Workspace saved locally."}</strong> {!activeWorkspace ? "Choose or create a workspace to begin." : workspaceLoading ? "Your workspace content is being loaded." : workspaceError ? workspaceError : !activeScene ? "Create your first scene with the New scene button." : "Messages are saved to this workspace as you send or edit them."}</span></div>

          <section ref={conversationRef} className={`conversation chat-spacing-${preferences.characterDisplayDefaults.messageSpacing}`} aria-label="Scene conversation" onScroll={handleConversationScroll}>
            {activeScene && <div className="date-divider"><span /><p>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</p><span /></div>}
            {activeScene && !messages.length && !workspaceLoading && <div className="scene-empty-state"><strong>This scene is ready.</strong><span>Your first passage will appear here.</span></div>}
            {messages.map((message) => { const messageCharacter = characters.find((item) => item.id && item.id === message.characterId) ?? characters.find((item) => item.name === message.author); const messagePortraitUrl = message.author === "You" ? profileMediaSource(preferences.profile.avatarAssetPath) : messageCharacter?.portraitResourceId ? characterPortraitUrls[messageCharacter.portraitResourceId] : null; return <article className={`message ${enteringMessageId === message.id ? "message-entering" : ""} ${message.role === "Narration" ? "message-role-narration" : "message-role-dialogue"} chat-avatar-${preferences.characterDisplayDefaults.avatarSize} chat-spacing-${preferences.characterDisplayDefaults.messageSpacing} ${preferences.characterDisplayDefaults.showAvatar ? "" : "message-no-avatar"}`} key={message.id}><button type="button" className={`message-avatar message-avatar-button avatar-${message.avatar}`} style={{ "--character-accent": characterAccentColor(message.avatar) } as React.CSSProperties} aria-label={`View portrait of ${message.author}`} title={`View ${message.author} portrait`} onClick={() => { setAvatarPreviewCharacter({ name: message.author, initials: message.initials, avatar: message.avatar, description: "", avatarAssetPath: message.avatarAssetPath ?? (message.author === "You" ? preferences.profile.avatarAssetPath : null), portraitResourceId: messageCharacter?.portraitResourceId, portraitFit: messageCharacter?.portraitFit, portraitPositionX: messageCharacter?.portraitPositionX, portraitPositionY: messageCharacter?.portraitPositionY, portraitZoom: messageCharacter?.portraitZoom, expression: message.expression }); setAvatarTilt({ x: 0, y: 0, shineX: 50, shineY: 35 }); setShowAvatarPreview(true); }} >{messagePortraitUrl ? <img className={message.author === "You" ? "message-avatar-profile-image" : "message-avatar-character-image"} src={messagePortraitUrl} alt="" style={message.author === "You" ? undefined : { objectFit: "cover", objectPosition: `${messageCharacter?.portraitPositionX ?? 50}% ${messageCharacter?.portraitPositionY ?? 50}%`, transform: `scale(${(messageCharacter?.portraitZoom ?? 100) / 100})`, transformOrigin: `${messageCharacter?.portraitPositionX ?? 50}% ${messageCharacter?.portraitPositionY ?? 50}%` }} /> : message.initials}{message.characterId && customExpressionUrls[`${message.characterId}:${message.expression}`] && <img className="message-avatar-expression-photo" src={customExpressionUrls[`${message.characterId}:${message.expression}`]} alt="" aria-hidden="true" />}</button><div className="message-body"><div className="message-meta"><strong className={message.author === "You" ? "message-author-user" : undefined}>{message.author}</strong>{message.author !== "You" && preferences.characterDisplayDefaults.showExpression && message.expression && (
                      <span
                        className="message-expression"
                        title="Character expression"
                        aria-label="Character expression"
                        style={{
                          maskImage: `url("${expressions.find((expression) => expression.emoji === message.expression)?.image ?? ""}")`,
                          WebkitMaskImage: `url("${expressions.find((expression) => expression.emoji === message.expression)?.image ?? ""}")`,
                        }}
                      />
                    )}{preferences.characterDisplayDefaults.showRoleLabel && <span className={`role-tag role-${message.role.toLowerCase()}`}>{message.role}</span>}<time>{message.time}</time></div>{message.role === "Narration" ? <div className="message-narration-block"><span className="narration-label">✦ NARRATION</span><div className="message-rich-content" dangerouslySetInnerHTML={{ __html: message.content }} /></div> : <div className="message-rich-content" dangerouslySetInnerHTML={{ __html: message.content }} />}</div><div className="message-actions">
                <button className="message-menu" type="button" title="Message actions" aria-label={`Message actions for ${message.author}`} aria-expanded={openMessageActionsId === message.id} onClick={() => setOpenMessageActionsId((current) => current === message.id ? null : message.id)}><MoreHorizontal size={17} /></button>
                {openMessageActionsId === message.id && <div className="message-actions-popover" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setOpenMessageActionsId(null); beginEditingMessage(message); }}><Pencil size={14} /><span>Edit message</span></button>
                  <button type="button" role="menuitem" onClick={() => void changeMessageRole(message)}><ArrowLeftRight size={14} /><span>Change to {message.role === "Narration" ? "dialogue" : "narration"}</span></button>
                  <button type="button" role="menuitem" className="message-delete-action" disabled={!canDeleteMessage(message)} title={!canDeleteMessage(message) ? "Messages can only be deleted within 24 hours of sending; older messages without a timestamp cannot be deleted." : "Delete message"} onClick={() => void deleteMessage(message)}><Trash2 size={14} /><span>Delete message</span>{!canDeleteMessage(message) && <small>24h limit</small>}</button>
                </div>}
              </div></article>; })}
            {hasNewMessages && <button className="scroll-to-latest" type="button" onClick={scrollToLatestMessage}>↓ New messages · Jump to latest</button>}
          </section>

          <footer className="composer-area">
            <div className="composer-context"><span className="composer-context-dot" />Writing in <strong>{activeScene?.name ?? "no scene selected"}</strong></div>
            <div className="composer-layout">
              <aside className="character-panel" ref={characterPanelRef}>
                <div className={`character-portrait avatar-${character.avatar}`} style={{ "--character-accent": characterAccentColor(character.avatar) } as React.CSSProperties}>
                  <button
                    className="character-portrait-preview"
                    type="button"
                    aria-label={`View ${character.name}'s avatar`}
                    title={`View ${character.name}'s avatar`}
                    onClick={() => { setAvatarPreviewCharacter(null); setShowAvatarPreview(true); setShowCharacterPicker(false); setShowExpressions(false); }}
                  >
                    <CharacterPortraitArt
                      initials={character.initials}
                      imageSrc={character.avatarAssetPath ? profileMediaSource(character.avatarAssetPath) : characterResourcePortraitUrl}
                      expressionImage={selectedCharacter !== "You" ? (customExpressionUrls[`${character.id}:${selectedExpression}`] ?? null) : null}
                      expressionIsPhoto={selectedCharacter !== "You" && Boolean(customExpressionUrls[`${character.id}:${selectedExpression}`])}
                      expressionLabel={expressions.find((expression) => expression.emoji === selectedExpression)?.label ?? "Character expression"}
                      fit="cover"
                      positionX={character.portraitPositionX ?? 50}
                      positionY={character.portraitPositionY ?? 50}
                      zoom={character.portraitZoom ?? 100}
                    />
                  </button>
                  <button className="portrait-picker-button character-picker-button" type="button" aria-label="Choose character" title={`Writing as ${character.name}`} aria-expanded={showCharacterPicker} onClick={() => { setShowCharacterPicker((visible) => !visible); setShowExpressions(false); }}><span className="expression-image character-picker-image" style={{ maskImage: `url("${personSilhouette}")`, WebkitMaskImage: `url("${personSilhouette}")` }} aria-hidden="true" /></button>
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
                  <EmojiPicker editorRef={editorRef} />

<span className="toolbar-spacer" />
<span className="toolbar-spacer" />
                  <span className="editor-mode-label">RICH TEXT</span>
                </div>
                <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label={editingMessageId !== null ? "Edit roleplay message" : "Write a roleplay message"} aria-multiline="true" data-placeholder={editingMessageId !== null ? "Edit your passage..." : !activeWorkspace ? "Choose a workspace first..." : !activeScene ? "Create a scene before writing..." : "Write your next passage..."} onInput={(event) => handleDraftInput(event.currentTarget.innerHTML)} onKeyDown={(event) => { if (!activeWorkspace || !activeSceneId || workspaceLoading) return; if (event.key === "ArrowUp" && !(event.currentTarget.innerText ?? "").trim()) { const latestMessage = messages[messages.length - 1]; if (latestMessage) { event.preventDefault(); beginEditingMessage(latestMessage); } return; } if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.closest("form")?.requestSubmit(); } }} />
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
      {categoryPendingDeletion && (
        <div className="clean-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryPendingDeletion(null); }}>
          <section className="clean-confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-category-title" aria-describedby="delete-category-description">
            <div className="clean-confirmation-icon"><AlertTriangle size={21} /></div>
            <span className="clean-confirmation-eyebrow">ROLEPLAY SPACE · DELETE CATEGORY</span>
            <h2 id="delete-category-title">Delete “{categoryPendingDeletion.name}”?</h2>
            <p id="delete-category-description">The category will be removed. Its folders will move to the general list; scenes and messages will be kept.</p>
            <div className="clean-confirmation-actions">
              <button type="button" className="clean-cancel-button" onClick={() => setCategoryPendingDeletion(null)}>Cancel</button>
              <button type="button" className="clean-continue-button" onClick={() => void confirmDeleteCategory()}>Delete category</button>
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
      {isCreatingScene && (
        <div className="clean-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setIsCreatingScene(false); setSceneNameDraft(""); } }}>
          <form className="clean-confirmation-dialog folder-create-dialog" onSubmit={(event) => { event.preventDefault(); void createScene(); }}>
            <div className="clean-confirmation-icon"><Plus size={21} /></div>
            <span className="clean-confirmation-eyebrow">ROLEPLAY SPACE · NEW SCENE</span>
            <h2>Create a scene</h2>
            <p>Give this scene a name. You can start writing as soon as it’s created.</p>
            <input autoFocus className="folder-name-input" value={sceneNameDraft} onChange={(event) => setSceneNameDraft(event.target.value)} placeholder="e.g. The beginning" aria-label="Scene name" maxLength={100} />
            <div className="clean-confirmation-actions">
              <button type="button" className="clean-cancel-button" onClick={() => { setIsCreatingScene(false); setSceneNameDraft(""); }}>Cancel</button>
              <button type="submit" className="clean-continue-button" disabled={!sceneNameDraft.trim()}>Create scene</button>
            </div>
          </form>
        </div>
      )}
      {isCreatingCategory && (
        <div className="clean-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreatingCategory(false); }}>
          <form className="clean-confirmation-dialog folder-create-dialog" onSubmit={(event) => { event.preventDefault(); void createCategory(); }}>
            <div className="clean-confirmation-icon"><Layers size={21} /></div>
            <span className="clean-confirmation-eyebrow">ROLEPLAY SPACE · ORGANISATION</span>
            <h2>Create a category</h2>
            <p>Categories sit directly inside Roleplay Space. Each category contains folders, and folders contain scenes. Existing scenes and messages will be preserved.</p>
            <input autoFocus className="folder-name-input" value={categoryNameDraft} onChange={(event) => setCategoryNameDraft(event.target.value)} placeholder="e.g. Main storyline" aria-label="Category name" maxLength={80} />
            <div className="clean-confirmation-actions"><button type="button" className="clean-cancel-button" onClick={() => setIsCreatingCategory(false)}>Cancel</button><button type="submit" className="clean-continue-button" disabled={!categoryNameDraft.trim()}>Create category</button></div>
          </form>
        </div>
      )}
      {isCreatingFolder && (
        <div className="clean-confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setIsCreatingFolder(false); setPendingSceneMoveId(null); } }}>
          <form className="clean-confirmation-dialog folder-create-dialog" onSubmit={(event) => { event.preventDefault(); void createFolder(); }}>
            <div className="clean-confirmation-icon"><FolderPlus size={21} /></div>
            <span className="clean-confirmation-eyebrow">ROLEPLAY SPACE · ORGANISATION</span>
            <h2>Create a folder</h2>
            <p>Use folders for acts, arcs, chapters, or any structure that helps organise your roleplay.</p>
            <input autoFocus className="folder-name-input" value={folderNameDraft} onChange={(event) => setFolderNameDraft(event.target.value)} placeholder="e.g. Act I" aria-label="Folder name" maxLength={80} />
            <div className="clean-confirmation-actions">
              <button type="button" className="clean-cancel-button" onClick={() => { setIsCreatingFolder(false); setPendingSceneMoveId(null); }}>Cancel</button>
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
              "--character-accent": characterAccentColor(previewCharacter.avatar),
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
              <div className={`avatar-preview-art ${(previewCharacter.avatarAssetPath || (previewCharacter.portraitResourceId && characterPortraitUrls[previewCharacter.portraitResourceId]) || previewCharacter.name === "Keira") ? "has-portrait-image" : "has-portrait-initials"}`}>
                {!(previewCharacter.avatarAssetPath || (previewCharacter.portraitResourceId && characterPortraitUrls[previewCharacter.portraitResourceId]) || previewCharacter.name === "Keira") && <>
                  <div className="avatar-preview-orbit avatar-preview-orbit-one" />
                  <div className="avatar-preview-orbit avatar-preview-orbit-two" />
                </>}
                {previewCharacter.avatarAssetPath ? (
                  <div className="avatar-preview-image-layer avatar-preview-image-layer-fade">
                    <img className="avatar-preview-image profile-media-image" src={profileMediaSource(previewCharacter.avatarAssetPath) ?? undefined} alt={previewCharacter.name} />
                  </div>
                ) : previewCharacter.portraitResourceId && characterPortraitUrls[previewCharacter.portraitResourceId] ? (
                  <div className="avatar-preview-image-layer avatar-preview-image-layer-fade">
                    <img className="avatar-preview-image" src={characterPortraitUrls[previewCharacter.portraitResourceId]} alt={previewCharacter.name} style={{ objectFit: previewCharacter.portraitFit ?? "contain", objectPosition: `${previewCharacter.portraitPositionX ?? 50}% ${previewCharacter.portraitPositionY ?? 50}%`, transform: `scale(${(previewCharacter.portraitZoom ?? 100) / 100})`, transformOrigin: `${previewCharacter.portraitPositionX ?? 50}% ${previewCharacter.portraitPositionY ?? 50}%` }} />
                  </div>
                ) : previewCharacter.name === "Keira" ? (
                  <div className="avatar-preview-image-layer avatar-preview-image-layer-fade"><img className="avatar-preview-image" src={avatarPlaceholder} alt="Keira" /></div>
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
            <EffectLayer effect="particles" intensity="balanced" particleCount={18} className="avatar-preview-effect-layer" />
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
      {activeLibraryPage === "projects" && <section className="projects-coming-soon"><div className="projects-coming-soon-content"><span className="projects-coming-soon-eyebrow">BOREALIS · WORKSPACE</span><h1>Coming soon!</h1><p>Something lovely is taking shape.</p><svg className="projects-coming-soon-moon" viewBox="0 0 72 72" aria-hidden="true"><path d="M48.7 8.8a27.5 27.5 0 1 0 14.5 48.6A29.4 29.4 0 0 1 48.7 8.8Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg></div></section>}{activeLibraryPage === "characters" && <CharactersPage workspacePath={activeWorkspace?.path} onClose={() => { setActiveLibraryPage(null); const refreshCharacters = async () => { const library = activeWorkspace ? await loadWorkspaceCharacters(activeWorkspace.path) : loadCharacters(); const refreshed: Character[] = [...library.map((item) => ({ id: item.id, name: item.name, initials: item.initials, avatar: characterAccentColor(item.accent), description: item.subtitle || item.description, avatarAssetPath: null, portraitResourceId: item.portraitResourceId, portraitFit: item.portraitFit ?? "cover", portraitPositionX: item.portraitPositionX ?? 50, portraitPositionY: item.portraitPositionY ?? 50, portraitZoom: item.portraitZoom ?? 100 })), { name: "You", initials: "Y", avatar: "blue", description: "Write as yourself" }]; setCharacters(refreshed); if (!refreshed.some((item) => item.name === selectedCharacter)) setSelectedCharacter(refreshed[0]?.name ?? "You"); }; void refreshCharacters().catch((reason) => console.error("Could not refresh workspace characters:", reason)); }} />}
      {activeLibraryPage === "resources" && <ResourcesPage onClose={() => setActiveLibraryPage(null)} workspacePath={activeWorkspace?.path} />}
      {isGlobalSearchOpen && <GlobalSearch onClose={() => setIsGlobalSearchOpen(false)} onOpenCharacters={() => { setIsGlobalSearchOpen(false); setActiveLibraryPage("characters"); }} onOpenResources={() => { setIsGlobalSearchOpen(false); setActiveLibraryPage("resources"); }} />}
    </main>
  );
}

export default App;
