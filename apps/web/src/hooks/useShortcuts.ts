'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { getUser, setUser } from '@/lib/auth';
import { normalizePanelHref } from '@/lib/panel-navigate';
import type { PanelType } from '@/lib/panel';

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

function migrateGroups(groups: ShortcutGroup[], panel: PanelType): ShortcutGroup[] {
  return groups.map((g) => ({
    ...g,
    items: g.items.map((item) => ({
      ...item,
      href: normalizePanelHref(item.href, panel),
    })),
  }));
}

function buildBusinessDefaults(panel: string): ShortcutGroup[] {
  const p = (path: string) => `/${panel}${path.startsWith('/') ? path : `/${path}`}`;
  return [
    {
      id: 'group-main',
      title: 'Hızlı Erişim',
      items: [
        { id: 's-pos', label: 'POS Satış', href: p('/pos'), iconName: 'Monitor' },
        { id: 's-cari', label: 'Cari Listesi', href: p('/accounting/contacts'), iconName: 'Users' },
        { id: 's-products', label: 'Ürünler', href: p('/inventory/products'), iconName: 'Package' },
        { id: 's-invoices', label: 'Satış Faturaları', href: p('/accounting/invoices'), iconName: 'FileText' },
        { id: 's-cash', label: 'Kasa & Banka', href: p('/accounting/cash'), iconName: 'Wallet' },
        { id: 's-reports', label: 'Raporlar', href: p('/reports'), iconName: 'BarChart3' },
      ],
    },
  ];
}

export function useShortcuts() {
  const [groups, setGroups] = useState<ShortcutGroup[]>(globalShortcutGroups || []);

  useEffect(() => {
    if (globalShortcutGroups === null) {
      // 1. Önce LocalStorage'a bak (Öncelikli Kalıcı Hafıza)
      try {
        const localData = localStorage.getItem('smartnexus_shortcuts');
        if (localData) {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            globalShortcutGroups = parsed;
            const totalItems = parsed.reduce(
              (sum: number, g: ShortcutGroup) => sum + (g.items?.length || 0),
              0,
            );
            const user = getUser();
            const isBusiness = user?.tenantType === 'BUSINESS' || user?.tenantType === 'BRANCH';
            if (totalItems === 0 && isBusiness) {
              globalShortcutGroups = buildBusinessDefaults(user?.panel || 'isletme');
            } else if (totalItems > 0) {
              globalShortcutGroups = migrateGroups(
                parsed,
                (user?.panel || 'isletme') as PanelType,
              );
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse local shortcuts', e);
      }

      if (!globalShortcutGroups) {
        const user = getUser();
        const panel = (user?.panel || 'isletme') as PanelType;
        const prefs = user?.preferences?.shortcuts;
        if (prefs && Array.isArray(prefs)) {
          if (prefs.length > 0 && !('items' in prefs[0])) {
            globalShortcutGroups = migrateGroups(
              [{ id: 'group-legacy', title: 'Masaüstü', items: prefs }],
              panel,
            );
          } else {
            globalShortcutGroups = migrateGroups(prefs, panel);
          }
        } else {
          const isBusiness = user?.tenantType === 'BUSINESS' || user?.tenantType === 'BRANCH';
          globalShortcutGroups =
            isBusiness && panel === 'isletme' ? buildBusinessDefaults(panel) : defaultGroups;
        }

        try {
          localStorage.setItem('smartnexus_shortcuts', JSON.stringify(globalShortcutGroups));
        } catch (e) {}
      } else {
        const user = getUser();
        const panel = (user?.panel || 'isletme') as PanelType;
        const migrated = migrateGroups(globalShortcutGroups, panel);
        const changed = JSON.stringify(migrated) !== JSON.stringify(globalShortcutGroups);
        if (changed) {
          globalShortcutGroups = migrated;
          try {
            localStorage.setItem('smartnexus_shortcuts', JSON.stringify(migrated));
          } catch (e) {}
        }
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
    
    // Tarayıcı hafızasına kesin kayıt yap
    try {
      localStorage.setItem('smartnexus_shortcuts', JSON.stringify(newGroups));
    } catch (e) {}
    
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

