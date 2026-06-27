'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { getUser, setUser } from '@/lib/auth';

export type Shortcut = {
  label: string;
  href: string;
  iconName: string;
};

// Global state for shortcuts
let globalShortcuts: Shortcut[] | null = null;
const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(globalShortcuts || []);

  useEffect(() => {
    // If globalShortcuts is null, load them from user preferences
    if (globalShortcuts === null) {
      const user = getUser();
      if (user?.preferences?.shortcuts) {
        globalShortcuts = user.preferences.shortcuts;
      } else {
        globalShortcuts = [];
      }
      setShortcuts(globalShortcuts);
    }

    const listener = () => setShortcuts(globalShortcuts || []);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const saveShortcuts = async (newShortcuts: Shortcut[]) => {
    globalShortcuts = newShortcuts;
    emitChange();
    
    // Update local user object
    const user = getUser();
    if (user) {
      user.preferences = { ...user.preferences, shortcuts: newShortcuts };
      setUser(user);
    }

    // Save to server
    try {
      await authApi.updatePreferences({ shortcuts: newShortcuts });
    } catch (err) {
      console.error('Failed to save shortcuts', err);
    }
  };

  const addShortcut = (shortcut: Shortcut) => {
    if (shortcuts.find((s) => s.href === shortcut.href)) return; // already exists
    saveShortcuts([...shortcuts, shortcut]);
  };

  const removeShortcut = (href: string) => {
    saveShortcuts(shortcuts.filter((s) => s.href !== href));
  };

  const hasShortcut = (href: string) => {
    return shortcuts.some((s) => s.href === href);
  };

  return { shortcuts, addShortcut, removeShortcut, hasShortcut, saveShortcuts };
}
