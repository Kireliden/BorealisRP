import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import type { AppPreferences } from "../preferences/types";
import { profileMediaSource } from "./profileMedia";
import EffectLayer from "../effects/components/EffectLayer";
import "./ProfileModal.css";

type Profile = AppPreferences["profile"];

function SpecialTitle({ displayName }: { displayName: string }) {
  const isZero = displayName.trim().toLocaleLowerCase() === "zero";
  return <span className={`special-title-badge ${isZero ? "special-title-star" : "special-title-moon"}`}>
    <span className="special-title-symbol" aria-hidden="true">{isZero ? "✦" : <svg className="special-title-moon-icon" viewBox="0 0 72 72" aria-hidden="true"><path d="M48.7 8.8a27.5 27.5 0 1 0 14.5 48.6A29.4 29.4 0 0 1 48.7 8.8Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>}</span>
    <span>{isZero ? "Star Developer" : "Moon Developer"}</span>
    <EffectLayer effect="particles" intensity="bold" particleCount={12} className="special-title-particles" />
  </span>;
}

interface ProfileModalProps {
  profile: Profile;
  onEdit: () => void;
  onClose: () => void;
}

export default function ProfileModal({ profile, onEdit, onClose }: ProfileModalProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, shineX: 50, shineY: 35 });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const avatarSrc = profileMediaSource(profile.avatarAssetPath);
  const bannerSrc = profileMediaSource(profile.bannerAssetPath);

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    setTilt({ x: (0.5 - y) * 12, y: (x - 0.5) * 12, shineX: x * 100, shineY: y * 100 });
  }

  function resetTilt() { setTilt({ x: 0, y: 0, shineX: 50, shineY: 35 }); }

  return (
    <div className="profile-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article
        className={`profile-modal profile-card frame-${profile.frameStyle}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${profile.displayName || "Your"} profile card`}
        style={{
          transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          "--shine-x": `${tilt.shineX}%`,
          "--shine-y": `${tilt.shineY}%`,
        } as CSSProperties}
        onMouseMove={handleMouseMove}
        onMouseLeave={resetTilt}
      >
        <button className="profile-close" type="button" onClick={onClose} aria-label="Close profile">×</button>
        <div className="profile-banner">
          {bannerSrc ? <img src={bannerSrc} alt="" className="profile-banner-image" /> : <div className="profile-banner-art" />}
          <div className="profile-banner-overlay" />
        </div>
        <div className="profile-identity">
          <div className="profile-avatar-column">
            <div className={`profile-portrait frame-border-${profile.frameStyle}`}>
              {avatarSrc ? <img src={avatarSrc} alt="" className="profile-portrait-image" /> : <span className="profile-portrait-placeholder">{profile.displayName.trim().charAt(0).toUpperCase() || "K"}</span>}
            </div>
          </div>
          <div className="profile-identity-copy">
            <h3>{profile.displayName || "Your name"}</h3>
            {profile.showSpecialTitle ? <SpecialTitle displayName={profile.displayName} /> : profile.title && <p className="profile-title">{profile.title}</p>}
          </div>
        </div>
        <div className="profile-details">
          {profile.motto && <p className="profile-motto">“{profile.motto}”</p>}
          <p className={`profile-description ${profile.description ? "" : "is-empty"}`}>{profile.description || "Your little corner of Borealis. Add a few words about yourself when you feel like it."}</p>
          <div className="profile-card-footer">
            <span className="profile-sparkle" aria-label="Borealis moon"><svg className="borealis-moon-mark" viewBox="0 0 72 72" aria-hidden="true"><path d="M48.7 8.8a27.5 27.5 0 1 0 14.5 48.6A29.4 29.4 0 0 1 48.7 8.8Z" fill="#c4b5fd" stroke="#1e1e2e" strokeWidth="2.5" strokeLinejoin="round"/></svg></span>
            <span>BOREALIS ROLEPLAY DEN</span>
            <button type="button" className="profile-primary-button" onClick={onEdit}>Edit profile</button>
          </div>
        </div>
      </article>
    </div>
  );
}
