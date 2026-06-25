'use client';

import { useState, useEffect } from 'react';
import { FileText, Send, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Download } from 'lucide-react';

type EInvoiceEntry = {
  id: string;
  series: string;
  number: number;
  eInvoiceId: string | null;
  eStatus: string | null;
  total: number;
  updatedAt: string;
  contact: { name: string };
};

type Stats = {
  byStatus: { eStatus: string | null; _count: { id: number } }[];
  recent: EInvoiceEntry[];
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Beklemede', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Clock },
  SENT: { label: 'Gönderildi', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Send },
  ACCEPTED: {
    label: 'Kabul Edildi',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/20',
    icon: CheckCircle,
  },
  REJECTED: { label: 'Reddedildi', color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
  CANCELLED: { label: 'İptal Edildi', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: XCircle },
};

// Faturalar listesi (e-fatura gönderilecekler dahil)
type Invoice = {
  id: string;
  series: string;
  number: number;
  status: string;
  eInvoiceId: string | null;
  eStatus: string | null;
  total: number;
  date: string;
  contact: { name: string };
};

const fmtMoney = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

export default function EInvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<'all' | 'sent' | 'pending'>('all');

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/invoices?type=SALES&limit=100`,
          { headers },
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/invoices/einvoice/stats`,
          { headers },
        ),
      ]);
      const invData = await invRes.json();
      setInvoices(invData.items || []);
      setStats(await statsRes.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const syncInbox = async () => {
    setSyncing(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/invoices/einvoice/sync-inbox`,
        { method: 'POST', headers, body: JSON.stringify({}) },
      );
      fetchData();
    } catch {}
    setSyncing(false);
  };

  const doAction = async (id: string, action: string) => {
    setActionLoading(`${id}-${action}`);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/invoices/${id}/einvoice/${action}`,
        { method: 'PATCH', headers },
      );
      fetchData();
    } catch {}
    setActionLoading('');
  };

  const statusCounts: Record<string, number> = {};
  if (stats?.byStatus)
    for (const s of stats.byStatus) statusCounts[s.eStatus || 'null'] = s._count.id;

  const filtered = invoices.filter((inv) => {
    if (tab === 'sent') return !!inv.eInvoiceId;
    if (tab === 'pending')
      return !inv.eInvoiceId && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED';
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="text-indigo-400" />
            E-Dönüşüm
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            E-Fatura ve E-Arşiv yönetimi (GIB Entegrasyon Simülasyonu)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncInbox}
            disabled={syncing}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Download size={14} />
            {syncing ? 'Çekiliyor…' : 'Gelen Faturaları Çek'}
          </button>
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Yenile
          </button>
        </div>
      </div>

      {/* E-Fatura durum özeti */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(STATUS_CFG).map(([k, v]) => {
          const Icon = v.icon;
          return (
            <div key={k} className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs">{v.label}</span>
                <Icon size={16} className={v.color} />
              </div>
              <div className={`text-2xl font-bold ${v.color}`}>{statusCounts[k] || 0}</div>
            </div>
          );
        })}
      </div>

      {/* GIB bağlantı durumu */}
      <div className="card border border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
          <div>
            <div className="text-gray-900 font-medium text-sm">GIB Entegratör Bağlantısı Aktif</div>
            <div className="text-gray-400 text-xs">
              Simülasyon modu · Son kontrol: {new Date().toLocaleTimeString('tr-TR')}
            </div>
          </div>
          <div className="ml-auto text-xs text-gray-500">API v2.1 · TLS 1.3</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Tüm Faturalar', count: invoices.length },
          {
            key: 'pending',
            label: 'Gönderilecek',
            count: invoices.filter(
              (i) => !i.eInvoiceId && i.status !== 'DRAFT' && i.status !== 'CANCELLED',
            ).length,
          },
          {
            key: 'sent',
            label: 'Gönderilmiş',
            count: invoices.filter((i) => !!i.eInvoiceId).length,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {t.label} <span className="ml-1 text-xs opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-200">
              <th className="text-left py-2 pr-4">Fatura No</th>
              <th className="text-left py-2 pr-4">Müşteri</th>
              <th className="text-right py-2 pr-4">Tutar</th>
              <th className="text-left py-2 pr-4">GIB No</th>
              <th className="text-center py-2 pr-4">E-Fatura Durumu</th>
              <th className="text-right py-2">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8">
                  Yükleniyor…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Fatura bulunamadı</p>
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const eCfg = inv.eStatus ? STATUS_CFG[inv.eStatus] : null;
                const EIcon = eCfg?.icon;
                const isBusy = actionLoading.startsWith(inv.id);
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="text-gray-900 font-medium">
                        {inv.series}-{String(inv.number).padStart(4, '0')}
                      </div>
                      <div className="text-gray-500 text-xs">{fmtDate(inv.date)}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{inv.contact?.name}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-900 font-medium">
                      {fmtMoney(inv.total)}
                    </td>
                    <td className="py-2.5 pr-4">
                      {inv.eInvoiceId ? (
                        <span className="text-xs font-mono text-indigo-400">{inv.eInvoiceId}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-center">
                      {eCfg && EIcon ? (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 justify-center w-fit mx-auto ${eCfg.bg} ${eCfg.color}`}
                        >
                          <EIcon size={10} />
                          {eCfg.label}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Gönderilmedi</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        {!inv.eInvoiceId &&
                          inv.status !== 'DRAFT' &&
                          inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => doAction(inv.id, 'send')}
                              disabled={isBusy}
                              className="text-xs px-2.5 py-1 rounded bg-brand-50 text-brand-600 hover:bg-indigo-500/30 flex items-center gap-1 transition-colors"
                            >
                              <Send size={10} />
                              {isBusy ? '…' : 'Gönder'}
                            </button>
                          )}
                        {inv.eStatus === 'SENT' && (
                          <>
                            <button
                              onClick={() => doAction(inv.id, 'accept')}
                              disabled={isBusy}
                              className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle size={10} />
                              {isBusy ? '…' : 'Kabul'}
                            </button>
                            <button
                              onClick={() => doAction(inv.id, 'reject')}
                              disabled={isBusy}
                              className="text-xs px-2.5 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-1 transition-colors"
                            >
                              <XCircle size={10} />
                              Red
                            </button>
                          </>
                        )}
                        {inv.eInvoiceId && inv.eStatus !== 'CANCELLED' && (
                          <button
                            onClick={() => doAction(inv.id, 'cancel')}
                            disabled={isBusy}
                            className="text-xs px-2.5 py-1 rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
                          >
                            {isBusy ? '…' : 'İptal'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
