// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Manager, LogicalSize};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn set_window_size(app_handle: tauri::AppHandle, width: f64, height: f64) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or("No main window")?;
    window.set_size(LogicalSize::new(width, height)).map_err(|e| e.to_string())?;
    // Center the window or ensure it's visible? No, it's a floating ball, position matters.
    // But we might want to bring it to front.
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").expect("no main window").set_focus();
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, set_window_size])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
