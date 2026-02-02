/// <reference types="vite/client" />

declare module '@tauri-apps/plugin-global-shortcut' {
    export interface ShortcutEvent {
        shortcut: string;
        id: number;
        state: 'Pressed' | 'Released';
    }
    export function register(shortcut: string, handler: (event: ShortcutEvent) => void | Promise<void>): Promise<void>;
    export function unregister(shortcut: string): Promise<void>;
    export function unregisterAll(): Promise<void>;
    export function isRegistered(shortcut: string): Promise<boolean>;
}
