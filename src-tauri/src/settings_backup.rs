//! Export a portable, explicit snapshot of app-local settings and profile media.
//! Workspace-owned stories, resources and characters are intentionally out of scope.

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::{
    fs::{self, File, OpenOptions},
    io::{self, BufReader, Read, Write},
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use zip::{CompressionMethod, ZipArchive, ZipWriter, write::SimpleFileOptions};

const STORE_FILES: &[&str] = &[
    "preferences.json",
    "recent-workspaces.json",
    "workspace-icons.json",
    "collections.json",
    "window-state.json",
];
const MAX_BACKUP_BYTES: u64 = 512 * 1024 * 1024;
const MAX_MEDIA_FILE_BYTES: u64 = 50 * 1024 * 1024;
const MAX_MEDIA_FILES: usize = 2048;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SettingsBackupResult {
    path: String,
    file_count: usize,
}

fn collect_settings_files(app_data: &Path) -> Result<Vec<(PathBuf, String)>, String> {
    let mut files = Vec::new();
    let mut total_bytes: u64 = 0;

    for name in STORE_FILES {
        let path = app_data.join(name);
        let meta = match fs::symlink_metadata(&path) {
            Ok(meta) => meta,
            Err(error) if error.kind() == io::ErrorKind::NotFound => continue,
            Err(error) => return Err(format!("Could not inspect {name}: {error}")),
        };
        if !meta.file_type().is_file() {
            return Err(format!("The settings entry {name} is not a regular file."));
        }
        total_bytes = total_bytes.checked_add(meta.len())
            .ok_or_else(|| "Settings backup is too large.".to_string())?;
        files.push((path, format!("AppData/{name}")));
    }

    // The app's imported profile avatars, banners and sidebar thumbnails are
    // stored under app_data_dir()/media (the workspace media live elsewhere).
    let media = app_data.join("media");
    if media.exists() {
        if !fs::symlink_metadata(&media)
            .map_err(|error| format!("Could not inspect profile images: {error}"))?
            .file_type().is_dir()
        {
            return Err("The profile media directory is not a normal folder.".to_string());
        }
        for entry in fs::read_dir(&media)
            .map_err(|error| format!("Could not inspect profile images: {error}"))?
        {
            let entry = entry.map_err(|error| format!("Could not inspect a profile image: {error}"))?;
            let meta = fs::symlink_metadata(entry.path())
                .map_err(|error| format!("Could not inspect a profile image: {error}"))?;
            if !meta.file_type().is_file() {
                // Do not traverse symlinks, junctions or unknown directories.
                continue;
            }
            if meta.len() > MAX_MEDIA_FILE_BYTES {
                return Err(format!("A profile image is too large to back up: {}", entry.file_name().to_string_lossy()));
            }
            let filename = entry.file_name().into_string()
                .map_err(|_| "A profile media file has an unsupported name.".to_string())?;
            total_bytes = total_bytes.checked_add(meta.len())
                .ok_or_else(|| "Settings backup is too large.".to_string())?;
            files.push((entry.path(), format!("AppData/media/{filename}")));
            if files.len() > MAX_MEDIA_FILES + STORE_FILES.len() {
                return Err("There are too many profile media files to back up.".to_string());
            }
        }
    }
    if files.is_empty() {
        return Err("No saved Borealis settings were found yet.".to_string());
    }
    if total_bytes > MAX_BACKUP_BYTES {
        return Err("Settings and profile images exceed the 512 MiB backup safety limit.".to_string());
    }
    files.sort_by(|a, b| a.1.cmp(&b.1));
    Ok(files)
}

fn create_zip(temp_path: &Path, files: &[(PathBuf, String)], version: &str) -> Result<(), String> {
    let file = OpenOptions::new().write(true).create_new(true).open(temp_path)
        .map_err(|error| format!("Could not prepare the backup file: {error}"))?;
    let mut zip = ZipWriter::new(file);
    let options = || SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    let manifest = serde_json::json!({
        "format": "borealis-settings-backup",
        "schemaVersion": 1,
        "appIdentifier": "com.borealis.rp",
        "applicationVersion": version,
        "createdAt": super::now_rfc3339()?,
        "includesWorkspaceData": false,
        "storedPaths": files.iter().map(|(_, name)| name.as_str()).collect::<Vec<_>>(),
    });
    zip.start_file("backup-manifest.json", options())
        .map_err(|error| format!("Could not add backup information: {error}"))?;
    zip.write_all(serde_json::to_string_pretty(&manifest)
        .map_err(|error| format!("Could not encode backup information: {error}"))?
        .as_bytes()).map_err(|error| format!("Could not write backup information: {error}"))?;

    let instructions = "BOREALIS ROLEPLAY STUDIO — SETTINGS BACKUP\n\nThis ZIP contains application preferences, recent workspace references,\nworkspace icon choices, discoveries and locally imported profile images.\nIt does NOT contain the workspace folders (characters, scenes, messages,\nresources and drafts). Back up each workspace folder separately.\n\nTO RESTORE MANUALLY:\n1. Fully close Borealis, including any development instance.\n2. Make a copy of your existing Borealis app data directory.\n3. Extract the contents of the ZIP's AppData folder into Borealis's\n   application data directory (on Windows, usually\n   %APPDATA%\\com.borealis.rp), preserving the media subfolder.\n4. Reopen Borealis. Recent workspace paths must still be accessible.\n5. When transferring to another Windows account/computer, profile media\n   absolute paths in preferences may need updating.\n\nThis is an export-only feature: automatic in-app restore is not yet available.\n";
    zip.start_file("RESTORE-INSTRUCTIONS.txt", options())
        .map_err(|error| format!("Could not add restore notes: {error}"))?;
    zip.write_all(instructions.as_bytes())
        .map_err(|error| format!("Could not write restore notes: {error}"))?;

    for (source, name) in files {
        zip.start_file(name, options())
            .map_err(|error| format!("Could not add {name}: {error}"))?;
        let mut input = BufReader::new(File::open(source)
            .map_err(|error| format!("Could not read {name}: {error}"))?);
        io::copy(&mut input, &mut zip)
            .map_err(|error| format!("Could not back up {name}: {error}"))?;
    }
    let file = zip.finish().map_err(|error| format!("Could not finalise backup ZIP: {error}"))?;
    file.sync_all().map_err(|error| format!("Could not finish writing backup ZIP: {error}"))?;
    Ok(())
}

/// Does not overwrite pre-existing archives, and never changes a workspace.
// ZIP compression and filesystem work run away from the Tauri UI thread.
#[tauri::command]
pub(crate) async fn create_settings_backup(
    app: AppHandle,
    destination_path: String,
) -> Result<SettingsBackupResult, String> {
    tauri::async_runtime::spawn_blocking(move || create_settings_backup_sync(app, destination_path))
        .await
        .map_err(|error| format!("Could not finish the settings backup: {error}"))?
}

fn create_settings_backup_sync(
    app: AppHandle,
    destination_path: String,
) -> Result<SettingsBackupResult, String> {
    let destination = PathBuf::from(destination_path);
    if !destination.is_absolute()
        || !destination.extension().and_then(|e| e.to_str()).is_some_and(|e| e.eq_ignore_ascii_case("zip"))
    {
        return Err("Choose an absolute .zip filename for the backup.".to_string());
    }
    if destination.exists() {
        return Err("A file already exists at that location. Choose a new backup filename.".to_string());
    }
    let parent = destination.parent()
        .ok_or_else(|| "Choose a valid backup folder.".to_string())?
        .canonicalize()
        .map_err(|error| format!("Could not access the backup folder: {error}"))?;
    let app_data = app.path().app_data_dir()
        .map_err(|error| format!("Could not locate Borealis settings: {error}"))?;
    let resolved_app_data = app_data.canonicalize()
        .map_err(|error| format!("Could not inspect Borealis settings folder: {error}"))?;
    if parent.starts_with(&resolved_app_data) {
        return Err("Save your backup outside Borealis's own application data folder.".to_string());
    }
    let sources = collect_settings_files(&app_data)?;
    let temp_path = parent.join(format!(".borealis-settings-{}.tmp", Uuid::new_v4()));

    let result = create_zip(&temp_path, &sources, &app.package_info().version.to_string());
    if let Err(error) = result {
        let _ = fs::remove_file(&temp_path);
        return Err(error);
    }
    // Never overwrite an existing backup. A failed rename leaves the previous
    // archive intact, and the newly generated temporary file is cleaned up.
    if destination.exists() {
        let _ = fs::remove_file(&temp_path);
        return Err("A backup with this name was created meanwhile. Choose a new name.".to_string());
    }
    if let Err(error) = fs::rename(&temp_path, &destination) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("Could not save the settings backup: {error}"));
    }
    Ok(SettingsBackupResult {
        path: destination.to_string_lossy().into_owned(),
        file_count: sources.len(),
    })
}


// ---- Import / restore -------------------------------------------------------------------------
// Only our own V1 backup archive layout is accepted. Never extract ZIP paths directly:
// expected relative file names are resolved from an explicit allowlist.
const MAX_ARCHIVE_ENTRIES: usize = MAX_MEDIA_FILES + STORE_FILES.len() + 2;
const MAX_JSON_FILE_BYTES: u64 = 16 * 1024 * 1024;
const MAX_MANIFEST_BYTES: u64 = 128 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupManifest {
    format: String,
    schema_version: u32,
    app_identifier: String,
    created_at: String,
    application_version: String,
    includes_workspace_data: bool,
    stored_paths: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestorePreview {
    created_at: String,
    application_version: String,
    file_count: usize,
    media_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RestoreResult {
    restored_count: usize,
    safety_backup_path: String,
}

struct ValidatedBackup {
    info: RestorePreview,
    // Canonical, controlled archive-relative paths; never user-provided filesystem paths.
    files: Vec<(String, Vec<u8>)>,
}

fn is_known_backup_path(name: &str) -> bool {
    if let Some(store) = name.strip_prefix("AppData/") {
        if STORE_FILES.contains(&store) {
            return true;
        }
    }
    let Some(filename) = name.strip_prefix("AppData/media/") else { return false; };
    // No subdirectories, dot segments, path traversal, alternate Windows streams, or
    // non-portable names. Media saved by this app have simple UUID-based names.
    if filename.is_empty() || filename.len() > 200 || filename.starts_with('.')
        || !filename.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_' || c == b'.')
    {
        return false;
    }
    matches!(
        filename.rsplit('.').next().map(str::to_ascii_lowercase).as_deref(),
        Some("png" | "jpg" | "jpeg" | "webp" | "gif")
    )
}

fn backup_file_limit(name: &str) -> u64 {
    if name.starts_with("AppData/media/") { MAX_MEDIA_FILE_BYTES } else { MAX_JSON_FILE_BYTES }
}

fn load_validated_backup(path: &Path) -> Result<ValidatedBackup, String> {
    if !path.is_absolute() || !path.is_file()
        || !path.extension().and_then(|ext| ext.to_str()).is_some_and(|ext| ext.eq_ignore_ascii_case("zip"))
    {
        return Err("Choose a valid Borealis settings ZIP file.".into());
    }
    let compressed_size = fs::metadata(path)
        .map_err(|error| format!("Could not inspect the chosen ZIP: {error}"))?.len();
    if compressed_size > MAX_BACKUP_BYTES + 32 * 1024 * 1024 {
        return Err("This backup ZIP is unusually large.".into());
    }
    let file = File::open(path).map_err(|error| format!("Could not open the backup: {error}"))?;
    let mut zip = ZipArchive::new(file)
        .map_err(|error| format!("This file is not a readable ZIP archive: {error}"))?;
    if zip.len() < 2 || zip.len() > MAX_ARCHIVE_ENTRIES {
        return Err("This ZIP does not have a supported Borealis backup layout.".into());
    }

    let mut encountered = HashSet::<String>::new();
    let mut stored_names = HashSet::<String>::new();
    let mut total: u64 = 0;
    let mut payloads = Vec::new();
    let mut manifest_bytes: Option<Vec<u8>> = None;

    for index in 0..zip.len() {
        let mut entry = zip.by_index(index)
            .map_err(|error| format!("Could not inspect ZIP entry: {error}"))?;
        let name = entry.name().to_owned();
        if entry.is_dir() || !encountered.insert(name.clone()) {
            return Err("The ZIP has a duplicate entry or unexpected directory.".into());
        }
        // Disallow UNIX symlinks and nonregular files, even when the filename is safe.
        if entry.unix_mode().is_some_and(|mode| {
            let kind = mode & 0o170000;
            kind != 0 && kind != 0o100000
        }) {
            return Err("The ZIP contains an unsupported file type.".into());
        }
        if name == "RESTORE-INSTRUCTIONS.txt" {
            if entry.size() > MAX_MANIFEST_BYTES {
                return Err("The backup notes are unusually large.".into());
            }
            continue;
        }
        if name == "backup-manifest.json" {
            if entry.size() > MAX_MANIFEST_BYTES {
                return Err("The backup manifest is too large.".into());
            }
            let mut bytes = Vec::new();
            (&mut entry).take(MAX_MANIFEST_BYTES + 1).read_to_end(&mut bytes)
                .map_err(|error| format!("Could not read the backup manifest: {error}"))?;
            if bytes.len() as u64 > MAX_MANIFEST_BYTES {
                return Err("The backup manifest is too large.".into());
            }
            manifest_bytes = Some(bytes);
            continue;
        }
        if !is_known_backup_path(&name) {
            return Err(format!("The ZIP contains an unexpected file: {name}"));
        }
        if entry.size() > backup_file_limit(&name) {
            return Err(format!("The ZIP entry is too large: {name}"));
        }
        total = total.checked_add(entry.size())
            .ok_or_else(|| "Backup content is too large.".to_string())?;
        if total > MAX_BACKUP_BYTES {
            return Err("Backup data exceed the 512 MiB safety limit.".into());
        }
        let mut bytes = Vec::new();
        // Bounded decompression also protects against false uncompressed-size headers.
        (&mut entry).take(backup_file_limit(&name) + 1).read_to_end(&mut bytes)
            .map_err(|error| format!("Could not read backup data {name}: {error}"))?;
        if bytes.len() as u64 > backup_file_limit(&name) {
            return Err(format!("Decompressed backup file exceeds its size limit: {name}"));
        }
        total = total.saturating_sub(entry.size()).saturating_add(bytes.len() as u64);
        if total > MAX_BACKUP_BYTES {
            return Err("Backup data exceed the 512 MiB safety limit.".into());
        }
        if STORE_FILES.iter().any(|store| name == format!("AppData/{store}")) {
            let json: serde_json::Value = serde_json::from_slice(&bytes)
                .map_err(|error| format!("Invalid JSON in {name}: {error}"))?;
            if !json.is_object() {
                return Err(format!("The store {name} has an invalid structure."));
            }
        }
        stored_names.insert(name.clone());
        payloads.push((name, bytes));
    }

    let manifest_bytes = manifest_bytes.ok_or_else(|| "Missing Borealis backup manifest.".to_string())?;
    let manifest: BackupManifest = serde_json::from_slice(&manifest_bytes)
        .map_err(|error| format!("Invalid Borealis backup manifest: {error}"))?;
    if manifest.format != "borealis-settings-backup" || manifest.schema_version != 1
        || manifest.app_identifier != "com.borealis.rp" || manifest.includes_workspace_data
        || manifest.created_at.trim().is_empty() || manifest.application_version.trim().is_empty()
    {
        return Err("This archive is not a supported Borealis settings backup.".into());
    }
    let declared = manifest.stored_paths.iter().cloned().collect::<HashSet<_>>();
    if declared.len() != manifest.stored_paths.len() || declared != stored_names {
        return Err("The backup manifest does not match the ZIP contents.".into());
    }
    if payloads.is_empty() {
        return Err("This settings backup contains no files to restore.".into());
    }
    let media_count = payloads.iter().filter(|(name, _)| name.starts_with("AppData/media/")).count();
    Ok(ValidatedBackup {
        info: RestorePreview {
            created_at: manifest.created_at,
            application_version: manifest.application_version,
            file_count: payloads.len(),
            media_count,
        },
        files: payloads,
    })
}

#[tauri::command]
pub(crate) async fn inspect_settings_backup(path: String) -> Result<RestorePreview, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let backup = load_validated_backup(Path::new(&path))?;
        Ok(backup.info)
    })
    .await.map_err(|error| format!("Could not inspect the ZIP: {error}"))?
}

// Profiles store absolute paths to files in the app's own media directory.
// When a backup is transferred between computers/accounts, point these two
// specific fields at the imported media. Do not rewrite any arbitrary paths.
fn rebase_profile_media(json: &mut serde_json::Value, app_data: &Path, media_names: &HashSet<String>) {
    let Some(profile) = json.get_mut("appPreferences").and_then(|v| v.get_mut("profile"))
        .and_then(serde_json::Value::as_object_mut) else { return };
    for field in ["avatarAssetPath", "bannerAssetPath"] {
        let Some(value) = profile.get_mut(field) else { continue };
        let Some(path) = value.as_str() else { continue };
        let clean_path = path.replace('\\', "/");
        let Some((parent, filename)) = clean_path.rsplit_once('/') else { continue };
        if !parent.to_ascii_lowercase().ends_with("/media") || !media_names.contains(filename) {
            continue;
        }
        let new_path = app_data.join("media").join(filename).to_string_lossy().into_owned();
        *value = serde_json::Value::String(new_path);
    }
}

fn create_restore_staging(app_data: &Path, backup: &ValidatedBackup) -> Result<PathBuf, String> {
    let staging = app_data.join(format!(".settings-restore-{}", Uuid::new_v4()));
    fs::create_dir(&staging)
        .map_err(|error| format!("Could not prepare temporary restore folder: {error}"))?;
    let work = (|| -> Result<(), String> {
        let media_names: HashSet<String> = backup.files.iter()
            .filter_map(|(name, _)| name.strip_prefix("AppData/media/").map(str::to_string))
            .collect();
        for (name, raw) in &backup.files {
            let dest = staging.join(name);
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| format!("Could not prepare the staged backup: {error}"))?;
            }
            let contents = if name == "AppData/preferences.json" {
                let mut json: serde_json::Value = serde_json::from_slice(raw)
                    .map_err(|error| format!("Could not decode saved preferences: {error}"))?;
                rebase_profile_media(&mut json, app_data, &media_names);
                serde_json::to_vec_pretty(&json)
                    .map_err(|error| format!("Could not prepare restored profile preferences: {error}"))?
            } else {
                raw.clone()
            };
            fs::write(&dest, contents)
                .map_err(|error| format!("Could not prepare backup file {name}: {error}"))?;
        }
        Ok(())
    })();
    if work.is_err() { let _ = fs::remove_dir_all(&staging); }
    work.map(|()| staging)
}

fn restore_settings_backup_sync(app: &AppHandle, source: &str) -> Result<RestoreResult, String> {
    let backup = load_validated_backup(Path::new(source))?;
    let app_data = app.path().app_data_dir()
        .map_err(|error| format!("Could not locate Borealis settings: {error}"))?;
    fs::create_dir_all(&app_data)
        .map_err(|error| format!("Could not open Borealis settings folder: {error}"))?;
    let app_data = app_data.canonicalize()
        .map_err(|error| format!("Could not resolve Borealis settings directory: {error}"))?;
    let media = app_data.join("media");
    if media.exists() && !fs::symlink_metadata(&media)
        .map_err(|error| format!("Could not inspect profile storage: {error}"))?
        .file_type().is_dir()
    {
        return Err("The application profile media folder is not a normal directory.".into());
    }
    // Reject any restore target that is not a normal file (including symlinks).
    for (name, _) in &backup.files {
        let target = app_data.join(name.strip_prefix("AppData/")
            .ok_or_else(|| "The ZIP contains an invalid path.".to_string())?);
        match fs::symlink_metadata(&target) {
            Ok(meta) if !meta.file_type().is_file() =>
                return Err(format!("An existing settings file is not a regular file: {name}")),
            Ok(_) => {},
            Err(error) if error.kind() == io::ErrorKind::NotFound => {},
            Err(error) => return Err(format!("Cannot access settings file {name}: {error}")),
        }
    }

    // Pre-stage the complete payload and create a durable 'before restore'
    // ZIP before touching ANY of the current settings.
    let staging = create_restore_staging(&app_data, &backup)?;
    let current_files = match collect_settings_files(&app_data) {
        Ok(files) => files,
        Err(error) if error == "No saved Borealis settings were found yet." => Vec::new(),
        Err(error) => {
            let _ = fs::remove_dir_all(&staging);
            return Err(error);
        }
    };
    let rollback_base = app_data.join("settings-backups");
    let result = (|| -> Result<RestoreResult, String> {
        // Never follow an existing symlink/junction for the recovery archive.
        match fs::symlink_metadata(&rollback_base) {
            Ok(meta) if !meta.file_type().is_dir() =>
                return Err("The safety backup location is not a normal directory.".into()),
            Ok(_) => {},
            Err(error) if error.kind() == io::ErrorKind::NotFound => {},
            Err(error) => return Err(format!("Could not inspect the safety backup folder: {error}")),
        }
        fs::create_dir_all(&rollback_base)
            .map_err(|error| format!("Could not create a safety backup folder: {error}"))?;
        let name = format!("before-restore-{}.zip", Uuid::new_v4());
        let safety_backup = rollback_base.join(name);
        create_zip(&safety_backup, &current_files, &app.package_info().version.to_string())?;

        // Preserve original files within our staging folder so we can roll back
        // immediately if ANY of the writes fails. The separate ZIP remains as
        // a persistent emergency backup even after a successful restore.
        let rollback_files = current_files.iter().map(|(path, name)| (name.clone(), path.clone()))
            .collect::<HashMap<_, _>>();
        let mut applied: Vec<(PathBuf, Option<PathBuf>)> = Vec::new();
        let apply = (|| -> Result<(), String> {
            for (name, _) in &backup.files {
                let rel = name.strip_prefix("AppData/").expect("validated backup prefix");
                let target = app_data.join(rel);
                if let Some(parent) = target.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|error| format!("Could not prepare restored media folder: {error}"))?;
                }
                let previous = rollback_files.get(name).map(|old| old.to_owned());
                let saved_previous = if let Some(old) = previous {
                    let rollback_path = staging.join("previous").join(rel);
                    if let Some(parent) = rollback_path.parent() {
                        fs::create_dir_all(parent)
                            .map_err(|error| format!("Could not stage the original settings: {error}"))?;
                    }
                    fs::copy(old, &rollback_path)
                        .map_err(|error| format!("Could not preserve current settings before restore: {error}"))?;
                    Some(rollback_path)
                } else { None };
                // Track the destination before copying, so even a partial write
                // is rolled back if fs::copy fails midway.
                applied.push((target.clone(), saved_previous));
                fs::copy(staging.join(name), &target)
                    .map_err(|error| format!("Could not restore {name}: {error}"))?;
            }
            Ok(())
        })();

        if let Err(error) = apply {
            let mut failures = Vec::new();
            for (target, previous) in applied.into_iter().rev() {
                let undo = match previous {
                    Some(path) => fs::copy(path, &target).map(|_| ()),
                    None => match fs::remove_file(&target) {
                        Ok(()) => Ok(()),
                        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
                        Err(e) => Err(e),
                    },
                };
                if let Err(e) = undo { failures.push(format!("{}: {e}", target.display())); }
            }
            if failures.is_empty() {
                return Err(format!("Restore cancelled and prior settings recovered: {error}. Safety ZIP: {}", safety_backup.display()));
            }
            return Err(format!("RESTORE ERROR: {error}. Automatic rollback was incomplete ({}). Your prior settings ZIP is safe at {}. Don't close this warning until you have copied its path.", failures.join("; "), safety_backup.display()));
        }
        Ok(RestoreResult {
            restored_count: backup.info.file_count,
            safety_backup_path: safety_backup.to_string_lossy().into_owned(),
        })
    })();

    // On rollback failures, retain staging files for possible manual recovery.
    if result.is_ok() || result.as_ref().err().is_some_and(|e| !e.contains("Automatic rollback was incomplete")) {
        let _ = fs::remove_dir_all(&staging);
    }
    result
}

/// Validates again and restores only allowlisted AppData files. Restarts the
/// application to discard cached plugin-store/in-memory settings immediately.
#[tauri::command]
pub(crate) async fn restore_settings_backup(app: AppHandle, path: String) -> Result<RestoreResult, String> {
    let backup_app = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        restore_settings_backup_sync(&backup_app, &path)
    }).await.map_err(|error| format!("Could not complete the settings restoration: {error}"))??;
    app.request_restart();
    Ok(result)
}
