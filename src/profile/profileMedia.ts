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
