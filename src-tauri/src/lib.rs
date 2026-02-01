// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Manager, LogicalSize, PhysicalPosition};
use tauri_plugin_autostart::MacosLauncher;
use std::{thread, time::Duration};

#[cfg(target_os = "windows")]
use windows::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::POINT;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn set_window_size(app_handle: tauri::AppHandle, width: f64, height: f64) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or("No main window")?;
    window.set_size(LogicalSize::new(width, height)).map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn start_custom_drag(app_handle: tauri::AppHandle) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or("No main window")?;
    
    // Get initial window position
    let initial_win_pos = window.outer_position().map_err(|e| e.to_string())?;
    
    // Get initial mouse position using WinAPI (to ensure sync with loop)
    #[cfg(target_os = "windows")]
    {
        let mut initial_cursor = POINT::default();
        unsafe {
            let _ = GetCursorPos(&mut initial_cursor);
        }
        
        let offset_x = initial_cursor.x - initial_win_pos.x;
        let offset_y = initial_cursor.y - initial_win_pos.y;

        // Spawn a thread to handle dragging
        thread::spawn(move || {
            loop {
                // Check if Left Mouse Button is still down
                // VK_LBUTTON is 0x01
                unsafe {
                    let state = GetAsyncKeyState(0x01);
                    // If the most significant bit is NOT set, the key is up
                    if (state as u16 & 0x8000) == 0 {
                        break;
                    }

                    let mut current_cursor = POINT::default();
                    if GetCursorPos(&mut current_cursor).is_ok() {
                        let new_x = current_cursor.x - offset_x;
                        let new_y = current_cursor.y - offset_y;
                        
                        // Update window position
                        // We use run_on_main_thread or just call it directly?
                        // Window methods are thread-safe in Tauri v2 mostly, but let's check.
                        // Actually, it's safer to dispatch. But we are in a separate thread.
                        // Let's try calling directly, if it fails we might need dispatch.
                        // Wait, we can't move 'window' into thread easily if it's not Clone (it is Clone).
                        let _ = window.set_position(PhysicalPosition::new(new_x, new_y));
                    }
                }
                
                // Sleep to limit CPU usage (approx 120fps)
                thread::sleep(Duration::from_millis(8));
            }
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Fallback for non-windows (though user is on windows)
        // Just call standard start_dragging as fallback
        let _ = window.start_dragging();
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").expect("no main window").set_focus();
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, set_window_size, start_custom_drag])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
