'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Package, FileText, LogOut } from 'lucide-react';
import { fmtMoney } from '@/lib/format';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const portalApi = axios.create({ baseURL: API_URL });
portalApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('portalToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const STATUS: Record<string, string> = {
  DRAFT: 'Taslak',
  PENDING: 'Beklemede',
  APPROVED: 'Onaylı',
  SHIPPED: 'Sevk Edildi',
  DELIVERED: 'Teslim',
  CANCELLED: 'İptal',
};

export default function PortalOrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'orders' | 'invoices'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('portalToken');
    if (!token) {
      router.replace('/portal/login');
      return;
    }
    const c = localStorage.getItem('portalContact');
    if (c) setContact(JSON.parse(c));

    const load = async () => {
      setLoading(true);
      try {
        const [o, i] = await Promise.all([
          portalApi.get('/portal/orders'),
          portalApi.get('/portal/invoices'),
        ]);
        setOrders(o.data || []);
        setInvoices(i.data || []);
      } catch {
        localStorage.removeItem('portalToken');
        router.replace('/portal/login');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const logout = () => {
    localStorage.removeItem('portalToken');
    localStorage.removeItem('portalContact');
    router.push('/portal/login');
  };

  return (
    <div className="min-h-screen dashboard-main">
      <header className="topbar px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <h1 className="font-semibold">{contact?.tenantName || 'B2B Portal'}</h1>
          <p className="text-sm text-gray-500">{contact?.name}</p>
        </div>
        <button type="button" onClick={logout} className="btn-secondary text-sm flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Çıkış
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="tab-group">
          <button
            type="button"
            onClick={() => setTab('orders')}
            className={`tab-pill ${tab === 'orders' ? 'tab-pill-active' : ''}`}
          >
            <Package className="w-4 h-4" />
            Siparişlerim
          </button>
          <button
            type="button"
            onClick={() => setTab('invoices')}
            className={`tab-pill ${tab === 'invoices' ? 'tab-pill-active' : ''}`}
          >
            <FileText className="w-4 h-4" />
            Faturalarım
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'orders' ? (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="card p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold">{o.code}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(o.requestedAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700">
                    {STATUS[o.status] || o.status}
                  </span>
                </div>
                <ul className="text-sm space-y-1 text-gray-600">
                  {(o.lines || []).map((l: any) => (
                    <li key={l.id}>
                      {l.product?.name} × {l.quantity} — {fmtMoney(l.total)}
                    </li>
                  ))}
                </ul>
                <p className="text-right font-bold mt-2">{fmtMoney(o.total)}</p>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-gray-400 py-8">Sipariş bulunamadı</p>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-3">Tarih</th>
                  <th className="p-3">Seri-No</th>
                  <th className="p-3 text-right">Toplam</th>
                  <th className="p-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50">
                    <td className="p-3">{new Date(inv.date).toLocaleDateString('tr-TR')}</td>
                    <td className="p-3">
                      {inv.series}-{inv.number}
                    </td>
                    <td className="p-3 text-right font-medium">{fmtMoney(inv.total)}</td>
                    <td className="p-3">{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <p className="text-center text-gray-400 py-8">Fatura bulunamadı</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
