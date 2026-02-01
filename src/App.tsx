import { useState, useEffect } from "react";
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
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
                const appWindow = getCurrentWindow();
                await appWindow.setSize(new LogicalSize(40, 40));
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
            const appWindow = getCurrentWindow();
            if (open) {
                await appWindow.setSize(new LogicalSize(300, 400));
            } else {
                await appWindow.setSize(new LogicalSize(40, 40));
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
