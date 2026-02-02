import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { register } from '@tauri-apps/plugin-global-shortcut';
import { FloatingBall } from "./components/FloatingBall";
import { ExpandedPanel } from "./components/ExpandedPanel";
import "./App.css";

const WINDOW_STATE_FILE = 'window-state.json';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const saveIntervalRef = useRef<number | null>(null);

  const savePosition = async () => {
      try {
          if ('__TAURI_INTERNALS__' in window) {
              const pos = await getCurrentWindow().outerPosition();
              await writeTextFile(WINDOW_STATE_FILE, JSON.stringify(pos), { baseDir: BaseDirectory.AppData });
          }
      } catch (e) {
          console.error("Failed to save position", e);
      }
  };

  const loadPosition = async () => {
      try {
          if ('__TAURI_INTERNALS__' in window) {
              const fileExists = await exists(WINDOW_STATE_FILE, { baseDir: BaseDirectory.AppData });
              if (fileExists) {
                  const content = await readTextFile(WINDOW_STATE_FILE, { baseDir: BaseDirectory.AppData });
                  const pos = JSON.parse(content);
                  // Restore position
                  await getCurrentWindow().setPosition(pos);
              }
          }
      } catch (e) {
           console.error("Failed to load position", e);
      }
  }

  useEffect(() => {
    // Initial setup
    const initWindow = async () => {
        try {
            // Check if running in Tauri
            if ('__TAURI_INTERNALS__' in window) {
                await loadPosition();
                // Set initial size (collapsed) - Increased to 80 to prevent clipping
                await invoke('set_window_size', { width: 80.0, height: 80.0 });
                
                // Register Global Shortcut: Alt+Space
                try {
                    await register('Alt+Space', async (event) => {
                        if (event.state === 'Pressed') {
                            const win = getCurrentWindow();
                            const isVisible = await win.isVisible();
                            if (isVisible) {
                                await win.hide();
                            } else {
                                await win.show();
                                await win.setFocus();
                            }
                        }
                    });
                    console.log('Global shortcut Alt+Space registered');
                } catch (e) {
                    console.error('Failed to register global shortcut', e);
                }
            }
        } catch (e) {
            console.error("Error setting initial size:", e);
        }
    };
    initWindow();

    // Start periodic position saving (every 3 seconds)
    saveIntervalRef.current = window.setInterval(savePosition, 3000);

    return () => {
        if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, []);

  const dragStartPos = useRef({ x: 0, y: 0 });

  // Rust Custom Drag Handler
  const handlePointerDown = async (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      
      // 1. Check interactive
      if (target.closest('button, input, textarea, [data-interactive="true"]')) {
          return;
      }

      // 2. Check drag region
      const dragTarget = target.closest('[data-drag-region="true"]');
      if (!dragTarget) return;

      if (e.button !== 0) return;

      // Record start pos
      dragStartPos.current = { x: e.screenX, y: e.screenY };

      // Prevent default to avoid text selection etc
      e.preventDefault();
      
      // Call Rust to start drag loop
      try {
          if ('__TAURI_INTERNALS__' in window) {
              await invoke('start_custom_drag');
              // Save position after drag finishes (Rust command returns when drag ends)
              await savePosition();
          }
      } catch (err) {
          console.error("Failed to start custom drag", err);
      }
  };

  const toggleWindow = async (open: boolean) => {
    try {
        if ('__TAURI_INTERNALS__' in window) {
            // Save position before resizing, just in case
            await savePosition();

            if (open) {
                // Expand
                await invoke('set_window_size', { width: 300.0, height: 400.0 });
            } else {
                // Collapse - Back to 80x80
                await invoke('set_window_size', { width: 80.0, height: 80.0 });
            }
        }
    } catch (e) {
        console.error("Error resizing window:", e);
    }
    setIsOpen(open);
  };

  return (
    <div 
      className="container" 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        background: 'transparent', 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onPointerDown={handlePointerDown}
      onClickCapture={(e) => {
          // If we just finished dragging, stop the click from propagating
          if (Math.abs(e.screenX - dragStartPos.current.x) > 5 || Math.abs(e.screenY - dragStartPos.current.y) > 5) {
             e.stopPropagation();
          }
      }}
    >
      {isOpen ? (
        <ExpandedPanel onCollapse={() => toggleWindow(false)} />
      ) : (
        <FloatingBall onClick={() => toggleWindow(true)} />
      )}
    </div>
  );
}

export default App;
