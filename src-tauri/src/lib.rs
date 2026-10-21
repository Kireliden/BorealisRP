use serde::{Deserialize, Serialize};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    time::Duration,
};
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
        return Err("This folder is not a Borealis Roleplay Den workspace.".into());
    }
    if manifest.schema_version != WORKSPACE_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported workspace schema version {} (this version of BRD supports {}).",
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

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Imports an image into BRD-owned application storage so the original file can be moved safely.
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
        .map_err(|error| format!("Could not locate BRD application storage: {error}"))?;
    let media_dir = app_data.join("media");
    fs::create_dir_all(&media_dir)
        .map_err(|error| format!("Could not create BRD media storage: {error}"))?;

    let destination = media_dir.join(format!("{}.{}", Uuid::new_v4(), extension));
    fs::copy(&source, &destination)
        .map_err(|error| format!("Could not import the selected image: {error}"))?;

    Ok(destination.to_string_lossy().into_owned())
}


#[tauri::command]
fn profile_sidebar_thumbnail_path(app: AppHandle) -> Result<String, String> {
    let path = app.path().app_data_dir().map_err(|error| format!("Could not locate BRD application storage: {error}"))?.join("media").join("profile-sidebar-avatar.png");
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
    let path = app.path().app_data_dir().map_err(|error| format!("Could not locate BRD application storage: {error}"))?.join("media").join("profile-sidebar-avatar.png");
    let parent = path.parent().ok_or_else(|| "Could not locate sidebar thumbnail folder.".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("Could not create sidebar thumbnail folder: {error}"))?;
    fs::write(&path, bytes).map_err(|error| format!("Could not save sidebar thumbnail: {error}"))?;
    Ok(path.to_string_lossy().into_owned())
}
#[tauri::command]
fn remove_profile_sidebar_thumbnail(app: AppHandle) -> Result<(), String> {
    let path = PathBuf::from(profile_sidebar_thumbnail_path(app)?);
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
            import_profile_media,
            profile_sidebar_thumbnail_path,
            save_profile_sidebar_thumbnail,
            remove_profile_sidebar_thumbnail,
            read_dropped_resource_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
