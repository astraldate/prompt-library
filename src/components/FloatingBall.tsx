import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface FloatingBallProps {
  onClick: () => void;
}

export const FloatingBall: React.FC<FloatingBallProps> = ({ onClick }) => {
  const handleMouseDown = async (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag if left button
    if (e.button === 0) {
      e.currentTarget.style.cursor = 'grabbing';
      await getCurrentWindow().startDragging();
    }
  };

  return (
    <div
      className="floating-ball"
      data-drag-region="true"
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onClick={() => {
          // Prevent click if it was a drag operation (simple heuristic could be added if needed)
          // But Tauri usually handles this: drag doesn't fire click.
          onClick();
      }}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)', // Sky Blue gradient
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 0 15px rgba(0, 198, 255, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.4)',
        color: 'white',
        fontSize: '20px',
        userSelect: 'none',
        border: '2px solid rgba(255, 255, 255, 0.8)',
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease',
        backdropFilter: 'blur(4px)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 198, 255, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.6)';
        e.currentTarget.style.cursor = 'grab'; // Hint that it can be dragged
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 198, 255, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.4)';
        e.currentTarget.style.cursor = 'pointer';
      }}
      onMouseUp={(e) => {
          e.currentTarget.style.cursor = 'grab';
      }}
    >
      <div style={{
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        position: 'absolute',
        top: 0,
        left: 0,
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 20%)'
      }} />
      <span style={{ pointerEvents: 'none', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }} title="Drag to move, Click to expand">⚡</span>
    </div>
  );
};
