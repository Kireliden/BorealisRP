# 🔒 BRD — Holographic Character Portrait Template (LOCKED)

**Status:** Approved / DO NOT regress  
**Project:** Borealis Roleplay Den (BorealisRP)

> This is the user-approved visual template. Preserve it in future work. Do not simplify, replace, or redesign it without asking first.

## Approved result

- Portrait extends through most of the holographic card height.
- **Never change** saved portrait position, zoom, fit, object-position, or per-character crop settings to achieve this effect.
- Short, visible top and bottom fades sit above the image but below the character text.
- Fades use the character's own accent colour from `--character-accent`, mixed with the dark card background.
- Character name/details remain readable and above the gradient.
- Scope is only the holographic character preview card. Do not affect composer or chat portraits.
- Do not re-enable image masks for this effect; earlier masks produced persistent horizontal bands.

## Canonical accent fade

File: `src/composer/AvatarComp.css`

The existing `::after` base rule must keep `content: ""`, `position: absolute`, and `pointer-events: none`. The following is the **final applicable gradient override**:

```css
/* Accent-tinted holographic edge fades, kept behind the character name. */
.avatar-preview-art.has-portrait-image::after {
  z-index: 3;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--character-accent, #b4befe) 78%, #292b31) 0%,
    color-mix(in srgb, var(--character-accent, #b4befe) 58%, #292b31) 7%,
    color-mix(in srgb, var(--character-accent, #b4befe) 34%, #292b31) 13%,
    color-mix(in srgb, var(--character-accent, #b4befe) 12%, transparent) 20%,
    transparent 28%,
    transparent 70%,
    color-mix(in srgb, var(--character-accent, #b4befe) 12%, transparent) 78%,
    color-mix(in srgb, var(--character-accent, #b4befe) 34%, #292b31) 85%,
    color-mix(in srgb, var(--character-accent, #b4befe) 60%, #292b31) 92%,
    color-mix(in srgb, var(--character-accent, #b4befe) 80%, #292b31) 100%
  );
}
```

## Required portrait expansion and text layering

These are the approved supporting layout values. Keep them when consolidating old overrides:

```css
/* Expand the image layer without changing its saved crop settings. */
.avatar-preview-art.has-portrait-image {
  overflow: visible;
}
.avatar-preview-art.has-portrait-image .avatar-preview-image-layer-fade {
  inset: -48px 0 -112px;
  overflow: visible;
}
.avatar-preview-art.has-portrait-image .avatar-preview-image-layer-fade .avatar-preview-image {
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Keep the card text above the fade. */
.avatar-preview-topline,
.avatar-preview-details,
.avatar-preview-footer {
  position: relative;
  z-index: 4;
}
.avatar-preview-details {
  z-index: 5;
}
.avatar-preview-details h2 {
  z-index: 6;
}
```

## Non-negotiable maintenance rules

1. `src/App.tsx` supplies `--character-accent` using `characterAccentColor(previewCharacter.avatar)`.
2. Keep the gradient layer above the image and below the name/details.
3. Keep the accent gradient; do not revert to a generic grey/black fade.
4. Do not change saved portrait position, zoom, `object-fit`, `object-position`, or any per-character values.
5. Keep the effect scoped to `.avatar-preview-art.has-portrait-image`; do not alter chat/composer portrait behaviour.
6. If future work requires changing this appearance, ask the user first. When consolidating CSS, preserve the final cascade and verify that the result remains visually identical.

## Source commits

- Approved accent fade: `b7847e38025d3c6ea2643f56a737cf7fb3f935f3`
- Portrait expansion: `f38f7f2b34e022e0f2d78a7cacae423516cd8b7d`
- Prior text layering / fade work: `e570b4cbea3a68216b2e7d849bbdd2ba9d2eb19a`

**LOCK:** Treat this as a protected visual template. No regressions or redesign without explicit user approval.
