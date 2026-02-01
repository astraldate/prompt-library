import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { FloatingBall } from "./components/FloatingBall";
import { ExpandedPanel } from "./components/ExpandedPanel";
import "./App.css";

function App() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Initial setup
    const initWindow = async () => {
        try {
            // Check if running in Tauri
            if ('__TAURI_INTERNALS__' in window) {
                await invoke('set_window_size', { width: 40.0, height: 40.0 });
                // Make sure the window is draggable anywhere by default if not handled by elements?
                // No, we handle it explicitly on elements.
            }
        } catch (e) {
            console.error("Error setting initial size:", e);
        }
    };
    initWindow();
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
          const dragTarget = target.closest('[data-drag-region="true"]');
          
          if (dragTarget && e.button === 0) {
              if ('__TAURI_INTERNALS__' in window) {
                   await getCurrentWindow().startDragging();
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
            if (open) {
                // Expand
                await invoke('set_window_size', { width: 300.0, height: 400.0 });
            } else {
                // Collapse
                await invoke('set_window_size', { width: 40.0, height: 40.0 });
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
