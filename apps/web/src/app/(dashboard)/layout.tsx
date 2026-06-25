'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import { inferPanelFromTenantType } from '@/lib/panel';

/** Eski /dashboard rotalarını panele yönlendir */
export default function LegacyDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/');
      return;
    }
    const user = getUser();
    if (user?.homeRoute) {
      router.replace(user.homeRoute);
    } else {
      const panel = user?.panel || inferPanelFromTenantType(user?.tenantType || '');
      router.replace(`/${panel}/dashboard`);
    }
  }, [router]);

  return null;
}
