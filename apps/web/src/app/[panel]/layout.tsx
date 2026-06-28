'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import ThemeProvider from '@/components/ThemeProvider';
import PwaRegister from '@/components/PwaRegister';
import PanelSidebar from '@/components/layout/PanelSidebar';
import TopBar from '@/components/layout/TopBar';
import KontorAlertBanner from '@/components/KontorAlertBanner';
import CheckAlertBanner from '@/components/CheckAlertBanner';
import { isAuthenticated, getUser, setSession } from '@/lib/auth';
import { canAccessRoute } from '@/lib/modules';
import { authApi } from '@/lib/api';
import { finalizeSubscriptionPayment } from '@/lib/finalize-subscription-payment';
import { isPublicAuthPath } from '@/lib/reset-client-state';
import {
  isPanelType,
  panelLoginPath,
  stripPanelPrefix,
  inferPanelFromTenantType,
  type PanelType,
} from '@/lib/panel';

function panelTitle(panel: PanelType): string {
  if (panel === 'nexusadmin') return 'Nexus Admin';
  if (panel === 'bayi') return 'Bayi Paneli';
  return 'İşletme Paneli';
}
import SubscriptionAlertBanner from '@/components/SubscriptionAlertBanner';
import CampaignPopup from '@/components/layout/CampaignPopup';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const panel = params.panel as string;
  const [sessionTick, setSessionTick] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isPanelType(panel)) {
      router.replace('/');
      return;
    }

    if (!isAuthenticated()) {
      router.push(panelLoginPath(panel));
      return;
    }

    const user = getUser();
    if (user) {
      const expectedPanel = user.panel || inferPanelFromTenantType(user.tenantType);
      if (expectedPanel !== panel) {
        router.replace(user.homeRoute || panelLoginPath(expectedPanel));
        return;
      }

      const innerPath = stripPanelPrefix(pathname);
      if (!canAccessRoute(innerPath, user.tenantType, user.modules ?? [], user.role)) {
        router.replace(`/${panel}/upsell?path=${encodeURIComponent(innerPath)}`);
      }
    }
  }, [router, pathname, panel]);

  useEffect(() => {
    authApi
      .me()
      .then((profile) => {
        const current = getUser();
        if (current && profile?.modules) {
          setSession({
            user: { ...current, ...profile, modules: profile.modules },
            accessToken: localStorage.getItem('accessToken') || '',
            refreshToken: localStorage.getItem('refreshToken') || '',
          });
          setSessionTick((t) => t + 1);
        }
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isPublicAuthPath(pathname)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'ok') return;
    const tid = sessionStorage.getItem('pendingPaymentTenantId') || getUser()?.tenantId;
    finalizeSubscriptionPayment(tid || undefined).finally(() => {
      sessionStorage.removeItem('pendingPaymentTenantId');
    });
  }, [pathname]);

  if (!isPanelType(panel)) return null;

  const user = getUser();
  let isLockedOut = false;
  if (user && panel !== 'nexusadmin') {
    const endDateStr = user.parentSubscriptionEndDate || user.subscriptionEndDate;
    if (endDateStr) {
      const end = new Date(endDateStr);
      if (end.getTime() <= Date.now()) {
        isLockedOut = true;
      }
    }
  }

  const isSubscribePage = pathname.endsWith('/subscribe');

  if (isLockedOut && !isSubscribePage) {
    return (
      <ThemeProvider>
        <PwaRegister />
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50 dark:bg-zinc-900 px-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-xl shadow-xl p-8 text-center border border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Lisansınız Sona Erdi</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Sistemi kullanmaya devam edebilmek için lisansınızı yenilemeniz gerekmektedir. Ana işletmenin lisansı yenilendiğinde bağlı tüm şube ve bayiler otomatik olarak aktifleşir.
            </p>
            <button
              onClick={() => router.push(`/${panel}/subscribe`)}
              className="w-full py-3 px-4 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Lisans Yenileme Ekranına Git
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="mt-4 w-full py-2 px-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Oturumu Kapat
            </button>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <PwaRegister />
      {panel !== 'nexusadmin' && <CampaignPopup />}
      <div className="dashboard-shell flex h-screen overflow-hidden">
        <PanelSidebar
          key={sessionTick}
          panel={panel}
          collapsed={collapsed}
          onRequestExpand={() => setCollapsed(false)}
        />
        <main className="dashboard-main flex-1 flex flex-col h-screen overflow-hidden">
          <TopBar 
            title={panelTitle(panel as PanelType)} 
            collapsed={collapsed} 
            onToggleSidebar={() => setCollapsed(!collapsed)} 
          />
          <div className="flex-1 overflow-y-auto relative bg-gray-50/30">
            <SubscriptionAlertBanner />
            <KontorAlertBanner />
            <CheckAlertBanner />
            <div className="dashboard-content">{children}</div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
