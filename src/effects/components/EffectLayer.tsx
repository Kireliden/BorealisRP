import { getEffectDefinition } from "../effects.registry";
import type { EffectIntensity, EffectName } from "../effects.types";
import "../effects.css";

interface EffectLayerProps {
  effect: EffectName;
  intensity?: EffectIntensity;
  className?: string;
  particleCount?: number;
}

export default function EffectLayer({
  effect,
  intensity = "subtle",
  className = "",
  particleCount,
}: EffectLayerProps) {
  const definition = getEffectDefinition(effect);

  return (
    <span
      className={`effect-layer effect-layer--${effect} effect-layer--${intensity} ${className}`.trim()}
      aria-hidden="true"
    >
      {definition.kind === "particles" &&
        Array.from({ length: particleCount ?? definition.particleCount }, (_, index) => (
          <i key={index} />
        ))}
    </span>
  );
}
