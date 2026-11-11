mod settings_backup;

use serde::{Deserialize, Serialize};
use std::{
    fs::{self, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    time::Duration,
};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, PhysicalPosition, Window};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

const WORKSPACE_FORMAT: &str = "borealis-roleplay-den-workspace";
const WORKSPACE_SCHEMA_VERSION: u32 = 1;
const WORKSPACE_MANIFEST: &str = "workspace.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceManifest {
    format: String,
    schema_version: u32,
    id: String,
    name: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceInfo {
    path: String,
    manifest: WorkspaceManifest,
}

fn now_rfc3339() -> Result<String, String> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .map_err(|error| format!("Could not create workspace timestamp: {error}"))
}

fn validate_workspace_name(name: &str) -> Result<(), String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Workspace name cannot be empty.".into());
    }
    if name == "." || name == ".." {
        return Err("Choose a different workspace name.".into());
    }
    if name.chars().any(|character| {
        character.is_control() || ['<', '>', ':', '"', '/', '\\', '|', '?', '*'].contains(&character)
    }) || name.ends_with('.') || name.ends_with(' ') {
        return Err("The workspace name contains characters that are not supported in folder names.".into());
    }
    Ok(())
}

fn read_workspace(path: &Path) -> Result<WorkspaceInfo, String> {
    let root = path
        .canonicalize()
        .map_err(|error| format!("Could not access workspace folder: {error}"))?;
    if !root.is_dir() {
        return Err("The selected path is not a folder.".into());
    }

    let manifest_path = root.join(WORKSPACE_MANIFEST);
    let manifest_text = fs::read_to_string(&manifest_path)
        .map_err(|error| format!("This folder does not contain a readable workspace.json: {error}"))?;
    let manifest: WorkspaceManifest = serde_json::from_str(&manifest_text)
        .map_err(|error| format!("The workspace manifest is invalid JSON: {error}"))?;

    if manifest.format != WORKSPACE_FORMAT {
        return Err("This folder is not a Borealis Roleplay Studio workspace.".into());
    }
    if manifest.schema_version != WORKSPACE_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported workspace schema version {} (this version of BRS supports {}).",
            manifest.schema_version, WORKSPACE_SCHEMA_VERSION
        ));
    }
    if manifest.id.trim().is_empty()
        || manifest.name.trim().is_empty()
        || manifest.created_at.trim().is_empty()
        || manifest.updated_at.trim().is_empty()
    {
        return Err("The workspace manifest is missing required fields.".into());
    }

    Ok(WorkspaceInfo {
        path: root.to_string_lossy().into_owned(),
        manifest,
    })
}

/// Creates a workspace inside a parent folder selected by the user.
#[tauri::command]
fn create_workspace(parent_path: String, name: String) -> Result<WorkspaceInfo, String> {
    validate_workspace_name(&name)?;
    let display_name = name.trim();
    let parent = PathBuf::from(parent_path)
        .canonicalize()
        .map_err(|error| format!("Could not access the selected destination folder: {error}"))?;
    if !parent.is_dir() {
        return Err("The selected destination is not a folder.".into());
    }

    let root = parent.join(display_name);
    fs::create_dir(&root).map_err(|error| {
        if error.kind() == std::io::ErrorKind::AlreadyExists {
            format!("A folder named '{display_name}' already exists there. Choose another name or destination.")
        } else {
            format!("Could not create the workspace folder: {error}")
        }
    })?;

    let creation_result = (|| -> Result<(), String> {
        for directory in [
            "Settings",
            "Characters",
            "Stories",
            "Chats",
            "Themes",
            "Resources/Backgrounds",
            "Resources/Audio",
            "Resources/Other",
        ] {
            fs::create_dir_all(root.join(directory))
                .map_err(|error| format!("Could not create workspace folder '{directory}': {error}"))?;
        }

        let timestamp = now_rfc3339()?;
        let manifest = WorkspaceManifest {
            format: WORKSPACE_FORMAT.into(),
            schema_version: WORKSPACE_SCHEMA_VERSION,
            id: Uuid::new_v4().to_string(),
            name: display_name.into(),
            created_at: timestamp.clone(),
            updated_at: timestamp,
        };
        let bytes = serde_json::to_vec_pretty(&manifest)
            .map_err(|error| format!("Could not serialize workspace manifest: {error}"))?;
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(root.join(WORKSPACE_MANIFEST))
            .map_err(|error| format!("Could not create workspace.json: {error}"))?;
        file.write_all(&bytes)
            .map_err(|error| format!("Could not write workspace.json: {error}"))?;
        file.write_all(b"\n")
            .map_err(|error| format!("Could not finish workspace.json: {error}"))?;
        Ok(())
    })();

    if let Err(error) = creation_result {
        // The target folder did not exist before this command created it.
        let _ = fs::remove_dir_all(&root);
        return Err(error);
    }

    read_workspace(&root)
}

/// Renames the workspace's displayed name in its manifest without moving its folder.
#[tauri::command]
fn rename_workspace(path: String, name: String) -> Result<WorkspaceInfo, String> {
    validate_workspace_name(&name)?;
    let workspace = read_workspace(Path::new(&path))?;
    let mut manifest = workspace.manifest;
    manifest.name = name.trim().to_string();
    manifest.updated_at = now_rfc3339()?;
    let bytes = serde_json::to_vec_pretty(&manifest)
        .map_err(|error| format!("Could not serialize workspace manifest: {error}"))?;
    fs::write(Path::new(&workspace.path).join(WORKSPACE_MANIFEST), bytes)
        .map_err(|error| format!("Could not rename workspace: {error}"))?;
    read_workspace(Path::new(&workspace.path))
}

/// Reads and validates an existing workspace without modifying its files.
#[tauri::command]
fn inspect_workspace(path: String) -> Result<WorkspaceInfo, String> {
    read_workspace(Path::new(&path))
}

#[tauri::command]
fn load_workspace_content(path: String) -> Result<serde_json::Value, String> {
    let workspace = read_workspace(Path::new(&path))?;
    let content_path = Path::new(&workspace.path).join("Chats/workspace-content.json");
    if !content_path.exists() {
        return Ok(serde_json::json!({ "schemaVersion": 1, "scenes": [] }));
    }

    let text = fs::read_to_string(&content_path)
        .map_err(|error| format!("Could not read workspace content: {error}"))?;
    let content: serde_json::Value = serde_json::from_str(&text)
        .map_err(|error| format!("Workspace content is invalid JSON: {error}"))?;
    if content.get("schemaVersion").and_then(serde_json::Value::as_u64) != Some(1)
        || !content.get("scenes").map_or(false, serde_json::Value::is_array)
    {
        return Err("Workspace content has an unsupported or invalid format.".into());
    }
    Ok(content)
}

#[tauri::command]
fn save_workspace_content(path: String, content: serde_json::Value) -> Result<(), String> {
    let workspace = read_workspace(Path::new(&path))?;
    if content.get("schemaVersion").and_then(serde_json::Value::as_u64) != Some(1)
        || !content.get("scenes").map_or(false, serde_json::Value::is_array)
    {
        return Err("Refusing to save workspace content with an unsupported or invalid format.".into());
    }

    let bytes = serde_json::to_vec_pretty(&content)
        .map_err(|error| format!("Could not serialize workspace content: {error}"))?;
    if bytes.len() > 20 * 1024 * 1024 {
        return Err("Workspace content is larger than the 20 MB safety limit.".into());
    }

    let content_path = Path::new(&workspace.path).join("Chats/workspace-content.json");
    fs::write(&content_path, bytes)
        .map_err(|error| format!("Could not save workspace content: {error}"))?;

    let manifest_path = Path::new(&workspace.path).join(WORKSPACE_MANIFEST);
    let mut manifest = workspace.manifest;
    manifest.updated_at = now_rfc3339()?;
    let manifest_bytes = serde_json::to_vec_pretty(&manifest)
        .map_err(|error| format!("Could not update workspace manifest: {error}"))?;
    fs::write(manifest_path, manifest_bytes)
        .map_err(|error| format!("Could not update workspace timestamp: {error}"))?;

    Ok(())
}

/// Data for a portable, Obsidian-friendly Markdown export.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarkdownExportAttachment {
    source_relative_path: String,
    target_file_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarkdownSceneExport {
    name: String,
    markdown: String,
    attachments: Vec<MarkdownExportAttachment>,
}

fn safe_markdown_export_name(name: &str) -> String {
    let cleaned = name
        .trim()
        .chars()
        .map(|ch| if ch.is_control() || matches!(ch, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '#' | '^' | '[' | ']') { '-' } else { ch })
        .take(72)
        .collect::<String>();
    let trimmed = cleaned.trim().trim_matches('.').trim().to_string();
    if trimmed.is_empty() {
        return "Untitled scene".into();
    }
    let reserved = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5",
        "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4",
        "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    if reserved.contains(&trimmed.to_ascii_uppercase().as_str()) {
        format!("{trimmed} - BRS")
    } else {
        trimmed
    }
}

/// Exports one or more scenes to a NEW directory selected by the user.
/// Never modifies the workspace or overwrites existing Obsidian notes.
#[tauri::command]
fn export_workspace_markdown(
    path: String,
    destination: String,
    collection_name: String,
    scenes: Vec<MarkdownSceneExport>,
) -> Result<String, String> {
    if scenes.is_empty() || scenes.len() > 500 {
        return Err("Choose between 1 and 500 scenes to export.".into());
    }
    let workspace = read_workspace(Path::new(&path))?;
    let workspace_root = fs::canonicalize(&workspace.path)
        .map_err(|error| format!("Cannot resolve workspace folder: {error}"))?;
    let selected_folder = fs::canonicalize(&destination)
        .map_err(|error| format!("Cannot find the selected export folder: {error}"))?;
    if !selected_folder.is_dir() {
        return Err("Select a destination folder for the Markdown export.".into());
    }

    let mut total_assets = 0_usize;
    // Inspect every referenced attachment before creating an export directory.
    for scene in &scenes {
        if scene.markdown.len() > 100 * 1024 * 1024 {
            return Err("One scene's Markdown exceeds the export safety limit.".into());
        }
        total_assets += scene.attachments.len();
        if total_assets > 10_000 {
            return Err("Too many image attachments to export at once.".into());
        }
        for attachment in &scene.attachments {
            if !attachment.source_relative_path.starts_with("Chats/Images/") {
                return Err("The export contains an invalid chat image reference.".into());
            }
            if attachment.target_file_name.len() > 100
                || !attachment.target_file_name.chars().all(|ch| {
                    ch.is_ascii_alphanumeric() || ch == '.' || ch == '-'
                })
                || !["png", "jpg", "jpeg", "webp", "gif"].contains(
                    &attachment.target_file_name.rsplit('.').next().unwrap_or("").to_ascii_lowercase().as_str()
                )
            {
                return Err("The export contains an invalid image filename.".into());
            }
            let source = workspace_file_path(&workspace.path, &attachment.source_relative_path)?;
            let canonical = fs::canonicalize(source)
                .map_err(|error| format!("Could not find an image in this chat: {error}"))?;
            if !canonical.starts_with(&workspace_root) {
                return Err("A chat image points outside the workspace.".into());
            }
            let metadata = fs::metadata(canonical)
                .map_err(|error| format!("Cannot inspect chat image: {error}"))?;
            if !metadata.is_file() || metadata.len() > 100 * 1024 * 1024 {
                return Err("An image is invalid or exceeds 100 MiB.".into());
            }
        }
    }

    let base = safe_markdown_export_name(&collection_name);
    let mut target = None;
    for n in 1..=1000 {
        let folder_name = if n == 1 { base.clone() } else { format!("{base} ({n})") };
        let candidate = selected_folder.join(folder_name);
        match fs::create_dir(&candidate) {
            Ok(()) => { target = Some(candidate); break; }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(format!("Cannot create the export folder: {error}")),
        }
    }
    let target = target.ok_or_else(|| "Too many exports with this name in the selected folder.".to_string())?;
    let export_result = (|| -> Result<(), String> {
        let assets_dir = target.join("assets");
        if total_assets > 0 {
            fs::create_dir(&assets_dir)
                .map_err(|error| format!("Could not create the attachments folder: {error}"))?;
        }
        let multiple = scenes.len() > 1;
        let mut index_links = Vec::new();

        for (index, scene) in scenes.iter().enumerate() {
            let name = safe_markdown_export_name(&scene.name);
            let stem = if multiple { format!("{:02} - {name}", index + 1) } else { name };
            let note_path = target.join(format!("{stem}.md"));
            fs::write(&note_path, scene.markdown.as_bytes())
                .map_err(|error| format!("Could not write the Markdown note: {error}"))?;
            if multiple {
                index_links.push(format!("- [[{stem}]]"));
            }
            for attachment in &scene.attachments {
                let source = workspace_file_path(&workspace.path, &attachment.source_relative_path)?;
                fs::copy(&source, assets_dir.join(&attachment.target_file_name))
                    .map_err(|error| format!("Could not copy an image into the export: {error}"))?;
            }
        }
        if multiple {
            let title = collection_name.replace('\r', " ").replace('\n', " ");
            let index_text = format!("# {}\n\n{}\n", title, index_links.join("\n"));
            fs::write(target.join("00 - Index.md"), index_text)
                .map_err(|error| format!("Could not write the export index: {error}"))?;
        }
        Ok(())
    })();

    if let Err(error) = export_result {
        // This directory was created by this call, so removing an incomplete export is safe.
        let _ = fs::remove_dir_all(&target);
        return Err(error);
    }
    Ok(target.to_string_lossy().into_owned())
}

/// Resolve a workspace-relative file path without allowing traversal outside the workspace.
fn workspace_file_path(workspace_path: &str, relative_path: &str) -> Result<PathBuf, String> {
    let workspace = read_workspace(Path::new(workspace_path))?;
    let relative = Path::new(relative_path);
    if relative.as_os_str().is_empty() || relative.is_absolute()
        || relative.components().any(|component| !matches!(component, std::path::Component::Normal(_)))
    {
        return Err("The workspace file path must be a safe relative path.".into());
    }
    Ok(Path::new(&workspace.path).join(relative))
}

/// Removes a file stored inside the selected workspace.
#[tauri::command]
fn delete_workspace_file(path: String, relative_path: String) -> Result<(), String> {
    if !relative_path.starts_with("Resources/Files/") && !relative_path.starts_with("Characters/Expressions/") && !relative_path.starts_with("Chats/Backgrounds/") {
        return Err("Only workspace media assets can be deleted with this command.".into());
    }
    let file_path = workspace_file_path(&path, &relative_path)?;
    match fs::remove_file(&file_path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("Could not delete workspace file '{relative_path}': {error}")),
    }
}

/// Reads bytes from a file stored inside the selected workspace.
#[tauri::command]
fn read_workspace_file(path: String, relative_path: String) -> Result<Vec<u8>, String> {
    let file_path = workspace_file_path(&path, &relative_path)?;
    let metadata = fs::metadata(&file_path)
        .map_err(|error| format!("Could not inspect workspace file '{relative_path}': {error}"))?;
    if !metadata.is_file() {
        return Err("The requested workspace path is not a file.".into());
    }
    if metadata.len() > 100 * 1024 * 1024 {
        return Err("Workspace files cannot exceed 100 MiB.".into());
    }
    fs::read(&file_path).map_err(|error| format!("Could not read workspace file '{relative_path}': {error}"))
}

/// Writes bytes atomically to a workspace-relative file, creating its parent directories.
#[tauri::command]
fn write_workspace_file(path: String, relative_path: String, bytes: Vec<u8>) -> Result<(), String> {
    const MAX_WORKSPACE_FILE_BYTES: usize = 100 * 1024 * 1024;
    if bytes.len() > MAX_WORKSPACE_FILE_BYTES {
        return Err("Workspace files cannot exceed 100 MiB.".into());
    }
    let file_path = workspace_file_path(&path, &relative_path)?;
    let parent = file_path.parent().ok_or_else(|| "Could not locate workspace file folder.".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("Could not create workspace file folder: {error}"))?;
    // Write directly for cross-platform replacement semantics (Windows rename does
    // not replace an existing destination consistently across supported filesystems).
    fs::write(&file_path, bytes)
        .map_err(|error| format!("Could not save workspace file '{relative_path}': {error}"))?;
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Imports an image into BRS-owned application storage so the original file can be moved safely.
#[tauri::command]
fn import_profile_media(app: AppHandle, source_path: String) -> Result<String, String> {
    let source = PathBuf::from(source_path);
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| "The selected file has no supported image extension.".to_string())?;

    if !["png", "jpg", "jpeg", "webp", "gif"].contains(&extension.as_str()) {
        return Err("Choose a PNG, JPG, WebP, or GIF image.".into());
    }

    let metadata = fs::metadata(&source)
        .map_err(|error| format!("Could not read the selected image: {error}"))?;
    if !metadata.is_file() {
        return Err("The selected path is not a file.".into());
    }
    if metadata.len() > 25 * 1024 * 1024 {
        return Err("Images must be 25 MiB or smaller.".into());
    }

    let app_data = app.path().app_data_dir()
        .map_err(|error| format!("Could not locate BRS application storage: {error}"))?;
    let media_dir = app_data.join("media");
    fs::create_dir_all(&media_dir)
        .map_err(|error| format!("Could not create BRS media storage: {error}"))?;

    let destination = media_dir.join(format!("{}.{}", Uuid::new_v4(), extension));
    fs::copy(&source, &destination)
        .map_err(|error| format!("Could not import the selected image: {error}"))?;

    Ok(destination.to_string_lossy().into_owned())
}


/// Makes a durable app-owned copy of an image picked from Resources (not a filesystem path).
#[tauri::command]
fn import_profile_media_bytes(app: AppHandle, file_name: String, bytes: Vec<u8>) -> Result<String, String> {
    let extension = Path::new(&file_name)
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| "The selected image has no supported extension.".to_string())?;
    if !["png", "jpg", "jpeg", "webp", "gif"].contains(&extension.as_str()) {
        return Err("Choose a PNG, JPG, WebP or GIF image.".into());
    }
    if bytes.is_empty() || bytes.len() > 25 * 1024 * 1024 {
        return Err("Images must be between 1 byte and 25 MiB.".into());
    }
    let signature_ok = match extension.as_str() {
        "png" => bytes.starts_with(&[137, 80, 78, 71, 13, 10, 26, 10]),
        "jpg" | "jpeg" => bytes.starts_with(&[0xff, 0xd8, 0xff]),
        "gif" => bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a"),
        "webp" => bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP".as_slice()),
        _ => false,
    };
    if !signature_ok {
        return Err("The selected file does not match its image format.".into());
    }
    let app_data = app.path().app_data_dir()
        .map_err(|error| format!("Could not locate BRS application storage: {error}"))?;
    let media_dir = app_data.join("media");
    fs::create_dir_all(&media_dir)
        .map_err(|error| format!("Could not create BRS media storage: {error}"))?;
    let destination = media_dir.join(format!("{}.{}", Uuid::new_v4(), extension));
    fs::write(&destination, bytes)
        .map_err(|error| format!("Could not import resource image: {error}"))?;
    Ok(destination.to_string_lossy().into_owned())
}


#[tauri::command]
fn profile_sidebar_thumbnail_path(app: AppHandle) -> Result<String, String> {
    let path = app.path().app_data_dir().map_err(|error| format!("Could not locate BRS application storage: {error}"))?.join("media").join("profile-sidebar-avatar.png");
    if !path.is_file() {
        return Err("No sidebar thumbnail has been generated yet.".into());
    }
    Ok(path.to_string_lossy().into_owned())
}
#[tauri::command]
fn save_profile_sidebar_thumbnail(app: AppHandle, bytes: Vec<u8>) -> Result<String, String> {
    const MAX_THUMBNAIL_BYTES: usize = 2 * 1024 * 1024;
    if bytes.len() < 8 || bytes.len() > MAX_THUMBNAIL_BYTES || bytes.get(0..8) != Some(&[137,80,78,71,13,10,26,10]) {
        return Err("The sidebar thumbnail is not a valid-sized PNG image.".into());
    }
    let path = app.path().app_data_dir().map_err(|error| format!("Could not locate BRS application storage: {error}"))?.join("media").join("profile-sidebar-avatar.png");
    let parent = path.parent().ok_or_else(|| "Could not locate sidebar thumbnail folder.".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("Could not create sidebar thumbnail folder: {error}"))?;
    fs::write(&path, bytes).map_err(|error| format!("Could not save sidebar thumbnail: {error}"))?;
    Ok(path.to_string_lossy().into_owned())
}
#[tauri::command]
fn remove_profile_sidebar_thumbnail(app: AppHandle) -> Result<(), String> {
    // Removing an optional cache must be safe before the first thumbnail exists.
    // Do not call profile_sidebar_thumbnail_path here: that command deliberately
    // returns an error when the file is absent.
    let path = app.path()
        .app_data_dir()
        .map_err(|error| format!("Could not locate BRS application storage: {error}"))?
        .join("media")
        .join("profile-sidebar-avatar.png");
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("Could not remove sidebar thumbnail: {error}")),
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DroppedResourceFile {
    file_name: String,
    bytes: Vec<u8>,
}

/// Reads files explicitly dropped onto the app window so the webview can store them in its resource library.
#[tauri::command]
fn read_dropped_resource_files(paths: Vec<String>) -> Result<Vec<DroppedResourceFile>, String> {
    const MAX_FILE_BYTES: u64 = 128 * 1024 * 1024;
    let mut files = Vec::new();

    for raw_path in paths {
        let path = PathBuf::from(&raw_path);
        let metadata = fs::metadata(&path)
            .map_err(|error| format!("Could not access dropped file '{}': {error}", path.display()))?;
        if !metadata.is_file() {
            continue;
        }
        if metadata.len() > MAX_FILE_BYTES {
            return Err(format!("'{}' is larger than the 128 MB drag-and-drop limit. Use Import files for this file.", path.display()));
        }
        let file_name = path.file_name()
            .ok_or_else(|| "A dropped item has no file name.".to_string())?
            .to_string_lossy()
            .into_owned();
        let bytes = fs::read(&path)
            .map_err(|error| format!("Could not read dropped file '{}': {error}", path.display()))?;
        files.push(DroppedResourceFile { file_name, bytes });
    }
    Ok(files)
}

/// Deletes a file only after the user selects it and BRS verifies its name, size and
/// SHA-256 against the imported copy. No stored path or arbitrary file is trusted.
#[tauri::command]
fn delete_confirmed_original_resource_file(
    path: String,
    expected_file_name: String,
    expected_size: u64,
    expected_sha256: String,
) -> Result<(), String> {
    if expected_sha256.len() != 64 || !expected_sha256.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err("The file verification fingerprint is invalid.".into());
    }
    let original = PathBuf::from(path)
        .canonicalize()
        .map_err(|error| format!("Could not locate the selected original file: {error}"))?;
    let info = fs::metadata(&original)
        .map_err(|error| format!("Could not inspect the selected original: {error}"))?;
    if !info.is_file() {
        return Err("The selected original is not a regular file.".into());
    }
    if info.len() != expected_size
        || original.file_name().and_then(|name| name.to_str()) != Some(expected_file_name.as_str())
    {
        return Err("The selected file does not match the imported resource's name and size. Nothing was deleted.".into());
    }

    let mut reader = fs::File::open(&original)
        .map_err(|error| format!("Could not read the selected original: {error}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let amount = reader.read(&mut buffer)
            .map_err(|error| format!("Could not verify original file contents: {error}"))?;
        if amount == 0 {
            break;
        }
        hasher.update(&buffer[..amount]);
    }
    let digest = format!("{:x}", hasher.finalize());
    if !digest.eq_ignore_ascii_case(&expected_sha256) {
        return Err("The file on disk has different contents from the imported resource. Nothing was deleted.".into());
    }
    // Close the read handle before deleting (required on Windows).
    drop(reader);
    fs::remove_file(&original)
        .map_err(|error| format!("Could not delete the selected local original: {error}"))?;
    Ok(())
}

/// Moves the native application window briefly from side to side.
#[tauri::command]
fn shake_window(window: Window) -> Result<(), String> {
    // Avoid disturbing the window's position when maximised.
    if window.is_maximized().map_err(|error| error.to_string())? {
        return Ok(());
    }

    let origin = window
        .outer_position()
        .map_err(|error| error.to_string())?;

    std::thread::spawn(move || {
        let offsets: [(i32, i32); 12] = [
            (-10, 0), (10, 0), (-12, 2), (12, -2),
            (-10, -2), (10, 2), (-7, 0), (7, 0),
            (-5, 0), (5, 0), (-2, 0), (0, 0),
        ];

        for (x, y) in offsets {
            let position = PhysicalPosition::new(origin.x + x, origin.y + y);
            if let Err(error) = window.set_position(position) {
                eprintln!("THE NUDGE could not move the window: {error}");
                break;
            }
            std::thread::sleep(Duration::from_millis(40));
        }

        if let Err(error) = window.set_position(origin) {
            eprintln!("THE NUDGE could not restore the window: {error}");
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            shake_window,
            create_workspace,
            rename_workspace,
            inspect_workspace,
            load_workspace_content,
            save_workspace_content,
            export_workspace_markdown,
            read_workspace_file,
            write_workspace_file,
            delete_workspace_file,
            import_profile_media,
            import_profile_media_bytes,
            profile_sidebar_thumbnail_path,
            save_profile_sidebar_thumbnail,
            remove_profile_sidebar_thumbnail,
            read_dropped_resource_files,
            delete_confirmed_original_resource_file,
            settings_backup::create_settings_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
