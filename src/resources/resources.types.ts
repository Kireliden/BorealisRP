export type ResourceKind = "image" | "audio" | "video" | "other";

export type ResourceRecord = {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  kind: ResourceKind;
  size: number;
  tags: string[];
  importedAt: string;
};

export type ResourceWithUrl = ResourceRecord & { url: string };

export function resourceKindFromFile(file: File): ResourceKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "other";
}
