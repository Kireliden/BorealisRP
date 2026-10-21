
import { load } from "@tauri-apps/plugin-store";
import { DEFAULT_PREFERENCES } from "./defaults";
import type {
  AppPreferences,
  CharacterDisplayPreferences,
} from "./types";

const STORE_PATH = "preferences.json";
const PREFERENCES_KEY = "appPreferences";
const VALID_THEMES = [
  "latte",
  "frappe",
  "macchiato",
  "mocha",
  "crimson-void",
  "coral-bloom",
  "sakura-dreams",
  "moon-light",
  "moon-shadow",
] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableColor(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(value))
  );
}

function isBoundedNumber(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function validOr<T>(
  value: unknown,
  isValid: (candidate: unknown) => candidate is T,
  fallback: T,
): T {
  return isValid(value) ? value : fallback;
}

function readCharacterDisplayDefaults(
  saved: unknown,
): CharacterDisplayPreferences {
  const source = isRecord(saved) ? saved : {};
  const defaults = DEFAULT_PREFERENCES.characterDisplayDefaults;

  return {
    showAvatar: validOr(
      source.showAvatar,
      isBoolean,
      defaults.showAvatar,
    ),
    avatarSize: validOr(
      source.avatarSize,
      (value): value is CharacterDisplayPreferences["avatarSize"] =>
        isOneOf(value, ["small", "medium", "large"]),
      defaults.avatarSize,
    ),
    nameMode: validOr(
      source.nameMode,
      (value): value is CharacterDisplayPreferences["nameMode"] =>
        isOneOf(value, ["character-name", "alias"]),
      defaults.nameMode,
    ),
    showRoleLabel: validOr(
      source.showRoleLabel,
      isBoolean,
      defaults.showRoleLabel,
    ),
    showExpression: validOr(
      source.showExpression,
      isBoolean,
      defaults.showExpression,
    ),
    messageSpacing: validOr(
      source.messageSpacing,
      (value): value is CharacterDisplayPreferences["messageSpacing"] =>
        isOneOf(value, ["compact", "comfortable", "spacious"]),
      defaults.messageSpacing,
    ),
    colorMode: validOr(
      source.colorMode,
      (value): value is CharacterDisplayPreferences["colorMode"] =>
        isOneOf(value, ["automatic", "custom"]),
      defaults.colorMode,
    ),
    customColor: validOr(
      source.customColor,
      isNullableColor,
      defaults.customColor,
    ),
  };
}

function normalizeCharacterAvatarPaths(saved: unknown): Record<string, string | null> {
  if (!isRecord(saved)) return {};
  const paths: Record<string, string | null> = {};
  for (const [name, path] of Object.entries(saved)) {
    if (name.length <= 80 && (path === null || (isString(path) && path.length <= 1024))) {
      paths[name] = path as string | null;
    }
  }
  return paths;
}

function normalizePreferences(saved: UnknownRecord): AppPreferences {
  const appearance = isRecord(saved.appearance)
    ? saved.appearance
    : {};
  const profile = isRecord(saved.profile) ? saved.profile : {};
  const accessibility = isRecord(saved.accessibility) ? saved.accessibility : {};
  const editor = isRecord(saved.editor) ? saved.editor : {};
  const roleplay = isRecord(saved.roleplay) ? saved.roleplay : {};

  const defaults = DEFAULT_PREFERENCES;
  const legacyScaleMap: Record<number, number> = { 80: 80, 90: 80, 100: 90, 110: 100, 125: 110, 150: 150 };
  const normalizedUiScale = Number(saved.schemaVersion) >= 3
    ? appearance.uiScale
    : legacyScaleMap[Number(appearance.uiScale)] ?? appearance.uiScale;

  return {
    schemaVersion: 3,

    appearance: {
      theme: validOr(
  appearance.theme,
  (value): value is AppPreferences["appearance"]["theme"] =>
    isOneOf(value, VALID_THEMES),
  defaults.appearance.theme,
),
      accentColor: validOr(
        appearance.accentColor,
        isNullableColor,
        defaults.appearance.accentColor,
      ),
     uiScale: validOr(
  normalizedUiScale,
  (value): value is AppPreferences["appearance"]["uiScale"] =>
    typeof value === "number" &&
    [80, 90, 100, 110, 125, 150].includes(value),
  defaults.appearance.uiScale,
),
      density: validOr(
        appearance.density,
        (value): value is AppPreferences["appearance"]["density"] =>
          isOneOf(value, ["compact", "comfortable", "spacious"]),
        defaults.appearance.density,
      ),
      interfaceFont: validOr(
        appearance.interfaceFont,
        (value): value is AppPreferences["appearance"]["interfaceFont"] =>
          isOneOf(value, ["ubuntu", "inter", "system"]),
        defaults.appearance.interfaceFont,
      ),
      chatFontSize: appearance.chatFontSize === 12
        ? defaults.appearance.chatFontSize
        : validOr(
            appearance.chatFontSize,
            (value): value is number => isBoundedNumber(value, 11, 24),
            defaults.appearance.chatFontSize,
          ),
    },

    accessibility: {
      animationsEnabled: validOr(accessibility.animationsEnabled, isBoolean, defaults.accessibility.animationsEnabled),
    },

    profile: {
      displayName: validOr(
        profile.displayName,
        (value): value is string =>
          isString(value) && value.trim().length > 0 && value.length <= 80,
        defaults.profile.displayName,
      ),
      avatarAssetId: validOr(
        profile.avatarAssetId,
        (value): value is string | null =>
          value === null ||
          (isString(value) && value.length <= 200),
        defaults.profile.avatarAssetId,
      ),
      avatarAssetPath: validOr(
        profile.avatarAssetPath,
        (value): value is string | null =>
          value === null || (isString(value) && value.length <= 1024),
        defaults.profile.avatarAssetPath,
      ),
      bannerAssetPath: validOr(
        profile.bannerAssetPath,
        (value): value is string | null =>
          value === null || (isString(value) && value.length <= 1024),
        defaults.profile.bannerAssetPath,
      ),
      title: validOr(
        profile.title,
        (value): value is string => isString(value) && value.length <= 80,
        defaults.profile.title,
      ),
      showSpecialTitle: validOr(profile.showSpecialTitle, isBoolean, defaults.profile.showSpecialTitle),
      motto: validOr(
        profile.motto,
        (value): value is string => isString(value) && value.length <= 160,
        defaults.profile.motto,
      ),
      avatarPositionX: validOr(profile.avatarPositionX, (value): value is number => isBoundedNumber(value, 0, 100), defaults.profile.avatarPositionX),
      avatarPositionY: validOr(profile.avatarPositionY, (value): value is number => isBoundedNumber(value, 0, 100), defaults.profile.avatarPositionY),
      bannerPositionX: validOr(profile.bannerPositionX, (value): value is number => isBoundedNumber(value, 0, 100), defaults.profile.bannerPositionX),
      bannerPositionY: validOr(profile.bannerPositionY, (value): value is number => isBoundedNumber(value, 0, 100), defaults.profile.bannerPositionY),
      avatarZoom: validOr(profile.avatarZoom, (value): value is number => isBoundedNumber(value, 100, 200), defaults.profile.avatarZoom),
      bannerZoom: validOr(profile.bannerZoom, (value): value is number => isBoundedNumber(value, 100, 200), defaults.profile.bannerZoom),
      frameStyle: validOr(
        profile.frameStyle,
        (value): value is AppPreferences["profile"]["frameStyle"] =>
          isOneOf(value, ["none", "lavender", "ornate"]),
        defaults.profile.frameStyle,
      ),
      description: validOr(
        profile.description,
        (value): value is string =>
          isString(value) && value.length <= 1000,
        defaults.profile.description,
      ),
    },

    characterAvatarPaths: normalizeCharacterAvatarPaths(saved.characterAvatarPaths),

    editor: {
      fontSize: validOr(
        editor.fontSize,
        (value): value is number => isBoundedNumber(value, 10, 32),
        defaults.editor.fontSize,
      ),
      toolbarVisible: validOr(
        editor.toolbarVisible,
        isBoolean,
        defaults.editor.toolbarVisible,
      ),
      defaultTextColor: validOr(
        editor.defaultTextColor,
        isNullableColor,
        defaults.editor.defaultTextColor,
      ),
      pasteFormatting: validOr(
        editor.pasteFormatting,
        (value): value is AppPreferences["editor"]["pasteFormatting"] =>
          isOneOf(value, ["preserve", "plain"]),
        defaults.editor.pasteFormatting,
      ),
      height: validOr(
        editor.height,
        (value): value is AppPreferences["editor"]["height"] =>
          isOneOf(value, ["compact", "normal", "large"]),
        defaults.editor.height,
      ),
      preserveDrafts: validOr(
        editor.preserveDrafts,
        isBoolean,
        defaults.editor.preserveDrafts,
      ),
    },

    roleplay: {
      defaultRole: validOr(
        roleplay.defaultRole,
        (value): value is AppPreferences["roleplay"]["defaultRole"] =>
          isOneOf(value, ["narration", "dialogue"]),
        defaults.roleplay.defaultRole,
      ),
      sendShortcut: validOr(
        roleplay.sendShortcut,
        (value): value is AppPreferences["roleplay"]["sendShortcut"] =>
          isOneOf(value, ["enter", "ctrl-enter"]),
        defaults.roleplay.sendShortcut,
      ),
      showSessionSeparators: validOr(
        roleplay.showSessionSeparators,
        isBoolean,
        defaults.roleplay.showSessionSeparators,
      ),
      showDates: validOr(
        roleplay.showDates,
        isBoolean,
        defaults.roleplay.showDates,
      ),
      paragraphSpacing: validOr(
        roleplay.paragraphSpacing,
        (value): value is AppPreferences["roleplay"]["paragraphSpacing"] =>
          isOneOf(value, ["normal", "spaced"]),
        defaults.roleplay.paragraphSpacing,
      ),
    },

    characterDisplayDefaults: readCharacterDisplayDefaults(
      saved.characterDisplayDefaults,
    ),
  };
}

export async function loadPreferences(): Promise<AppPreferences> {
  const store = await load(STORE_PATH, { autoSave: false });
  const saved = await store.get<unknown>(PREFERENCES_KEY);

  // No hay preferencias guardadas: usamos los valores iniciales.
  if (saved === undefined) {
    return getDefaultPreferences();
  }

  // Un archivo con una estructura inesperada no debe sobrescribirse a ciegas.
  if (!isRecord(saved)) {
    throw new Error(
      "Las preferencias guardadas tienen un formato inesperado. No se han modificado.",
    );
  }

  // Normalizar en memoria no modifica el archivo original.
  return normalizePreferences(saved);
}
let saveQueue: Promise<void> = Promise.resolve();

export async function savePreferences(
preferences: AppPreferences,
): Promise<void> {
const saveOperation = saveQueue.then(async () => {
const store = await load(STORE_PATH, { autoSave: false });

await store.set(PREFERENCES_KEY, preferences);
await store.save();

});

// La cola continúa funcionando aunque un guardado falle.
saveQueue = saveOperation.catch(() => {});

// El error sigue llegando al llamador para poder mostrarlo.
await saveOperation;
}

export function getDefaultPreferences(): AppPreferences {
  return structuredClone(DEFAULT_PREFERENCES);
}
