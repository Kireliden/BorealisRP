import { iconNames, type IconName } from "lucide-react/dynamic";

export const LUCIDE_PREFIX = "lucide:";
export const LUCIDE_PAGE_SIZE = 56;

export const featuredLucideNames = [
  "moon", "star", "sparkles", "book-open", "folder", "heart", "compass",
  "feather", "wand-sparkles", "cloud", "sun", "cat", "paw-print",
];

const knownNames = new Set<string>(iconNames);

export function lucideNameFromValue(value: string): IconName | null {
  const name = value.startsWith(LUCIDE_PREFIX) ? value.slice(LUCIDE_PREFIX.length) : value;
  return knownNames.has(name) ? name as IconName : null;
}

export const lucideOptions = [...iconNames]
  .sort((a, b) => {
    const first = featuredLucideNames.indexOf(a);
    const second = featuredLucideNames.indexOf(b);
    if (first !== -1 || second !== -1) return first === -1 ? 1 : second === -1 ? -1 : first - second;
    return a.localeCompare(b);
  })
  .map((name) => ({
    kind: "lucide" as const,
    name,
    label: name.replace(/-/g, " "),
    search: name.replace(/-/g, " "),
  }));
