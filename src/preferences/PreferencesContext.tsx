import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { AppPreferences } from "./types";
import { getDefaultPreferences, loadPreferences, savePreferences } from "./storage";

interface PreferencesContextValue {
  preferences: AppPreferences;
  isLoaded: boolean;
  error: string | null;
  updatePreferences: (
    updater: (current: AppPreferences) => AppPreferences,
  ) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined,
);

interface PreferencesProviderProps {
  children: ReactNode;
}

export function PreferencesProvider({
  children,
}: PreferencesProviderProps) {
  const [preferences, setPreferences] = useState<AppPreferences>(
    getDefaultPreferences,
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveVersion, setSaveVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const savedPreferences = await loadPreferences();

        if (!cancelled) {
          setPreferences(savedPreferences);
          setError(null);
          setIsLoaded(true);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar las preferencias.",
          );
          setIsLoaded(true);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
  const root = document.documentElement;
  const { theme, interfaceFont, uiScale, density } = preferences.appearance;

  root.dataset.theme = theme;
  root.dataset.density = density;
  root.dataset.font = interfaceFont;
  root.style.setProperty("--ui-scale", `${uiScale / 100}`);
  root.style.setProperty(
  "--chat-font-size",
  `${preferences.appearance.chatFontSize}px`,
);
}, [
  preferences.appearance.theme,
  preferences.appearance.interfaceFont,
  preferences.appearance.uiScale,
  preferences.appearance.density,
  preferences.appearance.chatFontSize,
]);

  useEffect(() => {
    if (!isLoaded || error !== null || saveVersion === 0) {
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      try {
        await savePreferences(preferences);

        if (!cancelled) {
          setError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron guardar las preferencias.",
          );
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [preferences, isLoaded, error, saveVersion]);

  const updatePreferences = useCallback(
    (updater: (current: AppPreferences) => AppPreferences) => {
      setPreferences((current) => updater(current));
      setError(null);
      setSaveVersion((version) => version + 1);
    },
    [],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(getDefaultPreferences());
    setError(null);
    setSaveVersion((version) => version + 1);
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        isLoaded,
        error,
        updatePreferences,
        resetPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);

  if (context === undefined) {
    throw new Error(
      "usePreferences debe utilizarse dentro de PreferencesProvider.",
    );
  }

  return context;
}