# Borealis Roleplay Studio — Changelog

This changelog records meaningful project changes, not every Git commit. Dates are approximate where an exact implementation date was not recorded. Completed code and user-confirmed behavior are distinguished from work that still needs broader testing.

**Current development status (11 November 2026):** internal Alpha, work in progress. The repository's package and Tauri configuration currently declare `0.1.0`. The retrospective `v0.0.x` milestones and proposed `v0.1.0-alpha.1` label below are **historical/organizational labels only**; they were not necessarily published, built, or tagged in Git. No official releases are implied.



## 2026-11-11 — Shared Lucide icon support and composer insertion corrections

- Extended `StudioIconPicker` with a **third Lucide tab**, joining OpenMoji and system emoji. The shared `src/ui/lucideCatalogue.ts` validates icon names and provides searchable, paged choices; workspace icon values use `lucide:<name>` in the existing `workspace-icons.json` store. Existing icon values continue to work.
- Normalised the main Workspace hero icon artwork: OpenMoji, system emojis and Lucide now use the same **32px layout box** (system glyph font size tuned separately). The Workspace selector's Lucide preview was enlarged to match OpenMoji more closely.
- Added a **fourth Lucide style** to the composer emoji picker (Color, Linework, System, Lucide) with search and source-specific recent history. The picker uses the official Lucide icons instead of a separate icon dependency.
- Fixed initially **invisible inline Lucide icons**: abandoned intermediate SVG-mask generation and render actual `DynamicIcon` SVGs through `src/composer/lucideInline.ts`. Message data stores only a validated `data-lucide-icon` name; sanitised send/edit/paste paths preserve the marker.
- Fixed icon-only passages: `Send passage` and the send handler recognise an inline Lucide marker as valid content, and picker insertion updates composer draft state directly. Inline icon visuals follow text colour.
- Removed icon-customisation **controls** from Roleplay Space folders and scenes after UI feedback, including overlapping scene buttons. Existing stored folder/scene icon fields and visible scene icons were preserved; the **Workspace** icon editor remains available.
- **User-confirmed in running app:** Workspace icon selection/sizing and composer inline Lucide display and sending now work; the overlapping Roleplay Space icon controls are gone. **Not yet verified:** full fresh build/package, restart/recovery regression, Markdown export fallback for Lucide-only messages, and clean installer/runtime testing.
- Milestone is an **internal alpha candidate**, not a tagged or shipped alpha release. Release gates documented in `docs/ALPHA-READINESS.md`.

## 2026-11-11 — Clean rich-text pastes and extend chat header fade

- Fixed unwanted background/highlight blocks appearing in the rich-text composer after pasting text copied from the chat or an external app. The composer now intercepts **HTML clipboard paste** and inserts only the result of the existing `sanitiseHtml` allowlist: inline text colours, basic formatting and supported emoji survive, while pasted background colours and unsupported styles are removed.
- Plain-text paste retains native handling; an HTML insertion failure falls back to safe plain text. The editor's draft state and selection are updated after the paste.
- Added a CSS guard for *existing unsanitised drafts* containing inline background styles or `<mark>` elements, so their non-persistent background highlighting is not displayed in the composer.
- Reworked the chat topbar gradient: the **57px header is solid**, with no bottom border; a longer, **116px fade starts immediately below its former boundary** and blends into the chat, rather than fading inside the header itself. The fade sits behind the scene heading, action buttons and messages, while supporting custom scene background images.
- **Pending local validation:** `npm run build`, copy/paste from an existing message with bold/colour and external backgrounds, verify no background in the composer, and check seamless header blending with and without scene images across light/dark themes.

## 2026-11-11 — Preserve composer text colours in sent messages

- Fixed colour formatting being lost when a rich-text composer passage was sent to chat. WebView's `execCommand("foreColor")` emits `<font color="...">` runs, but the composer-to-Markdown source converter previously flattened the `FONT` tag and discarded its colour before sanitisation.
- The conversion now normalises valid `FONT color` and `SPAN style.color` runs into safe `<span style="color: ...">` nodes. The existing HTML sanitizer, chat message renderer and Obsidian Markdown exporter already support this format; no new storage schema or CSS is necessary.
- Shared the existing colour-value allowlist between conversion and sanitisation. Nested bold, italic, underlined text and explicit Markdown are still processed as before, including when recolouring a saved message.
- This fixes **newly sent and re-edited passages**. Colours already discarded by previously saved messages cannot be recovered automatically.
- **Pending validation:** `npm run build` and live tests: apply a colour to a selected phrase, send it, edit it, save again, switch scenes/reopen workspace, and export to Obsidian.

## 2026-11-11 — Composer text-colour picker regression fix

- Fixed the rich-text composer colour control after replacing browser-native popovers: a legacy `.colour-picker > span { pointer-events: none }` rule had disabled mouse interaction on the new `AppColorPicker` wrapper.
- Restored the familiar compact **A with a colour underline** instead of a full swatch / palette icon. The underline follows the most recently chosen colour and remains within the original 28 × 27 px toolbar slot.
- Added an optional text-toolbar variant to the reusable `AppColorPicker`, leaving other colour controls (character accents, chat background) unchanged.
- The composer remembers the rich-text selection before entering the picker and restores it for the `foreColor` command. The colour popover stays open while the editor is refocused for colour changes, and can still be closed with Escape or outside click.
- Added pointer/keyboard range capture from the contenteditable editor to preserve highlighted text across the focus change.
- **Pending validation:** `npm run build`, clicking the A button, applying swatches and HSL/hex to a selected passage, and confirming the picker remains interactive in Tauri/WebView2.

## 2026-11-11 — Single workspace header correction

- Removed the redundant small active-workspace capsule above the sidebar hero header altogether; the sidebar has **one** workspace header again.
- The hero title now reads the **actual active workspace name** from `activeWorkspace.manifest.name`, with a sensible “Choose workspace” fallback when none is selected.
- Re-centred the hero OpenMoji/system-emoji artwork inside a 47×47 px themed icon button using a true CSS grid, zero padding and consistent rendered artwork dimensions.
- Clicking that single large icon retains the **Change icon**, **Switch workspace**, and **Create workspace** menu. To keep the existing recent-workspace list without rendering a duplicate button, `WorkspaceSwitcher` now supports a headless popup anchored to the hero header.
- The collapsed sidebar continues to display the same icon and its actions menu, with the expand button beneath it. Existing workspace icon persistence and creation flows are unchanged.
- **Pending user validation:** `npm run build`, visual centring in the actual WebView, and the Switch workspace action from the single hero header in expanded and collapsed layouts.

## 2026-11-11 — Two-tier workspace sidebar header

- Aligned the workspace sidebar header with the annotated layout: **retained the compact active-workspace capsule at the top**, with a separate prominent icon and "Workspace" heading directly beneath it, plus the collapse control on the far right.
- Removed the duplicate standalone tiny icon editor beside the capsule. The **large workspace icon** now opens a themed actions popup with **Change icon**, **Switch workspace**, and **Create workspace**.
- Change icon reveals the existing searchable OpenMoji/system-emoji picker inside the same popup. Saved icons still use the existing `workspace-icons.json` preference, and the top capsule and recent-workspaces list reflect changes.
- Switch workspace opens the existing portalled recent-workspace list, including external opening from the icon actions popup. Clicking the upper capsule continues to open the same list directly.
- Create workspace opens the workspace manager **directly in its Create view**, bypassing an unnecessary extra click; other entry points continue using the normal home view.
- Preserved the existing themed capsule styling, collapse persistence and compact sidebar navigation, with separate responsive layout rules in `src/ui/studioPolish.css`.
- **Pending local verification:** `npm run build` and testing both popups, click/keyboard focus, compact sidebar, colour-theme changes, and creating/selecting workspaces in the running Tauri app.

## 2026-11-11 — Sidebar, editor and profile polish

- Added **/expression commands** to the rich composer (`/smile`, `/cry`, `/smirk`, `/angry`, `/flushed`, `/neutral`, plus aliases `/sad`, `/blush`, `/mad`). Commands are suggested while typed; pressing Enter or adding a trailing space changes the selected character expression without submitting an empty message. Regular passages and manual avatar-expression selection remain intact.
- Made the sidebar **collapsible into a 76px icon rail** with a persistent compact/expanded preference. Workspace button, library navigation, Search, Collections and Settings remain accessible; the profile avatar stays at the bottom, resized appropriately for each state.
- Replaced the static sidebar **Borealis** heading with the active workspace name and custom icon. Clicking the header opens the existing recent-workspace picker. Its popup is rendered outside the sidebar clipping region. Workspace icons (OpenMoji or standard Unicode emoji) persist in app-local `workspace-icons.json` keyed by workspace ID.
- Added reusable `StudioIconPicker` with search, OpenMoji colour SVGs and system-emoji choices. Scene icons are displayed in the tree and chat header, while folders have a backwards-compatible optional `icon` field stored inside workspace content JSON. Edited icons are saved via the existing workspace content storage.
- Removed the visual vertical hierarchy guide lines; moved the in-category **New folder** shortcut from beneath the folder list into the category action group beside Rename and Delete. Root-level folder creation remains available in the Roleplay Space heading instead of at the bottom.
- Enlarged the footer user portrait from 42×52.5px to 54×68px in the expanded sidebar (and 44×55px compact). Profile banner now extends further into the user-identity row, with a softer gradient blending into the lower card.
- Applied a **bottom-fading chat topbar** for regular and image-backed scenes; themed the composer Send passage button (including hover/disabled states) and the titlebar moon application mark using the current palette accent, instead of fixed purple colours.
- Added a **bounded eight-image LRU cache** for chat background Blob URLs, with reuse between scenes, limited prefetching and invalidation when an image file is deleted. This cache is per running app session and does not alter workspace image files.
- Added isolated styles in `src/ui/studioPolish.css`, `src/composer/expressionCommands.css`, and `src/ui/StudioIconPicker.css` instead of expanding the legacy App.css.
- **Verification status:** 27 repository-level static integration assertions passed (module imports, feature wiring, theme styles, icon persistence, background caching and editor command guards). User-run `npm run build` and real WebView visual tests at expanded/compact sidebar widths remain pending. Dynamic OS/taskbar application icons are not modified; the in-app titlebar mark is theme-aware.

## 2026-11-11 — Sakura pairing and native Borealis UI controls

- Merged the former Coral and Sakura groups into **Sakura Collection** with **Sakura Dreams** (light) and **Sakura Dusk** (dark). Sakura Dusk reuses Coral Bloom's existing colours and internal `coral-bloom` theme ID to preserve saved preferences and system dark-theme choices.
- Removed the separate Coral Collection; Catppuccin, Moonlight, Crimson, Sakura and unlockable Emerald now account for all twelve palettes.
- Created reusable `src/ui/AppSelect.tsx` and its theme-aware CSS. Migrated **all 15 native HTML select controls** in the React UI to portalled in-app menus, including theme switching, Appearance, profile/title/frame, composer character selection, Character Studio and relationships, character/resource sorting, Resources filtering/move target, expression manager and emoji picker.
- AppSelect preserves controlled values and existing change handlers. It supports keyboard arrow navigation, Escape, focus/click-outside dismissal, chosen-item state, positioning that flips above the control when space is limited, and theme-aware colour across light/dark collections.
- Created `AppDialogProvider` / `useAppDialog`, installed at the React application root, replacing all eight previous browser `window.confirm` / `window.prompt` / `window.alert` interactions with queued native-looking Borealis dialogs. These cover message deletion, workspace renaming, relationship-type deletion, expression saving and image validation alerts.
- Created `AppColorPicker` with preset swatches, hue/saturation/lightness sliders and editable hex colour for the composer, Character Studio accents and scene background overlay, replacing four browser-native colour popovers.
- Existing app-authored popovers/context menus and system file selection dialogs remain in place; native file chooser dialogs are deliberately preserved for OS integration and filesystem security.
- **Pending local validation:** `npm run build`, interactive keyboard/focus checks in Tauri WebView2/WebKitGTK, portal positioning inside modals, text-colour selection preservation, and narrow-window layouts.

## 2026-11-11 — Crimson Dawn and theme layout refinements

- Introduced **Crimson Dawn**, the light counterpart to Crimson Void: warm pink-ivory surfaces, garnet typography and saturated crimson highlights, with a complete Catppuccin-compatible semantic variable palette in `src/themes/themes.css`.
- Added `crimson-dawn` to the typed theme IDs and the shared light-theme registry, which also drives preference validation, Follow system switching, and the per-scene Follow theme overlay.
- Removed the broad **Borealis Originals** category: all non-Catppuccin palettes are Borealis originals, so they now live in distinct collections: **Crimson Collection** (Dawn + Void), **Sakura Collection** (Dreams), **Coral Collection** (Bloom), alongside Catppuccin, Moonlight and unlockable Emerald.
- In Settings → Themes, moved the complete **Currently Applied** section (including swatches and the live preview) directly below Theme switching and before the theme collections.
- Enlarged the Settings dialog from a maximum of 1160 × 820 to **1480 × 980 px**, responsive to the available viewport with adaptive sidebar width and content padding. The small-screen layout is preserved.
- Existing saved manual/system preferences, the emerald unlock requirement and the four egg discoveries are unchanged.
- **Pending verification:** `npm run build`, Tauri runtime / visual tests at 1080p and 1440p, Crimson Dawn contrast and theme switching.

## 2026-11-11 — Emerald theme rewards and theme collections

- Added two visual themes inspired by THE PLUMBOB's emerald-green Skip button: **Emerald Glade** (light: sage/ivory/jade) and **Emerald Nocturne** (dark: deep forest/illuminated mint).
- Added both complete palettes in `src/themes/themes.css`, and extended the theme ID type, saved-preference validation and light/dark lists so they work with Manual selection, **Follow system**, and the chat's automatic light/dark overlay.
- Refactored theme metadata into `src/settings/themeCatalog.ts`, grouped into **Catppuccin Collection** (4), **Moonlight Collection** (2), **Borealis Originals** (3), and the secret **Emerald Collection** (2). The collections remain extensible for new theme packs.
- Emerald cards appear visibly **locked** before discovering the `the-plumbob` easter egg. The cards cannot be selected and the themes are excluded from Follow system selectors until unlocked.
- The Collections storage now emits a change notification when a discovery is saved; Themes listens and immediately unlocks the entire Emerald pair when `the-plumbob` is discovered. Existing discovery records stay valid.
- Changed the word that triggers Plumbob egg #004 from `tiranipeuti` to **`sims`** (case-insensitive whole word), keeping the original discovery ID and artwork.
- **Pending validation:** `npm run build`, manual/system mode, persistence, collection unlock timing, light/dark overlay, and full theme contrast checks across Windows/Linux.

## 2026-11-11 — Holographic sticker aspect-ratio alignment

- Fixed visible holographic foil/glare leakage to either side of tall, narrow stickers (notably the Plumbob PNG) caused by the foil mask covering the full-width card while `object-fit: contain` letterboxed the artwork.
- The holographic card and its absolute overlay layers now shrink-wrap the image's *actual displayed aspect ratio*. The sticker image scales proportionally within the same maximum width/height limits, without distorting the alpha mask.
- Mouse-position calculations now use the sticker/card bounds, keeping its reactive highlight aligned even on unusually narrow art.
- Existing PNG holographic foil, glare and sparkles are retained, and the separately filtered GIF pathway remains unchanged apart from the card's responsive sizing.
- **Pending user validation:** real app screenshot after Pull; local TypeScript/Vite and WebView runtime checks were not executable through the GitHub connector.

## 2026-11-11 — Easter egg 004: THE PLUMBOB and Lambda art swap

- Added **THE PLUMBOB** as the fourth Collections secret, triggered when the word `tiranipeuti` is typed in any app editable field (case-insensitive, whole word).
- The new `PlumbobEgg.tsx` registers discovery as `the-plumbob`, shows a green six-second Sims-inspired reveal using the actual `src/easter-eggs/assets/egg_004.png` image, does not modify written text, and is dismissible with Esc or Skip.
- Added isolated `PlumbobEgg.css` with reduced-motion and animation-off support. The input listener only triggers when the word newly appears in an editable field, avoiding repeated activations for every subsequent keystroke.
- Replaced THE LAMBDA's animated collectible GIF with the already uploaded static `src/easter-eggs/assets/egg_003.png` to postpone the holographic-GIF experiment. The animation handling code remains for possible future artwork.
- Collections now shows four secrets, including the new static Plumbob sticker in the existing holographic viewer. Secret trigger text is not exposed in the undiscovered entry.
- **Pending validation:** `npm run build`, reveal styling and Collections art on Windows/Linux, input/paste triggering, and existing easter egg regression checks.

## 2026-11-11 — Holographic GIF alpha-frame correction

- Fixed the animated collectible viewer so GIFs do not use a separately decoded CSS `mask-image` that may display a different frame from the artwork (visible as a detached oval/foil plate during rotation).
- For `.gif` stickers, the **same rendered image** is now processed through a native SVG filter; iridescent colour noise and pointer-reactive glare are composited using the image's live `SourceAlpha`. Every GIF frame therefore brings its own changing silhouette into the holographic calculation without manual frame extraction.
- The PNG/static artwork path keeps its existing holographic masked gradients, sparkles, tilt and mouse interactions unchanged.
- No new animation decoder, timers, or per-frame JavaScript updates were introduced; the filter is native to the WebView. If SVG filtering is not supported by a platform, the artwork still displays unfiltered rather than with an incorrect fixed silhouette.
- **Pending verification:** `npm run build` and live visual/performance tests with `ee_003.gif` in Windows WebView2 and Linux WebKitGTK, especially for higher-frame-count future animated stickers.

## 2026-11-11 — Easter egg 003: THE LAMBDA

### First cinematic pass (build/runtime verification pending)
- Added `LambdaEgg.tsx` and modular CSS. Typing the standalone word **lambda** in any editable field, case-insensitively, triggers a visual glitch at the word's location and a dark, blurred cinematic overlay featuring a stylised orange lambda emblem.
- The visual sequence follows the MP3's actual duration (13-second clips are no longer truncated), with a 13.5-second silent fallback and a 30-second safety limit. It can be skipped with Esc and respects animation-off / reduced-motion settings. Original typed text remains untouched.
- The optional user-supplied audio at `src/easter-eggs/assets/path_of_borealis_clip.mp3` starts at zero volume, fades in over 1.9 seconds, fades out over its final 1.5 seconds, and ends with the actual clip; without the asset, the cinematic still plays silently.
- The secret registers via `collectionStorage.registerDiscovery("lambda-signal")`, and is the third entry in Collections. Its collectible uses optional animated `src/easter-eggs/assets/ee_003.gif` in both the card and holographic viewer, falling back to λ until the GIF is supplied.
- Re-triggering is possible after a full sequence when the word is removed and typed again. The effect is isolated from other eggs and does not interfere with workspace storage.
- **Not included in Git:** the actual soundtrack audio or the future custom `ee_003.gif`; both are loaded from the shared easter egg asset directory when supplied.
- **Pending validation:** `npm run build`, app runtime, full 13-second audio playback and fade on Windows/Linux, and animated `ee_003.gif` display in Collections and the holographic viewer.

## 2026-11-11 — Markdown / Obsidian chat export

### Implemented (runtime and build verification pending)
- Added **Export scene as Markdown** and **Export all scenes as Markdown** to the current scene's `⋯` menu, opening a native destination-folder picker (an Obsidian vault folder can be chosen).
- Exports each scene to a UTF-8 `.md` note with YAML frontmatter for workspace/scene/export date and Obsidian-compatible callouts identifying each character, Narration or Dialogue, and message time.
- Converts saved rich-text HTML to Markdown, retaining bold, italics, strikethrough, inline code, paragraphs and line breaks; uses limited inline HTML for underlining/colours. No network or Obsidian plugin is required.
- Copies existing chat image attachments, including animated GIFs, into an `assets/` folder next to the notes and embeds each using portable relative Markdown image links.
- Exporting multiple scenes also produces `00 - Index.md` linking to each scene. Repeated exports create a uniquely numbered new folder rather than overwriting existing vault files.
- The Rust backend checks workspace-relative image paths and destination names before copying, and removes incomplete export directories on failure. Original BRS scenes and resources are not modified.
- Export notices report destination paths or errors. **The scene background wallpaper and character portrait images are not part of this first export**; conversation attachments are included.
- **Pending validation:** `npm run build`, Rust/Tauri compilation, destination picker on Windows/Fedora, Obsidian callout rendering, large-GIF export and repeated export safety.

## 2026-11-11 — Follow system themes and synchronised chat overlays

### Implemented (local build/runtime verification pending)
- Added **Manual / Follow system** in Settings → Themes. Follow system reads the OS light/dark preference via the WebView's `prefers-color-scheme` media query and updates when the OS reports a change; it does not guess sunrise/sunset times.
- The user can choose **one of the three light palettes** and **one of the six dark palettes** separately. In Follow system mode, selecting a theme card updates its corresponding light/dark slot rather than disabling automation.
- Persisted `appearance.themeMode`, `systemLightTheme`, and `systemDarkTheme` in preferences, validated on load. Existing saved preferences continue in Manual mode with their previously selected theme.
- Added **Follow theme** to each scene's background overlay. It uses the currently applied BRS palette's light/dark category, adjusting the overlay colour, vignette and text contrast together without reloading the background image.
- New backgrounds start with Follow theme. Older saved backgrounds default to their previous fixed Dark mode unless individually changed; explicit Dark, Light and Custom selections remain fixed regardless of OS changes.
- Kept theme selection inside Themes (not Appearance), and all new styles in the existing modular themes/chat files.
- **Pending validation:** `npm run build`, Tauri runtime tests on Windows and Linux, live OS theme switching, preview updates, preference persistence and per-scene overlay behaviour.

## 2026-11-11 — Dark, Light and Custom scene overlays

- Added **Dark / Light / Custom** overlay colours in the per-scene Background editor. Custom uses the system colour picker and displays its hexadecimal value.
- The overlay strength slider now applies to the selected tint and to its gradient vignette, including the editor's live preview.
- Light and bright custom colours switch foreground text to darker ink for readability, including message content, narration, the scene heading and the composer context capsule.
- Existing backgrounds keep the original **Dark** preset automatically; per-scene mode and custom colour are saved alongside the other background settings.
- Adjustments stay in the modular chat files; existing workspace media copies and chat attachments are unchanged.
- **Pending validation:** TypeScript/Vite build, Tauri runtime check, custom tint rendering and contrast across Latte, Frappé and other light/dark palettes.

## 2026-11-11 — Responsive chat reading width and composer context

- Let the message column, narration cards, date separator and composer grow proportionally with the main window, preserving side margins and a comfortable width cap on ultrawide monitors.
- Keep the body of each message flexible so it uses the wider reading column instead of staying compressed against the avatar.
- Replaced the typing-like dot in **Writing in** with a directional arrow; the active scene name now sits in a compact accent-tinted pill with truncation for long titles.
- Kept these styles in `src/chat/chatLayout.css`, without expanding `App.css`. Existing scene backgrounds and no-background chats share the same layout.
- **Pending validation:** local TypeScript/Vite build and visual check at standard, maximised and narrow window sizes.

## 2026-11-11 — Per-scene chat backgrounds

### Implemented (runtime/build verification pending)
- Added **Background** beside Favourite in the scene toolbar. Each scene can use a different background image or keep the original plain chat.
- Reused the system/Resources image chooser; system selections still ask whether to import an optional additional copy to Resources.
- Saved image snapshots in portable `Chats/Backgrounds/` paths and attached the image reference and appearance options to each scene's optional `background` metadata; deleting an image from Resources does not break an active scene background.
- Added a preview and sliders for dark overlay intensity, blur, zoom and horizontal/vertical framing, plus reset and remove controls. Changes apply when explicitly saved.
- Rendered the image underneath the scene heading, messages and composer, not the sidebar or topbar. The composer and notices get a translucent glass surface for legibility; chats without backgrounds keep their existing styling.
- Obsolete background snapshots are removed after successfully saving a replacement/removal, without touching Resources.
- **Pending validation:** TypeScript/Vite build, Tauri Rust compilation, background persistence across restarts and scene changes, GIF behaviour, light-theme legibility and slider layout on smaller windows.

## 2026-11-11 — Chat lightbox and workspace favourites

### Implemented (build/runtime verification pending)
- Chat image attachments now open in a full-size lightbox. Images from the same message can be browsed with arrow buttons or keyboard arrows; Esc and clicking the backdrop close the preview.
- Enabled the scene-level **Favourite** button and added **Add to favourites / Remove favourite** to each message's `⋯` menu.
- Added a dedicated **Favourites** button directly beneath Resources in the sidebar. The new library separates saved scenes and messages, offers search/filter views, and links back to the originating scene or highlighted passage.
- Favourite flags and timestamps are optional fields in the existing workspace content; no duplicate message copies or new global storage format are needed.
- Repositioned **Writing in…** to align with the composer's left edge, accounting for the character portrait and responsive layout gap.
- **Pending validation:** TypeScript/Vite build, Tauri runtime checks, favourite persistence after restarting, image lightbox keyboard controls, narrow-window alignment and navigation to saved messages.

## 2026-11-11 — Profile and composer image integration

### Implemented (runtime/build verification pending)
- Added **From system** and **From Resources** choices for the user portrait and banner. The Resource picker follows the active workspace; selected files are copied to durable profile storage rather than referenced by their original vault ID.
- Enabled the composer's image button for current scenes. Images from the computer or the active workspace's Resources are previewed before sending and saved as independent files in `Chats/Images/`, with relative-path metadata in messages. Text-only, image-only and combined messages are supported; existing message images remain editable/removable.
- When an image comes from the system picker, a separate, skippable **Save to Resources?** dialog asks whether to import an additional copy. Declining never prevents its use in the profile or a sent passage.
- Resources imports remain explicit. Existing workspace content and legacy storage identifiers are unchanged; the new attachment metadata is optional for older messages.
- Image picker overlays work over Settings; the user retains their composer attachments if message saving fails.
- **Pending validation:** Tauri Rust command compilation, TypeScript/Vite build and manual checks of media persistence across restarts, switching scenes and deleting Resources items.

## 2026-11-11 — BRS branding and final interface polish

- Standardised visible **BRS** initials for Borealis Roleplay Studio across the profile, holographic avatar card, Resources dialogs, workspace manager, settings, user-facing errors and development documentation.
- Preserved legacy `brd.*` application storage keys, event names, CSS selectors, character identifiers and migration markers to avoid breaking existing data and integrations. These are internal compatibility identifiers, not display branding.
- Refined the Moon/Star special-title capsules into a stationary, tightly blurred glow with a synchronised brighter border/halo colour transition (6.8 seconds), while keeping the sidebar aura visible without clipping.
- Added a close button to the workspace status notice. The dismissal lasts for the current app session, while a newly raised workspace error makes the notice visible again.
- Kept the existing accessibility/reduced-motion behavior for visual effects. Visual checks on narrow sidebars and multiple themes remain recommended.

## 2026-11-10 — Studio naming, scene rename and visual polish

- Standardised the **Borealis Roleplay Studio** name across dialogs, character tools, profile cards, workspace UI and documentation.
- Kept the legacy workspace-format identifier unchanged for backwards compatibility with existing files.
- Replaced the browser's **Rename scene** prompt with a native-styled Borealis modal and inline duplicate-name validation.
- Added a low-intensity, slow-breathing border glow to unlocked Moon/Star developer title capsules, respecting reduced-motion settings.
- Replaced the hard-bordered You-message highlight with an unobtrusive diffused lavender-accent gradient while retaining soft particles.

## Retrospective milestone calendar (unofficial)

| Approximate period | Suggested milestone | Main progress |
| --- | --- | --- |
| 15 Oct 2026 | `v0.0.1` — The Beginning | React/TypeScript/Vite and Tauri 2 desktop foundation, early roleplay scenes and composer. |
| 16–17 Oct 2026 | `v0.0.2` — Foundations | Git workflow, preferences, themes, UI scaling and early easter eggs. |
| 18–20 Oct 2026 | `v0.0.3` — The Cast | Character editing, cards, portrait customization and composer integration. |
| 21–22 Oct 2026 | `v0.0.4` — Connections | Mental Map, customizable relationships, expression tools and reusable visual effects. |
| 25–27 Oct 2026 | `v0.0.5` — A Place to Call Home | Workspace-scoped portable data, migrations, and persistence/isolation work. |
| Early Nov 2026 | `v0.0.6` — The Vault | Resource browsing, folders, batch operations, previews and drag/drop. |
| 10 Nov 2026 | `v0.1.0-alpha.1` — First Light | Expression-to-vault integration, portrait consistency, and workspace/UI fixes. |

These milestones are a *retrospective narrative*, not the exact Git history or a promise of SemVer-compatible releases. Only create a release/tag when there is a tested build to preserve.

## 2026-11-10 — Signed special titles and optional You message emphasis

### Implemented (runtime verification pending)
- Replaced name-only special-title switching with a central title registry (`src/profile/specialTitles.ts`) and Ed25519 signed redemption codes.
- Reserved **Moon Developer** for the `Kire` display name and **Star Developer** for `Zero`. A matching name alone no longer grants the title: a valid signature-bound unlock code is also required.
- Added an offline code-issuing utility for future titles. Only the public verification key lives in source control; signing keys and issued codes must remain private.
- Added profile settings to redeem and select previously unlocked titles. Invalid or mismatched codes are not rendered in the preview, profile card or sidebar.
- Added a **Settings → Chat → Highlight my messages** preference (off by default), which gently accents locally displayed messages authored in **You** mode with a themed edge and a small reusable particle effect.
- Honoured reduced-motion / animations-off settings and preserved unmodified chat data. Existing users with the older, unrestricted developer-title toggle need to redeem their corresponding title code.
- **Security note:** local/offline signed codes prevent casual unlocking but cannot establish a globally unique user identity or stop someone modifying their own copy of the application.

## 2026-11-10 — Profile layout and You composer avatar framing

- Kept the profile avatar anchored at the top of the identity area when redeemable special-title controls expand, instead of aligning the portrait to the bottom of those controls.
- Applied the profile's saved portrait X/Y position and zoom to the **You** portrait in the composer through the same portrait renderer used for OCs.
- Matched the composer's user portrait to a 4:5 **cover** crop, consistent with the profile preview and generated sidebar thumbnail.
- Preserved the original local profile media path, animated GIF playback and the existing static sidebar-thumbnail generation/refresh logic without modifying its storage routines.
- Runtime validation still required for normal images, GIFs, different zoom/positions, and profile-title toggle/resizing.

## 2026-11-10 — Expressions, portrait consistency and interface polish

### Added
- Added a reusable **Resources image picker** for Character Expressions, with folder browsing, search, image thumbnails and up to six selected images.
- Added vault-image choices for individual expressions, a 3 × 2 expression sheet, and replacement of a specific expression in Review.
- Load previously saved expression slots when returning to a character, so one expression can be replaced without reimporting the other five.
- Expressions save independent image data; reorganizing or deleting a source Resources entry does not invalidate already-saved expressions.

### Fixed / improved
- Aligned chat avatars, the composer, character cards and character preview with saved portrait image, fit, position and zoom; removed an obsolete hardcoded preview image fallback.
- Restored chat display names and initials from the current linked character record, including aliases for older messages when they can be matched.
- Treated Windows `os error 3` (missing parent directory) as an absent expression manifest on first save, allowing its directory and manifest to be created by normal workspace writes.
- Reworked the Expression Manager scrolling area and save footer so error messages remain visible above the bottom bar.
- Removed the duplicate inner border/rounded frame beneath the Character Expressions tabs.
- Fixed the custom window close button after window-size persistence introduced an intercepting close listener.
- Added restoration of window size alongside persisted position. Further display-scaling and multi-monitor testing is still recommended.

## Early November 2026 — Resources becomes a workspace vault

### Added
- Expanded Resources with folders/subfolders, breadcrumb navigation, importing into the current folder and adjustable thumbnail sizes.
- Added multi-selection actions for **Move**, **Copy** and **Delete**, plus confirmation and workspace/global-library scoping.
- Added folder rename/delete through the right-click context menu. Removing a logical folder keeps its contained assets and relocates them to the parent.
- Added a dedicated right-click menu for files and folders, plus blurred file previews for images, text, PDFs (where supported), audio and video.
- Added moving resources by dragging thumbnails onto folders and breadcrumb targets; retained marquee selection from empty space.
- Added an explicitly confirmed native flow to delete a selected *original file on disk*: require a file-picker selection and verify its name, size and SHA-256 against the BRS copy before deleting. Normal library deletion does not delete originals.

### Fixed / improved
- Kept resource captions hidden until hover/focus, as an overlay **inside** the thumbnail rather than an expanding footer below it.
- Corrected pointer capture that prevented normal clicks from opening file previews.
- Made card sizing and resource inspector layout more consistent across window sizes.

## 2026-10-21 to 2026-10-31 — Characters, relationships and workspace storage

- Developed the character relationship **Mental Map**, including custom relationship types, selection behavior, panning/zoom and background customization.
- Built out Character Expressions, the six-slot expression review workflow and independent storage of reviewed images.
- Added character portrait framing and reusable accent/particle presentation effects, including the optional Moon Developer / Star Developer titles.
- Evolved workspace persistence for scene resources and character expression assets; implemented targeted legacy-data migration and documented isolation requirements.
- Added modular application easter eggs, including the 18-click `POTATO.EXE` trigger and its reveal screen.
- Improved performance of multi-file resource imports and image thumbnail caching (details in the 27 October entry below).

## 2026-10-27 — Resource library performance and inspector layout

- Batched multi-file imports in the workspace resource library so the manifest is loaded and saved once per batch rather than once per image.
- Batched global resource imports into a single IndexedDB transaction.
- Reused existing image thumbnail object URLs when the resource list changes, loading only newly added images and releasing URLs for removed assets.
- Avoided repeatedly reading the legacy global resource library after its one-time migration has completed.
- Moved the selected-resource inspector out of the scrolling library content container so it can occupy the right-hand side panel beside the resource grid.
- Preserved manifest entries for files already written if a later file in a workspace import batch fails.
- Runtime performance and layout still require verification in the running app; a successful build alone does not confirm perceived responsiveness.


## 2026-10-16 — Documentation baseline

- Created the initial developer documentation set:
  - `DEV_DOCUMENT.md`
  - `CurrentState.md`
  - `Architecture.md`
  - `Changelog.md`
- Recorded known implementation status separately from planned work and unverified behavior.
- Identified the character-to-composer workflow as the recommended next development milestone.

## October 2026 — Global UI scaling and appearance settings

- Added/connected global UI scale preferences with supported values of 90%, 100%, 110%, 125% and 150%.
- Applied the scale to the main content through `.app-content`.
- Adjusted the scaling approach so the custom title bar retains its standard size.
- Kept chat text size separate from global UI scale.
- Identified CSS declarations with fixed pixel font sizes as a potential limitation for consistent scaling.
- Identified a duplicate `.message-body p` rule that could override the configurable chat font size; verify whether the current stylesheet has been corrected.

## October 2026 — Theme system

- Added a dedicated **Themes** category to the settings modal.
- Expanded the `CatppuccinFlavor` type to include nine themes.
- Kept Catppuccin Frappé as the default theme.
- Added five additional palettes:
  - Crimson Void
  - Coral Bloom
  - Sakura Dreams
  - Moon Light
  - Moon Shadow
- Preserved the original Catppuccin Latte, Frappé, Macchiato and Mocha palettes.
- Implemented theme cards and previews in `ThemesSettings.tsx` and `ThemesSettings.css`.
- Connected theme selection to preferences and the document root's `data-theme` attribute.
- Kept theme selection separate from Appearance settings.

## October 2026 — Appearance preferences

- Added/connected settings for interface font, chat text size, global scale and interface density.
- Supported interface font choices: Ubuntu, Inter and system default.
- Supported density modes: compact, comfortable and spacious.
- Removed theme selection from the Appearance category to avoid duplicating the dedicated Themes section.
- Connected appearance preferences to document-level CSS variables and data attributes.

## Earlier development — Preferences foundation

- Added typed preference definitions in `src/preferences/types.ts`.
- Added default preferences in `src/preferences/defaults.ts`.
- Added the preferences storage module.
- Added `PreferencesContext.tsx` and wrapped the application with `PreferencesProvider`.
- Added debounced automatic preference saving.
- Defined preference groups for appearance, profile, editor, roleplay and character display defaults.
- Added a typed character data structure with display overrides.

## Earlier development — Desktop application foundation

- Established the React + TypeScript + Vite frontend.
- Integrated the Tauri 2 desktop shell.
- Created the main application layout and custom title bar.
- Established the settings modal and initial scene/composer interface.

## Outstanding / requiring verification

These are **not** recorded as completed in this changelog:

- Run a repeatable regression suite for window restore, portrait synchronization, character expressions, resource moves/deletions and workspace reloads.
- Validate first-run setup, handling of corrupted or missing manifests, backup/restore and migration between versions.
- Stress-test many images and large workspaces; verify peak memory use and long-session responsiveness.
- Test Windows and Linux packaging, distribution and cross-platform portability in clean installations.
- Continue work on accessibility, recovery behavior and any future collaboration or remote access features when those are explicitly scoped.
- Reconcile `CurrentState.md` and `Architecture.md` with the actual codebase; both may lag behind these features.


---

## Changelog conventions

For future entries:
- Use the date the change was made.
- Describe user-visible changes and meaningful architecture decisions.
- Separate completed changes from planned work.
- Mention breaking changes and migrations explicitly.
- Record known regressions or follow-up verification tasks.
- Distinguish implemented source code, user-validated workflows, and workflows that still require tests.
- Use release labels only for tested/tagged builds; provisional milestone versions are not release artifacts.
