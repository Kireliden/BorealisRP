import AppColorPicker from "./ui/AppColorPicker";
import AppSelect from "./ui/AppSelect";
import { useAppDialog } from "./ui/AppDialogProvider";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { getCurrentWindow, PhysicalSize } from "@tauri-apps/api/window";
import { convertFileSrc } from "@tauri-apps/api/core";
import { usePreferences } from "./preferences/PreferencesContext";
import { isLightTheme } from "./preferences/themeMode";
import ProfileModal from "./profile/ProfileModal";
import SpecialTitleBadge from "./profile/SpecialTitleBadge";
import { useActiveSpecialTitle } from "./profile/useActiveSpecialTitle";
import { getSidebarAvatarThumbnailPath, profileMediaSource } from "./profile/profileMedia";
import "./themes/themes.css";
import "./App.css";
import "./chat/userMessageHighlight.css";
import "./composer/Composer.css";
import "./chat/chatLayout.css";
import "./composer/AvatarComp.css";
import SettingsModal from "./settings/SettingsModal";
import CollectionsModal from "./collection/CollectionModal";
import PotatoEgg from "./easter-eggs/PotatoEgg";
import NudgeEgg from "./easter-eggs/NudgeEgg";
import LambdaEgg from "./easter-eggs/LambdaEgg";
import PlumbobEgg from "./easter-eggs/PlumbobEgg";
import { PanelLeftClose, PanelLeftOpen, Cog, Trophy, Heart, Image as ImageIcon, ArrowRight, FileDown, MoreHorizontal, Pencil, ArrowLeftRight, Trash2, Share2, Broom, Folder, FolderPlus, Layers, Plus, ChevronDown, ChevronRight, AlertTriangle, GripVertical, Search, ImagePlus, X } from "lucide-react";
import { expressions, defaultExpression } from "./composer/expressions";
import { commandQuery, resolveExpressionCommand, EXPRESSION_COMMANDS } from "./composer/expressionCommands";
import "./composer/expressionCommands.css";
import personSilhouette from "openmoji/black/svg/1F464.svg?url";
import WorkspaceManagerModal from "./workspace/WorkspaceManagerModal";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import StudioIconPicker, { StudioIcon } from "./ui/StudioIconPicker";
import { getWorkspaceIcon, saveWorkspaceIcon } from "./workspace/workspaceIcons";
import CharactersPage from "./characters/CharactersPage";
import { loadCharacters } from "./characters/characters.storage";
import { loadWorkspaceCharacters } from "./characters/workspaceCharacters.storage";
import { characterAccentColor } from "./characters/characters.types";
import { getResourceBlob } from "./resources/resources.storage";
import { getWorkspaceResourceBlob, importWorkspaceResource } from "./resources/workspaceResources.storage";
import ImageSourceDialog from "./resources/ImageSourceDialog";
import SaveImageToResourcesDialog from "./resources/SaveImageToResourcesDialog";
import { type ComposerImage, loadMessageImages, saveMessageImages } from "./chat/messageImages";
import "./chat/messageImages.css";
import ChatImageLightbox, { type ChatLightboxImage } from "./chat/ChatImageLightbox";
import { exportScenesToMarkdown } from "./chat/obsidianExport";
import "./chat/obsidianExport.css";
import SceneBackgroundSettings from "./chat/SceneBackgroundSettings";
import { isLightOverlay, overlayRgb, safeSceneBackground, saveSceneBackgroundFile, type SceneBackground, type SceneBackgroundAdjustments } from "./chat/sceneBackground";
import { getCachedSceneBackground, peekSceneBackground, forgetSceneBackground, prefetchSceneBackgrounds } from "./chat/sceneBackgroundCache";
import "./chat/sceneBackground.css";
import FavouritesPage from "./favourites/FavouritesPage";
import { CHARACTER_EXPRESSION_SLOTS, getCharacterExpressionBlob } from "./characters/characterExpressions.storage";
import { ensureWorkspaceCharacterExpressions, getWorkspaceCharacterExpressionBlob } from "./characters/workspaceCharacterExpressions.storage";
import CharacterPortraitArt, { characterPortraitStyle } from "./characters/CharacterPortraitArt";
import EffectLayer from "./effects/components/EffectLayer";
import EmojiPicker from "./composer/EmojiPicker";
import ResourcesPage from "./resources/ResourcesPage";
import GlobalSearch from "./GlobalSearch";
import type { WorkspaceInfo } from "./workspace/workspaceTypes";
import { loadWorkspaceContent, saveWorkspaceContent, type WorkspaceContent, type WorkspaceMessage, type WorkspaceScene, type WorkspaceFolder, type WorkspaceCategory } from "./workspace/workspaceContent";
import { clearLastWorkspacePath, getLastWorkspacePath, inspectWorkspace, rememberLastWorkspacePath } from "./workspace/workspaceStorage";
import { loadWorkspaceDraft, saveWorkspaceDraft } from "./workspace/workspaceDrafts.storage";
import { deleteWorkspaceFile } from "./workspace/workspaceFiles";
import "./popup-motion.css";
import "./ui/studioPolish.css";

const appWindow = getCurrentWindow();
const SAVED_WINDOW_SIZE_KEY = "brd.window-physical-size.v1";

type Role = "Narration" | "Dialogue";
type Character = { id?: string; name: string; initials: string; formerNames?: string[]; avatar: string; description: string; avatarAssetPath?: string | null; portraitResourceId?: string | null; portraitFit?: "cover" | "contain"; portraitPositionX?: number; portraitPositionY?: number; portraitZoom?: number };
type AvatarPreviewCharacter = Character & { expression?: string };
type Message = WorkspaceMessage;

function charactersFromLibrary(): Character[] {
  const libraryCharacters = loadCharacters().map((item) => ({
    id: item.id,
    name: item.name,
    initials: item.initials,
    formerNames: item.formerNames,
    avatar: characterAccentColor(item.accent),
    description: item.subtitle || item.description,
    avatarAssetPath: null,
    portraitResourceId: item.portraitResourceId,
    portraitFit: item.portraitFit ?? "contain",
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
  const { confirm, prompt } = useAppDialog();
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
  const [scenePendingRename, setScenePendingRename] = useState<WorkspaceScene | null>(null);
  const [sceneRenameDraft, setSceneRenameDraft] = useState("");
  const [sceneRenameError, setSceneRenameError] = useState("");
  const [sceneRenameBusy, setSceneRenameBusy] = useState(false);
  const [folderPendingDeletion, setFolderPendingDeletion] = useState<WorkspaceFolder | null>(null);
  const [categoryPendingDeletion, setCategoryPendingDeletion] = useState<WorkspaceCategory | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [backgroundSettingsOpen, setBackgroundSettingsOpen] = useState(false);
  const [backgroundImageState, setBackgroundImageState] = useState<{ key: string; url: string } | null>(null);
  const backgroundSavingRef = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [showWorkspaceNotice, setShowWorkspaceNotice] = useState(true);
  useEffect(() => { if (workspaceError) setShowWorkspaceNotice(true); }, [workspaceError]);
  const [draftHtml, setDraftHtml] = useState("");
  const [composerImages, setComposerImages] = useState<ComposerImage[]>([]);
  const [messageImageUrls, setMessageImageUrls] = useState<Record<string, string>>({});
  const [chatLightbox, setChatLightbox] = useState<{ images: ChatLightboxImage[]; startIndex: number } | null>(null);
  const [messageImagesLoading, setMessageImagesLoading] = useState(false);
  const composerImageUrlsRef = useRef<Set<string>>(new Set());
  const [imageSourceOpen, setImageSourceOpen] = useState(false);
  const [systemImageToSave, setSystemImageToSave] = useState<File | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [openMessageActionsId, setOpenMessageActionsId] = useState<number | null>(null);
  const [isSceneOptionsOpen, setIsSceneOptionsOpen] = useState(false);
  const [markdownExportBusy, setMarkdownExportBusy] = useState(false);
  const [markdownExportNotice, setMarkdownExportNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [favouriteBusy, setFavouriteBusy] = useState(false);
  const favouritePendingRef = useRef(false);
  const [favouriteJump, setFavouriteJump] = useState<{ sceneId: string; messageId: number } | null>(null);
  const [cleanConfirmationStep, setCleanConfirmationStep] = useState<1 | 2 | null>(null);
  const [characters, setCharacters] = useState<Character[]>(charactersFromLibrary);


  const [selectedCharacter, setSelectedCharacter] = useState("Keira");
  const [selectedRole, setSelectedRole] = useState<Role>("Narration");
  const [selectedExpression, setSelectedExpression] = useState<string>(defaultExpression.emoji);
  const [expressionSlashQuery, setExpressionSlashQuery] = useState<string | null>(null);
  const [customExpressionUrls, setCustomExpressionUrls] = useState<Record<string, string>>({});
  const [showExpressions, setShowExpressions] = useState(false);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [avatarPreviewCharacter, setAvatarPreviewCharacter] = useState<AvatarPreviewCharacter | null>(null);
  const [avatarTilt, setAvatarTilt] = useState({ x: 0, y: 0, shineX: 50, shineY: 35 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(272);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("brs.sidebar-collapsed") === "true"; } catch { return false; }
  });
  const [workspaceIcon, setWorkspaceIcon] = useState("om:1F319");
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
  const { preferences, resolvedTheme } = usePreferences();
  const themeIsLight = isLightTheme(resolvedTheme);
  const activeSpecialTitle = useActiveSpecialTitle(preferences.profile);


  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [activeLibraryPage, setActiveLibraryPage] = useState<"projects" | "characters" | "resources" | "favourites" | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>(null);
  // Keep async workspace operations aware of the currently visible workspace.
  const activeWorkspacePathRef = useRef<string | null>(null);
  activeWorkspacePathRef.current = activeWorkspace?.path ?? null;
  const [workspaceRestoreComplete, setWorkspaceRestoreComplete] = useState(false);
  const workspaceSelectionMadeRef = useRef(false);

  useEffect(() => {
    try { localStorage.setItem("brs.sidebar-collapsed", String(sidebarCollapsed)); } catch { /* Optional UI preference. */ }
  }, [sidebarCollapsed]);
  useEffect(() => {
    let disposed = false;
    setWorkspaceIcon("om:1F319");
    if (activeWorkspace) {
      void getWorkspaceIcon(activeWorkspace.manifest.id)
        .then((icon) => { if (!disposed) setWorkspaceIcon(icon); })
        .catch((error: unknown) => console.warn("Could not load workspace icon:", error));
    }
    return () => { disposed = true; };
  }, [activeWorkspace?.manifest.id]);
  const changeWorkspaceIcon = (icon: string) => {
    if (!activeWorkspace) return;
    const id = activeWorkspace.manifest.id;
    setWorkspaceIcon(icon);
    void saveWorkspaceIcon(id, icon).catch((error: unknown) =>
      console.error("Could not save workspace icon:", error));
  };

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
          formerNames: item.formerNames,
          avatar: characterAccentColor(item.accent),
          description: item.subtitle || item.description,
          avatarAssetPath: null,
          portraitResourceId: item.portraitResourceId,
          portraitFit: item.portraitFit ?? "contain" as const,
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
  const messageImageKeys = messages.flatMap((message) => message.images ?? [])
    .map((image) => `${image.id}:${image.relativePath}`).join("|");

  useEffect(() => {
    let disposed = false;
    let urls: Record<string, string> = {};
    setMessageImageUrls({});
    const images = messages.flatMap((message) => message.images ?? []);
    setMessageImagesLoading(Boolean(activeWorkspace && images.length));
    if (activeWorkspace) {
      void loadMessageImages(activeWorkspace.path, images)
        .then((loaded) => {
          urls = loaded;
          if (disposed) Object.values(loaded).forEach((url) => URL.revokeObjectURL(url));
          else {
            setMessageImageUrls(loaded);
            setMessageImagesLoading(false);
          }
        })
        .catch((reason) => {
          if (!disposed) setMessageImagesLoading(false);
          console.warn("Could not load chat images:", reason);
        });
    }
    return () => {
      disposed = true;
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  // The attachment key only changes when saved image references change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.path, messageImageKeys]);

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
  const sceneBackground = safeSceneBackground(activeScene?.background);
  const sceneBackgroundPath = sceneBackground?.relativePath ?? null;
  const backgroundImageKey = `${activeWorkspace?.path ?? ""}::${sceneBackgroundPath ?? ""}`;
  const backgroundImageUrl = activeWorkspace && sceneBackgroundPath
    ? peekSceneBackground(activeWorkspace.path, sceneBackgroundPath) ??
      (backgroundImageState?.key === backgroundImageKey ? backgroundImageState.url : null)
    : null;

  useEffect(() => {
    let disposed = false;
    setBackgroundImageState(null);
    if (activeWorkspace && sceneBackground) {
      void getCachedSceneBackground(activeWorkspace.path, sceneBackground)
        .then((url) => {
          if (!disposed) setBackgroundImageState({ key: backgroundImageKey, url });
        })
        .catch((reason) => {
          if (!disposed) console.warn("Could not load this scene's background:", reason);
        });
    }
    return () => { disposed = true; };
    // The LRU owns object URL lifetime, so switching scenes does not revoke/reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.path, sceneBackgroundPath]);


  // Keep nearby scene backgrounds warm so navigating between scenes has no
  // repeated disk reads; cache size is bounded independently.
  useEffect(() => {
    if (!activeWorkspace) return;
    const previews = scenes.filter((scene) => Boolean(scene.background))
      .map((scene) => safeSceneBackground(scene.background))
      .filter((item): item is SceneBackground => item !== null);
    prefetchSceneBackgrounds(activeWorkspace.path, previews);
  }, [activeWorkspace?.path, scenes]);

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
    // Invalidate any scene-draft load started by the workspace we are leaving.
    draftLoadRequestRef.current += 1;
    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
    setWorkspaceError("");
    setDraftHtml("");
    composerImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    composerImageUrlsRef.current.clear();
    setComposerImages([]);
    setImageSourceOpen(false);
    setSystemImageToSave(null);
    setEditingMessageId(null);
    setOpenMessageActionsId(null);
    setIsSceneOptionsOpen(false);
    setMarkdownExportNotice(null);
    setBackgroundSettingsOpen(false);
    setFavouriteJump(null);
    setChatLightbox(null);
    setCleanConfirmationStep(null);
    setScenePendingDeletion(null);
    setFolderPendingDeletion(null);
    setCategoryPendingDeletion(null);
    setIsCreatingScene(false);
    setSceneNameDraft("");
    setIsCreatingCategory(false);
    setCategoryNameDraft("");
    setIsCreatingFolder(false);
    setFolderNameDraft("");
    setPendingSceneMoveId(null);
    setDraggingNode(null);
    setDraggingSceneId(null);
    pointerDragRef.current = null;
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
          // Workspace may have changed while the migration was being saved.
          if (cancelled) return;
        }
        if (cancelled) return;
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
    // Restore physical pixels rather than CSS dimensions so display scaling is respected.
    const restoreSize = async () => {
      const raw = localStorage.getItem(SAVED_WINDOW_SIZE_KEY);
      if (!raw || await appWindow.isMaximized()) return;
      const saved: unknown = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;
      const size = saved as { width?: unknown; height?: unknown };
      if (typeof size.width !== "number" || typeof size.height !== "number" ||
          !Number.isFinite(size.width) || !Number.isFinite(size.height) ||
          size.width < 760 || size.height < 560 || size.width > 16000 || size.height > 16000) return;
      await appWindow.setSize(new PhysicalSize(size.width, size.height));
    };
    const recordSize = async () => {
      if (await appWindow.isMaximized()) return;
      const size = await appWindow.outerSize();
      if (size.width >= 760 && size.height >= 560) {
        localStorage.setItem(SAVED_WINDOW_SIZE_KEY, JSON.stringify({ width: size.width, height: size.height }));
      }
    };
    void restoreSize().catch((error) => console.warn("Could not restore BRS window size:", error));
    void appWindow.isMaximized().then((value) => { if (!cancelled) setIsMaximized(value); }).catch((error) => console.warn("Could not check maximised state:", error));
    void appWindow.onResized(() => {
      void appWindow.isMaximized().then((value) => {
        if (!cancelled) setIsMaximized(value);
        if (!cancelled && !value) void recordSize().catch((error) => console.warn("Could not remember BRS window size:", error));
      }).catch(() => undefined);
    }).then((unlisten) => { if (cancelled) unlisten(); else stopResize = unlisten; });
    // Window size is saved on resize; do not intercept the close request.
    // Awaiting another Tauri window command from a close-request handler can delay closing.
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
    clearComposerImages();
    setComposerImages((message.images ?? []).map((image) => ({ ...image })));

    if (editorRef.current) {
      editorRef.current.innerHTML = editableSource;
      editorRef.current.focus();
    }
  }

  function cancelEditingMessage() {
    setEditingMessageId(null);
    clearComposerImages();
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
    const confirmed = await confirm("Delete this message? This cannot be undone.", { title: "Delete message", confirmLabel: "Delete", destructive: true });
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
    const workspacePath = activeWorkspace.path;
    const sceneId = activeSceneId;
    const nextScenes = scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, messages: nextMessages } : scene,
    );
    const content: WorkspaceContent = { schemaVersion: 1, scenes: nextScenes, folders, categories };
    try {
      await saveWorkspaceContent(workspacePath, content);
      if (activeWorkspacePathRef.current !== workspacePath) return false;
      setScenes(nextScenes);
      setMessages(nextMessages);
      if (activeWorkspacePathRef.current === workspacePath) setWorkspaceError("");
      return true;
    } catch (reason) {
      if (activeWorkspacePathRef.current === workspacePath) {
        setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
      }
      return false;
    }
  }

  async function saveActiveSceneBackground(
    settings: SceneBackgroundAdjustments | null, file: File | null,
  ): Promise<void> {
    if (!activeWorkspace || !activeSceneId || backgroundSavingRef.current) {
      throw new Error("Choose an active scene before saving its background.");
    }
    const workspacePath = activeWorkspace.path;
    const sceneId = activeSceneId;
    const previousScene = scenes.find((item) => item.id === sceneId);
    if (!previousScene) throw new Error("This scene no longer exists.");
    backgroundSavingRef.current = true;
    try {
      const storedImage = file ? await saveSceneBackgroundFile(workspacePath, file) : null;
      const existingImage = safeSceneBackground(previousScene.background);
      if (settings && !storedImage && !existingImage) {
        throw new Error("Choose a background image first.");
      }
      const nextBackground: SceneBackground | undefined = settings
        ? { ...(storedImage ?? existingImage!), ...settings }
        : undefined;
      const nextScenes = scenes.map((item) =>
        item.id === sceneId ? { ...item, background: nextBackground } : item,
      );
      await saveWorkspaceContent(workspacePath, {
        schemaVersion: 1, scenes: nextScenes, folders, categories,
      });
      if (activeWorkspacePathRef.current !== workspacePath) return;
      setScenes(nextScenes);
      setWorkspaceError("");
      const oldPath = existingImage?.relativePath;
      if (oldPath && oldPath !== nextBackground?.relativePath &&
        !nextScenes.some((item) => item.background?.relativePath === oldPath)) {
        // The new workspace manifest is already durable; deleting an orphan is best-effort.
        forgetSceneBackground(workspacePath, oldPath);
        await deleteWorkspaceFile(workspacePath, oldPath).catch((reason) =>
          console.warn("Could not clean up an unused chat background:", reason));
      }
    } catch (reason) {
      if (activeWorkspacePathRef.current === workspacePath) {
        setWorkspaceError(`Could not save chat background: ${reason instanceof Error ? reason.message : String(reason)}`);
      }
      throw reason;
    } finally {
      backgroundSavingRef.current = false;
    }
  }

  async function exportChatMarkdown(allScenes: boolean) {
    if (!activeWorkspace || workspaceLoading || markdownExportBusy) return;
    const selected = allScenes ? scenes : activeScene ? [activeScene] : [];
    if (!selected.length) return;
    const path = activeWorkspace.path;
    const name = activeWorkspace.manifest.name;
    setIsSceneOptionsOpen(false);
    setMarkdownExportNotice(null);
    setMarkdownExportBusy(true);
    try {
      const exportedFolder = await exportScenesToMarkdown(path, name, selected);
      if (exportedFolder && activeWorkspacePathRef.current === path) {
        setMarkdownExportNotice({ kind: "success", text: exportedFolder });
      }
    } catch (reason) {
      if (activeWorkspacePathRef.current === path) {
        setMarkdownExportNotice({ kind: "error",
          text: reason instanceof Error ? reason.message : String(reason) });
      }
    } finally {
      setMarkdownExportBusy(false);
    }
  }

  async function toggleFavourite(sceneId: string, messageId?: number) {
    if (!activeWorkspace || workspaceLoading || favouritePendingRef.current) return;
    const scene = scenes.find((entry) => entry.id === sceneId);
    if (!scene || (messageId !== undefined && !scene.messages.some((entry) => entry.id === messageId))) return;
    const workspacePath = activeWorkspace.path;
    const changedAt = Date.now();
    const nextScenes = scenes.map((entry) => {
      if (entry.id !== sceneId) return entry;
      if (messageId === undefined) {
        return { ...entry, favourite: !entry.favourite, favouritedAt: entry.favourite ? undefined : changedAt };
      }
      return {
        ...entry,
        messages: entry.messages.map((message) => message.id === messageId
          ? { ...message, favourite: !message.favourite, favouritedAt: message.favourite ? undefined : changedAt }
          : message),
      };
    });
    favouritePendingRef.current = true;
    setFavouriteBusy(true);
    try {
      await saveWorkspaceContent(workspacePath, { schemaVersion: 1, scenes: nextScenes, folders, categories });
      if (activeWorkspacePathRef.current !== workspacePath) return;
      setScenes(nextScenes);
      if (activeSceneId === sceneId) setMessages(nextScenes.find((entry) => entry.id === sceneId)?.messages ?? []);
      setWorkspaceError("");
    } catch (reason) {
      if (activeWorkspacePathRef.current === workspacePath) {
        setWorkspaceError(`Could not update favourite: ${reason instanceof Error ? reason.message : String(reason)}`);
      }
    } finally {
      favouritePendingRef.current = false;
      setFavouriteBusy(false);
    }
  }

  function openFavourite(sceneId: string, messageId?: number) {
    const scene = scenes.find((entry) => entry.id === sceneId);
    if (!scene) return;
    setFavouriteJump(messageId === undefined ? null : { sceneId, messageId });
    if (activeSceneId !== sceneId) void selectScene(scene);
    else setActiveLibraryPage(null);
  }

  useEffect(() => {
    if (!favouriteJump || activeLibraryPage !== null || favouriteJump.sceneId !== activeSceneId ||
        !messages.some((message) => message.id === favouriteJump.messageId)) return;
    const frame = window.requestAnimationFrame(() => {
      const target = conversationRef.current?.querySelector<HTMLElement>(
        `[data-message-id="${favouriteJump.messageId}"]`,
      );
      if (!target) return;
      const reducedMotion = document.documentElement.dataset.animations === "off" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "center", behavior: reducedMotion ? "instant" : "smooth" });
      target.classList.add("message-favourite-target");
      window.setTimeout(() => target.classList.remove("message-favourite-target"), 1800);
      setFavouriteJump(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeLibraryPage, activeSceneId, favouriteJump, messages]);

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
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setScenes(nextScenes);
      setActiveSceneId(scene.id);
      setBackgroundSettingsOpen(false);
      setMessages([]);
      clearComposerImages();
      setImageSourceOpen(false);
      setSystemImageToSave(null);
      setDraftHtml("");
      setEditingMessageId(null);
      setWorkspaceError("");
      setSceneNameDraft("");
      setIsCreatingScene(false);
    } catch (reason) {
      if (activeWorkspacePathRef.current === activeWorkspace.path) {
        setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
      }
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
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setScenes(nextScenes);
      if (activeSceneId === scene.id) {
        const nextActiveScene = nextScenes[0] ?? null;
        setActiveSceneId(nextActiveScene?.id ?? null);
        setBackgroundSettingsOpen(false);
        setMessages(nextActiveScene?.messages ?? []);
        clearComposerImages();
        setImageSourceOpen(false);
        setSystemImageToSave(null);
        setDraftHtml("");
        setEditingMessageId(null);
        setOpenMessageActionsId(null);
      }
      setWorkspaceError("");
      setScenePendingDeletion(null);
    } catch (reason) {
      if (activeWorkspacePathRef.current === activeWorkspace.path) {
        setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
      }
    }
  }

  async function updateTreeIcon(kind: "folder" | "scene", id: string, icon: string) {
    if (!activeWorkspace || workspaceLoading) return;
    const workspacePath = activeWorkspace.path;
    const nextFolders = kind === "folder"
      ? folders.map((item) => item.id === id ? { ...item, icon } : item)
      : folders;
    const nextScenes = kind === "scene"
      ? scenes.map((item) => item.id === id ? { ...item, icon } : item)
      : scenes;
    try {
      await saveWorkspaceContent(workspacePath, {
        schemaVersion: 1, scenes: nextScenes, folders: nextFolders, categories,
      });
      if (activeWorkspacePathRef.current !== workspacePath) return;
      if (kind === "folder") setFolders(nextFolders);
      else setScenes(nextScenes);
      setWorkspaceError("");
    } catch (error) {
      if (activeWorkspacePathRef.current === workspacePath) {
        setWorkspaceError(error instanceof Error ? error.message : String(error));
      }
    }
  }

  async function renameFolder(folder: WorkspaceFolder) {
    if (!activeWorkspace || workspaceLoading) return;
    const name = (await prompt("Choose a new name for this folder.", folder.name, { title: "Rename folder" }))?.trim();
    if (!name || name === folder.name) return;
    if (folders.some((item) => item.id !== folder.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A folder with that name already exists in this roleplay space.");
      return;
    }
    const nextFolders = folders.map((item) => item.id === folder.id ? { ...item, name } : item);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders: nextFolders, categories });
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setFolders(nextFolders);
      setWorkspaceError("");
    } catch (reason) {
      if (activeWorkspacePathRef.current === activeWorkspace.path) {
        setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
      }
    }
  }

  function renameScene(scene: WorkspaceScene) {
    if (!activeWorkspace || workspaceLoading) return;
    setScenePendingRename(scene);
    setSceneRenameDraft(scene.name);
    setSceneRenameError("");
  }

  function cancelRenameScene() {
    if (sceneRenameBusy) return;
    setScenePendingRename(null);
    setSceneRenameDraft("");
    setSceneRenameError("");
  }

  async function confirmRenameScene() {
    const scene = scenePendingRename;
    if (!scene || !activeWorkspace || workspaceLoading || sceneRenameBusy) return;
    const name = sceneRenameDraft.trim();
    if (!name) {
      setSceneRenameError("Enter a name for this scene.");
      return;
    }
    if (name === scene.name) {
      cancelRenameScene();
      return;
    }
    if (scenes.some((item) => item.id !== scene.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setSceneRenameError("A scene with that name already exists in this workspace.");
      return;
    }

    const workspacePath = activeWorkspace.path;
    const nextScenes = scenes.map((item) => item.id === scene.id ? { ...item, name } : item);
    setSceneRenameBusy(true);
    setSceneRenameError("");
    try {
      await saveWorkspaceContent(workspacePath, { schemaVersion: 1, scenes: nextScenes, folders, categories });
      if (activeWorkspacePathRef.current !== workspacePath) return;
      setScenes(nextScenes);
      setWorkspaceError("");
      setScenePendingRename(null);
      setSceneRenameDraft("");
    } catch (reason) {
      if (activeWorkspacePathRef.current === workspacePath) {
        setSceneRenameError(reason instanceof Error ? reason.message : String(reason));
      }
    } finally {
      setSceneRenameBusy(false);
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
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setScenes(nextScenes);
      setWorkspaceError("");
    } catch (reason) { if (activeWorkspacePathRef.current === activeWorkspace.path) setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function moveSceneToFolder(sceneId: string, folderId: string | null) {
    if (!activeWorkspace || workspaceLoading) return;
    const nextScenes = scenes.map((scene) => scene.id === sceneId ? { ...scene, folderId } : scene);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders, categories });
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setScenes(nextScenes);
      if (folderId) {
        setExpandedFolderIds((current) => current.includes(folderId) ? current : [...current, folderId]);
        setActiveFolderId(folderId);
      } else {
        setActiveFolderId(null);
      }
      setWorkspaceError("");
    } catch (reason) { if (activeWorkspacePathRef.current === activeWorkspace.path) setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
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
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setCategories(nextCategories);
      setExpandedCategoryIds((current) => [...current, category.id]);
      setActiveCategoryId(category.id);
      setCategoryNameDraft("");
      setIsCreatingCategory(false);
      setWorkspaceError("");
    } catch (reason) { if (activeWorkspacePathRef.current === activeWorkspace.path) setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function renameCategory(category: WorkspaceCategory) {
    if (!activeWorkspace || workspaceLoading) return;
    const name = (await prompt("Choose a new name for this category.", category.name, { title: "Rename category" }))?.trim();
    if (!name || name === category.name) return;
    if (categories.some((item) => item.id !== category.id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setWorkspaceError("A category with that name already exists in this roleplay space.");
      return;
    }
    const nextCategories = categories.map((item) => item.id === category.id ? { ...item, name } : item);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders, categories: nextCategories });
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setCategories(nextCategories);
      setWorkspaceError("");
    } catch (reason) { if (activeWorkspacePathRef.current === activeWorkspace.path) setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function moveFolder(folderId: string, categoryId: string | null) {
    if (!activeWorkspace || workspaceLoading) return;
    const nextFolders = folders.map((folder) => folder.id === folderId ? { ...folder, categoryId } : folder);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders: nextFolders, categories });
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setFolders(nextFolders);
      setWorkspaceError("");
    } catch (reason) { if (activeWorkspacePathRef.current === activeWorkspace.path) setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
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
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setFolders(nextFolders);
      setWorkspaceError("");
    } catch (reason) { if (activeWorkspacePathRef.current === activeWorkspace.path) setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
  }

  async function reorderCategories(draggedId: string, targetId: string) {
    if (!activeWorkspace || workspaceLoading || draggedId === targetId) return;
    const from = categories.findIndex((item) => item.id === draggedId), to = categories.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const nextCategories = [...categories], [moved] = nextCategories.splice(from, 1);
    nextCategories.splice(to, 0, moved);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes, folders, categories: nextCategories });
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setCategories(nextCategories);
      setWorkspaceError("");
    } catch (reason) { if (activeWorkspacePathRef.current === activeWorkspace.path) setWorkspaceError(reason instanceof Error ? reason.message : String(reason)); }
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
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setFolders(nextFolders);
      setScenes(nextScenes);
      setPendingSceneMoveId(null);
      setExpandedFolderIds((current) => [...current, folder.id]);
      setActiveFolderId(folder.id);
      setFolderNameDraft("");
      setIsCreatingFolder(false);
      setWorkspaceError("");
    } catch (reason) {
      if (activeWorkspacePathRef.current === activeWorkspace.path) {
        setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
      }
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
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setFolders(nextFolders);
      setCategories(nextCategories);
      setExpandedCategoryIds((current) => current.filter((id) => id !== category.id));
      if (activeCategoryId === category.id) setActiveCategoryId(null);
      setCategoryPendingDeletion(null);
      setWorkspaceError("");
    } catch (reason) {
      if (activeWorkspacePathRef.current === activeWorkspace.path) {
        setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
      }
    }
  }

  async function confirmDeleteFolder() {
    const folder = folderPendingDeletion;
    if (!folder || !activeWorkspace || workspaceLoading) return;
    const nextFolders = folders.filter((item) => item.id !== folder.id);
    const nextScenes = scenes.map((scene) => scene.folderId === folder.id ? { ...scene, folderId: null } : scene);
    try {
      await saveWorkspaceContent(activeWorkspace.path, { schemaVersion: 1, scenes: nextScenes, folders: nextFolders, categories });
      if (activeWorkspacePathRef.current !== activeWorkspace.path) return;
      setFolders(nextFolders);
      setScenes(nextScenes);
      setExpandedFolderIds((current) => current.filter((id) => id !== folder.id));
      if (activeFolderId === folder.id) setActiveFolderId(null);
      setFolderPendingDeletion(null);
      setWorkspaceError("");
    } catch (reason) {
      if (activeWorkspacePathRef.current === activeWorkspace.path) {
        setWorkspaceError(reason instanceof Error ? reason.message : String(reason));
      }
    }
  }

  async function selectScene(scene: WorkspaceScene) {
    setBackgroundSettingsOpen(false);
    setActiveLibraryPage(null);
    const requestId = ++draftLoadRequestRef.current;
    setActiveSceneId(scene.id);
    setMessages(scene.messages);
    clearComposerImages();
    setImageSourceOpen(false);
    setSystemImageToSave(null);
    setDraftHtml("");
    setExpressionSlashQuery(null);
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

  function applyExpressionCommand(command: string): boolean {
    const expression = resolveExpressionCommand(command);
    if (!expression || editingMessageId !== null || selectedCharacter === "You") return false;
    setSelectedExpression(expression.emoji);
    setShowExpressions(false);
    setExpressionSlashQuery(null);
    const editor = editorRef.current;
    if (editor) {
      editor.innerHTML = "";
      editor.focus();
    }
    handleDraftInput("");
    return true;
  }

  function handleDraftInput(html: string) {
    const text = editorRef.current?.textContent ?? "";
    if (editingMessageId === null && selectedCharacter !== "You") {
      const expression = resolveExpressionCommand(text);
      // Typing a space after a complete command applies it immediately.
      if (expression && /\s$/.test(text)) {
        setSelectedExpression(expression.emoji);
        setShowExpressions(false);
        setExpressionSlashQuery(null);
        if (editorRef.current) editorRef.current.innerHTML = "";
        html = "";
      } else {
        setExpressionSlashQuery(commandQuery(text));
      }
    } else setExpressionSlashQuery(null);
    setDraftHtml(html);
    if (!activeWorkspace || !activeSceneId || editingMessageId !== null || workspaceLoading) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    const workspacePath = activeWorkspace.path;
    const sceneId = activeSceneId;
    draftSaveTimerRef.current = setTimeout(() => {
      void saveWorkspaceDraft(workspacePath, sceneId, html)
        .then(() => {
          if (activeWorkspacePathRef.current === workspacePath && activeSceneId === sceneId) {
            setWorkspaceError((current) => current.startsWith("Could not save draft:") ? "" : current);
          }
        })
        .catch((reason: unknown) => {
          if (activeWorkspacePathRef.current === workspacePath && activeSceneId === sceneId) {
            setWorkspaceError(`Could not save draft: ${reason instanceof Error ? reason.message : String(reason)}`);
          }
        });
    }, 500);
  }

  function clearComposerImages() {
    composerImageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    composerImageUrlsRef.current.clear();
    setComposerImages([]);
  }

  function removeComposerImage(id: string) {
    setComposerImages((current) => {
      const removed = current.find((image) => image.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
        composerImageUrlsRef.current.delete(removed.previewUrl);
      }
      return current.filter((image) => image.id !== id);
    });
  }

  function attachComposerImage(file: File, fromSystem: boolean) {
    if (!activeWorkspace || !activeSceneId) throw new Error("Choose a scene first.");
    if (composerImages.length >= 6) throw new Error("You can attach up to six images per message.");
    const previewUrl = URL.createObjectURL(file);
    composerImageUrlsRef.current.add(previewUrl);
    setComposerImages((current) => [...current, {
      id: crypto.randomUUID(), fileName: file.name, mimeType: file.type,
      file, previewUrl,
    }]);
    if (fromSystem) setSystemImageToSave(file);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !activeSceneId || workspaceLoading) return;
    const workspacePath = activeWorkspace.path;
    const sceneId = activeSceneId;
    const isEditingMessage = editingMessageId !== null;
    const editor = editorRef.current;
    const plainText = editor?.innerText.trim() ?? "";
    if (!isEditingMessage && applyExpressionCommand(plainText)) return;
    if (!plainText && !composerImages.length) return;
    let savedImages;
    try {
      savedImages = await saveMessageImages(workspacePath, composerImages);
    } catch (reason) {
      setWorkspaceError(`Could not save message image: ${reason instanceof Error ? reason.message : String(reason)}`);
      return;
    }

    const source = markdownSourceFromHtml(editor?.innerHTML ?? plainText);
    const contentRoot = document.createElement("div");
    contentRoot.innerHTML = source;
    applyMarkdownToTextNodes(contentRoot);
    const content = sanitiseHtml(contentRoot.innerHTML);

    let nextMessages: Message[];
    if (editingMessageId !== null) {
      nextMessages = messages.map((message) =>
        message.id === editingMessageId
          ? { ...message, content, source, images: savedImages, history: [...(message.history ?? []), message.content] }
          : message,
      );
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
          images: savedImages,
          avatar: character.avatar,
          expression: selectedCharacter === "You" ? "" : selectedExpression,
          avatarAssetPath: character.avatarAssetPath ?? null,
          characterId: selectedCharacter === "You" ? undefined : character.id,
        },
      ];
    }

    const enteringId = editingMessageId === null ? nextMessages[nextMessages.length - 1]?.id : null;
    if (!isEditingMessage && draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
    if (typeof enteringId === "number") setEnteringMessageId(null);
    const saved = await persistSceneMessages(nextMessages);
    if (!saved) return;
    clearComposerImages();
    if (isEditingMessage) setEditingMessageId(null);
    if (!isEditingMessage) {
      try {
        await saveWorkspaceDraft(workspacePath, sceneId, "");
      } catch (reason) {
        if (activeWorkspace?.path === workspacePath && activeSceneId === sceneId) {
          setWorkspaceError(`Could not clear saved draft: ${reason instanceof Error ? reason.message : String(reason)}`);
        }
      }
    }
    if (typeof enteringId === "number" && activeWorkspace?.path === workspacePath && activeSceneId === sceneId) {
      // Let React mount the message first, then apply the animation class on a later frame.
      // This reliably restarts the keyframes instead of mounting the element already animated.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        setEnteringMessageId(enteringId);
        window.setTimeout(() => setEnteringMessageId((current) => current === enteringId ? null : current), 900);
      }));
    }
    if (activeWorkspace?.path === workspacePath && activeSceneId === sceneId) {
      setDraftHtml("");
      if (editor) editor.innerHTML = "";
    }
  }
  return (
    <main className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`} style={{ "--sidebar-width": `${sidebarCollapsed ? 76 : sidebarWidth}px` } as CSSProperties}>
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

      <div className="app-content" style={{ "--sidebar-width": `${sidebarCollapsed ? 76 : sidebarWidth}px` } as CSSProperties}>
        <aside className={`sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
          <div className="brand workspace-brand">
            <div className="workspace-switcher-slot brand-workspace-switcher">
              <WorkspaceSwitcher activeWorkspace={activeWorkspace} icon={workspaceIcon}
                compact={sidebarCollapsed}
                onSelect={(workspace) => { workspaceSelectionMadeRef.current = true; setActiveWorkspace(workspace); }}
                onAddNew={() => setIsWorkspaceManagerOpen(true)} />
            </div>
            <StudioIconPicker className="workspace-brand-icon-editor" value={workspaceIcon}
              onChange={changeWorkspaceIcon} title="Change workspace icon"
              disabled={!activeWorkspace} compact />
            <button type="button" className="sidebar-collapse-button"
              onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}>
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          
          <div className="sidebar-section"><div className="section-heading"><span>WORKSPACE</span></div><button className={`nav-item ${activeLibraryPage === "projects" ? "active" : ""}`} type="button" onClick={() => setActiveLibraryPage("projects")}><span className="nav-icon">▦</span>Projects</button><button className="nav-item" type="button" onClick={() => setActiveLibraryPage("characters")}><span className="nav-icon">♧</span>Characters</button><button className="nav-item" type="button" onClick={() => setActiveLibraryPage("resources")}><span className="nav-icon">▧</span>Resources</button><button className={`nav-item ${activeLibraryPage === "favourites" ? "active" : ""}`} type="button" onClick={() => setActiveLibraryPage("favourites")}><span className="nav-icon"><Heart size={17} /></span>Favourites</button><button type="button" className="nav-item sidebar-search-nav" onClick={() => setIsGlobalSearchOpen(true)} title="Search characters and resources" aria-label="Search characters and resources"><span className="nav-icon"><Search size={17} /></span>Search</button></div>
          <div className={`sidebar-section scenes-section ${isScenesCollapsed ? "scenes-collapsed" : ""}`}>
            <div className="section-heading roleplay-space-heading">
              <button type="button" className="scenes-collapse-button" aria-expanded={!isScenesCollapsed} onClick={() => setIsScenesCollapsed((collapsed) => !collapsed)}>
                <span>ROLEPLAY SPACE</span>{isScenesCollapsed ? <ChevronRight size={14} className="scenes-collapse-chevron" /> : <ChevronDown size={14} className="scenes-collapse-chevron" />}
              </button>
              <button type="button" className="tiny-button roleplay-create-button" title="Create category" aria-label="Create category" onClick={() => { setCategoryNameDraft(""); setIsCreatingCategory(true); }}><Plus size={15} /></button><button type="button" className="tiny-button roleplay-create-button" title="New root folder" aria-label="New root folder" disabled={!activeWorkspace || workspaceLoading} onClick={() => { setActiveCategoryId(null); setPendingSceneMoveId(null); setFolderNameDraft(""); setIsCreatingFolder(true); }}><FolderPlus size={15} /></button>
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
                      <button type="button" className="tiny-button tree-folder-create" title="New folder in category" aria-label={`New folder in ${category.name}`} onClick={() => { setActiveCategoryId(category.id); setActiveFolderId(null); setPendingSceneMoveId(null); setFolderNameDraft(""); setIsCreatingFolder(true); }}><FolderPlus size={13} /></button>
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
                            <button type="button" className="folder-select-button" onClick={() => { setActiveFolderId(folder.id); setActiveCategoryId(category.id); }}><StudioIcon value={folder.icon ?? "📁"} /><span>{folder.name}</span><small>{folderScenes.length}</small></button>
                            <StudioIconPicker className="tree-icon-editor" value={folder.icon ?? "📁"} onChange={(icon) => void updateTreeIcon("folder", folder.id, icon)} title={`Change icon for ${folder.name}`} compact />
                             <button type="button" className="rename-node-button folder-rename-button" title="Rename folder" aria-label="Rename folder" onClick={() => void renameFolder(folder)}><Pencil size={12} /></button>
                            <button type="button" className="folder-delete-button" title="Delete folder" aria-label="Delete folder" onClick={() => setFolderPendingDeletion(folder)}><Trash2 size={13} /></button>
                          </div>
                          {folderExpanded && <div className="folder-scenes">{folderScenes.map((scene) => (<div key={scene.id} onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData("text/plain", scene.id); setDraggingNode({ type: "scene", id: scene.id }); setDraggingSceneId(scene.id); }} onDragEnd={() => { setDraggingNode(null); setDraggingSceneId(null); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "scene") void reorderScenes(draggingNode.id, scene.id); setDraggingNode(null); setDraggingSceneId(null); }} data-drop-type="scene" data-drop-id={scene.id} className={`scene-row ${activeSceneId === scene.id ? "selected" : ""} ${draggingSceneId === scene.id ? "scene-dragging" : ""}`}><span className="tree-drag-handle" title="Drag scene" aria-label={`Drag ${scene.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "scene", id: scene.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span><button type="button" className="scene-item" onClick={() => selectScene(scene)}><span className="scene-icon"><StudioIcon value={scene.icon} /></span><span className="scene-copy"><span className="scene-name">{scene.name}</span><span className="scene-detail">{scene.messages.length} {scene.messages.length === 1 ? "message" : "messages"}</span></span></button><StudioIconPicker className="tree-icon-editor" value={scene.icon} onChange={(icon) => void updateTreeIcon("scene", scene.id, icon)} title={`Change icon for ${scene.name}`} compact />
                          <button type="button" className="rename-node-button scene-rename-button" title="Rename scene" aria-label="Rename scene" onClick={() => void renameScene(scene)}><Pencil size={12} /></button><button type="button" className="scene-delete-button" title="Delete scene" aria-label="Delete scene" onClick={() => void deleteScene(scene)}><Trash2 size={14} /></button></div>))}</div>}
                        </div>;
                      })}
                      
                    </div>}
                  </div>;
                })}
                {folders.filter((folder) => !folder.categoryId || !categories.some((category) => category.id === folder.categoryId)).map((folder) => {
                  const folderScenes = scenes.filter((scene) => scene.folderId === folder.id);
                  const expanded = expandedFolderIds.includes(folder.id);
                  return <div key={folder.id} className={`folder-group ${draggingNode?.type === "folder" && draggingNode.id === folder.id ? "tree-node-dragging" : ""}`} data-drop-type="folder" data-drop-id={folder.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "folder") void reorderFolders(draggingNode.id, folder.id, null); if (draggingNode?.type === "scene") void moveSceneToFolder(draggingNode.id, folder.id); setDraggingNode(null); }}>
                    <div className="folder-row"><span className="tree-drag-handle" title="Drag folder" aria-label={`Drag ${folder.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "folder", id: folder.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span><button type="button" className="folder-expand-button" onClick={() => setExpandedFolderIds((current) => expanded ? current.filter((id) => id !== folder.id) : [...current, folder.id])}>{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button><button type="button" className="folder-select-button" onClick={() => { setActiveFolderId(folder.id); setActiveCategoryId(null); }}><StudioIcon value={folder.icon ?? "📁"} /><span>{folder.name}</span><small>{folderScenes.length}</small></button><StudioIconPicker className="tree-icon-editor" value={folder.icon ?? "📁"} onChange={(icon) => void updateTreeIcon("folder", folder.id, icon)} title={`Change icon for ${folder.name}`} compact />
                             <button type="button" className="rename-node-button folder-rename-button" title="Rename folder" aria-label="Rename folder" onClick={() => void renameFolder(folder)}><Pencil size={12} /></button><button type="button" className="folder-delete-button" title="Delete folder" aria-label="Delete folder" onClick={() => setFolderPendingDeletion(folder)}><Trash2 size={13} /></button></div>
                    {expanded && <div className="folder-scenes">{folderScenes.map((scene) => (<div key={scene.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "scene") void reorderScenes(draggingNode.id, scene.id); setDraggingNode(null); setDraggingSceneId(null); }} data-drop-type="scene" data-drop-id={scene.id} className={`scene-row ${activeSceneId === scene.id ? "selected" : ""} ${draggingSceneId === scene.id ? "scene-dragging" : ""}`}><span className="tree-drag-handle" title="Drag scene" aria-label={`Drag ${scene.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "scene", id: scene.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span><button type="button" className="scene-item" onClick={() => selectScene(scene)}><span className="scene-icon"><StudioIcon value={scene.icon} /></span><span className="scene-copy"><span className="scene-name">{scene.name}</span><span className="scene-detail">{scene.messages.length} {scene.messages.length === 1 ? "message" : "messages"}</span></span></button><StudioIconPicker className="tree-icon-editor" value={scene.icon} onChange={(icon) => void updateTreeIcon("scene", scene.id, icon)} title={`Change icon for ${scene.name}`} compact />
                          <button type="button" className="rename-node-button scene-rename-button" title="Rename scene" aria-label="Rename scene" onClick={() => void renameScene(scene)}><Pencil size={12} /></button><button type="button" className="scene-delete-button" title="Delete scene" aria-label="Delete scene" onClick={() => void deleteScene(scene)}><Trash2 size={14} /></button></div>))}</div>}
                  </div>;
                })}
                <div className="folder-group unfiled-scenes" data-drop-type="unfiled" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "scene") void moveSceneToFolder(draggingNode.id, null); setDraggingNode(null); }}>
                  <div className="folder-row" onClick={() => setActiveFolderId(null)}><button type="button" className="folder-expand-button" onClick={() => setIsUnfiledScenesCollapsed((collapsed) => !collapsed)}>{isUnfiledScenesCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button><Folder size={14} className="unfiled-folder-icon" /><span className="unfiled-label">No category</span><small>{scenes.filter((scene) => !scene.folderId || !folders.some((folder) => folder.id === scene.folderId)).length}</small></div>
                  {!isUnfiledScenesCollapsed && <div className="folder-scenes">{scenes.filter((scene) => !scene.folderId || !folders.some((folder) => folder.id === scene.folderId)).map((scene) => (<div key={scene.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (draggingNode?.type === "scene") void reorderScenes(draggingNode.id, scene.id); setDraggingNode(null); setDraggingSceneId(null); }} data-drop-type="scene" data-drop-id={scene.id} className={`scene-row ${activeSceneId === scene.id ? "selected" : ""} ${draggingSceneId === scene.id ? "scene-dragging" : ""}`}><span className="tree-drag-handle" title="Drag scene" aria-label={`Drag ${scene.name}`} onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); pointerDragRef.current = { type: "scene", id: scene.id, startX: event.clientX, startY: event.clientY, active: false }; }}><GripVertical size={13} /></span><button type="button" className="scene-item" onClick={() => selectScene(scene)}><span className="scene-icon"><StudioIcon value={scene.icon} /></span><span className="scene-copy"><span className="scene-name">{scene.name}</span><span className="scene-detail">{scene.messages.length} {scene.messages.length === 1 ? "message" : "messages"}</span></span></button><StudioIconPicker className="tree-icon-editor" value={scene.icon} onChange={(icon) => void updateTreeIcon("scene", scene.id, icon)} title={`Change icon for ${scene.name}`} compact />
                          <button type="button" className="rename-node-button scene-rename-button" title="Rename scene" aria-label="Rename scene" onClick={() => void renameScene(scene)}><Pencil size={12} /></button><button type="button" className="scene-delete-button" title="Delete scene" aria-label="Delete scene" onClick={() => void deleteScene(scene)}><Trash2 size={14} /></button></div>))}</div>}
                </div>
              </div>
              <div className="scene-creation-actions">
                <button className="new-scene-button" onClick={() => { setSceneNameDraft(""); setIsCreatingScene(true); }} disabled={!activeWorkspace || workspaceLoading}><span>＋</span> New scene</button>
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
      <span className="profile-status">{activeSpecialTitle ? <SpecialTitleBadge title={activeSpecialTitle} compact /> : preferences.profile.title || "Personal profile"}</span>
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

        <section className={`main-panel ${backgroundImageUrl && sceneBackground ? "has-scene-background" : ""}`}
          data-scene-overlay-tone={backgroundImageUrl && sceneBackground ? (isLightOverlay(sceneBackground, themeIsLight) ? "light" : "dark") : undefined}>
          <header className="topbar"><div className="breadcrumbs"><span>{activeWorkspace?.manifest.name ?? "No workspace"}</span><span className="breadcrumb-divider">/</span><span className="current-crumb">{activeScene?.name ?? "No scene selected"}</span></div><div className="topbar-actions"><span className="local-badge"><span className="status-dot" />Local mode</span><div className="scene-options-menu"><button className="icon-button" type="button" title="Scene options" aria-label="Scene options" aria-expanded={isSceneOptionsOpen} disabled={!activeScene || !activeWorkspace || workspaceLoading} onClick={() => setIsSceneOptionsOpen((open) => !open)}>⋯</button>{isSceneOptionsOpen && <div className="scene-options-popover" role="menu"><button type="button" role="menuitem" onClick={() => setIsSceneOptionsOpen(false)}><Share2 size={15} /><span>Share</span></button>
            <button type="button" role="menuitem" disabled={markdownExportBusy || workspaceLoading || !activeScene}
              onClick={() => void exportChatMarkdown(false)}><FileDown size={15} /><span>Export scene as Markdown</span></button>
            <button type="button" role="menuitem" disabled={markdownExportBusy || workspaceLoading || scenes.length === 0}
              onClick={() => void exportChatMarkdown(true)}><FileDown size={15} /><span>Export all scenes as Markdown</span></button>
            <div className="scene-options-divider" /><button type="button" role="menuitem" className="scene-clean-action" disabled={!activeScene || !messages.length} title={!messages.length ? "This conversation is already empty." : "Delete all messages in this scene"} onClick={requestCleanConversation}><Broom size={15} /><span>Clean conversation</span></button></div>}</div></div></header>
          {markdownExportNotice && <div className={`markdown-export-notice ${markdownExportNotice.kind}`}
            role={markdownExportNotice.kind === "error" ? "alert" : "status"}>
            <span><strong>{markdownExportNotice.kind === "error" ? "Markdown export failed." : "Markdown export complete."}</strong>
            {markdownExportNotice.kind === "success" ? " Saved to: " : " "}
            <span className="markdown-export-path" title={markdownExportNotice.text}>{markdownExportNotice.text}</span></span>
            <button type="button" aria-label="Dismiss export notice" title="Dismiss" onClick={() => setMarkdownExportNotice(null)}>
              <X size={15} />
            </button>
          </div>}
          {backgroundImageUrl && sceneBackground && <div className="scene-background-layer" aria-hidden="true"
            style={{
              "--scene-bg-dim": sceneBackground.dim / 100,
              "--scene-overlay-rgb": overlayRgb(sceneBackground, themeIsLight),
              "--scene-bg-blur": `${sceneBackground.blur}px`,
              "--scene-bg-zoom": sceneBackground.zoom / 100,
            } as CSSProperties}>
            <div className="scene-background-layer-image" style={{
              backgroundImage: `url("${backgroundImageUrl}")`,
              backgroundPosition: `${sceneBackground.positionX}% ${sceneBackground.positionY}%`,
            }} />
            <div className="scene-background-layer-shade" />
          </div>}
          <div className="scene-toolbar"><div className="scene-heading"><div className="scene-heading-icon"><StudioIcon value={activeScene?.icon ?? "◈"} /></div><div><h1>{activeScene?.name ?? "Your next scene"}</h1><p>{activeWorkspace?.manifest.name ?? "Create or choose a workspace"} <span>·</span> Roleplay scene</p></div></div><div className="scene-actions"><button type="button" className={`secondary-button scene-favourite-button ${activeScene?.favourite ? "is-favourite" : ""}`}
              aria-pressed={Boolean(activeScene?.favourite)}
              disabled={!activeScene || !activeWorkspace || workspaceLoading || favouriteBusy}
              title={activeScene?.favourite ? "Remove scene from Favourites" : "Add scene to Favourites"}
              onClick={() => { if (activeScene) void toggleFavourite(activeScene.id); }}>
              <Heart size={15} fill={activeScene?.favourite ? "currentColor" : "none"} />
              <span>{activeScene?.favourite ? "Favourited" : "Favourite"}</span>
            </button>
            <button type="button" className={`secondary-button scene-background-button ${sceneBackground ? "is-custom" : ""}`}
              disabled={!activeScene || !activeWorkspace || workspaceLoading}
              title="Customise this scene's chat background"
              onClick={() => setBackgroundSettingsOpen(true)}>
              <ImageIcon size={15} /><span>Background</span>
            </button></div></div>
          {showWorkspaceNotice && <div className="demo-notice" role={workspaceError ? "alert" : "status"}><span className="notice-icon" aria-hidden="true">i</span><span className="demo-notice-text"><strong>{!activeWorkspace ? "No workspace selected." : workspaceLoading ? "Loading workspace…" : workspaceError ? "Workspace issue." : !activeScene ? "No scene yet." : "Workspace saved locally."}</strong> {!activeWorkspace ? "Choose or create a workspace to begin." : workspaceLoading ? "Your workspace content is being loaded." : workspaceError ? workspaceError : !activeScene ? "Create your first scene with the New scene button." : "Messages are saved to this workspace as you send or edit them."}</span><button type="button" className="demo-notice-close" onClick={() => setShowWorkspaceNotice(false)} aria-label="Dismiss workspace notice" title="Dismiss notice"><X size={15} /></button></div>}

          <section ref={conversationRef} className={`conversation chat-spacing-${preferences.characterDisplayDefaults.messageSpacing}`} aria-label="Scene conversation" onScroll={handleConversationScroll}>
            {activeScene && <div className="date-divider"><span /><p>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</p><span /></div>}
            {activeScene && !messages.length && !workspaceLoading && <div className="scene-empty-state"><strong>This scene is ready.</strong><span>Your first passage will appear here.</span></div>}
            {messages.map((message) => { const messageCharacter = characters.find((item) => item.id && item.id === message.characterId) ?? characters.find((item) => item.name === message.author || (!message.characterId && item.formerNames?.includes(message.author))); const displayAuthor = messageCharacter?.id ? messageCharacter.name : message.author; const displayInitials = messageCharacter?.id ? messageCharacter.initials : message.initials; const displayAvatar = messageCharacter?.id ? messageCharacter.avatar : message.avatar; const messagePortraitUrl = displayAuthor === "You" ? profileMediaSource(preferences.profile.avatarAssetPath) : messageCharacter?.portraitResourceId ? characterPortraitUrls[messageCharacter.portraitResourceId] : null; const highlightYouMessage = preferences.characterDisplayDefaults.highlightOwnMessages && message.author === "You" && !message.characterId; return <article className={`message ${enteringMessageId === message.id ? "message-entering" : ""} ${message.role === "Narration" ? "message-role-narration" : "message-role-dialogue"} ${highlightYouMessage ? "message-user-highlight" : ""} chat-avatar-${preferences.characterDisplayDefaults.avatarSize} chat-spacing-${preferences.characterDisplayDefaults.messageSpacing} ${preferences.characterDisplayDefaults.showAvatar ? "" : "message-no-avatar"}`} key={message.id} data-message-id={message.id}><button type="button" className={`message-avatar message-avatar-button avatar-${displayAvatar}`} style={{ "--character-accent": characterAccentColor(displayAvatar) } as React.CSSProperties} aria-label={`View portrait of ${displayAuthor}`} title={`View ${displayAuthor} portrait`} onClick={() => { setAvatarPreviewCharacter({ name: displayAuthor, initials: displayInitials, avatar: displayAvatar, description: "", avatarAssetPath: displayAuthor === "You" ? preferences.profile.avatarAssetPath : (messageCharacter?.avatarAssetPath ?? null), portraitResourceId: messageCharacter?.portraitResourceId, portraitFit: messageCharacter?.portraitFit, portraitPositionX: messageCharacter?.portraitPositionX, portraitPositionY: messageCharacter?.portraitPositionY, portraitZoom: messageCharacter?.portraitZoom, expression: message.expression }); setAvatarTilt({ x: 0, y: 0, shineX: 50, shineY: 35 }); setShowAvatarPreview(true); }} >{displayAuthor === "You" ? (messagePortraitUrl ? <img className="message-avatar-profile-image" src={messagePortraitUrl} alt="" /> : displayInitials) : <CharacterPortraitArt initials={displayInitials} imageSrc={messagePortraitUrl} alt={displayAuthor} fit={messageCharacter?.portraitFit ?? "contain"} positionX={messageCharacter?.portraitPositionX ?? 50} positionY={messageCharacter?.portraitPositionY ?? 50} zoom={messageCharacter?.portraitZoom ?? 100} />}{message.characterId && customExpressionUrls[`${message.characterId}:${message.expression}`] && <img className="message-avatar-expression-photo" src={customExpressionUrls[`${message.characterId}:${message.expression}`]} alt="" aria-hidden="true" />}</button><div className="message-body">{highlightYouMessage && <span className="message-user-accent" aria-hidden="true"><EffectLayer effect="particles" intensity="subtle" particleCount={4} className="message-user-particles" /></span>}<div className="message-meta"><strong className={displayAuthor === "You" ? "message-author-user" : undefined}>{displayAuthor}</strong>{displayAuthor !== "You" && preferences.characterDisplayDefaults.showExpression && message.expression && (
                      <span
                        className="message-expression"
                        title="Character expression"
                        aria-label="Character expression"
                        style={{
                          maskImage: `url("${expressions.find((expression) => expression.emoji === message.expression)?.image ?? ""}")`,
                          WebkitMaskImage: `url("${expressions.find((expression) => expression.emoji === message.expression)?.image ?? ""}")`,
                        }}
                      />
                    )}{preferences.characterDisplayDefaults.showRoleLabel && <span className={`role-tag role-${message.role.toLowerCase()}`}>{message.role}</span>}<time>{message.time}</time></div>{message.role === "Narration" ? <div className="message-narration-block"><span className="narration-label">✦ NARRATION</span><div className="message-rich-content" dangerouslySetInnerHTML={{ __html: message.content }} /></div> : <div className="message-rich-content" dangerouslySetInnerHTML={{ __html: message.content }} />}
                  {!!message.images?.length && <div className="message-image-gallery">
                    {message.images.map((image) => messageImageUrls[image.id]
                      ? <button type="button" className="message-image-open" key={image.id}
                        aria-label={`Open ${image.fileName} at full size`}
                        onClick={() => {
                          const images = (message.images ?? []).filter((item) => Boolean(messageImageUrls[item.id]))
                            .map((item) => ({ src: messageImageUrls[item.id], name: item.fileName }));
                          const startIndex = (message.images ?? []).filter((item) => Boolean(messageImageUrls[item.id]))
                            .findIndex((item) => item.id === image.id);
                          setChatLightbox({ images, startIndex: Math.max(0, startIndex) });
                        }}>
                        <img src={messageImageUrls[image.id]} alt={image.fileName} title={image.fileName} loading="lazy" />
                      </button>
                      : <span className="message-image-unavailable" key={image.id}>{image.fileName} · {messageImagesLoading ? "Loading image…" : "Image unavailable"}</span>)}
                  </div>}
                </div><div className="message-actions">
                <button className="message-menu" type="button" title="Message actions" aria-label={`Message actions for ${displayAuthor}`} aria-expanded={openMessageActionsId === message.id} onClick={() => setOpenMessageActionsId((current) => current === message.id ? null : message.id)}><MoreHorizontal size={17} /></button>
                {openMessageActionsId === message.id && <div className="message-actions-popover" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setOpenMessageActionsId(null); beginEditingMessage(message); }}><Pencil size={14} /><span>Edit message</span></button>
                  <button type="button" role="menuitem" onClick={() => void changeMessageRole(message)}><ArrowLeftRight size={14} /><span>Change to {message.role === "Narration" ? "dialogue" : "narration"}</span></button>
                  <button type="button" role="menuitem" disabled={favouriteBusy} onClick={() => { setOpenMessageActionsId(null); if (activeSceneId) void toggleFavourite(activeSceneId, message.id); }}><Heart size={14} fill={message.favourite ? "currentColor" : "none"} /><span>{message.favourite ? "Remove favourite" : "Add to favourites"}</span></button>
                  <button type="button" role="menuitem" className="message-delete-action" disabled={!canDeleteMessage(message)} title={!canDeleteMessage(message) ? "Messages can only be deleted within 24 hours of sending; older messages without a timestamp cannot be deleted." : "Delete message"} onClick={() => void deleteMessage(message)}><Trash2 size={14} /><span>Delete message</span>{!canDeleteMessage(message) && <small>24h limit</small>}</button>
                </div>}
              </div></article>; })}
            {hasNewMessages && <button className="scroll-to-latest" type="button" onClick={scrollToLatestMessage}>↓ New messages · Jump to latest</button>}
          </section>

          <footer className="composer-area">
            <div className="composer-context"><span className="composer-context-arrow" aria-hidden="true"><ArrowRight size={13} strokeWidth={2.2} /></span><span className="composer-context-caption">Writing in</span><strong className="composer-scene-pill" title={activeScene?.name ?? "no scene selected"}>{activeScene?.name ?? "no scene selected"}</strong></div>
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
                      fit={selectedCharacter === "You" ? "cover" : character.portraitFit ?? "contain"}
                      positionX={selectedCharacter === "You" ? preferences.profile.avatarPositionX : character.portraitPositionX ?? 50}
                      positionY={selectedCharacter === "You" ? preferences.profile.avatarPositionY : character.portraitPositionY ?? 50}
                      zoom={selectedCharacter === "You" ? preferences.profile.avatarZoom : character.portraitZoom ?? 100}
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
                  <AppSelect id="character-select" className="character-select" aria-label="Choose character" value={selectedCharacter} onChange={(event) => { setSelectedCharacter(event.target.value); setShowExpressions(false); }}>{characters.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</AppSelect>
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
                  <div className="colour-picker" title="Text colour"><AppColorPicker aria-label="Text colour" defaultValue="#babbf1" onChange={(event) => changeTextColour(event.target.value)} /></div>
                  <span className="toolbar-divider" />
                  <button
                    type="button"
                    title="Insert image"
                    aria-label="Insert image"
                    disabled={!activeWorkspace || !activeSceneId || workspaceLoading || composerImages.length >= 6}
                    onClick={() => setImageSourceOpen(true)}
                  >
                  <ImagePlus size={16} />
                  </button>

<NudgeEgg />
                  <EmojiPicker editorRef={editorRef} />

<span className="toolbar-spacer" />
<span className="toolbar-spacer" />
                  <span className="editor-mode-label">RICH TEXT</span>
                </div>
                <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label={editingMessageId !== null ? "Edit roleplay message" : "Write a roleplay message"} aria-multiline="true" data-placeholder={editingMessageId !== null ? "Edit your passage..." : !activeWorkspace ? "Choose a workspace first..." : !activeScene ? "Create a scene before writing..." : "Write your next passage..."} onInput={(event) => handleDraftInput(event.currentTarget.innerHTML)} onKeyDown={(event) => { if (!activeWorkspace || !activeSceneId || workspaceLoading) return; if (event.key === "ArrowUp" && composerImages.length === 0 && !(event.currentTarget.innerText ?? "").trim()) { const latestMessage = messages[messages.length - 1]; if (latestMessage) { event.preventDefault(); beginEditingMessage(latestMessage); } return; } if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!applyExpressionCommand(event.currentTarget.innerText ?? "")) event.currentTarget.closest("form")?.requestSubmit(); } }} />
                {expressionSlashQuery !== null && editingMessageId === null && selectedCharacter !== "You" && (
                  <div className="expression-command-menu" role="group" aria-label="Expression commands">
                    <span className="expression-command-hint">EXPRESSIONS · type the command + Space or press Enter</span>
                    {EXPRESSION_COMMANDS.filter((entry) => entry.command.slice(1).includes(expressionSlashQuery)).map((entry) => (
                      <button key={entry.command} type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyExpressionCommand(entry.command)}>
                        <strong>{entry.command}</strong><span>{entry.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {composerImages.length > 0 && <div className="composer-image-previews" aria-label="Attached images">
                  {composerImages.map((image) => <div className="composer-image-preview" key={image.id}>
                    {(image.previewUrl ?? messageImageUrls[image.id]) && <img src={image.previewUrl ?? messageImageUrls[image.id]} alt="" />}
                    <span title={image.fileName}>{image.fileName}</span>
                    <button type="button" aria-label={`Remove ${image.fileName}`} title="Remove image" onClick={() => removeComposerImage(image.id)}><X size={13} /></button>
                  </div>)}
                </div>}
                <div className="composer-bottom"><span className="composer-hint">{editingMessageId !== null ? <>Editing message <span>·</span> <kbd>Enter</kbd> to save</> : <><kbd>Enter</kbd> to send <span>·</span> <kbd>Shift + Enter</kbd> for a new line <span>·</span> <kbd>↑</kbd> to edit latest</>}</span>{editingMessageId !== null && <button className="cancel-edit-button" type="button" onClick={cancelEditingMessage}>Cancel</button>}<button className="send-button" type="submit" disabled={!activeWorkspace || !activeSceneId || workspaceLoading || (!draftHtml.replace(/<[^>]*>/g, "").trim() && composerImages.length === 0)}>{editingMessageId !== null ? "Save changes" : "Send passage"} <span>↑</span></button></div>
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
      {scenePendingRename && (
        <div className="clean-confirmation-backdrop" role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) cancelRenameScene(); }}>
          <form className="clean-confirmation-dialog folder-create-dialog" role="dialog" aria-modal="true"
            aria-labelledby="rename-scene-title" onSubmit={(event) => { event.preventDefault(); void confirmRenameScene(); }}
            onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); cancelRenameScene(); } }}>
            <div className="clean-confirmation-icon"><Pencil size={21} /></div>
            <span className="clean-confirmation-eyebrow">ROLEPLAY SPACE · RENAME SCENE</span>
            <h2 id="rename-scene-title">Rename scene</h2>
            <p>Give “{scenePendingRename.name}” a new name. Its messages and resources will stay untouched.</p>
            <input autoFocus className="folder-name-input" value={sceneRenameDraft}
              onChange={(event) => { setSceneRenameDraft(event.target.value); setSceneRenameError(""); }}
              placeholder="Scene name" aria-label="New scene name" maxLength={100} disabled={sceneRenameBusy} />
            {sceneRenameError && <p className="scene-rename-error" role="alert">{sceneRenameError}</p>}
            <div className="clean-confirmation-actions">
              <button type="button" className="clean-cancel-button" onClick={cancelRenameScene} disabled={sceneRenameBusy}>Cancel</button>
              <button type="submit" className="clean-continue-button" disabled={!sceneRenameDraft.trim() || sceneRenameBusy}>
                {sceneRenameBusy ? "Saving…" : "Save name"}
              </button>
            </div>
          </form>
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
              <div className={`avatar-preview-art ${(previewCharacter.avatarAssetPath || (previewCharacter.portraitResourceId && characterPortraitUrls[previewCharacter.portraitResourceId])) ? "has-portrait-image" : "has-portrait-initials"}`}>
                {!(previewCharacter.avatarAssetPath || (previewCharacter.portraitResourceId && characterPortraitUrls[previewCharacter.portraitResourceId])) && <>
                  <div className="avatar-preview-orbit avatar-preview-orbit-one" />
                  <div className="avatar-preview-orbit avatar-preview-orbit-two" />
                </>}
                {previewCharacter.avatarAssetPath ? (
                  <div className="avatar-preview-image-layer avatar-preview-image-layer-fade">
                    <img className="avatar-preview-image profile-media-image" src={profileMediaSource(previewCharacter.avatarAssetPath) ?? undefined} alt={previewCharacter.name} />
                  </div>
                ) : previewCharacter.portraitResourceId && characterPortraitUrls[previewCharacter.portraitResourceId] ? (
                  <div className="avatar-preview-image-layer avatar-preview-image-layer-fade">
                    <img className="avatar-preview-image" src={characterPortraitUrls[previewCharacter.portraitResourceId]} alt={previewCharacter.name} style={characterPortraitStyle({ fit: previewCharacter.portraitFit, positionX: previewCharacter.portraitPositionX, positionY: previewCharacter.portraitPositionY, zoom: previewCharacter.portraitZoom })} />
                  </div>
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
              <div className="avatar-preview-footer"><span>BRS</span><span>HOLOGRAPHIC EDITION</span></div>
            </div>
            <EffectLayer effect="particles" intensity="balanced" particleCount={18} className="avatar-preview-effect-layer" />
          </section>
        </div>
      )}
      {imageSourceOpen && <ImageSourceDialog
        workspacePath={activeWorkspace?.path}
        title="Add image to passage"
        onCancel={() => setImageSourceOpen(false)}
        onSystem={(file) => attachComposerImage(file, true)}
        onResource={(file) => attachComposerImage(file, false)}
      />}
      {systemImageToSave && <SaveImageToResourcesDialog
        fileName={systemImageToSave.name}
        onSkip={() => setSystemImageToSave(null)}
        onSave={async () => {
          if (!activeWorkspace) throw new Error("No active workspace.");
          await importWorkspaceResource(activeWorkspace.path, systemImageToSave);
          setSystemImageToSave(null);
        }}
      />}
      {backgroundSettingsOpen && activeWorkspace && activeScene && <SceneBackgroundSettings
        key={`${activeWorkspace.path}:${activeScene.id}`}
        workspacePath={activeWorkspace.path} sceneName={activeScene.name}
        current={sceneBackground} currentPreviewUrl={backgroundImageUrl}
        onSave={saveActiveSceneBackground}
        onClose={() => setBackgroundSettingsOpen(false)}
      />}
      {chatLightbox && <ChatImageLightbox images={chatLightbox.images} startIndex={chatLightbox.startIndex} onClose={() => setChatLightbox(null)} />}
      {isSettingsOpen && (
        <SettingsModal initialCategory={settingsInitialCategory} workspacePath={activeWorkspace?.path} onClose={() => setIsSettingsOpen(false)} />
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
      {activeLibraryPage === "projects" && <section className="projects-coming-soon"><div className="projects-coming-soon-content"><span className="projects-coming-soon-eyebrow">BOREALIS · WORKSPACE</span><h1>Coming soon!</h1><p>Something lovely is taking shape.</p><svg className="projects-coming-soon-moon" viewBox="0 0 72 72" aria-hidden="true"><path d="M48.7 8.8a27.5 27.5 0 1 0 14.5 48.6A29.4 29.4 0 0 1 48.7 8.8Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg></div></section>}{activeLibraryPage === "characters" && <CharactersPage workspacePath={activeWorkspace?.path} onClose={() => { setActiveLibraryPage(null); const refreshCharacters = async () => { const library = activeWorkspace ? await loadWorkspaceCharacters(activeWorkspace.path) : loadCharacters(); const refreshed: Character[] = [...library.map((item) => ({ id: item.id, name: item.name, initials: item.initials, formerNames: item.formerNames, avatar: characterAccentColor(item.accent), description: item.subtitle || item.description, avatarAssetPath: null, portraitResourceId: item.portraitResourceId, portraitFit: item.portraitFit ?? "cover", portraitPositionX: item.portraitPositionX ?? 50, portraitPositionY: item.portraitPositionY ?? 50, portraitZoom: item.portraitZoom ?? 100 })), { name: "You", initials: "Y", avatar: "blue", description: "Write as yourself" }]; setCharacters(refreshed); setSelectedCharacter((previousName) => { const previousCharacter = characters.find((item) => item.name === previousName); const matchingId = previousCharacter?.id ? refreshed.find((item) => item.id === previousCharacter.id) : null; return matchingId?.name ?? (refreshed.some((item) => item.name === previousName) ? previousName : refreshed[0]?.name ?? "You"); }); }; void refreshCharacters().catch((reason) => console.error("Could not refresh workspace characters:", reason)); }} />}
      {activeLibraryPage === "resources" && <ResourcesPage onClose={() => setActiveLibraryPage(null)} workspacePath={activeWorkspace?.path} />}
      {activeLibraryPage === "favourites" && <FavouritesPage
        workspaceName={activeWorkspace?.manifest.name ?? null} scenes={scenes} busy={favouriteBusy}
        onClose={() => setActiveLibraryPage(null)} onOpen={openFavourite}
        onToggleScene={(sceneId) => { void toggleFavourite(sceneId); }}
        onToggleMessage={(sceneId, messageId) => { void toggleFavourite(sceneId, messageId); }}
      />}
      {isGlobalSearchOpen && <GlobalSearch workspacePath={activeWorkspace?.path ?? null} onClose={() => setIsGlobalSearchOpen(false)} onOpenCharacters={() => { setIsGlobalSearchOpen(false); setActiveLibraryPage("characters"); }} onOpenResources={() => { setIsGlobalSearchOpen(false); setActiveLibraryPage("resources"); }} />}
      <LambdaEgg />
      <PlumbobEgg />
    </main>
  );
}

export default App;
