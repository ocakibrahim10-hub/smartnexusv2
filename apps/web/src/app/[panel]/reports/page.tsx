'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  BarChart2,
  PieChart as PieIcon,
  FileBarChart,
  Layers,
  FileText,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { FormField, FormSelect } from '@/components/FormField';
import { fmtMoney, fmtNum, fmtPct, safeNum } from '@/lib/format';

type ReportTab = 'sales' | 'profit' | 'inventory' | 'dealers' | 'checks' | 'vat';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('sales');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [salesData, setSalesData] = useState<any>(null);
  const [profitData, setProfitData] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [dealerData, setDealerData] = useState<any[]>([]);
  const [checksData, setChecksData] = useState<any>(null);
  const [vatData, setVatData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (tab === 'sales') {
        const r = await api.get('/reports/sales', {
          params: { startDate: dateRange.start, endDate: dateRange.end },
        });
        setSalesData(r.data);
      } else if (tab === 'profit') {
        const r = await api.get('/reports/profit-loss', {
          params: { startDate: dateRange.start, endDate: dateRange.end },
        });
        setProfitData(r.data);
      } else if (tab === 'inventory') {
        const r = await api.get('/reports/inventory-valuation');
        setInventoryData(r.data.items || []);
      } else if (tab === 'dealers') {
        const r = await api.get('/reports/dealers', {
          params: { startDate: dateRange.start, endDate: dateRange.end },
        });
        setDealerData(r.data);
      } else if (tab === 'checks') {
        const r = await api.get('/reports/checks', { params: { daysAhead: 60 } });
        setChecksData(r.data);
      } else if (tab === 'vat') {
        const r = await api.get('/reports/vat', {
          params: { startDate: dateRange.start, endDate: dateRange.end },
        });
        setVatData(r.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [tab, dateRange]);

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="page-header">
        <h1 className="page-title">Gelişmiş Raporlar</h1>
        <div className="flex items-center gap-3">
          <FormField
            label="Başlangıç tarihi"
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="input text-sm py-1.5 px-3 w-36"
          />
          <FormField
            label="Bitiş tarihi"
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="input text-sm py-1.5 px-3 w-36"
          />
        </div>
      </div>

      <div className="tab-group">
        {[
          { key: 'sales', label: 'Satış Analizi', icon: BarChart2 },
          { key: 'profit', label: 'Kar / Zarar', icon: TrendingUp },
          { key: 'inventory', label: 'Stok Değerleme', icon: Package },
          { key: 'checks', label: 'Çek Portföyü', icon: FileText },
          { key: 'vat', label: 'KDV Beyanı', icon: FileBarChart },
          { key: 'dealers', label: 'Bayi Raporu', icon: Layers },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as ReportTab)}
            className={`tab-pill ${tab === key ? 'tab-pill-active' : ''}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Satış Analizi ─────────────────────────────────────────── */}
          {tab === 'sales' && salesData && (
            <div className="space-y-6">
              {/* KPI Özeti */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  {
                    label: 'Toplam Ciro',
                    value: salesData.total?.revenue || 0,
                    icon: DollarSign,
                    color: 'indigo',
                  },
                  {
                    label: 'Fatura Satışı',
                    value: salesData.invoiceSummary?.total || 0,
                    icon: FileBarChart,
                    color: 'blue',
                  },
                  {
                    label: 'POS Satışı',
                    value: salesData.posSummary?.total || 0,
                    icon: BarChart2,
                    color: 'emerald',
                  },
                  {
                    label: 'İşlem Sayısı',
                    value:
                      (salesData.invoiceSummary?.count || 0) + (salesData.posSummary?.count || 0),
                    icon: TrendingUp,
                    color: 'purple',
                    isCount: true,
                  },
                ].map(({ label, value, icon: Icon, color, isCount }) => (
                  <div key={label} className="kpi-card">
                    <div
                      className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center mb-3`}
                    >
                      <Icon className={`w-5 h-5 text-${color}-600`} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {isCount
                        ? value
                        : `₺${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Günlük satış trendi */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Günlük Satış Trendi</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={salesData.byPeriod || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, 'Satış']}
                      />
                      <Bar dataKey="revenue" name="Satış" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Ürün bazlı */}
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">En Çok Satan Ürünler</h3>
                  <div className="space-y-3">
                    {(salesData.byProduct || []).slice(0, 8).map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            backgroundColor: COLORS[i % COLORS.length] + '20',
                            color: COLORS[i % COLORS.length],
                          }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {p.productName || p.name}
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, (p.revenue / (salesData.byProduct?.[0]?.revenue || 1)) * 100)}%`,
                                backgroundColor: COLORS[i % COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-xs font-bold text-gray-700 flex-shrink-0">
                          ₺
                          {Number(p.revenue || 0).toLocaleString('tr-TR', {
                            minimumFractionDigits: 0,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cari bazlı */}
              <div className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Cari Bazlı Satış</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="text-left text-xs text-gray-400 pb-2">Cari</th>
                        <th className="text-right text-xs text-gray-400 pb-2">İşlem Sayısı</th>
                        <th className="text-right text-xs text-gray-400 pb-2">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(salesData.byContact || []).slice(0, 10).map((c: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-2 font-medium">{c.contactName || 'Perakende'}</td>
                          <td className="py-2 text-right text-gray-500">{c.count}</td>
                          <td className="py-2 text-right font-bold text-brand-600">
                            ₺
                            {Number(c.revenue || 0).toLocaleString('tr-TR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Kar / Zarar ───────────────────────────────────────────── */}
          {tab === 'profit' &&
            profitData &&
            (() => {
              const totalRevenue = safeNum(profitData.revenue?.total ?? profitData.revenue);
              const invoiceRevenue = safeNum(
                profitData.revenue?.invoice ?? profitData.invoiceRevenue,
              );
              const posRevenue = safeNum(profitData.revenue?.pos ?? profitData.posRevenue);
              const cogs = safeNum(profitData.cogs);
              const grossProfit = safeNum(profitData.grossProfit);
              const grossMargin = safeNum(profitData.grossMarginPct ?? profitData.grossMargin);
              const purchases = safeNum(profitData.purchases);
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Toplam Gelir',
                        value: fmtMoney(totalRevenue),
                        color: 'text-emerald-600',
                        positive: true,
                      },
                      {
                        label: 'Maliyet (COGS)',
                        value: fmtMoney(cogs),
                        color: 'text-red-400',
                        positive: false,
                      },
                      {
                        label: 'Brüt Kar',
                        value: fmtMoney(grossProfit),
                        color: grossProfit >= 0 ? 'text-blue-400' : 'text-red-400',
                        positive: grossProfit >= 0,
                      },
                      {
                        label: 'Brüt Kar Marjı',
                        value: `%${fmtPct(grossMargin)}`,
                        color: 'text-purple-400',
                        positive: grossMargin >= 0,
                      },
                    ].map(({ label, value, color, positive }) => (
                      <div key={label} className="kpi-card">
                        <div className={`flex items-center gap-1 mb-3 ${color}`}>
                          {positive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="text-xs font-medium text-gray-400">{label}</span>
                        </div>
                        <div className={`text-2xl font-bold ${color}`}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Gelir/Gider özet */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="card p-5">
                      <h3 className="text-sm font-bold text-gray-900 mb-4">Gelir Dağılımı</h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Fatura Satışları', value: invoiceRevenue, color: '#6366f1' },
                          { label: 'POS Satışları', value: posRevenue, color: '#10b981' },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-400">{item.label}</span>
                              <span className="font-bold text-gray-900">
                                {fmtMoney(item.value)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.min(100, totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0)}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-5">
                      <h3 className="text-sm font-bold text-gray-900 mb-4">Maliyet Analizi</h3>
                      <div className="space-y-3 text-sm">
                        {[
                          { label: 'Satışların Maliyeti', value: cogs },
                          { label: 'Satın Almalar', value: purchases },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between">
                            <span className="text-gray-400">{item.label}</span>
                            <span className="font-bold text-red-400">{fmtMoney(item.value)}</span>
                          </div>
                        ))}
                        <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                          <span className="text-gray-600">Brüt Kar</span>
                          <span className={grossProfit >= 0 ? 'text-emerald-600' : 'text-red-400'}>
                            {fmtMoney(grossProfit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* ── Stok Değerleme ────────────────────────────────────────── */}
          {tab === 'inventory' && (
            <div className="space-y-6">
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Stok Değerleme Raporu</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Alış fiyatı bazında mevcut stok değeri
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left text-xs text-gray-400 px-5 py-3">Ürün</th>
                        <th className="text-right text-xs text-gray-400 px-5 py-3">Stok</th>
                        <th className="text-right text-xs text-gray-400 px-5 py-3">Alış Fiyatı</th>
                        <th className="text-right text-xs text-gray-400 px-5 py-3">Stok Değeri</th>
                        <th className="text-right text-xs text-gray-400 px-5 py-3">Satış Değeri</th>
                        <th className="text-right text-xs text-gray-400 px-5 py-3">
                          Potansiyel Kar
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {inventoryData.map((item: any, i: number) => {
                        const costValue = item.quantity * (item.purchasePrice || 0);
                        const saleValue = item.quantity * (item.salePrice || 0);
                        const potProfit = saleValue - costValue;
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-5 py-3">
                              <div className="font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-400">{item.code}</div>
                            </td>
                            <td className="px-5 py-3 text-right">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-5 py-3 text-right text-gray-500">
                              ₺
                              {(item.purchasePrice || 0).toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-5 py-3 text-right font-medium">
                              ₺{costValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3 text-right text-blue-600">
                              ₺{saleValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                            <td
                              className={`px-5 py-3 text-right font-bold ${potProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                            >
                              ₺{potProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-5 py-3 font-bold text-gray-700">
                          TOPLAM
                        </td>
                        <td className="px-5 py-3 text-right font-bold">
                          ₺
                          {inventoryData
                            .reduce((s, i) => s + i.quantity * (i.purchasePrice || 0), 0)
                            .toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-blue-600">
                          ₺
                          {inventoryData
                            .reduce((s, i) => s + i.quantity * (i.salePrice || 0), 0)
                            .toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-600">
                          ₺
                          {inventoryData
                            .reduce(
                              (s, i) =>
                                s + i.quantity * ((i.salePrice || 0) - (i.purchasePrice || 0)),
                              0,
                            )
                            .toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {inventoryData.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">
                    Stok Değeri Dağılımı (Top 10)
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={inventoryData
                          .slice(0, 10)
                          .map((i) => ({
                            name: i.name,
                            value: i.quantity * (i.purchasePrice || 0),
                          }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name?.substring(0, 12)}... ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {inventoryData.slice(0, 10).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, 'Değer']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── Çek Portföyü ──────────────────────────────────────────── */}
          {tab === 'checks' && checksData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Toplam Çek',
                    count: checksData.summary?.totalCount,
                    amount: checksData.summary?.totalAmount,
                    icon: FileText,
                    color: 'indigo',
                  },
                  {
                    label: 'Bekleyen',
                    count: checksData.summary?.pendingCount,
                    amount: checksData.summary?.pendingAmount,
                    icon: Clock,
                    color: 'amber',
                  },
                  {
                    label: 'Yaklaşan Vade (60 gün)',
                    count: checksData.summary?.upcomingCount,
                    amount: checksData.summary?.upcomingAmount,
                    icon: TrendingUp,
                    color: 'blue',
                  },
                  {
                    label: 'Vadesi Geçmiş',
                    count: checksData.summary?.overdueCount,
                    amount: checksData.summary?.overdueAmount,
                    icon: AlertTriangle,
                    color: 'red',
                  },
                ].map(({ label, count, amount, icon: Icon, color }) => (
                  <div key={label} className="kpi-card">
                    <div
                      className={`w-10 h-10 bg-${color}-100 rounded-xl flex items-center justify-center mb-3`}
                    >
                      <Icon className={`w-5 h-5 text-${color}-600`} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{count ?? 0} adet</div>
                    <div className="text-sm font-semibold text-brand-600 mt-1">
                      {fmtMoney(amount)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="kpi-card">
                  <div className="text-xs text-gray-500 mb-1">Alınan Çekler (Gelir)</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {checksData.summary?.incomingCount} adet ·{' '}
                    {fmtMoney(checksData.summary?.incomingAmount)}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="text-xs text-gray-500 mb-1">Verilen Çekler (Gider)</div>
                  <div className="text-lg font-bold text-red-600">
                    {checksData.summary?.outgoingCount} adet ·{' '}
                    {fmtMoney(checksData.summary?.outgoingAmount)}
                  </div>
                </div>
              </div>

              {checksData.upcoming?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 font-bold text-amber-700 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Yaklaşan Vadeler
                  </div>
                  <CheckTable rows={checksData.upcoming} onStatusChange={loadReport} />
                </div>
              )}

              {checksData.overdue?.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 font-bold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Vadesi Geçmiş
                  </div>
                  <CheckTable rows={checksData.overdue} onStatusChange={loadReport} />
                </div>
              )}

              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 font-bold">Tüm Çekler</div>
                <CheckTable rows={checksData.all || []} onStatusChange={loadReport} />
              </div>
            </div>
          )}

          {/* ── Bayi Raporu ───────────────────────────────────────────── */}
          {tab === 'dealers' && (
            <div className="space-y-6">
              {dealerData.length === 0 ? (
                <div className="card p-12 text-center text-gray-400">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Bayi raporu SuperAdmin rolü gerektirir</p>
                </div>
              ) : (
                <>
                  <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900">Bayi Performans Raporu</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="text-left text-xs text-gray-400 px-5 py-3">Bayi</th>
                            <th className="text-right text-xs text-gray-400 px-5 py-3">İşletme</th>
                            <th className="text-right text-xs text-gray-400 px-5 py-3">Aktif</th>
                            <th className="text-right text-xs text-gray-400 px-5 py-3">Basic</th>
                            <th className="text-right text-xs text-gray-400 px-5 py-3">Pro</th>
                            <th className="text-right text-xs text-gray-400 px-5 py-3">Platinum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dealerData.map((d: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-5 py-3">
                                <div className="font-medium text-gray-900">{d.name}</div>
                                <div className="text-xs text-gray-400">{d.city}</div>
                              </td>
                              <td className="px-5 py-3 text-right font-medium">
                                {d.businessCount}
                              </td>
                              <td className="px-5 py-3 text-right text-emerald-600 font-medium">
                                {d.activeCount}
                              </td>
                              <td className="px-5 py-3 text-right text-gray-500">
                                {d.plans?.BASIC || 0}
                              </td>
                              <td className="px-5 py-3 text-right text-blue-600">
                                {d.plans?.PROFESSIONAL || 0}
                              </td>
                              <td className="px-5 py-3 text-right text-indigo-600 font-bold">
                                {d.plans?.PLATINUM || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card p-5">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">
                      Bayi Başına İşletme Sayısı
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dealerData.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                        <Tooltip />
                        <Bar
                          dataKey="businessCount"
                          name="Toplam"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="activeCount"
                          name="Aktif"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'vat' && vatData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="kpi-card">
                  <p className="text-sm text-gray-500">Satış KDV</p>
                  <p className="text-xl font-bold text-blue-600">{fmtMoney(vatData.sales?.vat || 0)}</p>
                </div>
                <div className="kpi-card">
                  <p className="text-sm text-gray-500">Alış KDV</p>
                  <p className="text-xl font-bold text-purple-600">
                    {fmtMoney(vatData.purchases?.vat || 0)}
                  </p>
                </div>
                <div className="kpi-card">
                  <p className="text-sm text-gray-500">Gider KDV</p>
                  <p className="text-xl font-bold text-amber-600">
                    {fmtMoney(vatData.expenses?.vat || 0)}
                  </p>
                </div>
                <div className="kpi-card">
                  <p className="text-sm text-gray-500">Ödenecek KDV</p>
                  <p
                    className={`text-xl font-bold ${(vatData.payableVat || 0) >= 0 ? 'text-red-600' : 'text-emerald-600'}`}
                  >
                    {fmtMoney(vatData.payableVat || 0)}
                  </p>
                </div>
              </div>
              <div className="card p-5">
                <h3 className="text-sm font-bold mb-4">KDV Özeti</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Satış (net)</dt>
                    <dd className="font-semibold">{fmtMoney(vatData.sales?.net || 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Alış (net)</dt>
                    <dd className="font-semibold">{fmtMoney(vatData.purchases?.net || 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">İndirilecek KDV</dt>
                    <dd className="font-semibold">{fmtMoney(vatData.deductibleVat || 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Dönem</dt>
                    <dd className="font-semibold">
                      {vatData.startDate} — {vatData.endDate}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor',
  CLEARED: 'Tahsil',
  BOUNCED: 'Karşılıksız',
  CANCELLED: 'İptal',
};

function CheckTable({ rows, onStatusChange }: { rows: any[]; onStatusChange: () => void }) {
  const updateStatus = async (id: string, status: string) => {
    try {
      await api.post(`/cash/checks/${id}/status`, { status });
      onStatusChange();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    }
  };

  if (!rows.length) return <div className="p-6 text-center text-gray-400 text-sm">Kayıt yok</div>;

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          <th className="text-left text-xs text-gray-400 px-5 py-2">Çek No</th>
          <th className="text-left text-xs text-gray-400 px-5 py-2">Kimden / Kime</th>
          <th className="text-right text-xs text-gray-400 px-5 py-2">Tutar</th>
          <th className="text-left text-xs text-gray-400 px-5 py-2">Vade</th>
          <th className="text-left text-xs text-gray-400 px-5 py-2">Durum</th>
          <th className="text-right text-xs text-gray-400 px-5 py-2">İşlem</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((c: any) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="px-5 py-3 font-medium">{c.checkNo}</td>
            <td className="px-5 py-3">
              <div>{c.contactName}</div>
              <div className="text-xs text-gray-400">
                {c.type === 'INCOME' ? 'Alınan' : 'Verilen'} · {c.bankAccount || ''}
              </div>
            </td>
            <td className="px-5 py-3 text-right font-bold">{fmtMoney(c.amount)}</td>
            <td className="px-5 py-3">
              {c.dueDate ? new Date(c.dueDate).toLocaleDateString('tr-TR') : '—'}
              {c.daysToDue != null && c.daysToDue >= 0 && c.checkStatus === 'PENDING' && (
                <div className="text-xs text-amber-600">{c.daysToDue} gün kaldı</div>
              )}
              {c.daysToDue != null && c.daysToDue < 0 && (
                <div className="text-xs text-red-600">{Math.abs(c.daysToDue)} gün gecikmiş</div>
              )}
            </td>
            <td className="px-5 py-3">
              <span
                className={`text-xs px-2 py-0.5 rounded-lg ${c.checkStatus === 'CLEARED' ? 'bg-emerald-100 text-emerald-700' : c.checkStatus === 'BOUNCED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}
              >
                {STATUS_LABELS[c.checkStatus] || c.checkStatus}
              </span>
            </td>
            <td className="px-5 py-3 text-right">
              {c.checkStatus === 'PENDING' && (
                <FormSelect
                  label="Çek durumu güncelle"
                  hideLabel
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) updateStatus(c.id, e.target.value);
                    e.target.value = '';
                  }}
                >
                  <option value="">Durum</option>
                  <option value="CLEARED">Tahsil edildi</option>
                  <option value="BOUNCED">Karşılıksız</option>
                  <option value="CANCELLED">İptal</option>
                </FormSelect>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
