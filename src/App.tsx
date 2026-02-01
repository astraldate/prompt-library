import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
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
            }
        } catch (e) {
            console.error("Error setting initial size:", e);
        }
    };
    initWindow();

    // Start periodic position saving (every 3 seconds)
    // This is a simple way to persist position after dragging without complex event listeners
    saveIntervalRef.current = window.setInterval(savePosition, 3000);

    return () => {
        if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, []);

  // Global drag handler
  useEffect(() => {
      const handleGlobalMouseDown = async (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          
          // 1. Check if the target is interactive (button, input, etc.) - If so, ignore drag
          if (target.closest('button, input, textarea, [data-interactive="true"]')) {
              return;
          }

          // 2. Check if the target is within a designated drag region
          // We also treat the main container as a drag region if it's collapsed (ball mode)
          // But to be safe, we rely on the attributes.
          const dragTarget = target.closest('[data-drag-region="true"]');
          
          if (dragTarget && e.button === 0) {
              if ('__TAURI_INTERNALS__' in window) {
                   await getCurrentWindow().startDragging();
                   // Position will be saved by the interval
              }
          }
      };

      // Use capture phase to ensure we catch it before anything else
      document.addEventListener('mousedown', handleGlobalMouseDown, true);
      return () => document.removeEventListener('mousedown', handleGlobalMouseDown, true);
  }, []);

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
    <div className="container" style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      background: 'transparent', 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {isOpen ? (
        <ExpandedPanel onCollapse={() => toggleWindow(false)} />
      ) : (
        <FloatingBall onClick={() => toggleWindow(true)} />
      )}
    </div>
  );
}

export default App;
