'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
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
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Store,
  GitBranch,
  ShoppingCart,
  Package,
  AlertTriangle,
  Ticket,
  ArrowUpRight,
  Activity,
  CreditCard,
  FileText,
  Truck,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { reportsApi } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { fmtMoney, safeNum, fmtPercentChange } from '@/lib/format';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  trendValue,
  color = 'indigo',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: string;
}) {
  const colors = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', iconBg: 'bg-indigo-100' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', iconBg: 'bg-amber-100' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600', iconBg: 'bg-rose-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', iconBg: 'bg-purple-100' },
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', iconBg: 'bg-cyan-100' },
  } as any;
  const c = colors[color] || colors.indigo;

  return (
    <div className="kpi-card animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}
          >
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// Demo veriler (API bağlanana kadar)
const demoData = {
  kpis: {
    totalTenants: 142,
    activeTenants: 138,
    totalDealers: 12,
    totalBusinesses: 98,
    totalBranches: 32,
    newTenantsThisMonth: 7,
    churnRate: '2.8',
    revenueThisMonth: 485000,
    revenueLastMonth: 421000,
    revenueGrowth: '15.2',
    invoicesThisMonth: 324,
    totalProducts: 1847,
    lowStockCount: 14,
    pendingOrders: 23,
    totalContacts: 412,
  },
  planDistribution: [
    { plan: 'BASIC', count: 45 },
    { plan: 'PROFESSIONAL', count: 38 },
    { plan: 'PLATINUM', count: 15 },
  ],
  growthData: [
    { month: 'Oca 26', newTenants: 8 },
    { month: 'Şub 26', newTenants: 11 },
    { month: 'Mar 26', newTenants: 9 },
    { month: 'Nis 26', newTenants: 14 },
    { month: 'May 26', newTenants: 12 },
    { month: 'Haz 26', newTenants: 7 },
  ],
  recentTickets: [
    {
      id: '1',
      subject: 'E-fatura gönderim hatası',
      status: 'OPEN',
      priority: 'HIGH',
      tenant: 'Demo İşletme A.Ş.',
      createdAt: new Date(),
    },
    {
      id: '2',
      subject: 'Stok raporu çalışmıyor',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      tenant: 'ABC Ticaret',
      createdAt: new Date(),
    },
    {
      id: '3',
      subject: 'Kullanıcı ekleme sorunu',
      status: 'OPEN',
      priority: 'LOW',
      tenant: 'XYZ Market',
      createdAt: new Date(),
    },
  ],
};

const revenueData = [
  { month: 'Oca', gelir: 320000, gider: 210000 },
  { month: 'Şub', gelir: 380000, gider: 245000 },
  { month: 'Mar', gelir: 410000, gider: 268000 },
  { month: 'Nis', gelir: 395000, gider: 255000 },
  { month: 'May', gelir: 421000, gider: 278000 },
  { month: 'Haz', gelir: 485000, gider: 301000 },
];

const statusBadge = (status: string) => {
  const map: any = {
    OPEN: 'badge-error',
    IN_PROGRESS: 'badge-warning',
    RESOLVED: 'badge-success',
    CLOSED: 'bg-gray-100 text-gray-600 badge',
  };
  const labels: any = {
    OPEN: 'Açık',
    IN_PROGRESS: 'İşlemde',
    RESOLVED: 'Çözüldü',
    CLOSED: 'Kapalı',
  };
  return <span className={map[status] || 'badge'}>{labels[status] || status}</span>;
};

const priorityBadge = (priority: string) => {
  const map: any = {
    HIGH: 'badge-error',
    URGENT: 'badge-error',
    MEDIUM: 'badge-warning',
    LOW: 'badge-info',
  };
  const labels: any = { HIGH: 'Yüksek', URGENT: 'Acil', MEDIUM: 'Orta', LOW: 'Düşük' };
  return <span className={map[priority] || 'badge'}>{labels[priority] || priority}</span>;
};

export default function DashboardPage() {
  const user = getUser();
  const [data, setData] = useState<any>(demoData);
  const [loading, setLoading] = useState(false);
  const isSuperAdmin = user?.tenantType === 'SUPERADMIN';
  const isDealer = user?.tenantType === 'DEALER';
  const isBusiness = !isSuperAdmin && !isDealer;

  useEffect(() => {
    reportsApi
      .getBossScreen()
      .then(setData)
      .catch(() => {}) // demo verilerle devam et
      .finally(() => setLoading(false));
  }, []);

  const kpis: Record<string, any> = data?.kpis || demoData.kpis;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Boss Screen"
        subtitle={`Hoş geldiniz, ${user?.name} · ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* SuperAdmin KPIs */}
        {isSuperAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard
              label="Toplam Tenant"
              value={kpis.totalTenants}
              icon={Building2}
              color="indigo"
              sub="Tüm hesaplar"
            />
            <KPICard
              label="Aktif Tenant"
              value={kpis.activeTenants}
              icon={Activity}
              color="emerald"
              trend="up"
              trendValue={`${kpis.churnRate}% churn`}
            />
            <KPICard label="Bayiler" value={kpis.totalDealers} icon={Store} color="purple" />
            <KPICard
              label="İşletmeler"
              value={kpis.totalBusinesses}
              icon={Building2}
              color="cyan"
            />
            <KPICard label="Şubeler" value={kpis.totalBranches} icon={GitBranch} color="amber" />
            <KPICard
              label="Bu Ay Yeni"
              value={kpis.newTenantsThisMonth}
              icon={TrendingUp}
              color="emerald"
              trend="up"
              trendValue="+%12"
            />
          </div>
        )}

        {/* Dealer KPIs */}
        {isDealer && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard
              label="İşletmelerim"
              value={safeNum(kpis.businessCount)}
              icon={Building2}
              color="indigo"
              sub={`${safeNum(kpis.activeBusinesses)} aktif`}
            />
            <KPICard
              label="Aylık Hakediş"
              value={fmtMoney(kpis.monthlyCommission)}
              icon={TrendingUp}
              color="emerald"
            />
            <KPICard
              label="Bekleyen Ödeme"
              value={fmtMoney(kpis.pendingPayout)}
              icon={CreditCard}
              color="amber"
            />
            <KPICard
              label="İşletme Cirosu"
              value={fmtMoney(kpis.monthlyRevenue)}
              icon={ShoppingCart}
              color="cyan"
              sub="Bu ay"
            />
            <KPICard
              label="Okunmamış Mesaj"
              value={safeNum(kpis.unreadMessages)}
              icon={Ticket}
              color="rose"
            />
            <KPICard
              label="Yeni İşletme"
              value={(data.recentBusinesses ?? []).length}
              icon={Store}
              color="purple"
              sub="Son kayıtlar"
            />
          </div>
        )}

        {/* Business KPIs */}
        {isBusiness && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Bu Ay Ciro"
              value={fmtMoney(kpis.revenueThisMonth || 485000)}
              icon={TrendingUp}
              color="emerald"
              trend={safeNum(kpis.revenueGrowth) >= 0 ? 'up' : 'down'}
              trendValue={`${safeNum(kpis.revenueGrowth) >= 0 ? '+' : ''}${fmtPercentChange(kpis.revenueThisMonth, kpis.revenueLastMonth)}%`}
            />
            <KPICard
              label="Fatura Sayısı"
              value={kpis.invoicesThisMonth || 324}
              icon={FileText}
              color="indigo"
              sub="Bu ay"
            />
            <KPICard
              label="Bekleyen Sipariş"
              value={kpis.pendingOrders || 23}
              icon={ShoppingCart}
              color="amber"
            />
            <KPICard
              label="Düşük Stok"
              value={kpis.lowStockCount ?? 0}
              icon={AlertTriangle}
              color="rose"
              sub="Uyarı"
            />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue Chart — admin & işletme */}
          {!isDealer && (
            <div className="card xl:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Gelir & Gider Analizi</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Son 6 ay (TL)</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm inline-block" />
                    Gelir
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-purple-300 rounded-sm inline-block" />
                    Gider
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueData} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="gelirGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="giderGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(v: any) => [`₺${Number(v).toLocaleString('tr-TR')}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="gelir"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gelirGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="gider"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#giderGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {isDealer && (
            <div className="card xl:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Hakediş Trendi</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Son 6 ay komisyon geliri</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.commissionTrend ?? []} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(safeNum(v) / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(v: any) => [fmtMoney(v), 'Hakediş']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="commission" fill="#6366f1" radius={[4, 4, 0, 0]} name="Hakediş" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Plan Distribution (SuperAdmin) / Stok Durumu */}
          <div className="card">
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900">
                {isSuperAdmin ? 'Paket Dağılımı' : isDealer ? 'Son İşletmeler' : 'Stok Özeti'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isSuperAdmin
                  ? 'İşletme abonelikleri'
                  : isDealer
                    ? 'Kayıtlı işletmeleriniz'
                    : 'Depo özeti'}
              </p>
            </div>
            {isSuperAdmin ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={data.planDistribution || demoData.planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {(data.planDistribution || demoData.planDistribution).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {(data.planDistribution || demoData.planDistribution).map((p, i) => (
                    <div key={p.plan} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: COLORS[i] }}
                        />
                        <span className="text-gray-600">{p.plan}</span>
                      </span>
                      <span className="font-semibold text-gray-900">{p.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : isDealer ? (
              <div className="space-y-3">
                {(data.recentBusinesses ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500">Henüz işletme kaydı yok</p>
                ) : (
                  (data.recentBusinesses ?? []).map((b: any) => (
                    <div key={b.id} className="list-row">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{b.name}</div>
                        <div className="text-xs text-gray-500">
                          {b.endDate ? new Date(b.endDate).toLocaleDateString('tr-TR') : '—'}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {b.plan}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    label: 'Toplam Ürün',
                    value: kpis.totalProducts || 1847,
                    color: 'bg-indigo-500',
                    pct: 100,
                  },
                  {
                    label: 'Aktif Stok',
                    value: (kpis.totalProducts || 0) - (kpis.lowStockCount ?? 0),
                    color: 'bg-emerald-500',
                    pct: 99,
                  },
                  {
                    label: 'Düşük Stok',
                    value: kpis.lowStockCount ?? 0,
                    color: 'bg-amber-500',
                    pct: 14,
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-400">{s.label}</span>
                      <span className="font-semibold text-gray-900">{s.value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.color} rounded-full`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Growth Chart (SuperAdmin) */}
        {isSuperAdmin && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="card xl:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900">Aylık Büyüme</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Yeni tenant sayısı</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.growthData || demoData.growthData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar
                    dataKey="newTenants"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    name="Yeni Tenant"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
              <div className="space-y-2">
                {[
                  {
                    icon: Store,
                    label: 'Yeni Bayi Ekle',
                    href: '/dealers/new',
                    color: 'text-indigo-600 bg-indigo-50',
                  },
                  {
                    icon: Building2,
                    label: 'İşletme Ekle',
                    href: '/businesses/new',
                    color: 'text-purple-600 bg-purple-50',
                  },
                  {
                    icon: CreditCard,
                    label: 'Abonelik Uzat',
                    href: '/subscriptions',
                    color: 'text-emerald-600 bg-emerald-50',
                  },
                  {
                    icon: FileText,
                    label: 'Rapor Al',
                    href: '/reports',
                    color: 'text-amber-600 bg-amber-50',
                  },
                  {
                    icon: Truck,
                    label: 'Yeni Sevkiyat',
                    href: '/tms/shipments/new',
                    color: 'text-cyan-600 bg-cyan-50',
                  },
                ].map((a) => (
                  <button
                    key={a.label}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group list-row hover:border-indigo-500/20"
                  >
                    <div
                      className={`w-8 h-8 ${a.color} rounded-lg flex items-center justify-center`}
                    >
                      <a.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {a.label}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-600 ml-auto group-hover:text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Recent Tickets */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Son Destek Talepleri</h3>
              <button className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                Tümü <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {(data.recentTickets || demoData.recentTickets).map((t: any) => (
                <div key={t.id} className="list-row cursor-pointer">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 icon-chip">
                    <Ticket className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{t.subject}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.tenant}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {statusBadge(t.status)}
                    {priorityBadge(t.priority)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Sistem Durumu</h3>
              <span className="badge-success">Tümü Çevrimiçi</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'API Sunucusu', status: 'online', latency: '12ms' },
                { label: 'Veritabanı', status: 'online', latency: '3ms' },
                { label: 'Redis Cache', status: 'online', latency: '1ms' },
                { label: 'E-Fatura Servisi', status: 'online', latency: '245ms' },
                { label: 'Dosya Depolama', status: 'online', latency: '18ms' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-700">{s.label}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{s.latency}</span>
                </div>
              ))}
            </div>

            {/* Version info */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
              <span>SmartNexus v1.0.0</span>
              <span>Faz 1 — Haziran 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
