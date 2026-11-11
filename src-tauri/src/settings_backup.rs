//! Export a portable, explicit snapshot of app-local settings and profile media.
//! Workspace-owned stories, resources and characters are intentionally out of scope.

use serde::Serialize;
use std::{
    fs::{self, File, OpenOptions},
    io::{self, BufReader, Write},
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use zip::{CompressionMethod, ZipWriter, write::SimpleFileOptions};

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
