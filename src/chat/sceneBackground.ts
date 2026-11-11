import { readWorkspaceFile, writeWorkspaceFile } from "../workspace/workspaceFiles";
import { imageExtension, validateSelectedImage } from "../resources/imageSelection";

/** Persisted per scene; image files live within the workspace, never in browser storage. */
export type SceneBackground = {
  relativePath: string;
  fileName: string;
  mimeType: string;
  dim: number;
  blur: number;
  positionX: number;
  positionY: number;
  zoom: number;
};

export type SceneBackgroundAdjustments = Pick<SceneBackground,
  "dim" | "blur" | "positionX" | "positionY" | "zoom">;

export const DEFAULT_SCENE_BACKGROUND: SceneBackgroundAdjustments = {
  dim: 56,
  blur: 0,
  positionX: 50,
  positionY: 50,
  zoom: 100,
};

const backgroundFilePattern = /^Chats\/Backgrounds\/[a-f0-9-]+\.(?:png|jpe?g|webp|gif)$/i;

export function safeSceneBackground(background: SceneBackground | undefined): SceneBackground | null {
  if (!background || !backgroundFilePattern.test(background.relativePath)) return null;
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
