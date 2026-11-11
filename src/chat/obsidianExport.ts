import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { WorkspaceScene, WorkspaceMessage } from "../workspace/workspaceContent";

/** The Rust command copies existing workspace attachments into an export folder.
 * Keeping byte transfer on the Rust side also supports large GIFs and offline vaults. */
type ExportAttachment = {
  sourceRelativePath: string;
  targetFileName: string;
};
type MarkdownSceneExport = {
  name: string;
  markdown: string;
  attachments: ExportAttachment[];
};

function escapeLabel(value: string): string {
  return value.replace(/[\\*_`\[\]<>]/g, "\\$&").replace(/\r?\n/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Convert BRS's existing rich HTML message content into portable Markdown.
 * Text the user typed as Markdown is retained, not double-escaped. */
export function richTextToMarkdown(html: string): string {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  function convert(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = node as HTMLElement;
    const content = Array.from(element.childNodes, convert).join("");
    switch (element.tagName) {
      case "BR": return "\n";
      case "DIV":
      case "P": return content.trimEnd() + "\n\n";
      case "B":
      case "STRONG": return content ? `**${content}**` : "";
      case "I":
      case "EM": return content ? `*${content}*` : "";
      case "S":
      case "DEL": return content ? `~~${content}~~` : "";
      case "U": return content ? `<u>${escapeHtml(element.textContent ?? "")}</u>` : "";
      case "CODE": {
        const ticks = "`".repeat(Math.max(1, ...(content.match(/`+/g)?.map((match) => match.length + 1) ?? [1])));
        return `${ticks}${content}${ticks}`;
      }
      case "IMG": return element.getAttribute("alt") || "";
      case "SPAN": {
        if (element.classList.contains("message-openmoji-linework")) {
          return element.getAttribute("aria-label") || element.title || content;
        }
        // Obsidian supports inline HTML for coloured rich-text runs.
        const color = element.style.color;
        if (color && /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|[a-z]+)$/i.test(color)) {
          return `<span style="color: ${color}">${escapeHtml(element.textContent ?? "")}</span>`;
        }
        return content;
      }
      default: return content;
    }
  }
  return Array.from(documentNode.body.childNodes, convert).join("")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function imageExtension(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension && ["png", "jpg", "jpeg", "webp", "gif"].includes(extension) ? extension : null;
}

function renderMessage(message: WorkspaceMessage, sceneIndex: number, messageIndex: number): {
  block: string;
  attachments: ExportAttachment[];
} {
  const role = message.role === "Dialogue" ? "Dialogue" : "Narration";
  const tag = role === "Narration" ? "note" : "quote";
  const title = `**${escapeLabel(message.author || "Unknown")}** · ${role}${message.time ? ` · ${escapeLabel(message.time)}` : ""}`;
  const body = richTextToMarkdown(message.content);
  const attachments: ExportAttachment[] = [];
  const imageLinks: string[] = [];
  for (const [index, image] of (message.images ?? []).entries()) {
    const extension = imageExtension(image.fileName);
    if (!extension || !/^Chats\/Images\/[a-zA-Z0-9._/-]+$/.test(image.relativePath)) {
      // Malformed/unsupported legacy references are shown, but not read from disk.
      imageLinks.push(`*Attachment unavailable: ${escapeLabel(image.fileName)}*`);
      continue;
    }
    const targetFileName = `s${sceneIndex + 1}-m${messageIndex + 1}-i${index + 1}.${extension}`;
    attachments.push({ sourceRelativePath: image.relativePath, targetFileName });
    imageLinks.push(`![${escapeLabel(image.fileName)}](assets/${targetFileName})`);
  }
  const passage = [body, ...imageLinks].filter(Boolean).join("\n\n");
  const content = passage
    ? passage.split("\n").map((line) => line ? `> ${line}` : ">").join("\n")
    : "> *(Empty passage)*";
  return { block: `> [!${tag}] ${title}\n${content}`, attachments };
}

export function prepareMarkdownScenes(
  workspaceName: string, scenes: WorkspaceScene[], exportedAt = new Date().toISOString(),
): MarkdownSceneExport[] {
  return scenes.map((scene, sceneIndex) => {
    const attachments: ExportAttachment[] = [];
    const blocks = scene.messages.map((message, messageIndex) => {
      const result = renderMessage(message, sceneIndex, messageIndex);
      attachments.push(...result.attachments);
      return result.block;
    });
    const frontmatter = [
      "---",
      "source: \"Borealis RP Studio\"",
      `workspace: ${JSON.stringify(workspaceName)}`,
      `scene: ${JSON.stringify(scene.name)}`,
      `exported_at: ${JSON.stringify(exportedAt)}`,
      "tags:",
      "  - brs/roleplay",
      "---",
    ];
    return {
      name: scene.name,
      attachments,
      markdown: [...frontmatter, "", `# ${escapeLabel(scene.name)}`, "",
        ...blocks.flatMap((block) => [block, ""])].join("\n").trimEnd() + "\n",
    };
  });
}

/** Opens the OS folder picker. Safe, read-only with respect to the BRS workspace. */
export async function exportScenesToMarkdown(
  workspacePath: string, workspaceName: string, scenes: WorkspaceScene[],
): Promise<string | null> {
  if (!scenes.length) throw new Error("There are no scenes to export.");
  const destination = await open({
    directory: true, multiple: false, title: "Choose the Obsidian vault or destination folder",
  });
  if (typeof destination !== "string") return null;
  const prepared = prepareMarkdownScenes(workspaceName, scenes);
  return invoke<string>("export_workspace_markdown", {
    path: workspacePath,
    destination,
    collectionName: scenes.length === 1 ? scenes[0].name : `${workspaceName} - BRS Export`,
    scenes: prepared,
  });
}
