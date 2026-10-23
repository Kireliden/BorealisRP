import { Download, Heart, Info, Users } from "lucide-react";
import "./AboutSettings.css";

const APP_VERSION = "0.1.0";

export default function AboutSettings() {
  return (
    <div className="about-settings">
      <section className="about-hero">
        <div className="about-app-mark" aria-hidden="true">☾</div>
        <span className="settings-eyebrow">YOUR ROLEPLAY SPACE</span>
        <h4>Borealis Roleplay Den</h4>
        <p>A little space for the stories, characters, and worlds you create.</p>
        <span className="about-version">Version {APP_VERSION}</span>
      </section>

      <section className="about-section" aria-labelledby="about-updates-title">
        <div className="about-section-heading">
          <Download size={18} aria-hidden="true" />
          <div>
            <h5 id="about-updates-title">Updates</h5>
            <p>Keep Borealis up to date with the latest improvements.</p>
          </div>
        </div>
        <button
          type="button"
          className="about-action"
          data-tooltip="Coming soon"
          aria-label="Check for updates — Coming soon"
          disabled
        >
          <span>Check for updates</span>
          <span className="about-action-status">Coming soon</span>
        </button>
      </section>

      <section className="about-section" aria-labelledby="about-credits-title">
        <div className="about-section-heading">
          <Users size={18} aria-hidden="true" />
          <div>
            <h5 id="about-credits-title">Credits</h5>
            <p>Made with care, curiosity, and a love for roleplay.</p>
          </div>
        </div>
        <div className="about-credit-row">
          <span>Development & design</span>
          <span>StrandedStars team</span>
        </div>
        <div className="about-credit-row">
          <span>Catppuccin Themes</span>
          <span>Catppuccin Community</span>
        </div>
        <div className="about-credit-row">
          <span>Emoji artwork</span>
          <span>OpenMoji</span>
        </div>
        <div className="about-credit-row">
          <span>Icons</span>
          <span>Lucide</span>
        </div>
      </section>

      <section className="about-note">
        <Heart size={16} aria-hidden="true" />
        <p>Borealis is a work in progress. More details and useful links will find their home here.</p>
      </section>
      <span className="about-build-note"><Info size={13} aria-hidden="true" /> Update support is planned for a future release.</span>
    </div>
  );
}
