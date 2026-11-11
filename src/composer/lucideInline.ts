import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { IconName } from "lucide-react/dynamic";
import { lucideNameFromValue } from "../ui/lucideCatalogue";

// Lucide icons are stored in rich messages by name, not by untrusted SVG markup.
// SVG masks are rebuilt from the installed library whenever a message is rendered.
// This keeps messages small, safe to paste, and styled with the current theme.
type IconNode = [tag: string, attributes: Record<string, string | number>][];
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const maskCache = new Map<IconName, Promise<string>>();

function getMask(name: IconName): Promise<string> {
  const cached = maskCache.get(name);
  if (cached) return cached;

  const pending = dynamicIconImports[name]().then((module) => {
    const iconNode = (module as { __iconNode?: IconNode }).__iconNode;
    if (!iconNode) throw new Error(`Lucide icon ${name} has no SVG data.`);

    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    Object.entries({
      xmlns: SVG_NAMESPACE, width: "24", height: "24", viewBox: "0 0 24 24",
      fill: "none", stroke: "#000", "stroke-width": "2",
      "stroke-linecap": "round", "stroke-linejoin": "round",
    }).forEach(([key, value]) => svg.setAttribute(key, value));

    for (const [tag, attributes] of iconNode) {
      const element = document.createElementNS(SVG_NAMESPACE, tag);
      Object.entries(attributes).forEach(([key, value]) => {
        if (key !== "key") element.setAttribute(key, String(value));
      });
      svg.appendChild(element);
    }
    return `url("data:image/svg+xml,${encodeURIComponent(svg.outerHTML)}")`;
  }).catch((error: unknown) => {
    maskCache.delete(name);
    throw error;
  });
  maskCache.set(name, pending);
  return pending;
}

export function makeLucideInlineIcon(name: IconName): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "message-lucide-icon";
  span.dataset.lucideIcon = name;
  span.title = name.replace(/-/g, " ");
  span.setAttribute("role", "img");
  span.setAttribute("aria-label", span.title);
  span.setAttribute("contenteditable", "false");
  return span;
}

export function hydrateLucideInlineIcons(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(".message-lucide-icon[data-lucide-icon]").forEach((span) => {
    const name = lucideNameFromValue(span.dataset.lucideIcon ?? "");
    if (!name || span.dataset.lucideReady === name || span.dataset.lucidePending === name) return;
    span.dataset.lucidePending = name;
    void getMask(name).then((mask) => {
      if (!span.isConnected || span.dataset.lucideIcon !== name) return;
      span.style.maskImage = mask;
      span.style.webkitMaskImage = mask;
      span.dataset.lucideReady = name;
      delete span.dataset.lucidePending;
    }).catch((error: unknown) => {
      delete span.dataset.lucidePending;
      console.warn("Could not load a Lucide message icon:", name, error);
    });
  });
}
