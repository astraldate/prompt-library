import React, { useState, useEffect } from 'react';
import promptsData from '../data/prompts-zh.json';

interface ExpandedPanelProps {
  onCollapse: () => void;
}

interface Prompt {
  act: string;
  prompt: string;
}

export const ExpandedPanel: React.FC<ExpandedPanelProps> = ({ onCollapse }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'favorites' | 'categories'>('categories');

  useEffect(() => {
    const savedFavs = localStorage.getItem('favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  const toggleFavorite = (act: string) => {
    let newFavs;
    if (favorites.includes(act)) {
      newFavs = favorites.filter(f => f !== act);
    } else {
      newFavs = [...favorites, act];
    }
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const filteredPrompts = (promptsData as Prompt[]).filter(p => 
    p.act.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayPrompts = activeTab === 'favorites' 
    ? (promptsData as Prompt[]).filter(p => favorites.includes(p.act))
    : filteredPrompts;

  const handlePromptClick = async (promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      onCollapse();
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 0 10px rgba(0,0,0,0.2)',
      color: '#333'
    }}>
      {/* Top: Search */}
      <div style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', gap: '8px', background: '#f5f5f5' }} data-tauri-drag-region>
        <input 
          type="text" 
          placeholder="Search prompts..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none' }}
        />
      </div>

      {/* Middle: Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
          <button 
            onClick={() => setActiveTab('categories')}
            style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: activeTab === 'categories' ? 'bold' : 'normal',
                color: activeTab === 'categories' ? '#3b82f6' : '#666',
                borderBottom: activeTab === 'categories' ? '2px solid #3b82f6' : 'none'
            }}
          >
            All
          </button>
          <button 
            onClick={() => setActiveTab('favorites')}
            style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: activeTab === 'favorites' ? 'bold' : 'normal',
                color: activeTab === 'favorites' ? '#3b82f6' : '#666',
                borderBottom: activeTab === 'favorites' ? '2px solid #3b82f6' : 'none'
            }}
          >
            Favorites
          </button>
        </div>

        {displayPrompts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No prompts found</div>
        ) : (
            displayPrompts.map((p) => (
            <div key={p.act} 
            onClick={() => handlePromptClick(p.prompt)}
            style={{ 
                padding: '8px', 
                borderBottom: '1px solid #f0f0f0', 
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <span title={p.prompt} style={{ fontSize: '14px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.act}</span>
                <span 
                onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(p.act);
                }}
                style={{ cursor: 'pointer', color: favorites.includes(p.act) ? '#fbbf24' : '#e5e7eb', fontSize: '18px', marginLeft: '8px' }}
                >
                ★
                </span>
            </div>
            ))
        )}
      </div>

      {/* Bottom: Settings/Collapse */}
      <div style={{ 
        padding: '10px', 
        borderTop: '1px solid #eee', 
        display: 'flex', 
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9'
      }}>
        <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#666' }}>Settings</button>
        <button onClick={onCollapse} style={{ 
            padding: '6px 12px', 
            borderRadius: '4px', 
            border: 'none', 
            background: '#e5e7eb', 
            cursor: 'pointer',
            fontSize: '12px'
        }}>
            收起
        </button>
      </div>
    </div>
  );
};
