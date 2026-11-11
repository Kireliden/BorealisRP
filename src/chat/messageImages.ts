import { readWorkspaceFile, writeWorkspaceFile } from "../workspace/workspaceFiles";
import { imageExtension, validateSelectedImage } from "../resources/imageSelection";

export type MessageImage = {
  id: string;
  fileName: string;
  mimeType: string;
  relativePath: string;
};

export type ComposerImage = {
  id: string;
  fileName: string;
  mimeType: string;
  relativePath?: string;
  file?: File;
  previewUrl?: string;
};

const imagePath = (image: ComposerImage) =>
  `Chats/Images/${image.id}.${imageExtension(image.fileName)}`;

/** Messages always keep their own image snapshot, never a fragile Resources ID. */
export async function saveMessageImages(
  workspacePath: string, images: ComposerImage[],
): Promise<MessageImage[]> {
  const saved: MessageImage[] = [];
  for (const image of images) {
    const relativePath = image.relativePath ?? imagePath(image);
    if (image.file) {
      validateSelectedImage(image.file);
      await writeWorkspaceFile(
        workspacePath, relativePath, new Uint8Array(await image.file.arrayBuffer()),
      );
    } else if (!image.relativePath) {
      throw new Error("This image no longer has a source file.");
    }
    saved.push({ id: image.id, fileName: image.fileName, mimeType: image.mimeType, relativePath });
  }
  return saved;
}

/** Resolve saved workspace attachments to temporary browser preview URLs. */
export async function loadMessageImages(
  workspacePath: string, images: MessageImage[],
): Promise<Record<string, string>> {
  const entries = await Promise.all(images.map(async (image) => {
    const bytes = await readWorkspaceFile(workspacePath, image.relativePath);
    const copy = Uint8Array.from(bytes);
    return [image.id, URL.createObjectURL(new Blob([copy.buffer], { type: image.mimeType }))] as const;
  }));
  return Object.fromEntries(entries);
}
