import type { CatppuccinFlavor } from "../preferences/types";

/** Single catalogue for every theme collection. Add future palettes here,
 * then list their IDs in a collection below. */
export type ThemeDefinition = {
  id: CatppuccinFlavor;
  name: string;
  description: string;
  quote: string;
  icon: string;
  colors: {
    base: string;
    mantle: string;
    surface: string;
    accent: string;
    secondary: string;
    text: string;
    muted: string;
  };
};

export const themes: ThemeDefinition[] = [
  {
    id: "latte",
    name: "Latte",
    description: "A soft, sunlit pastel palette.",
    quote: "A little light goes a long way.",
    icon: "☀",
    colors: {
      base: "#eff1f5",
      mantle: "#e6e9ef",
      surface: "#ccd0da",
      accent: "#8839ef",
      secondary: "#ea76cb",
      text: "#4c4f69",
      muted: "#7c7f93",
    },
  },
  {
    id: "frappe",
    name: "Frappé",
    description: "A calm balance of warmth and depth.",
    quote: "Rain drops and lofi beats.",
    icon: "☕",
    colors: {
      base: "#303446",
      mantle: "#292c3c",
      surface: "#414559",
      accent: "#ca9ee6",
      secondary: "#f4b8e4",
      text: "#c6d0f5",
      muted: "#a5adce",
    },
  },
  {
    id: "macchiato",
    name: "Macchiato",
    description: "Muted tones with a touch of elegance.",
    quote: "Some stories bloom in silence.",
    icon: "◐",
    colors: {
      base: "#24273a",
      mantle: "#1e2030",
      surface: "#363a4f",
      accent: "#c6a0f6",
      secondary: "#f5bde6",
      text: "#cad3f5",
      muted: "#a5adcb",
    },
  },
  {
    id: "mocha",
    name: "Mocha",
    description: "Deep, rich tones for quiet nights.",
    quote: "Make yourself at home.",
    icon: "☾",
    colors: {
      base: "#1e1e2e",
      mantle: "#181825",
      surface: "#313244",
      accent: "#cba6f7",
      secondary: "#f5c2e7",
      text: "#cdd6f4",
      muted: "#a6adc8",
    },
  },
  {
    id: "crimson-void",
    name: "Crimson Void",
    description: "Obsidian shadows and blood-red neon.",
    quote: "You should've stayed dead.",
    icon: "☠",
    colors: {
      base: "#100D12",
      mantle: "#1C1119",
      surface: "#32131F",
      accent: "#FF244F",
      secondary: "#A20F35",
      text: "#E7B5C5",
      muted: "#9C6B8A",
    },
  },
  {
    id: "crimson-dawn",
    name: "Crimson Dawn",
    description: "Blushed ivory and garnet red in morning light.",
    quote: "Even the darkest night ends in dawn.",
    icon: "☀",
    colors: {
      base: "#FFF4F2",
      mantle: "#F9E6E5",
      surface: "#EFDDE2",
      accent: "#A91E45",
      secondary: "#C66B7C",
      text: "#4B2534",
      muted: "#875E6B",
    },
  },
  {
    id: "coral-bloom",
    name: "Sakura Dusk",
    description: "Dusky plum and coral-pink cherry blossoms.",
    quote: "Even the blossoms glow after sundown.",
    icon: "✿",
    colors: {
      base: "#241A20",
      mantle: "#2D1E26",
      surface: "#35222B",
      accent: "#FF91A4",
      secondary: "#D86A82",
      text: "#FFE0E4",
      muted: "#F47F91",
    },
  },
  {
    id: "sakura-dreams",
    name: "Sakura Dreams",
    description: "Blushing pastels and gentle warmth.",
    quote: "Stay a little longer, okay?",
    icon: "❀",
    colors: {
      base: "#FFF7F5",
      mantle: "#FBEAE7",
      surface: "#F4DCD9",
      accent: "#D94F70",
      secondary: "#FF9EAA",
      text: "#703744",
      muted: "#A66C77",
    },
  },
  {
    id: "moon-light",
    name: "Moon Light",
    description: "Airy lavender beneath a quiet sky.",
    quote: "Find peace in the quiet.",
    icon: "☾",
    colors: {
      base: "#F7F6FF",
      mantle: "#ECEBFA",
      surface: "#DEDEF2",
      accent: "#777BD1",
      secondary: "#A7A4E8",
      text: "#353650",
      muted: "#73758F",
    },
  },
  {
    id: "moon-shadow",
    name: "Moon Shadow",
    description: "Midnight blue and ethereal violet.",
    quote: "The night remembers everything.",
    icon: "☾",
    colors: {
      base: "#10121F",
      mantle: "#191B2D",
      surface: "#252840",
      accent: "#8588ED",
      secondary: "#A9A7F5",
      text: "#E1E3FF",
      muted: "#A1A4C5",
    },
  },
  {
    id: "emerald-glade",
    name: "Emerald Glade",
    description: "Sunlit sage, jade and soft green ivory.",
    quote: "A little light, a little luck.",
    icon: "☀",
    colors: {
      base: "#F0F8F2",
      mantle: "#E3F1E8",
      surface: "#DCEEE2",
      accent: "#278B60",
      secondary: "#61ADA8",
      text: "#234539",
      muted: "#709386",
    },
  },
  {
    id: "emerald-nocturne",
    name: "Emerald Nocturne",
    description: "Forest shadows and luminous mint.",
    quote: "Even midnight can glow green.",
    icon: "◆",
    colors: {
      base: "#0E1918",
      mantle: "#122321",
      surface: "#213A30",
      accent: "#63D99A",
      secondary: "#6CCBB3",
      text: "#D7F5E3",
      muted: "#85AB9C",
    },
  },
];


export const EMERALD_UNLOCK_ID = "the-plumbob";

export type ThemeCollection = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  themeIds: readonly CatppuccinFlavor[];
  unlockId?: string;
};

export const THEME_COLLECTIONS: ThemeCollection[] = [
  {
    id: "catppuccin",
    name: "Catppuccin Collection",
    subtitle: "The four classic palettes, from soft mornings to deep nights.",
    icon: "☕",
    themeIds: ["latte", "frappe", "macchiato", "mocha"],
  },
  {
    id: "moonlight",
    name: "Moonlight Collection",
    subtitle: "Two sides of the same moon.",
    icon: "☾",
    themeIds: ["moon-light", "moon-shadow"],
  },
  {
    id: "crimson",
    name: "Crimson Collection",
    subtitle: "From garnet sunrise to blood-red nightfall.",
    icon: "♦",
    themeIds: ["crimson-dawn", "crimson-void"],
  },
  {
    id: "sakura",
    name: "Sakura Collection",
    subtitle: "Cherry blossoms from daydreams to dusk.",
    icon: "❀",
    themeIds: ["sakura-dreams", "coral-bloom"],
  },
  {
    id: "emerald",
    name: "Emerald Collection",
    subtitle: "An elusive pair of green palettes. Discover a hidden secret to unlock them.",
    icon: "◆",
    themeIds: ["emerald-glade", "emerald-nocturne"],
    unlockId: EMERALD_UNLOCK_ID,
  },
];

export function isThemeLocked(theme: CatppuccinFlavor, discoveredIds: ReadonlySet<string>): boolean {
  const collection = THEME_COLLECTIONS.find((group) => group.themeIds.includes(theme));
  return Boolean(collection?.unlockId && !discoveredIds.has(collection.unlockId));
}
