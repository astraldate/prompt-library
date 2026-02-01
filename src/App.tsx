import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
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
            }
        } catch (e) {
            console.error("Error setting initial size:", e);
        }
    };
    initWindow();
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
