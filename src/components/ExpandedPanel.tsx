import React, { useState, useEffect } from 'react';
import promptsData from '../data/prompts-zh.json';
import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { exit } from '@tauri-apps/plugin-process';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';
import { invoke } from '@tauri-apps/api/core';

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
  // Unified prompts state: combines initial JSON and user additions/deletions
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activeTab, setActiveTab] = useState<'favorites' | 'categories' | 'add' | 'settings' | 'handbook'>('categories');
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  
  // New prompt input state
  const [newAct, setNewAct] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [editingOldAct, setEditingOldAct] = useState<string | null>(null);

  const PROMPTS_FILE = 'prompts.json';
  const FAVORITES_FILE = 'favorites.json';

  // Helper to load data from FS
  const loadData = async () => {
    try {
        // Check autostart status
        try {
            const enabled = await isEnabled();
            setAutoStartEnabled(enabled);
        } catch (e) {
            console.error("Failed to check autostart", e);
        }

        // Ensure AppData directory exists
        // Use fs.exists instead of mkdir which was unused and potentially problematic without recursive flag in old API
        // writeTextFile handles directory creation if configured correctly, but let's just rely on lazy creation
        
        // 1. Load Prompts
        const promptsExist = await exists(PROMPTS_FILE, { baseDir: BaseDirectory.AppData });
        if (promptsExist) {
            const content = await readTextFile(PROMPTS_FILE, { baseDir: BaseDirectory.AppData });
            setPrompts(JSON.parse(content));
        } else {
            // First run: use default data
            setPrompts(promptsData as Prompt[]);
            // Persist it immediately
            await writeTextFile(PROMPTS_FILE, JSON.stringify(promptsData), { baseDir: BaseDirectory.AppData });
        }

        // 2. Load Favorites
        const favsExist = await exists(FAVORITES_FILE, { baseDir: BaseDirectory.AppData });
        if (favsExist) {
            const content = await readTextFile(FAVORITES_FILE, { baseDir: BaseDirectory.AppData });
            setFavorites(JSON.parse(content));
        }
    } catch (e) {
        console.error("Failed to load data from FS", e);
        // Fallback to localStorage if FS fails (e.g. web preview)
        const savedPrompts = localStorage.getItem('prompts');
        if (savedPrompts) setPrompts(JSON.parse(savedPrompts));
        else setPrompts(promptsData as Prompt[]);
        
        const savedFavs = localStorage.getItem('favorites');
        if (savedFavs) setFavorites(JSON.parse(savedFavs));
    }
  };

  const saveData = async (filename: string, data: any) => {
      try {
          await writeTextFile(filename, JSON.stringify(data), { baseDir: BaseDirectory.AppData });
      } catch (e) {
          console.error(`Failed to save ${filename}`, e);
          // Fallback
          if (filename === PROMPTS_FILE) localStorage.setItem('prompts', JSON.stringify(data));
          if (filename === FAVORITES_FILE) localStorage.setItem('favorites', JSON.stringify(data));
      }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleAutoStart = async () => {
    try {
        if (autoStartEnabled) {
            await disable();
            setAutoStartEnabled(false);
        } else {
            await enable();
            setAutoStartEnabled(true);
        }
    } catch (e) {
        console.error("Failed to toggle autostart", e);
        // Fallback visual toggle for preview
        setAutoStartEnabled(!autoStartEnabled);
    }
  };

  const savePrompt = () => {
    if (!newAct.trim() || !newPrompt.trim()) return;
    
    let updatedPrompts = [...prompts];
    
    if (editingOldAct) {
        // Update existing
        updatedPrompts = updatedPrompts.map(p => 
            p.act === editingOldAct ? { act: newAct, prompt: newPrompt } : p
        );
        // If name changed, update favorites too
        if (editingOldAct !== newAct && favorites.includes(editingOldAct)) {
            const newFavs = favorites.map(f => f === editingOldAct ? newAct : f);
            setFavorites(newFavs);
            saveData(FAVORITES_FILE, newFavs);
        }
    } else {
        // Add new
        updatedPrompts = [{ act: newAct, prompt: newPrompt }, ...prompts];
    }
    
    setPrompts(updatedPrompts);
    saveData(PROMPTS_FILE, updatedPrompts);
    
    // Reset
    setNewAct('');
    setNewPrompt('');
    setEditingOldAct(null);
    setActiveTab('categories');
  };

  const cancelEdit = () => {
      setNewAct('');
      setNewPrompt('');
      setEditingOldAct(null);
      setActiveTab('categories');
  };

  const handleEditPrompt = (p: Prompt) => {
      setNewAct(p.act);
      setNewPrompt(p.prompt);
      setEditingOldAct(p.act);
      setActiveTab('add');
  };

  const deletePrompt = async (actToDelete: string) => {
    console.log('Attempting to delete:', actToDelete);
    let yes = false;
    try {
        // Use Tauri's native dialog with explicit labels
        yes = await ask(`Are you sure you want to delete "${actToDelete}"?`, { 
            title: 'Confirm Deletion', 
            kind: 'warning',
            okLabel: 'Delete',
            cancelLabel: 'Cancel'
        });
        console.log('Native dialog result:', yes);
    } catch (e) {
        // Fallback for browser preview
        console.warn("Native dialog failed, falling back to window.confirm", e);
        // window.confirm returns true if OK is clicked, false otherwise
        yes = window.confirm(`Delete "${actToDelete}"?`);
        console.log('Window confirm result:', yes);
    }
    
    // Explicitly check for boolean true
    if (yes !== true) {
        console.log('Deletion cancelled by user');
        return;
    }

    console.log('Proceeding with deletion');
    const updatedPrompts = prompts.filter(p => p.act !== actToDelete);
    setPrompts([...updatedPrompts]); // Force new array reference
    saveData(PROMPTS_FILE, updatedPrompts);
    
    // Also remove from favorites if it was there
    if (favorites.includes(actToDelete)) {
        const newFavs = favorites.filter(f => f !== actToDelete);
        setFavorites([...newFavs]);
        saveData(FAVORITES_FILE, newFavs);
    }
    
    // Optional: Feedback
    // alert(`Deleted "${actToDelete}"`); // Might be annoying, but good for confirmation
  };

  const toggleFavorite = (act: string) => {
    let newFavs;
    if (favorites.includes(act)) {
      newFavs = favorites.filter(f => f !== act);
    } else {
      newFavs = [...favorites, act];
    }
    setFavorites(newFavs);
    saveData(FAVORITES_FILE, newFavs);
  };

  const allPrompts = prompts;

  const filteredPrompts = allPrompts.filter(p => 
    p.act.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayPrompts = activeTab === 'favorites' 
    ? allPrompts.filter(p => favorites.includes(p.act))
    : filteredPrompts;

  const handlePromptClick = async (promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      // Collapse first to restore ball state
      onCollapse();
      // Then call Rust to paste (it will hide window momentarily and show it again)
      if ('__TAURI_INTERNALS__' in window) {
          await invoke('paste_to_cursor');
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleQuit = async () => {
    try {
        await exit(0);
    } catch (e) {
        console.error("Failed to exit", e);
        // Fallback for preview or if exit fails
        // alert("Quit action triggered (Native exit only works in built app)");
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
      <div 
        style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', gap: '8px', background: '#f5f5f5', cursor: 'grab' }} 
        data-drag-region="true"
        onMouseDown={async (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.button === 0) {
                e.currentTarget.style.cursor = 'grabbing';
                // Global handler in App.tsx handles startDragging
            }
        }}
        onMouseUp={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.cursor = 'grab'}
      >
        <input 
          type="text" 
          placeholder="Search prompts..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', outline: 'none' }}
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag on input
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => {
                // If editing, ask or reset? Let's just reset if clicking add explicitly
                setNewAct('');
                setNewPrompt('');
                setEditingOldAct(null);
                setActiveTab('add');
            }}
            title="Add New Prompt"
            style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: activeTab === 'add' ? 'bold' : 'normal',
                color: activeTab === 'add' ? '#3b82f6' : '#666',
                borderBottom: activeTab === 'add' ? '2px solid #3b82f6' : 'none',
                padding: '0 5px'
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag on button
          >
            +
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            title="Settings"
            style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: activeTab === 'settings' ? 'bold' : 'normal',
                color: activeTab === 'settings' ? '#3b82f6' : '#666',
                borderBottom: activeTab === 'settings' ? '2px solid #3b82f6' : 'none',
                padding: '0 5px'
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag on button
          >
            ⚙️
          </button>
          <button 
            onClick={() => setActiveTab('handbook')}
            title="Handbook"
            style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: activeTab === 'handbook' ? 'bold' : 'normal',
                color: activeTab === 'handbook' ? '#3b82f6' : '#666',
                borderBottom: activeTab === 'handbook' ? '2px solid #3b82f6' : 'none',
                padding: '0 5px'
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag on button
          >
            ?
          </button>
        </div>
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

        {activeTab === 'handbook' ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '5px', fontSize: '13px', lineHeight: '1.5' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>Operation Handbook</h3>
                
                <div>
                    <strong>🖱️ Basic Operations:</strong>
                    <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                        <li><strong>Left Click:</strong> Copy prompt to clipboard, auto-hide window, and paste to cursor position.</li>
                        <li><strong>Right Click:</strong> Edit the selected prompt.</li>
                        <li><strong>Hover:</strong> Preview full prompt content.</li>
                        <li><strong>Drag:</strong> Hold left click on title bar or floating ball to move window.</li>
                    </ul>
                </div>

                <div>
                    <strong>⌨️ Shortcuts:</strong>
                    <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                        <li><strong>Alt + Space:</strong> Toggle window visibility (Global).</li>
                    </ul>
                </div>

                <div>
                    <strong>⚙️ Features:</strong>
                    <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                        <li><strong>Search:</strong> Filter prompts by keywords.</li>
                        <li><strong>Favorites:</strong> Star your most used prompts for quick access.</li>
                        <li><strong>Auto-start:</strong> Enable in Settings to launch on login.</li>
                    </ul>
                </div>
            </div>
        ) : activeTab === 'settings' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Auto Start on Login</span>
                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                        <input 
                            type="checkbox" 
                            checked={autoStartEnabled}
                            onChange={toggleAutoStart}
                            style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{ 
                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                            backgroundColor: autoStartEnabled ? '#3b82f6' : '#ccc', 
                            transition: '.4s', borderRadius: '20px' 
                        }}>
                            <span style={{ 
                                position: 'absolute', content: '""', height: '16px', width: '16px', 
                                left: autoStartEnabled ? '22px' : '2px', bottom: '2px', 
                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%' 
                            }} />
                        </span>
                    </label>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                    <p>Current Version: 1.0.2</p>
                    <p>Click "Quit" below to exit the app.</p>
                </div>
            </div>
        ) : activeTab === 'add' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>{editingOldAct ? 'Edit Prompt' : 'New Prompt'}</span>
                    {editingOldAct && (
                        <button onClick={cancelEdit} style={{ border: 'none', background: 'none', color: '#666', cursor: 'pointer' }}>Cancel</button>
                    )}
                </div>
                <input 
                    placeholder="Title (e.g. Python Helper)" 
                    value={newAct}
                    onChange={(e) => setNewAct(e.target.value)}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <textarea 
                    placeholder="Enter prompt content..." 
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    style={{ 
                        padding: '8px', 
                        border: '1px solid #ccc', 
                        borderRadius: '4px',
                        minHeight: '100px',
                        resize: 'vertical'
                    }}
                />
                <button 
                    onClick={savePrompt}
                    disabled={!newAct || !newPrompt}
                    style={{ 
                        padding: '8px', 
                        background: '#3b82f6', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        opacity: (!newAct || !newPrompt) ? 0.5 : 1
                    }}
                >
                    {editingOldAct ? 'Update Prompt' : 'Save Prompt'}
                </button>
            </div>
        ) : (
            displayPrompts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>No prompts found</div>
            ) : (
                displayPrompts.map((p) => (
                <div key={p.act} 
                onClick={() => handlePromptClick(p.prompt)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    handleEditPrompt(p);
                }}
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
                title={p.prompt} // Use title attribute for hover preview
                >
                    <span style={{ fontSize: '14px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.act}</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span 
                        onClick={(e) => {
                            e.stopPropagation();
                            deletePrompt(p.act);
                        }}
                        title="Delete"
                        style={{ 
                            cursor: 'pointer', 
                            color: '#ef4444', 
                            fontSize: '16px', 
                            padding: '0 4px',
                            opacity: 0.6
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                    >
                    🗑️
                    </span>
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
                </div>
                ))
            )
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
        <button onClick={handleQuit} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>Quit</button>
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
