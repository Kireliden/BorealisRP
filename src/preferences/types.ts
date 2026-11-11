
export type CatppuccinFlavor =
  | "latte"
  | "frappe"
  | "macchiato"
  | "mocha"
  | "crimson-void"
  | "coral-bloom"
  | "sakura-dreams"
  | "moon-light"
  | "moon-shadow"
  | "emerald-glade"
  | "emerald-nocturne";

export type UiDensity = "compact" | "comfortable" | "spacious";

export type MessageRole = "narration" | "dialogue";

export type AvatarSize = "small" | "medium" | "large";

export type InterfaceFont = "ubuntu" | "inter" | "system";

export type SendShortcut = "enter" | "ctrl-enter";

export type PasteFormatting = "preserve" | "plain";

export type EditorHeight = "compact" | "normal" | "large";

export type CharacterNameMode = "character-name" | "alias";

export type CharacterColorMode = "automatic" | "custom";

export interface CharacterDisplayPreferences {
  showAvatar: boolean;
  avatarSize: AvatarSize;
  nameMode: CharacterNameMode;
  showRoleLabel: boolean;
  showExpression: boolean;
  highlightOwnMessages: boolean;
  messageSpacing: UiDensity;
  colorMode: CharacterColorMode;
  customColor: string | null;
}

export interface Character {
  id: string;
  name: string;
  alias: string | null;
  avatarAssetId: string | null;
  summary: string;
  displayOverrides: Partial<CharacterDisplayPreferences>;
}

export interface AppPreferences {
  schemaVersion: 3;

  appearance: {
    theme: CatppuccinFlavor;
    /** Manual preserves the existing theme. System follows the OS light/dark preference. */
    themeMode: "manual" | "system";
    systemLightTheme: CatppuccinFlavor;
    systemDarkTheme: CatppuccinFlavor;
    accentColor: string | null;
    uiScale: 80 | 90 | 100 | 110 | 125 | 150;
    density: UiDensity;
    interfaceFont: InterfaceFont;
    chatFontSize: number;
  };

  accessibility: {
    animationsEnabled: boolean;
  };

  profile: {
    displayName: string;
    avatarAssetId: string | null;
    avatarAssetPath: string | null;
    bannerAssetPath: string | null;
    title: string;
    showSpecialTitle: boolean;
    specialTitleCodes: Record<string, string>;
    activeSpecialTitleId: string | null;
    motto: string;
    description: string;
    frameStyle: "none" | "lavender" | "ornate";
    avatarPositionX: number;
    avatarPositionY: number;
    bannerPositionX: number;
    bannerPositionY: number;
    avatarZoom: number;
    bannerZoom: number;
  };

  /** App-level image paths for the current interim character picker. */
  characterAvatarPaths: Record<string, string | null>;

  editor: {
    fontSize: number;
    toolbarVisible: boolean;
    defaultTextColor: string | null;
    pasteFormatting: PasteFormatting;
    height: EditorHeight;
    preserveDrafts: boolean;
  };

  roleplay: {
    defaultRole: MessageRole;
    sendShortcut: SendShortcut;
    showSessionSeparators: boolean;
    showDates: boolean;
    paragraphSpacing: "normal" | "spaced";
  };

  characterDisplayDefaults: CharacterDisplayPreferences;
}
