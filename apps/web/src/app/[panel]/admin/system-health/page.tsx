'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { platformApi } from '@/lib/api';
import { Activity, CheckCircle, AlertTriangle, XCircle, Server } from 'lucide-react';

const statusIcon = (status: string) => {
  if (status === 'OK' || status === 'HEALTHY') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  if (status === 'WARNING' || status === 'DEGRADED') return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
};

export default function SystemHealthPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    platformApi.getHealth().then(setData).catch(() => setData(null));
    const t = setInterval(() => platformApi.getHealth().then(setData).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <TopBar title="Sistem Sağlığı" subtitle="Altyapı, modül ve entegrasyon durumu — tek ekran" />
      <div className="p-6 space-y-6">
        <div className="card p-6 flex items-center gap-4">
          {statusIcon(data?.overall || 'WARNING')}
          <div>
            <div className="text-lg font-bold text-gray-900">
              Genel Durum: {data?.overall === 'HEALTHY' ? 'Sağlıklı' : 'Dikkat Gerekli'}
            </div>
            <div className="text-sm text-gray-500">
              Son kontrol: {data?.checkedAt ? new Date(data.checkedAt).toLocaleString('tr-TR') : '—'}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Server className="w-4 h-4" /> Altyapı
            </h3>
            <div className="space-y-3">
              {(data?.infrastructure || []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    {statusIcon(c.status)}
                    <span>{c.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{c.latencyMs}ms</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Modül & Entegrasyonlar
            </h3>
            <div className="space-y-3">
              {(data?.modules || []).map((m: any) => (
                <div key={m.code} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    {statusIcon(m.status)}
                    <span>{m.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{m.activeTenants} aktif</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(data?.recentErrors?.length > 0) && (
          <div className="card p-5 border-red-200">
            <h3 className="font-semibold text-red-700 mb-4">Arızalı / Hatalı Entegrasyonlar</h3>
            <div className="space-y-2">
              {data.recentErrors.map((e: any, i: number) => (
                <div key={i} className="text-sm bg-red-50 p-3 rounded-xl">
                  <div className="font-medium">{e.type} / {e.provider}</div>
                  <div className="text-red-600">{e.lastError}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="kpi-card">
            <div className="text-sm text-gray-500">Bugün Başarısız Ödeme</div>
            <div className="text-2xl font-bold text-red-600">{data?.stats?.failedPaymentsToday ?? 0}</div>
          </div>
          <div className="kpi-card">
            <div className="text-sm text-gray-500">Açık Destek Talebi</div>
            <div className="text-2xl font-bold text-amber-600">{data?.stats?.openTickets ?? 0}</div>
          </div>
        </div>
      </div>
    </>
  );
}
