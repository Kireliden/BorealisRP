import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { lucideNameFromValue } from "../ui/lucideCatalogue";

// Save only a validated Lucide name. Actual SVG artwork is rendered by Lucide
// inside the composer/chat after loading; never persist injected SVG markup.
const mountedIcons = new WeakMap<HTMLElement, { name: IconName; root: Root }>();

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
    if (!name) return;
    const mounted = mountedIcons.get(span);
    if (mounted?.name === name) return;

    const reactRoot = mounted?.root ?? createRoot(span);
    mountedIcons.set(span, { name, root: reactRoot });
    // Using the public DynamicIcon renderer avoids SVG masks/data URLs,
    // and automatically inherits text colour from the surrounding rich text.
    reactRoot.render(createElement(DynamicIcon, {
      name,
      size: 22,
      strokeWidth: 2,
      "aria-hidden": true,
    }));
  });
}
