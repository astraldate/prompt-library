import React from 'react';

interface FloatingBallProps {
  onClick: () => void;
}

export const FloatingBall: React.FC<FloatingBallProps> = ({ onClick }) => {
  return (
    <div
      className="floating-ball"
      data-tauri-drag-region
      onClick={onClick}
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
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 198, 255, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.4)';
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
      <span style={{ pointerEvents: 'none', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>⚡</span>
    </div>
  );
};
