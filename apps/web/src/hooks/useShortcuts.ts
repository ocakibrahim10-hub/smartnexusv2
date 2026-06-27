'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { getUser, setUser } from '@/lib/auth';

export type Shortcut = {
  id?: string;
  label: string;
  href: string;
  iconName: string;
};

export type ShortcutGroup = {
  id: string;
  title: string;
  items: Shortcut[];
};

// Global state for shortcuts
let globalShortcutGroups: ShortcutGroup[] | null = null;
const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const defaultGroups: ShortcutGroup[] = [
  { id: 'group-main', title: 'Genel Kısayollar', items: [] },
];

export function useShortcuts() {
  const [groups, setGroups] = useState<ShortcutGroup[]>(globalShortcutGroups || []);

  useEffect(() => {
    if (globalShortcutGroups === null) {
      const user = getUser();
      const prefs = user?.preferences?.shortcuts;
      if (prefs && Array.isArray(prefs)) {
        if (prefs.length > 0 && !('items' in prefs[0])) {
          // Migration from old flat array
          globalShortcutGroups = [{ id: 'group-legacy', title: 'Masaüstü', items: prefs }];
        } else {
          globalShortcutGroups = prefs;
        }
      } else {
        globalShortcutGroups = defaultGroups;
      }
      setGroups(globalShortcutGroups);
    }

    const listener = () => setGroups(globalShortcutGroups || []);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const saveGroups = async (newGroups: ShortcutGroup[]) => {
    globalShortcutGroups = newGroups;
    emitChange();
    
    // Update local user object
    const user = getUser();
    if (user) {
      user.preferences = { ...user.preferences, shortcuts: newGroups };
      setUser(user);
    }

    // Save to server
    try {
      await authApi.updatePreferences({ shortcuts: newGroups });
    } catch (err) {
      console.error('Failed to save shortcuts', err);
    }
  };

  const addShortcut = (shortcut: Shortcut, groupId?: string) => {
    const currentGroups = globalShortcutGroups || defaultGroups;
    // Check if it already exists anywhere
    const exists = currentGroups.some(g => g.items.some(s => s.href === shortcut.href));
    if (exists) return;

    if (!shortcut.id) {
      shortcut.id = `shortcut-${Date.now()}`;
    }

    const newGroups = [...currentGroups];
    const targetGroupIndex = groupId ? newGroups.findIndex(g => g.id === groupId) : 0;
    
    if (targetGroupIndex !== -1) {
      newGroups[targetGroupIndex] = {
        ...newGroups[targetGroupIndex],
        items: [...newGroups[targetGroupIndex].items, shortcut]
      };
    } else {
      if (newGroups.length > 0) {
        newGroups[0] = { ...newGroups[0], items: [...newGroups[0].items, shortcut] };
      } else {
        newGroups.push({ id: 'group-default', title: 'Genel', items: [shortcut] });
      }
    }
    
    saveGroups(newGroups);
  };

  const removeShortcut = (href: string) => {
    const currentGroups = globalShortcutGroups || defaultGroups;
    const newGroups = currentGroups.map(g => ({
      ...g,
      items: g.items.filter(s => s.href !== href)
    }));
    saveGroups(newGroups);
  };

  const hasShortcut = (href: string) => {
    const currentGroups = globalShortcutGroups || defaultGroups;
    return currentGroups.some(g => g.items.some(s => s.href === href));
  };

  return { groups, shortcuts: groups.flatMap(g => g.items), addShortcut, removeShortcut, hasShortcut, saveGroups };
}

