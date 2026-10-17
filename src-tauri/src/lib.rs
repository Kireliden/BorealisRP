
use std::time::Duration;
use tauri::{PhysicalPosition, Window};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
            (-10, 0),
            (10, 0),
            (-12, 2),
            (12, -2),
            (-10, -2),
            (10, 2),
            (-7, 0),
            (7, 0),
            (-5, 0),
            (5, 0),
            (-2, 0),
            (0, 0),
        ];

        for (x, y) in offsets {
            let position = PhysicalPosition::new(origin.x + x, origin.y + y);

            if let Err(error) = window.set_position(position) {
                eprintln!("THE NUDGE could not move the window: {error}");
                break;
            }

            std::thread::sleep(Duration::from_millis(40));
        }

        // Always attempt to restore the original position.
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, shake_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
