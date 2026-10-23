# Clean first-run installer build

This branch prepares Borealis Roleplay Den for a first-run installation test.

## Intended first launch

- The workspace chooser opens automatically when no valid last workspace exists.
- The chooser cannot be dismissed until a workspace has been opened or created.
- The user can create a workspace in a folder they choose, or open an existing BRD workspace.
- The character library starts empty; the development character **Keira** is not pre-created.
- The profile starts unconfigured, with an empty display name.
- Collection discoveries (including easter eggs) use the normal empty default for a fresh installation.

## Build on Windows

From the repository root:

```powershell
npm install
npm run tauri build
```

Tauri's configured `beforeBuildCommand` runs `npm run build` before packaging. The Windows bundle should produce installer artefacts under `src-tauri/target/release/bundle/` (NSIS setup executable and/or MSI, depending on installed build prerequisites).

## Important test note

This branch does not delete existing user data. To test a genuine first launch, install it under a Windows account or machine that has not previously run BRD. Existing app data must never be wiped just to simulate onboarding; workspaces are user-owned folders and should remain untouched.

## Branch scope

This is a release-preparation branch based on `feature/workspace-storage-foundation`. Continue feature development on the development branch; only cherry-pick or merge release fixes intentionally.
