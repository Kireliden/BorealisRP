# Borealis Roleplay Den
## Developer Documentation

**Project codename:** BRD  
**Project type:** Private desktop roleplay application  
**Primary platform:** Windows desktop  
**Secondary platform:** Android companion (planned)  
**Frontend:** React + TypeScript + Vite 8  
**Desktop framework:** Tauri 2  
**Project root:** `C:\Dev\BorealisRP`  
**Document status:** Initial development baseline — 16 October 2026

---

## 1. Project overview

Borealis Roleplay Den (BRD) is a private, desktop-first application designed to provide a comfortable, customizable and feature-rich environment for written roleplay.

The project aims to bring character management, scene organization, rich-text writing, message history and personal customization together in one application, without depending on a general-purpose chat platform.

The interface should feel like a dedicated writing and roleplay workspace rather than a conventional messaging client.

### 1.1 Project philosophy

- **Desktop first.** Desktop is the primary platform and receives priority for organization, writing and advanced management.
- **Writing comes first.** The composer, character selection and message presentation are core functionality, not secondary features.
- **Customization without compromise.** Users should be able to personalize the interface without sacrificing usability.
- **Private by design.** BRD is a personal project; private data and user-controlled storage are important design considerations.
- **Reliable persistence.** Drafts, messages and project data must survive application restarts and unexpected closures.
- **Incremental development.** Each feature should be implemented, tested and stabilized before the next major feature is introduced.

### 1.2 Naming and identity

The name *Borealis* is a personal reference to the lost ship from *Half-Life*, an idea that has been meaningful to the project owner since adolescence. *Roleplay Den* describes the application’s purpose as a dedicated space for roleplay.

The project should retain its identity as Borealis even if the subtitle or presentation changes.

---

## 2. Current development status

The statuses below reflect the development information available when this document was prepared. They are not a substitute for inspecting the current source code and testing the application.

| Area | Status |
|---|---|
| React + TypeScript frontend | Implemented |
| Tauri 2 desktop integration | Implemented |
| Custom window title bar | Implemented |
| Main application layout and scene interface | Initial implementation |
| Temporary message/composer flow | Initial implementation |
| Settings modal and categories | Implemented |
| Nine selectable color themes | Implemented |
| Appearance preferences and persistence | Implemented; verify after changes |
| Global interface scaling | Implemented; recently adjusted |
| Density and typography controls | Implemented; visual coverage may need refinement |
| Complete character-management workflow | Planned / needs verification |
| Complete rich-text roleplay editor | Partially implemented / needs verification |
| Reliable message editing and version history | Planned |
| Durable project, scene and message storage | Needs verification |
| Android companion | Planned |
| Mandatory POTATO.EXE easter egg | Planned |
| Packaging and release workflow | Not yet confirmed |

**Important:** “Implemented” means that the feature has been created during development. It does not necessarily mean that every edge case has been tested or that it is ready for release.

---

## 3. Technical architecture

### 3.1 Current technology stack

- **React:** UI components and application interface.
- **TypeScript:** typed application code and data structures.
- **Vite 8:** frontend development server and build tooling.
- **Tauri 2:** desktop application shell and native integration.
- **CSS:** custom styling, theme palettes, layouts and interface preferences.

The frontend is developed in VS Code. Development and verification currently use:

```powershell
npm run build
npm run tauri dev
```

The first command checks/builds the frontend. The second launches the application through Tauri in development mode.

### 3.2 Existing frontend structure

```text
C:\Dev\BorealisRP
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   ├── preferences/
│   │   ├── types.ts
│   │   ├── defaults.ts
│   │   ├── storage.ts
│   │   └── PreferencesContext.tsx
│   └── settings/
│       ├── SettingsModal.tsx
│       ├── SettingsModal.css
│       ├── AppearanceSettings.tsx
│       ├── AppearanceSettings.css
│       ├── ThemesSettings.tsx
│       └── ThemesSettings.css
└── ...
```

This represents the known frontend structure, not a complete inventory of every project file.

### 3.3 Architectural principles

- Keep preferences and their defaults in the existing preferences modules.
- Keep settings categories separated into focused components.
- Avoid duplicating theme controls across settings categories.
- Keep application data models typed with TypeScript.
- Separate presentation from durable storage as the application grows.
- Avoid unnecessary rewrites of working components.
- Verify changes through builds and practical interaction tests.

The final persistence architecture for roleplay projects, scenes, characters, messages and media has not yet been confirmed. It should be decided before implementing substantial data-management features.

---

## 4. Implemented interface and customization

### 4.1 Custom window title bar

BRD uses a custom title bar rather than relying entirely on the native window decoration.

The application has a custom title bar and window-control integration. The drag region and related behavior have been addressed during earlier development.

**Design requirement:** the title bar must retain its standard dimensions when the user changes the global UI scale. Scaling should apply to the main application content, not enlarge the window chrome.

The current scaling implementation uses CSS `zoom` on `.app-content`, while `.custom-titlebar` remains outside that scaling rule.

### 4.2 Main interface

The initial interface includes a scene-oriented workspace, a top bar, a sidebar, message presentation and a composer.

The existing layout is the foundation for future character, project and scene management. The completeness of the underlying data workflows still needs to be verified.

### 4.3 Theme system

Nine themes are currently available:

| Theme | Identifier |
|---|---|
| Catppuccin Latte | `latte` |
| Catppuccin Frappé | `frappe` |
| Catppuccin Macchiato | `macchiato` |
| Catppuccin Mocha | `mocha` |
| Crimson Void | `crimson-void` |
| Coral Bloom | `coral-bloom` |
| Sakura Dreams | `sakura-dreams` |
| Moon Light | `moon-light` |
| Moon Shadow | `moon-shadow` |

**Default theme:** Catppuccin Frappé.

The original Catppuccin palettes have been retained alongside five additional palettes. Theme selection is available in the dedicated **Themes** settings category, and theme-aware CSS uses the selected theme.

The themes should remain independent of typography, interface scale and density settings.

### 4.4 Appearance settings

The Appearance category is responsible for interface presentation rather than theme selection.

Current preference controls include:

- Interface font: Ubuntu, Inter or system default.
- Chat text size.
- Global interface scale.
- Interface density: compact, comfortable or spacious.

The title bar must not scale with the main content.

The global scaling implementation is intentionally separate from the chat text-size setting. Further testing is needed to ensure that scaling behaves consistently across components with explicit pixel-based font sizes and that larger scale values do not cause clipping.

### 4.5 Preferences and persistence

The preferences system has typed data structures, default values, a React context and a storage module.

The current preferences schema is version `1`.

The known preference groups are:

- `appearance`
- `profile`
- `editor`
- `roleplay`
- `characterDisplayDefaults`

Preferences are applied through `PreferencesContext.tsx`, including document-level theme, density, font and scale settings.

Automatic preference saving has been implemented with a short debounce. The reliability of preference restoration after restarting the application should continue to be tested.

---

## 5. Current preference data model

The following fields are present in the known TypeScript model.

### 5.1 Appearance

- `theme`
- `accentColor`
- `uiScale`
- `density`
- `interfaceFont`
- `chatFontSize`

Supported scale values are 90%, 100%, 110%, 125% and 150%.

### 5.2 Profile

- `displayName`
- `avatarAssetId`
- `description`

### 5.3 Editor

- `fontSize`
- `toolbarVisible`
- `defaultTextColor`
- `pasteFormatting`
- `height`
- `preserveDrafts`

### 5.4 Roleplay

- `defaultRole`
- `sendShortcut`
- `showSessionSeparators`
- `showDates`
- `paragraphSpacing`

### 5.5 Character display defaults

- `showAvatar`
- `avatarSize`
- `nameMode`
- `showRoleLabel`
- `showExpression`
- `messageSpacing`
- `colorMode`
- `customColor`

### 5.6 Character data model

The current known character interface includes:

- `id`
- `name`
- `alias`
- `avatarAssetId`
- `summary`
- `displayOverrides`

`displayOverrides` allows a character to override some default display preferences.

This provides a foundation for character-specific presentation without requiring a separate hardcoded UI for every character.

---

## 6. Functional roadmap

The roadmap below describes the intended order of development. Some items may already have partial implementations that need inspection before work begins.

### Phase 1 — Stabilize the existing interface

**Goal:** establish a reliable foundation before adding more complex workflows.

Tasks:

1. Verify the current build.
2. Test all nine themes.
3. Test the appearance controls at every supported scale.
4. Confirm that the title bar retains its standard size.
5. Check compact, comfortable and spacious density modes.
6. Verify preference persistence after restarting BRD.
7. Fix any layout regressions discovered during testing.

**Completion criteria:** the existing interface remains usable and preferences consistently apply and persist.

### Phase 2 — Character panel and selection

**Goal:** make characters accessible directly from the roleplay workspace.

Planned capabilities:

- Browse characters associated with the current project or scene.
- Display character avatars and identifying information.
- Select the character used for a new message.
- Switch characters without leaving the scene.
- Support character-specific display overrides.

The panel and composer should be designed as parts of the same workflow.

**Completion criteria:** selecting a character has a real effect on the message being composed and published.

### Phase 3 — Character expressions

**Goal:** make character expression selection part of the writing workflow.

Planned capabilities:

- Display an expression tile grid.
- Select an expression for the active character.
- Associate expressions with messages.
- Present the selected expression consistently in the published message.

The final expression data model and asset-management approach remain to be defined.

### Phase 4 — Complete roleplay editor

**Goal:** provide a comfortable writing experience for long-form roleplay.

Planned capabilities:

- Rich-text formatting, including bold, italics and underline.
- Markdown-compatible authoring and formatting.
- Text colors.
- Image insertion.
- Narration and dialogue roles.
- Configurable Enter and Ctrl+Enter sending behavior.
- Configurable paste formatting.
- Adjustable editor height and font size.
- Draft preservation.
- A toolbar that can be shown or hidden.

The editor must preserve the intended formatting when text is published and displayed in the scene.

**Completion criteria:** users can compose, format and publish a message without losing supported formatting.

### Phase 5 — Message editing and version history

**Goal:** allow users to revise roleplay messages without artificial editing restrictions.

Requirements:

- No arbitrary edit-count limit.
- Editing should not introduce unnecessary visible edit indicators.
- Previous versions should remain recoverable through a history mechanism.
- Editing must not silently discard the original content.
- The interface should make the distinction between the current message and its recoverable versions clear.

The exact version-history storage format and recovery interface remain to be designed.

### Phase 6 — Durable data storage and recovery

**Goal:** protect the user's writing and project data.

This phase must establish a durable storage strategy for:

- Projects.
- Scenes.
- Characters.
- Messages.
- Message history.
- Drafts.
- Avatars and expressions.
- Inserted media.
- Application preferences.

Requirements:

- Data must survive normal application restarts.
- Drafts should be preserved automatically.
- Failed saves should be detectable.
- Users should receive useful feedback if saving fails.
- Unexpected shutdowns must not unnecessarily destroy recent work.
- Data migrations should be considered when the schema evolves.

The current preferences storage exists, but the complete storage architecture for all roleplay data has not been confirmed. It should not be assumed that all the data above is already persisted.

### Phase 7 — Project and scene organization

**Goal:** support complete roleplay sessions rather than isolated message views.

Planned capabilities include:

- Project organization.
- Scene organization within projects.
- Character associations.
- Session separators.
- Date presentation.
- Navigation between scenes.
- Reliable restoration of each scene's content.

The precise hierarchy and navigation model should be finalized before the project and scene management features expand.

### Phase 8 — Android companion

**Goal:** extend BRD to mobile without sacrificing the desktop experience.

The Android companion is planned as a secondary application for accessing private projects, scenes and resources, with writing functionality where practical.

The desktop application remains the priority for advanced organization and management.

Open design questions include:

- How desktop and Android will communicate.
- Whether synchronization will be local-network-only or support additional connection methods.
- How conflicts between edits will be resolved.
- How authentication and private access will work.
- How media and attachments will be transferred.

No synchronization or networking architecture should be considered finalized until these decisions have been made.

### Phase 9 — Packaging and release readiness

Before considering BRD ready for regular use, the project should have:

- A reliable Windows installer.
- A defined application data location.
- A tested backup and recovery workflow.
- Basic error reporting.
- Verified startup and shutdown behavior.
- A repeatable release build.
- Documentation for data migration and recovery.

---

## 7. Mandatory easter egg: POTATO.EXE

This is a required project feature, not an optional enhancement.

### Requirements

- The trigger is **exactly 18 clicks on the application logo**.
- The trigger count must not be replaced with another number.
- Activation must display a cute pink potato illustration.
- The exact required text is:

  **`You've been POTATO'ED`**

- A high-pitched sound may be included as an optional extra.

The illustration has not yet been confirmed as implemented. The final artwork should be created when the easter egg is developed.

The trigger, artwork and exact text must all be preserved in future implementation work.

---

## 8. UI and interaction requirements

The following rules should guide future UI work.

1. **Themes and appearance are separate settings categories.** Do not reintroduce theme selection into Appearance.
2. **The title bar remains at standard scale.** Global UI scaling affects the main content only.
3. **Character selection must be functional.** A visual selection without an effect on the composer is incomplete.
4. **Editing must remain unrestricted.** Do not add arbitrary message-edit limits.
5. **History must be recoverable.** Editing should not permanently destroy previous versions.
6. **Drafts must be protected.** Saving behavior should be reliable and failures should be visible.
7. **Customization must be consistent.** Changes to fonts, scale, density and theme should not create contradictory visual states.
8. **Avoid unnecessary rewrites.** Preserve existing working features and make focused changes.
9. **Test after each meaningful change.** Build first, then check the actual interaction in the running application.

---

## 9. Development workflow

The project is developed incrementally in VS Code.

### Recommended implementation cycle

1. Identify one specific task.
2. Inspect the relevant existing files.
3. Decide on the smallest safe change.
4. Apply the change without replacing unrelated functionality.
5. Run the build.
6. Launch BRD and test the affected behavior.
7. Check that existing features still work.
8. Update this document when implementation status changes.

Commands:

```powershell
npm run build
npm run tauri dev
```

These are development commands, not a complete production packaging procedure.

### Change-management principles

- Keep existing `.bk` backups when modifying important files.
- Do not assume a feature is missing before inspecting the current implementation.
- Do not mark a feature complete solely because the application compiles.
- Record unresolved design decisions explicitly.
- Prefer one clear implementation task at a time.

---

## 10. Current priorities

The recommended immediate priorities are:

1. Verify the current interface and preference behavior.
2. Inspect the existing character and composer implementation.
3. Complete the character panel and character selection workflow.
4. Integrate expression selection.
5. Finish and validate the rich-text editor.
6. Establish reliable persistence for messages, scenes and projects.
7. Implement message editing and version history.
8. Expand project organization.
9. Develop the Android companion.
10. Implement and test the mandatory POTATO.EXE easter egg.

The ordering can be adjusted when inspection reveals dependencies, but the desktop roleplay workflow and data reliability remain the primary goals.

---

## 11. Open decisions and verification checklist

These items should remain explicitly unresolved until confirmed.

- [ ] Inspect the current project and scene data model.
- [ ] Confirm which character-management features already work.
- [ ] Confirm which rich-text editor features are implemented.
- [ ] Verify actual message persistence across application restarts.
- [ ] Decide the durable storage architecture for projects, scenes and messages.
- [ ] Define how message versions will be stored and restored.
- [ ] Define the asset model for avatars and expressions.
- [ ] Test all supported UI scales and density modes.
- [ ] Define the Android synchronization architecture.
- [ ] Implement POTATO.EXE with its exact 18-click trigger and required text.
- [ ] Establish a production packaging and recovery procedure.

---

## 12. Definition of a successful first usable version

The first genuinely usable version of BRD should allow a user to:

- Open the application and access a project and scene.
- Select a character and compose a roleplay message.
- Format and publish the message.
- Edit the message and recover an earlier version.
- Close and reopen the application without losing saved work.
- Customize the interface using the available themes and appearance settings.
- Continue working without relying on fragile temporary state.

The Android companion, advanced synchronization and additional conveniences can follow once this desktop workflow is dependable.

---

## 13. Project status summary

Borealis Roleplay Den has progressed beyond the initial concept: the React/TypeScript desktop application exists, the Tauri shell and custom title bar are in place, and a substantial theme and preferences foundation has been built.

The next milestone is not simply adding more screens. It is turning the existing interface into a complete, dependable roleplay workflow: characters, expressions, writing, editing, history and persistent data.

**Guiding principle:** build a stable writing environment first, then expand the world around it.

*End of document.*
