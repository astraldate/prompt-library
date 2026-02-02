// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Manager, LogicalSize, PhysicalPosition};
use tauri_plugin_autostart::MacosLauncher;
use std::{thread, time::Duration};
use enigo::{Enigo, Key, Keyboard, Settings, Direction};

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
        let _ = window.start_dragging();
    }

    Ok(())
}

#[tauri::command]
async fn paste_to_cursor(app_handle: tauri::AppHandle) -> Result<(), String> {
    let window = app_handle.get_webview_window("main").ok_or("No main window")?;
    
    // Hide window first to return focus to previous app
    window.hide().map_err(|e| e.to_string())?;
    
    // Small delay to ensure focus switch
    thread::sleep(Duration::from_millis(150));

    // Simulate Paste
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "macos")]
    {
        let _ = enigo.key(Key::Meta, Direction::Press);
        let _ = enigo.key(Key::Unicode('v'), Direction::Click);
        let _ = enigo.key(Key::Meta, Direction::Release);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = enigo.key(Key::Control, Direction::Press);
        let _ = enigo.key(Key::Unicode('v'), Direction::Click);
        let _ = enigo.key(Key::Control, Direction::Release);
    }
    
    // Show window again after paste
    thread::sleep(Duration::from_millis(50));
    window.show().map_err(|e| e.to_string())?;
    // Optionally focus it back if needed, but for a "helper" tool, maybe not strictly required immediately?
    // Actually set_window_size calls set_focus, so if we just show it, it might not be focused.
    // But since it's the ball, maybe that's fine.
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").expect("no main window").set_focus();
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, set_window_size, start_custom_drag, paste_to_cursor])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
