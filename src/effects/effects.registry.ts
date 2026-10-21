import type { EffectName } from "./effects.types";

export interface EffectDefinition {
  particleCount: number;
  description: string;
}

export const EFFECT_REGISTRY: Record<EffectName, EffectDefinition> = {
  particles: {
    particleCount: 6,
    description: "Small particles that drift gently away from an element.",
  },
};

export function getEffectDefinition(effect: EffectName): EffectDefinition {
  return EFFECT_REGISTRY[effect];
}
