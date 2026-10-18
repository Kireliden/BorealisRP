import { useEffect, useState } from "react";
import "./SettingsModal.css";
import AppearanceSettings from "./AppearanceSettings";
import ThemesSettings from "./ThemesSettings";
import ProfileSettings from "./ProfileSettings";
import ChatSettings from "./ChatSettings";

type SettingsCategory =
  | "appearance"
  | "themes"
  | "profile"
  | "chat"
  | "characters"
  | "roleplay"
  | "editor"
  | "data";

interface SettingsModalProps {
  onClose: () => void;
  initialCategory?: SettingsCategory;
}

const categories: { id: SettingsCategory; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "themes", label: "Themes" },
  { id: "profile", label: "Profile" },
  { id: "chat", label: "Chat" },
  { id: "characters", label: "Characters" },
  { id: "roleplay", label: "Roleplay" },
  { id: "editor", label: "Editor" },
  { id: "data", label: "Data and Storage" },
];

export default function SettingsModal({ onClose, initialCategory = "appearance" }: SettingsModalProps) {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>(initialCategory);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const activeLabel =
    categories.find((category) => category.id === activeCategory)?.label ??
    "Ajustes";

  return (
    <div
      className="settings-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <aside className="settings-sidebar">
          <div className="settings-sidebar-heading">
            <span className="settings-eyebrow">BOREALIS ROLEPLAY DEN</span>
            <h2 id="settings-title">settings</h2>
          </div>

          <nav
            className="settings-navigation"
            aria-label="Settings categories"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`settings-nav-item ${
                  activeCategory === category.id ? "active" : ""
                }`}
                aria-current={
                  activeCategory === category.id ? "page" : undefined
                }
                onClick={() => setActiveCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </nav>

          <div className="settings-sidebar-footer">
            Local Configuration
          </div>
        </aside>

        <main className="settings-content">
          <header className="settings-content-header">
            <div>
              <span className="settings-eyebrow">PREFERENCES</span>
              <h3>{activeLabel}</h3>
            </div>

            <button
              className="settings-close-button"
              type="button"
              onClick={onClose}
              aria-label="Cerrar ajustes"
              title="Cerrar ajustes"
            >
              ×
            </button>
          </header>

          <div className="settings-content-body">
            {activeCategory === "appearance" ? (
  <AppearanceSettings />
) : activeCategory === "themes" ? (
  <ThemesSettings />
) : activeCategory === "profile" ? (
  <ProfileSettings />
) : activeCategory === "chat" ? (
  <ChatSettings />
) : (
  <div className="settings-placeholder">
    <div className="settings-placeholder-symbol">✦</div>
    <h4>{activeLabel}</h4>
    <p>
      This section is ready. Here we will be incorporating your
      configuration options.
    </p>
  </div>
)}

          </div>

          <footer className="settings-content-footer">
            <span>{activeCategory === "profile" ? "Profile changes apply when you save" : "Changes will be saved automatically"}</span>
          </footer>
        </main>
      </section>
    </div>
  );
}