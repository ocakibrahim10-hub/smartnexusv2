'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

type CheckAlert = {
  id: string;
  checkNo: string;
  amount: number;
  direction: string;
  dueDate: string;
  contactName?: string;
  daysToDue?: number;
};

export default function CheckAlertBanner() {
  const params = useParams();
  const panel = params?.panel as string;
  const user = getUser();
  const [alerts, setAlerts] = useState<CheckAlert[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || user.tenantType === 'SUPERADMIN') return;
    api
      .get('/cash/check-alerts')
      .then((r) => setAlerts(r.data.checks || []))
      .catch(() => {});
  }, [user?.tenantId]);

  if (dismissed || alerts.length === 0 || !panel) return null;

  const fmt = (n: number) => `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

  return (
    <div
      role="alert"
      className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" aria-hidden />
        <div>
          <strong>Çek vadesi uyarısı — yarın ({alerts.length} adet)</strong>
          <span className="block text-red-800">
            {alerts
              .slice(0, 3)
              .map(
                (c) =>
                  `${c.checkNo} · ${c.contactName || '—'} · ${fmt(c.amount)} · ${c.direction === 'OUTGOING' ? 'Ödenecek' : 'Tahsil'}`,
              )
              .join(' · ')}
            {alerts.length > 3 ? ` … +${alerts.length - 3}` : ''}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/${panel}/accounting/checks`}
          className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
        >
          Çek Defterine Git
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="px-3 py-2 rounded-lg text-red-800 hover:bg-red-100"
          aria-label="Uyarıyı kapat"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}
