import { useEffect, useState } from "react";
import {
  Accessibility,
  Brush,
  Database,
  MessageCircle,
  Palette,
  Settings2,
  Sparkles,
  UserRound,
  UsersRound,
  BookOpen,
  Info,
} from "lucide-react";
import "./SettingsModal.css";
import AppearanceSettings from "./AppearanceSettings";
import ThemesSettings from "./ThemesSettings";
import ProfileSettings from "./ProfileSettings";
import ChatSettings from "./ChatSettings";
import AccessibilitySettings from "./AccessibilitySettings";
import AboutSettings from "./AboutSettings";

type SettingsCategory =
  | "appearance"
  | "themes"
  | "profile"
  | "chat"
  | "characters"
  | "roleplay"
  | "editor"
  | "data"
  | "accessibility"
  | "about";

interface SettingsModalProps {
  onClose: () => void;
  initialCategory?: SettingsCategory;
}

const applicationCategories = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Brush },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "data", label: "Data and Storage", icon: Database },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
] as const;

const workspaceCategories = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "characters", label: "Characters", icon: UsersRound },
  { id: "roleplay", label: "Roleplay", icon: BookOpen },
  { id: "editor", label: "Editor", icon: Sparkles },
] as const;

const categoryLabels: Record<SettingsCategory, string> = {
  appearance: "Appearance",
  themes: "Themes",
  profile: "Profile",
  chat: "Chat",
  characters: "Characters",
  roleplay: "Roleplay",
  editor: "Editor",
  data: "Data and Storage",
  accessibility: "Accessibility",
  about: "About",
};

export default function SettingsModal({ onClose, initialCategory = "appearance" }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialCategory);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const activeLabel = categoryLabels[activeCategory];

  function renderCategoryButton(category: {
    id: SettingsCategory;
    label: string;
    icon: typeof Settings2;
  }) {
    const Icon = category.icon;
    return (
      <button
        key={category.id}
        type="button"
        className={`settings-nav-item ${activeCategory === category.id ? "active" : ""}`}
        aria-current={activeCategory === category.id ? "page" : undefined}
        onClick={() => setActiveCategory(category.id)}
      >
        <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
        <span>{category.label}</span>
      </button>
    );
  }

  return (
    <div className="settings-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-heading">
            <span className="settings-eyebrow">BOREALIS ROLEPLAY STUDIO</span>
            <h2 id="settings-title">settings</h2>
          </div>

          <nav className="settings-navigation" aria-label="Settings categories">
            <div className="settings-nav-group">
              <span className="settings-nav-group-title">APPLICATION</span>
              {applicationCategories.map(renderCategoryButton)}
            </div>
            <div className="settings-nav-group">
              <span className="settings-nav-group-title">WORKSPACE</span>
              {workspaceCategories.map(renderCategoryButton)}
            </div>
          </nav>

          <div className="settings-sidebar-bottom">
            <button
              type="button"
              className={`settings-nav-item settings-about-link ${activeCategory === "about" ? "active" : ""}`}
              aria-current={activeCategory === "about" ? "page" : undefined}
              onClick={() => setActiveCategory("about")}
            >
              <Info size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>About</span>
            </button>
            <div className="settings-sidebar-footer">Local Configuration</div>
          </div>
        </aside>

        <main className="settings-content">
          <header className="settings-content-header">
            <div>
              <span className="settings-eyebrow">{activeCategory === "about" ? "BOREALIS ROLEPLAY STUDIO" : "PREFERENCES"}</span>
              <h3>{activeLabel}</h3>
            </div>
            <button className="settings-close-button" type="button" onClick={onClose} aria-label="Close settings" title="Close settings">×</button>
          </header>

          <div className="settings-content-body">
            {activeCategory === "appearance" ? <AppearanceSettings /> :
             activeCategory === "accessibility" ? <AccessibilitySettings /> :
             activeCategory === "themes" ? <ThemesSettings /> :
             activeCategory === "profile" ? <ProfileSettings /> :
             activeCategory === "chat" ? <ChatSettings /> :
             activeCategory === "about" ? <AboutSettings /> : (
              <div className="settings-placeholder">
                <div className="settings-placeholder-symbol">✦</div>
                <h4>{activeLabel}</h4>
                <p>This section is ready. Here we will be incorporating your configuration options.</p>
              </div>
            )}
          </div>

          <footer className="settings-content-footer">
            <span>{activeCategory === "profile" ? "Profile changes apply when you save" : activeCategory === "about" ? "Borealis Roleplay Studio · Version 0.1.0" : "Changes will be saved automatically"}</span>
          </footer>
        </main>
      </section>
    </div>
  );
}
