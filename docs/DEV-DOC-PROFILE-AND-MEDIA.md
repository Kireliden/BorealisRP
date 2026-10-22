# Profile card and app-wide media — implementation note

## Profile identity
The user profile is app-level and independent of workspaces and roleplay characters. It uses the existing PreferencesContext and is saved to the existing local preferences store. The profile card opens as a standalone floating card with mouse-reactive 3D tilt and a soft holographic highlight. It is read-only; **Edit profile** opens the canonical Settings → Profile editor.

Profile fields: display name (required), title, motto, description, avatar image path, banner image path, and portrait frame style. The portrait uses a fixed 4:5 aspect ratio inside a rounded rectangle. The banner is wide and crops with `object-fit: cover`. The initial card uses an atmospheric BRD gradient if no banner is selected.

## Image and GIF handling
The shared `src/profile/profileMedia.ts` helper opens a native file picker and calls the Rust `import_profile_media` command. The backend copies supported images (PNG, JPG/JPEG, WebP, GIF; max 25 MiB) into BRD's application-data media folder, so the app does not depend on the original file remaining in place. The stored path is app-level, not workspace-level. Tauri's asset protocol is scoped to the app-data directory. GIFs remain original GIF files and animate naturally in the UI.

The media helper may be reused by future character and scene/resource workflows. Character records are not yet implemented, so the composer currently only supports selecting the built-in demo character or "You". When "You" is selected, the composer portrait is bound directly to the saved user profile avatar (including GIF animation). Character portrait selection is intentionally not exposed in the composer; character portraits will get their own workflow through character options later.

## Boundaries
This is local profile identity only: no accounts, cloud sync, public profiles, or social functionality. Avatar frames are currently visual presets: Minimal, Theme Outline (uses the active theme accent), and Ornate glow (animated, stronger accent-coloured glow). Badge collections and profile typography customization remain follow-up work.


## Profile settings workflow (updated)
The sidebar profile avatar opens the read-only profile card. Its **Edit profile** action navigates to Settings → Profile, which is the canonical editor. Settings edits a local draft and applies it only when **Save profile** is pressed; **Cancel** restores the last saved profile. The shared PreferencesContext persists the saved profile through the existing local preferences storage. The profile card and sidebar reflect saved changes from the same profile object.

All profile and character imagery uses a fill/crop presentation (`object-fit: cover`), not letterboxing or distortion. The profile portrait is 4:5, including the sidebar thumbnail; the banner fills its wide container. Source files retain their original dimensions and GIF animation when copied into app storage.


## Composer identity binding (updated)

The composer resolves its current portrait from the selected identity. For **You**, it reads `preferences.profile.avatarAssetPath`, the same saved image used by the profile card and sidebar. This keeps the user portrait consistent everywhere and automatically reflects profile avatar changes without maintaining a duplicate copy. The temporary `characterAvatarPaths` preference is not used by the composer; character portrait editing is reserved for the future character-management workflow. User portrait frame styles apply only to the profile card, not to character portraits.

## Chat display preferences (updated)

The dedicated **Settings → Chat** section controls chat readability and layout. The default message text size is 16 px (configurable from 11–24 px); avatar size supports Small, Medium, and Large while keeping the composer's 4:5 portrait ratio. Compact, Comfortable, and Spacious layouts control message spacing. Users can also hide avatars, role labels, or character expressions independently.

Chat messages can persist an optional `avatarAssetPath`. New messages snapshot the selected identity's portrait path; older messages authored as **You** fall back to the current saved profile portrait, and the built-in Keira demo character continues to use its placeholder artwork. User-authored messages have no expression, including in the expanded holographic avatar preview. These preferences are app-wide defaults and are stored through PreferencesContext; workspace messages retain their own content and optional avatar path.

---

## Development update — 22 October 2026

This section records the implementation work added after the original profile/media notes. It complements the focused design documents rather than replacing them. The status reflects the current source tree; runtime behaviour and the latest UI polish still require a local build and hands-on verification.

### Character library and editor

The **Characters** area now has three views: **Characters**, **Character Expressions**, and **Mental Map**.

- Character gallery and editor are separated into focused modules under `src/characters/`.
- Character records have typed models and a dedicated storage module. The current global character library is persisted in local storage under `brd.character-library.v1`; it is not yet stored inside individual workspaces.
- Character management includes creating, editing and deleting characters, search/filtering, tags, portrait selection, and per-character accent colour.
- The character editor is implemented in `CharacterEditorModal.tsx`; reusable portrait artwork is in `CharacterPortraitArt.tsx`.
- Character portraits refer to a resource-library item by resource ID rather than duplicating its image data. If a referenced resource is missing, the UI should fall back gracefully rather than crash.
- The profile identity **You** remains separate from roleplay characters and continues to use the saved profile avatar. Do not conflate profile avatar settings with a character's portrait/crop.

### Character Expressions

The guided Expression Manager lives in `src/characters/ExpressionManager.tsx`, with styles in `expressionManager.css` and persistence helpers in `characterExpressions.storage.ts`.

The workflow is:

1. Welcome screen: choose **Templates** or **Edit character expressions**.
2. Templates: save a copy of the individual-image template or expression-sheet template; never modify the bundled original.
3. Select a character.
4. Import multiple individual images and assign them to slots, or import a sheet using the current 3-column × 2-row layout.
5. Review all six expressions, with the ability to replace/edit an image or go back before saving.
6. Explicitly confirm the final save.

Canonical slots are **Neutral**, **Smile**, **Smirk**, **Angry**, **Crying**, and **Flushed**. The current sheet importer assumes a 3×2 grid; adjustable regions for arbitrary third-party sheet layouts are not implemented yet.

Expression data is stored in IndexedDB, separately from the global Resources library. Records use stable IDs and associate expressions with a character explicitly. Image bytes are stored as Blobs rather than object URLs; all six slots are saved together so a review/cancel path does not partially overwrite a character's existing set. The UI's import/review flow is implemented, but connecting saved custom expressions to the composer remains follow-up work; built-in OpenMoji expressions remain the fallback.

See `docs/CHARACTER_EXPRESSIONS.md` for the workflow and storage contract.

### Mental Map / relationship map

The relationship map is implemented in `src/characters/RelationshipMap.tsx` and `relationship-map.css`, with a separate `RelationshipTypeManagerModal.tsx` for managing relationship types.

Current UI capabilities include character nodes, editable relationship connections, custom relationship-type management (so the list is not limited to a fixed **Other** option), relationship details, node positioning, zoom/pan interactions, and a configurable map background. The intended layout is a circular node arrangement and a map canvas that stays visually balanced with the connection-details panel; continue to check this at different window sizes.

Connection lines need sufficient contrast in both light and dark themes, and filtered-out nodes should remain present but visually subdued rather than disappearing. Keep relationship-type management separate from the details editor and preserve the existing character accent colours.

### Global Resources library

The **Resources** page is implemented in `src/resources/ResourcesPage.tsx`, with typed records, storage and styles in the same folder.

- Resources form a global library, separate from individual workspaces and from character-expression storage.
- Resource metadata and imported media Blobs are persisted in IndexedDB (`borealis-resource-library`).
- The gallery supports importing files, drag-and-drop from the operating system, thumbnails/previews for supported image/audio/video files, filtering, per-resource tags, multi-selection and bulk tag addition.
- Native drag-and-drop uses Tauri window drop events and a guarded native file reader; the current per-file limit is 128 MB.
- Character portraits store a resource ID rather than copying the same media into the character record.
- Resource deletion asks for confirmation. A deleted/missing portrait resource should degrade gracefully.

The current Resources view is intentionally independent from **Character Expressions**. Expressions are character-owned data; the Resources library is a reusable global collection. Future work includes resource folders, tag autocomplete/normalization, import/export and backup/restore, and pickers for scenes, attachments and audio cues.

See `docs/architecture/global-libraries.md` for the ownership and persistence decisions.

### Global search

`src/GlobalSearch.tsx` and `src/global-search.css` provide a global search overlay associated with the workspace navigation. It currently searches character metadata and resource filenames/tags. Scene and message search are not included yet.

### Reusable visual effects

A small reusable effects system has been added under `src/effects/`:

- `effects.types.ts` defines effect types.
- `effects.registry.ts` registers available effects.
- `components/EffectLayer.tsx` renders the selected effect.
- `effects.css` contains effect styling and animation.
- `README.md` documents how to use and extend it.

The first effect is `particles`, used by the special-title badge in the sidebar. The host can set `--effect-color`; otherwise the effect falls back to the special-title tint and then the active theme accent. Effects are decorative, pointer-transparent, and must respect BRD's animation-off preference and `prefers-reduced-motion`. New effects should be added to the shared registry/layer instead of reimplementing one-off animations in feature-specific stylesheets.

### Profile and holographic portrait maintenance

The profile remains app-level identity, independent from workspace content and roleplay characters. The sidebar special-title pill now uses the shared particle effect, with theme/accent-aware contrast adjustments.

The holographic character portrait is a protected visual template. Do not change its saved crop, zoom, object-fit, object-position or per-character positioning to make the artwork fill the card. Keep the accent-coloured top/bottom fades above the portrait but below the character text, scoped only to the holographic preview. Do not reintroduce image masks. Obtain explicit approval before redesigning this effect.

See `docs/LOCKED_HOLOGRAPHIC_PORTRAIT_TEMPLATE.md` for the canonical CSS requirements and source commits.

### Navigation and workspace presentation

- **Character Expressions** is a view under **Characters**, not a tab in **Resources**.
- **Resources** remains its own global-library destination.
- The **Projects** entry currently displays a **Coming soon!** placeholder. It is only a placeholder, not a functioning project manager or evidence that project persistence is complete. The placeholder must not cover the sidebar or trap navigation; keep the normal app navigation accessible.
- Styling for Expression Manager file inputs has been customized to match the active BRD theme, including focus and hover states.

### Current boundaries and follow-up work

The new character/resource/expression stores are not yet a unified workspace-owned persistence system. This is an intentional distinction in the current implementation: characters and resources are global libraries, expressions are associated with characters in their own IndexedDB store, and workspace scenes/messages remain a separate concern. Do not describe all app data as workspace-portable until the storage architecture is integrated and verified.

Recommended next checks:

- Run `npm run build` and test the current branch in the desktop app.
- Verify character create/edit/delete and portrait references after restart.
- Test expression import, sheet slicing, review/cancel, replacement and final save for all six slots.
- Verify relationship-map circular layout, line contrast, custom relationship types, zoom/pan and background selection across window sizes and themes.
- Test resource import/drag-and-drop, preview, tags, bulk selection and missing/deleted portrait references.
- Check special-title particles with animation disabled, reduced motion and light themes.
- Keep `src-tauri/Cargo.lock` changes intact; do not overwrite unrelated local changes while updating documentation.

