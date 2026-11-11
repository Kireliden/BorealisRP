# Borealis Roleplay Den — Alpha Readiness

**Assessment date:** 11 November 2026  
**Target:** **private, local-first desktop alpha**.  
**Decision:** **Candidate / freeze-worthy, NOT yet accepted as a packaged alpha release.** No version bump, Git tag or release has been performed by this document.

## Release scope

This alpha should demonstrate one reliable offline desktop loop:

**Open a workspace → manage scenes/characters → write as a character → format/send/edit → close app → reopen → recover the same data.**

Included candidate features: workspace navigation and storage, character library and expressions, Resources, roleplay chat/composer, themed customisation, scene backgrounds and local export. Extras (achievements/easter eggs) are permitted but not acceptance criteria. Online roleplay/invitations, multi-device sync, AI and a mobile companion are explicitly **out of scope**.

## What appears ready

- Rich, coherent interactive interface with reusable theme-aware controls and twelve theme options.
- Active workspace name/icon and three icon styles in Workspace; four icon styles (including Lucide) in the composer.
- The developer has tested the recent rich text colour, paste cleanup, icon visibility, icon-only sends and workspace icon selection fixes in the running app.
- Source-level storage and isolation features exist, with a prior workspace isolation audit and per-scene draft write ordering.
- Characters, relationships, resources, expressions, folders, scenes and message editing are implemented, making the application meaningfully more than a UI mock-up.

These observations support an **internal alpha candidate**, not a claim of general stability.

## Acceptance gates — complete before tagging or sharing a build

Use a disposable/copy of the workspace for destructive tests; **never experiment on the only copy of user content**.

| Gate | Required result | Status |
| --- | --- | --- |
| A. Exact-head reproducible build | Clean `npm ci`, `npm run build`, `npm run tauri build` pass, with commit recorded | [ ] Pending |
| B. Fresh start | Create workspace in chosen folder, set its icon, make folder/category/scene, restart and reopen | [ ] Pending |
| C. Core writing loop | Select character, expression, dialogue/narration, format text/colour, send, edit, reload, verify original content | [ ] Pending |
| D. Icon and paste regression | OpenMoji/system/Lucide selection; Lucide-only send; pasted rich text has no background; saved icon survives reload | [ ] Pending |
| E. Draft reliability | Draft persists when changing scenes, on restart, and does not reappear after a successful send | [ ] Pending |
| F. Multi-workspace isolation | Distinct characters/resources/relationship types/scenes in two workspaces; switch rapidly; no leaking | [ ] Pending |
| G. Resources/media | Import images/GIFs, pick portrait/expression, attach message media, move/delete in a disposable workspace, reopen | [ ] Pending |
| H. Backup/recovery | With app closed, copy **entire workspace folder**; reopen copied folder; confirm chat, characters and media. Test missing/corrupt data without data loss | [ ] Pending |
| I. UI/accessibility smoke | Common scale factors, light/dark themes, keyboard navigation/Escape, small window, reduced-motion setting | [ ] Pending |
| J. Distribution | Test packaged Windows application (clean environment if possible), startup and local file access. Linux build/test required before claiming Linux alpha support | [ ] Pending |
| K. Release metadata | Decide BRD product title, window title, package identity and exact prerelease version; update consistently and tag only after gates pass | [ ] Pending |

**Blocker policy:** data loss/corruption, cross-workspace bleed, unsendable messages, unrecoverable drafts, an application that will not open/build, or installers that cannot access workspaces **block the alpha**. Cosmetic imperfections may be logged as non-blocking if they do not impede use.

**Restore checkpoint:** the About page now includes a ZIP importer with confirmation, a pre-restore archive and restart. The acceptance gate must include a genuine restore on disposable settings, proof that the safety ZIP can be reopened, and proof that user Workspaces are unchanged. Code presence is not a passed test.

### Core settings-backup smoke test

The About page now has **Create settings backup** and **Restore settings backup** actions (source implemented, runtime acceptance pending). Verify the ZIP manifest, app-local stores, images, confirmation, rollback and automatic restart using disposable app data. This does **not replace** the full Workspace copy/restore gate above. See `docs/SETTINGS-BACKUP.md`.

## Known candidates for follow-up investigation

- **Markdown/Obsidian export and inline Lucide:** export currently processes rich HTML but does not have an explicit `data-lucide-icon` fallback. Verify that icon-only messages are not silently exported as blank; implement a readable substitute if needed.
- **Storage/schema:** version-1 workspace schema exists; future workspace migration/recovery and automated **Workspace ZIP** backup/restore are not established. The new settings-only ZIP does not replace workspace backups. Full Workspace ZIP UI can remain a post-alpha feature **if complete manual folder-copy restore is verified and documented**.
- **Brand consistency:** the configured desktop package still says *Borealis Roleplay Studio*, although product naming is BRD. Choose whether to reconcile before distributing.
- **Cross-platform:** no claim of verified Linux portability until packaged and launched on Linux.

## Minimum practical test pass

1. Record the branch and commit SHA; test that precise build.
2. Build and launch on Windows; work with a new disposable Workspace A.
3. Create a category, folder, scene, character and portrait; compose and send formatted dialogue with a Lucide-only message too; edit a passage.
4. Save a draft, switch scene/workspace and reopen; check message/history, draft and media.
5. Open Workspace B, create different records and verify A/B are isolated.
6. Close the app; make a complete folder copy of A; open the copy as an existing workspace and verify its content independently.
7. Repeat key checks from the packaged app; assess UI scale, light theme and keyboard interactions; register issues.
8. Fix alpha blockers, rerun impacted tests, then deliberately tag a prerelease such as `v0.1.0-alpha.1`. **Do not infer a release from the current `0.1.0` package version.**

## Outcomes

- **Good now:** label the development branch **internal alpha candidate** and freeze feature scope.
- **Good after gates:** ship a **closed/private Windows alpha** to designated testers.
- **Later:** Linux alpha after native smoke test; online collaboration, mobile companion, full backup UI and polish can become separate milestones.

Keep checkboxes unchecked until the specific test is actually run and observed. User confirmation of a focused fix does not retroactively clear unrelated acceptance gates.
