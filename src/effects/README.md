# Visual effects

This folder contains small, reusable visual effects for BRD UI components. Effects are implemented with React and CSS; no external animation dependency is required.

## Current effect

- `particles`: a lightweight layer of small particles that drift away from the element. The existing profile title badge uses the `subtle` intensity.

## Usage

Import `EffectLayer` and place it inside a positioned element that should contain the effect:

```tsx
<EffectLayer effect="particles" intensity="subtle" />
```

The host element should use `position: relative` and allow overflow where particles need to escape. Effects are decorative and hidden from assistive technology. They respect BRD's animation setting and `prefers-reduced-motion`.

Set `--effect-color` on the host element to choose a colour. If it is not set, the effect falls back to the special-title tint (when present) and then the active theme accent.

## Adding an effect

1. Add its name to `EffectName` in `effects.types.ts`.
2. Add a discriminated definition to `EffectDefinition` and an entry in `EFFECT_REGISTRY`.
3. Add a rendering branch for the new `kind` in `components/EffectLayer.tsx`.
4. Add its styling and animation to `effects.css`. Keep decorative layers pointer-transparent and include both BRD animation-off and reduced-motion behaviour.
5. Use the effect from any component; avoid reimplementing its animation in feature-specific CSS.

Keep each effect lightweight by default. Add intensity options only when they provide a useful visual distinction.
