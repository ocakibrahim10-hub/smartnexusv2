'use client';

import { useEffect } from 'react';
import { applyTheme, getStoredTheme } from '@/lib/theme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  return <>{children}</>;
}
