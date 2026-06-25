export type ThemeId = 'hosting' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet';

export type ThemePreset = {
  id: ThemeId;
  label: string;
  description: string;
  swatch: string;
  vars: Record<string, string>;
};

/** Saasable Hosting light base — tüm preset'ler açık arka plan kullanır */
const LIGHT_BASE = {
  '--theme-sidebar-bg': '#FFFFFF',
  '--theme-sidebar-hover': '#F5F2FA',
  '--theme-sidebar-active': '#E0E0FF',
  '--theme-sidebar-border': '#EAE7EF',
  '--theme-panel-bg': '#FFFFFF',
  '--theme-main-bg': '#FBF8FF',
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'hosting',
    label: 'Hosting (Varsayılan)',
    description: 'Saasable UI — profesyonel açık SaaS',
    swatch: '#606BDF',
    vars: {
      ...LIGHT_BASE,
      '--theme-primary': '#606BDF',
      '--theme-primary-hover': '#3944B8',
      '--theme-accent': '#606BDF',
      '--theme-primary-light': '#BDC2FF',
      '--theme-primary-lighter': '#E0E0FF',
      '--theme-primary-glow': 'rgba(96, 107, 223, 0.22)',
    },
  },
  {
    id: 'emerald',
    label: 'Zümrüt',
    description: 'Yeşil kurumsal',
    swatch: '#10b981',
    vars: {
      ...LIGHT_BASE,
      '--theme-primary': '#10b981',
      '--theme-primary-hover': '#059669',
      '--theme-accent': '#34d399',
      '--theme-primary-light': '#a7f3d0',
      '--theme-primary-lighter': '#d1fae5',
      '--theme-primary-glow': 'rgba(16, 185, 129, 0.22)',
      '--theme-sidebar-active': '#d1fae5',
    },
  },
  {
    id: 'rose',
    label: 'Gül',
    swatch: '#f43f5e',
    description: 'Sıcak pembe',
    vars: {
      ...LIGHT_BASE,
      '--theme-primary': '#f43f5e',
      '--theme-primary-hover': '#e11d48',
      '--theme-accent': '#fb7185',
      '--theme-primary-light': '#fecdd3',
      '--theme-primary-lighter': '#ffe4e6',
      '--theme-primary-glow': 'rgba(244, 63, 94, 0.22)',
      '--theme-sidebar-active': '#ffe4e6',
    },
  },
  {
    id: 'amber',
    label: 'Kehribar',
    swatch: '#f59e0b',
    description: 'Altın sıcak',
    vars: {
      ...LIGHT_BASE,
      '--theme-primary': '#f59e0b',
      '--theme-primary-hover': '#d97706',
      '--theme-accent': '#fbbf24',
      '--theme-primary-light': '#fde68a',
      '--theme-primary-lighter': '#fef3c7',
      '--theme-primary-glow': 'rgba(245, 158, 11, 0.22)',
      '--theme-sidebar-active': '#fef3c7',
    },
  },
  {
    id: 'cyan',
    label: 'Camgöbeği',
    swatch: '#06b6d4',
    description: 'Modern mavi',
    vars: {
      ...LIGHT_BASE,
      '--theme-primary': '#06b6d4',
      '--theme-primary-hover': '#0891b2',
      '--theme-accent': '#22d3ee',
      '--theme-primary-light': '#a5f3fc',
      '--theme-primary-lighter': '#cffafe',
      '--theme-primary-glow': 'rgba(6, 182, 212, 0.22)',
      '--theme-sidebar-active': '#cffafe',
    },
  },
  {
    id: 'violet',
    label: 'Menekşe',
    swatch: '#8b5cf6',
    description: 'Mor premium',
    vars: {
      ...LIGHT_BASE,
      '--theme-primary': '#8b5cf6',
      '--theme-primary-hover': '#7c3aed',
      '--theme-accent': '#a78bfa',
      '--theme-primary-light': '#ddd6fe',
      '--theme-primary-lighter': '#ede9fe',
      '--theme-primary-glow': 'rgba(139, 92, 246, 0.22)',
      '--theme-sidebar-active': '#ede9fe',
    },
  },
];

const STORAGE_KEY = 'smartnexus-theme';

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'hosting';
  const v = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
  if (v === ('indigo' as ThemeId)) return 'hosting';
  return THEME_PRESETS.some((t) => t.id === v) ? v! : 'hosting';
}

export function applyTheme(id: ThemeId) {
  const preset = THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
  const root = document.documentElement;
  Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', id);
  localStorage.setItem(STORAGE_KEY, id);
}
