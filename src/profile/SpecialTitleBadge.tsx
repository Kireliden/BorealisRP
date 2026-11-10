import EffectLayer from "../effects/components/EffectLayer";
import type { SpecialTitle } from "./specialTitles";

type Props = { title: SpecialTitle; compact?: boolean; };

export default function SpecialTitleBadge({ title, compact = false }: Props) {
  return <span className={`special-title-badge special-title-${title.variant} ${compact ? "sidebar-special-title" : ""}`.trim()}>
    <span className="special-title-symbol" aria-hidden="true">
      {title.symbol === "star" ? "✦" : <svg className="special-title-moon-icon" viewBox="0 0 72 72" aria-hidden="true"><path d="M48.7 8.8a27.5 27.5 0 1 0 14.5 48.6A29.4 29.4 0 0 1 48.7 8.8Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>}
    </span>
    <span>{title.label}</span>
    <EffectLayer effect="particles" intensity="bold" particleCount={compact ? 12 : 8} className="special-title-particles" />
  </span>;
}
