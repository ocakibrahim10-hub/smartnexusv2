'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { platformApi, tenantsApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { KONTOR_LOW_THRESHOLD } from '@/lib/plans';
import { useParams } from 'next/navigation';

type SummaryItem = {
  moduleCode: string;
  moduleName: string;
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  lowBalance: boolean;
};

export default function KontorAlertBanner() {
  const params = useParams();
  const panel = params?.panel as string;
  const user = getUser();
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || user.tenantType === 'SUPERADMIN') return;
    platformApi
      .getKontorSummary()
      .then((res) => setItems(res.items || []))
      .catch(() => {});
  }, [user?.tenantId]);

  const lowItems = items.filter((i) => i.balance <= KONTOR_LOW_THRESHOLD);
  if (dismissed || lowItems.length === 0 || !panel) return null;

  const purchaseHref = `/${panel}/kontor`;

  return (
    <div
      role="alert"
      className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" aria-hidden />
        <div>
          <strong>Düşük kontör uyarısı</strong>
          <span className="block text-amber-800">
            {lowItems.map((i) => `${i.moduleName}: ${i.balance} kontör`).join(' · ')} — {KONTOR_LOW_THRESHOLD}{' '}
            ve altında. Hizmet kesintisi yaşamamak için kontör yükleyin.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={purchaseHref}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
        >
          Kontör Satın Al
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="px-3 py-2 rounded-lg text-amber-800 hover:bg-amber-100"
          aria-label="Uyarıyı kapat"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}

export function KontorStatsStrip() {
  const params = useParams();
  const panel = params?.panel as string;
  const user = getUser();
  const [items, setItems] = useState<SummaryItem[]>([]);

  useEffect(() => {
    if (!user || user.tenantType === 'SUPERADMIN') return;
    platformApi
      .getKontorSummary()
      .then((res) => setItems(res.items || []))
      .catch(() => {});
  }, [user?.tenantId]);

  if (!items.length || user?.tenantType === 'SUPERADMIN' || !panel) return null;

  const totalBalance = items.reduce((s, i) => s + i.balance, 0);
  const totalUsed = items.reduce((s, i) => s + i.totalUsed, 0);
  const totalPurchased = items.reduce((s, i) => s + i.totalPurchased, 0);

  return (
    <div className="hidden xl:flex items-center gap-4 mr-2 text-xs text-gray-600 border-r border-gray-200 pr-4">
      <div title="Mevcut bakiye">
        <span className="text-gray-400">Kontör</span>{' '}
        <span className={`font-semibold ${totalBalance <= KONTOR_LOW_THRESHOLD ? 'text-amber-600' : 'text-gray-900'}`}>
          {totalBalance}
        </span>
      </div>
      <div title="Kullanılan">
        <span className="text-gray-400">Kullanılan</span>{' '}
        <span className="font-semibold text-gray-900">{totalUsed}</span>
      </div>
      <div title="Toplam alınan">
        <span className="text-gray-400">Alınan</span>{' '}
        <span className="font-semibold text-gray-900">{totalPurchased}</span>
      </div>
      <Link href={`/${panel}/kontor`} className="text-indigo-600 font-medium hover:underline">
        Yükle
      </Link>
    </div>
  );
}

export function SubscriptionDaysStrip() {
  const params = useParams();
  const panel = params?.panel as string;
  const user = getUser();
  const [status, setStatus] = useState<{ remainingDays: number; plan?: string; active?: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!user || user.tenantType === 'SUPERADMIN' || !panel) return;
    tenantsApi
      .getSubscriptionStatus()
      .then(setStatus)
      .catch(() => {});
  }, [user?.tenantId, panel]);

  if (!status || user?.tenantType === 'SUPERADMIN' || !panel) return null;

  const low = status.remainingDays <= 30;

  return (
    <div
      className="hidden xl:flex items-center gap-2 mr-2 text-xs border-r border-gray-200 pr-4"
      title="Yıllık abonelik kalan gün"
    >
      <span className="text-gray-400">Abonelik</span>
      <span className={`font-semibold ${low ? 'text-amber-600' : 'text-emerald-600'}`}>
        {status.remainingDays} gün
      </span>
      {(user?.tenantType === 'BUSINESS' || user?.tenantType === 'DEALER') && low && (
        <Link href={`/${panel}/subscribe`} className="text-indigo-600 font-medium hover:underline">
          Yenile
        </Link>
      )}
    </div>
  );
}
