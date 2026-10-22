import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];

export function profileMediaSource(path: string | null | undefined): string | null {
  return path ? convertFileSrc(path) : null;
}

/** Opens an image picker and copies the selected image into BRD's app-owned media folder. */
export async function chooseProfileMedia(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Images and animated GIFs", extensions: IMAGE_EXTENSIONS }],
  });

  if (typeof selected !== "string") return null;
  return invoke<string>("import_profile_media", { sourcePath: selected });
}

/** Create a high-quality sidebar-only thumbnail; the original and GIF animation stay untouched elsewhere. */
export async function saveSidebarAvatarThumbnail(path: string, positionX: number, positionY: number, zoom: number): Promise<string> {
  const image = new Image();
  // Tauri serves imported media through its asset protocol. Request CORS access
  // before assigning src so drawing the image does not taint the export canvas.
  image.crossOrigin = "anonymous";
  image.src = profileMediaSource(path) ?? "";
  await image.decode();
  const width = 168, height = 210;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the sidebar avatar thumbnail.");
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * (zoom / 100);
  const drawnWidth = image.naturalWidth * scale, drawnHeight = image.naturalHeight * scale;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, (width - drawnWidth) * positionX / 100, (height - drawnHeight) * positionY / 100, drawnWidth, drawnHeight);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not encode the sidebar avatar thumbnail.")), "image/png");
  });
  const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
  return invoke<string>("save_profile_sidebar_thumbnail", { bytes });
}
export function getSidebarAvatarThumbnailPath(): Promise<string> { return invoke<string>("profile_sidebar_thumbnail_path"); }
export function removeSidebarAvatarThumbnail(): Promise<void> { return invoke<void>("remove_profile_sidebar_thumbnail"); }
