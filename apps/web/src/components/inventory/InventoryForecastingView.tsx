'use client';

import { useEffect, useState } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShoppingCart,
  Package,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  BarChart2,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ForecastItem {
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  warehouses: string[];
  currentStock: number;
  minQuantity: number;
  avgDailyDemand: number;
  totalOut90d: number;
  last30dOut: number;
  prev30dOut: number;
  daysRemaining: number;
  reorderPoint: number;
  reorderQty: number;
  trend: 'up' | 'down' | 'stable';
  trendPct: number;
  urgency: number;
  confidence: number;
  estimatedCost: number;
  needsReorder: boolean;
}

interface ForecastData {
  summary: {
    critical: number;
    warning: number;
    needsReorder: number;
    totalEstimatedCost: number;
    analyzedProducts: number;
  };
  forecasts: ForecastItem[];
  generatedAt: string;
}

function urgencyFill(value: number) {
  if (value >= 75) return '#ef4444';
  if (value >= 50) return '#f97316';
  if (value >= 25) return '#eab308';
  return '#22c55e';
}

function urgencyTextClass(u: number) {
  if (u >= 75) return 'text-red-500';
  if (u >= 50) return 'text-orange-500';
  if (u >= 25) return 'text-yellow-600';
  return 'text-emerald-600';
}

function urgencyDotClass(u: number) {
  if (u >= 75) return 'bg-red-500 shadow-[0_0_6px_#ef4444]';
  if (u >= 50) return 'bg-orange-500';
  if (u >= 25) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function daysRemainingClass(d: number) {
  if (d <= 7) return 'text-red-500';
  if (d <= 14) return 'text-orange-500';
  return 'text-emerald-600';
}

function UrgencyBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg className="w-full h-1.5 block" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden>
      <rect width="100" height="6" fill="#EFEDF4" rx="2" />
      <rect width={v} height="6" fill={urgencyFill(value)} rx="2" />
    </svg>
  );
}

function MiniSparkline({ last30, prev30 }: { last30: number; prev30: number }) {
  const max = Math.max(last30, prev30, 1);
  const h1 = (prev30 / max) * 28;
  const h2 = (last30 / max) * 28;
  const color = last30 >= prev30 ? '#606BDF' : '#94a3b8';
  return (
    <svg width="48" height="32" viewBox="0 0 48 32" aria-hidden>
      <rect x="4" y={32 - h1 - 2} width="16" height={h1} rx="2" fill="#EFEDF4" />
      <rect x="28" y={32 - h2 - 2} width="16" height={h2} rx="2" fill={color} />
    </svg>
  );
}

const KPI_CONFIG = [
  {
    label: 'Analiz Edilen',
    key: 'analyzedProducts' as const,
    icon: Package,
    iconBg: 'bg-indigo-50',
    iconText: 'text-indigo-500',
    sub: 'ürün',
    format: 'number' as const,
  },
  {
    label: 'Kritik Seviye',
    key: 'critical' as const,
    icon: AlertTriangle,
    iconBg: 'bg-red-50',
    iconText: 'text-red-500',
    sub: 'stok tükenmek üzere',
    format: 'number' as const,
  },
  {
    label: 'Sipariş Gerekli',
    key: 'needsReorder' as const,
    icon: ShoppingCart,
    iconBg: 'bg-orange-50',
    iconText: 'text-orange-500',
    sub: 'ürün',
    format: 'number' as const,
  },
  {
    label: 'Tahmini Maliyet',
    key: 'totalEstimatedCost' as const,
    icon: BarChart2,
    iconBg: 'bg-purple-50',
    iconText: 'text-purple-500',
    sub: '30 günlük sipariş',
    format: 'currency' as const,
  },
];

export default function InventoryForecastingView() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'reorder'>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'days' | 'cost'>('urgency');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await apiFetch<ForecastData>('/inventory/forecast');
      setData(res);
    } catch {
      /* demo / offline */
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.round(n));
  const fmtCur = (n: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(n);

  const urgencyLabel = (u: number) =>
    u >= 75 ? 'Kritik' : u >= 50 ? 'Yüksek' : u >= 25 ? 'Orta' : 'Düşük';

  const filtered = (data?.forecasts ?? [])
    .filter((f) => {
      if (filter === 'critical') return f.urgency >= 75;
      if (filter === 'warning') return f.urgency >= 25 && f.urgency < 75;
      if (filter === 'reorder') return f.needsReorder;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'days') return a.daysRemaining - b.daysRemaining;
      if (sortBy === 'cost') return b.estimatedCost - a.estimatedCost;
      return b.urgency - a.urgency;
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-[#606BDF] animate-spin" />
        <p className="text-sm text-[#777680]">AI analizi çalışıyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-chip w-11 h-11">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="page-title">AI Talep Tahmini</h1>
            <p className="page-subtitle">
              {data?.forecasts.length ?? 0} ürün analiz edildi
              {data?.generatedAt
                ? ` · ${new Date(data.generatedAt).toLocaleString('tr-TR')}`
                : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="btn-secondary"
          disabled={refreshing}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {KPI_CONFIG.map((k) => {
          const raw = data?.summary[k.key] ?? 0;
          const value = k.format === 'currency' ? fmtCur(raw) : fmt(raw);
          const Icon = k.icon;
          return (
            <div key={k.label} className="kpi-card flex-row items-center gap-4 !p-5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${k.iconBg}`}
              >
                <Icon className={`w-5 h-5 ${k.iconText}`} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-[#777680]">{k.label}</p>
                <p className="kpi-value text-xl">{value}</p>
                <p className="text-[11px] text-[#777680]">{k.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mb-6 !p-4 bg-indigo-50 border-indigo-200 flex items-start gap-4">
        <Zap className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-700 mb-1">AI Özeti</p>
          <p className="text-sm text-indigo-900/80 leading-relaxed">
            Son 90 günlük satış verileri analiz edildi.{' '}
            <strong className="text-indigo-950">{data?.summary.critical ?? 0} ürün</strong> kritik
            stok seviyesinde.{' '}
            <strong className="text-indigo-950">{data?.summary.needsReorder ?? 0} ürün</strong> için
            sipariş önerilmekte. Toplam tahmini yenileme maliyeti:{' '}
            <strong className="text-indigo-600">
              {fmtCur(data?.summary.totalEstimatedCost ?? 0)}
            </strong>
            .
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div className="tab-group">
          {(
            [
              { key: 'all', label: `Tümü (${data?.forecasts.length ?? 0})` },
              { key: 'critical', label: `Kritik (${data?.summary.critical ?? 0})` },
              { key: 'warning', label: `Uyarı (${data?.summary.warning ?? 0})` },
              { key: 'reorder', label: `Sipariş Gerekli (${data?.summary.needsReorder ?? 0})` },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? 'tab-pill tab-pill-active' : 'tab-pill'}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#777680]">Sırala:</span>
          {(
            [
              { key: 'urgency', label: 'Aciliyet' },
              { key: 'days', label: 'Kalan Gün' },
              { key: 'cost', label: 'Maliyet' },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSortBy(s.key)}
              className={sortBy === s.key ? 'tab-pill tab-pill-active text-xs !py-1.5' : 'tab-pill text-xs !py-1.5'}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="forecast-grid-header px-4 py-2.5 border-b border-[#EFEDF4] bg-[#FBF8FF]">
          {[
            'Ürün',
            'Stok',
            'Günlük Talep',
            'Kalan Gün',
            'Trend',
            'Sipariş Önerisi',
            'Aciliyet',
            'Güven',
            '',
          ].map((h) => (
            <div
              key={h}
              className="text-[11px] font-semibold uppercase tracking-wide text-[#777680] pr-2"
            >
              {h}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-[#777680]">
            Bu filtrede ürün bulunamadı.
          </div>
        )}

        {filtered.map((f) => {
          const isExp = expanded === f.productId;
          return (
            <div key={f.productId} className="border-b border-[#EFEDF4] last:border-b-0">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(isExp ? null : f.productId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpanded(isExp ? null : f.productId);
                  }
                }}
                className={`forecast-grid-row px-4 py-3 cursor-pointer transition-colors ${
                  isExp ? 'bg-[#FBF8FF]' : 'hover:bg-[#FBF8FF]/60'
                }`}
              >
                <div className="pr-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${urgencyDotClass(f.urgency)}`}
                    />
                    <span className="text-sm font-medium truncate">{f.productName}</span>
                    {f.needsReorder && (
                      <span className="badge-warning text-[9px] !px-1.5 !py-0">SİPARİŞ</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#777680] mt-0.5 ml-4 truncate">
                    {f.productCode} · {f.warehouses.join(', ')}
                  </p>
                </div>

                <div className="pr-2">
                  <p
                    className={`text-sm font-semibold ${
                      f.currentStock <= f.reorderPoint ? 'text-red-500' : ''
                    }`}
                  >
                    {fmt(f.currentStock)}
                  </p>
                  <p className="text-[10px] text-[#777680]">{f.unit}</p>
                </div>

                <p className="text-sm text-[#46464F] pr-2">
                  {f.avgDailyDemand.toFixed(1)} {f.unit}/gün
                </p>

                <div className="pr-2">
                  <p className={`text-sm font-bold ${daysRemainingClass(f.daysRemaining)}`}>
                    {f.daysRemaining >= 999 ? '∞' : `${f.daysRemaining}g`}
                  </p>
                  {f.daysRemaining < 999 && (
                    <p className="text-[10px] text-[#777680]">stok ömrü</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pr-2">
                  <MiniSparkline last30={f.last30dOut} prev30={f.prev30dOut} />
                  <div>
                    {f.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                    {f.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                    {f.trend === 'stable' && <Minus className="w-3.5 h-3.5 text-[#777680]" />}
                    <p className="text-[10px] text-[#777680]">
                      {f.trendPct > 0 ? '+' : ''}
                      {f.trendPct}%
                    </p>
                  </div>
                </div>

                <div className="pr-2">
                  <p className="text-sm font-semibold text-[#606BDF]">
                    +{fmt(f.reorderQty)} {f.unit}
                  </p>
                  <p className="text-[10px] text-[#777680]">{fmtCur(f.estimatedCost)}</p>
                </div>

                <div className="pr-2">
                  <p className={`text-[11px] font-semibold mb-1 ${urgencyTextClass(f.urgency)}`}>
                    {urgencyLabel(f.urgency)} ({f.urgency})
                  </p>
                  <UrgencyBar value={f.urgency} />
                </div>

                <div className="pr-2">
                  <p className="text-xs text-[#46464F]">{f.confidence}%</p>
                  <p className="text-[10px] text-[#777680]">güven</p>
                </div>

                <div className="flex justify-center">
                  {isExp ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[#606BDF]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#777680]" />
                  )}
                </div>
              </div>

              {isExp && (
                <div className="px-4 pb-4 pt-1 bg-[#FBF8FF] grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      title: 'Talep Analizi',
                      rows: [
                        {
                          label: 'Son 90 gün toplam çıkış',
                          value: `${fmt(f.totalOut90d)} ${f.unit}`,
                        },
                        { label: 'Son 30 gün', value: `${fmt(f.last30dOut)} ${f.unit}` },
                        { label: 'Önceki 30 gün', value: `${fmt(f.prev30dOut)} ${f.unit}` },
                        {
                          label: 'Ort. günlük talep',
                          value: `${f.avgDailyDemand.toFixed(2)} ${f.unit}`,
                        },
                        {
                          label: 'Trend',
                          value:
                            f.trend === 'up'
                              ? `↑ Yükselen %${f.trendPct}`
                              : f.trend === 'down'
                                ? `↓ Düşen %${Math.abs(f.trendPct)}`
                                : '→ Sabit',
                        },
                      ],
                    },
                    {
                      title: 'Stok Durumu',
                      rows: [
                        { label: 'Mevcut stok', value: `${fmt(f.currentStock)} ${f.unit}` },
                        { label: 'Min. stok seviyesi', value: `${fmt(f.minQuantity)} ${f.unit}` },
                        { label: 'Yenileme noktası', value: `${fmt(f.reorderPoint)} ${f.unit}` },
                        {
                          label: 'Tahmini bitiş',
                          value: f.daysRemaining >= 999 ? 'Belirsiz' : `${f.daysRemaining} gün`,
                        },
                        { label: 'Depolar', value: f.warehouses.join(', ') },
                      ],
                    },
                    {
                      title: 'Sipariş Önerisi',
                      rows: [
                        {
                          label: '30 günlük sipariş miktarı',
                          value: `${fmt(f.reorderQty)} ${f.unit}`,
                        },
                        { label: 'Alış fiyatı', value: fmtCur(f.purchasePrice) },
                        { label: 'Tahmini maliyet', value: fmtCur(f.estimatedCost) },
                        { label: 'Satış fiyatı', value: fmtCur(f.salePrice) },
                        { label: 'AI güven skoru', value: `%${f.confidence}` },
                      ],
                    },
                  ].map((section) => (
                    <div key={section.title} className="card !p-3.5 !shadow-none">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#606BDF] mb-2.5">
                        {section.title}
                      </p>
                      {section.rows.map((r) => (
                        <div
                          key={r.label}
                          className="flex justify-between gap-2 mb-2 last:mb-0 text-xs"
                        >
                          <span className="text-[#777680]">{r.label}</span>
                          <span className="font-medium text-right">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[11px] text-[#777680] flex items-center justify-center gap-1">
        <Clock className="w-3 h-3" />
        Son 90 günlük hareket verileri kullanılarak hesaplanmıştır. Yatırım tavsiyesi değildir.
      </p>
    </div>
  );
}
