
import type { AppPreferences } from "./types";

export const DEFAULT_PREFERENCES: AppPreferences = {
  schemaVersion: 3,

  appearance: {
    theme: "frappe",
    accentColor: null,
    uiScale: 100,
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
    showSpecialTitle: false,
    motto: "",
    description: "",
    frameStyle: "none",
    avatarPositionX: 50,
    avatarPositionY: 50,
    bannerPositionX: 50,
    bannerPositionY: 50,
    avatarZoom: 100,
    bannerZoom: 100,
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
