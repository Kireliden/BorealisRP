import { readWorkspaceFile, writeWorkspaceFile } from "../workspace/workspaceFiles";
import { imageExtension, validateSelectedImage } from "../resources/imageSelection";

/** Persisted per scene; image files live within the workspace, never in browser storage. */
export type SceneOverlayMode = "dark" | "light" | "custom";

export type SceneBackground = {
  relativePath: string;
  fileName: string;
  mimeType: string;
  dim: number;
  blur: number;
  positionX: number;
  positionY: number;
  zoom: number;
  /** Optional for backwards compatibility: old scenes use the original dark overlay. */
  overlayMode?: SceneOverlayMode;
  overlayColor?: string;
};

export type SceneBackgroundAdjustments = Pick<SceneBackground,
  "dim" | "blur" | "positionX" | "positionY" | "zoom" | "overlayMode" | "overlayColor">;

export const DEFAULT_SCENE_BACKGROUND: SceneBackgroundAdjustments = {
  dim: 56,
  blur: 0,
  positionX: 50,
  positionY: 50,
  zoom: 100,
  overlayMode: "dark",
  overlayColor: "#8b81bb",
};

export const SCENE_OVERLAY_PRESETS = {
  dark: "#0c0f1c",
  light: "#f3f4ff",
} as const;

export function safeOverlayHex(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : "#8b81bb";
}

export function overlayHex(settings: SceneBackgroundAdjustments): string {
  return settings.overlayMode === "light" ? SCENE_OVERLAY_PRESETS.light
    : settings.overlayMode === "custom" ? safeOverlayHex(settings.overlayColor)
    : SCENE_OVERLAY_PRESETS.dark;
}

/** A bright overlay needs dark labels rather than the original white text. */
export function isLightOverlay(settings: SceneBackgroundAdjustments): boolean {
  const hex = overlayHex(settings);
  const channels = [1, 3, 5].map((index) => {
    const component = parseInt(hex.slice(index, index + 2), 16) / 255;
    return component <= 0.04045 ? component / 12.92 : ((component + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >= 0.36;
}

export function overlayRgb(settings: SceneBackgroundAdjustments): string {
  const hex = overlayHex(settings);
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)).join(" ");
}

const backgroundFilePattern = /^Chats\/Backgrounds\/[a-f0-9-]+\.(?:png|jpe?g|webp|gif)$/i;

export function safeSceneBackground(background: SceneBackground | undefined): SceneBackground | null {
  if (!background || typeof background.relativePath !== "string" || !backgroundFilePattern.test(background.relativePath)) return null;
  const clamp = (value: unknown, low: number, high: number, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(high, Math.max(low, value)) : fallback;

  return {
    relativePath: background.relativePath,
    fileName: background.fileName || "Scene background",
    mimeType: background.mimeType || "image/png",
    dim: clamp(background.dim, 0, 90, DEFAULT_SCENE_BACKGROUND.dim),
    blur: clamp(background.blur, 0, 20, DEFAULT_SCENE_BACKGROUND.blur),
    positionX: clamp(background.positionX, 0, 100, DEFAULT_SCENE_BACKGROUND.positionX),
    positionY: clamp(background.positionY, 0, 100, DEFAULT_SCENE_BACKGROUND.positionY),
    zoom: clamp(background.zoom, 100, 200, DEFAULT_SCENE_BACKGROUND.zoom),
    overlayMode: background.overlayMode === "light" || background.overlayMode === "custom" ? background.overlayMode : "dark",
    overlayColor: safeOverlayHex(background.overlayColor),
  };
}

/** Snapshot the chosen image so backgrounds survive removal from Resources. */
export async function saveSceneBackgroundFile(
  workspacePath: string, file: File,
): Promise<Pick<SceneBackground, "relativePath" | "fileName" | "mimeType">> {
  validateSelectedImage(file);
  const path = `Chats/Backgrounds/${crypto.randomUUID()}.${imageExtension(file.name)}`;
  await writeWorkspaceFile(workspacePath, path, new Uint8Array(await file.arrayBuffer()));
  return { relativePath: path, fileName: file.name, mimeType: file.type };
}

export async function loadSceneBackgroundUrl(
  workspacePath: string, background: SceneBackground,
): Promise<string> {
  const safe = safeSceneBackground(background);
  if (!safe) throw new Error("Invalid scene background reference.");
  const bytes = await readWorkspaceFile(workspacePath, safe.relativePath);
  const buffer = Uint8Array.from(bytes);
  return URL.createObjectURL(new Blob([buffer.buffer], { type: safe.mimeType }));
}
