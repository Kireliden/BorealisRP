
import type { AppPreferences } from "./types";

export const DEFAULT_PREFERENCES: AppPreferences = {
  schemaVersion: 2,

  appearance: {
    theme: "frappe",
    accentColor: null,
    uiScale: 110,
    density: "comfortable",
    interfaceFont: "ubuntu",
    chatFontSize: 16,
  },

  accessibility: {
    animationsEnabled: true,
  },

  profile: {
    displayName: "Usuario",
    avatarAssetId: null,
    avatarAssetPath: null,
    bannerAssetPath: null,
    title: "",
    motto: "",
    description: "",
    frameStyle: "none",
  },

  characterAvatarPaths: {},

  editor: {
    fontSize: 14,
    toolbarVisible: true,
    defaultTextColor: null,
    pasteFormatting: "preserve",
    height: "normal",
    preserveDrafts: true,
  },

  roleplay: {
    defaultRole: "narration",
    sendShortcut: "enter",
    showSessionSeparators: true,
    showDates: true,
    paragraphSpacing: "normal",
  },

  characterDisplayDefaults: {
    showAvatar: true,
    avatarSize: "large",
    nameMode: "character-name",
    showRoleLabel: true,
    showExpression: true,
    messageSpacing: "comfortable",
    colorMode: "automatic",
    customColor: null,
  },
};
