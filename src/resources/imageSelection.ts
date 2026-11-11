import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

const IMAGE_MIMES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  webp: "image/webp", gif: "image/gif",
};
export const MAX_CHAT_IMAGE_BYTES = 25 * 1024 * 1024;

type NativeImage = { fileName: string; bytes: number[] };

export function imageExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!Object.hasOwn(IMAGE_MIMES, extension)) {
    throw new Error("Choose a PNG, JPG, WebP or GIF image.");
  }
  return extension;
}

export function validateSelectedImage(file: File): File {
  imageExtension(file.name);
  if (!file.size || file.size > MAX_CHAT_IMAGE_BYTES) {
    throw new Error("Images must be between 1 byte and 25 MiB.");
  }
  return file;
}

/** Read a user-selected image without automatically importing it into Resources. */
export async function chooseSystemImageFile(): Promise<File | null> {
  const path = await open({
    multiple: false, directory: false,
    filters: [{ name: "Images and animated GIFs", extensions: Object.keys(IMAGE_MIMES) }],
  });
  if (typeof path !== "string") return null;
  const [entry] = await invoke<NativeImage[]>("read_dropped_resource_files", { paths: [path] });
  if (!entry) throw new Error("Could not read the chosen image.");
  const extension = imageExtension(entry.fileName);
  const bytes = Uint8Array.from(entry.bytes);
  return validateSelectedImage(new File([bytes.buffer], entry.fileName, { type: IMAGE_MIMES[extension] }));
}

/** Ensure Resource-library images meet the same constraints as system files. */
export async function fileFromResource(fileName: string, mimeType: string, blob: Blob): Promise<File> {
  const extension = imageExtension(fileName);
  const data = await blob.arrayBuffer();
  return validateSelectedImage(new File([data], fileName, { type: IMAGE_MIMES[extension] || mimeType }));
}
