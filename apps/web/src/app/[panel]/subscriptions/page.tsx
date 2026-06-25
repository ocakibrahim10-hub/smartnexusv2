'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CreditCard, RefreshCw, Check, Calendar, Settings, Zap, Sparkles, AlertCircle } from 'lucide-react';
import { FormField, IconButton } from '@/components/FormField';
import TopBar from '@/components/layout/TopBar';
import { getUser } from '@/lib/auth';
import ModulePicker from '@/components/ModulePicker';
import { fmtMoney, safeNum } from '@/lib/format';
import { expandLegacyModules, getModuleLabel } from '@/lib/modules';
import { planLabel } from '@/lib/plans';
import { applyDiscount } from '@/lib/pricing';

const PLAN_COLORS: Record<string, string> = {
  BASIC: 'bg-gray-100 text-gray-700',
  PROFESSIONAL: 'bg-blue-50 text-blue-700',
  PLATINUM: 'bg-amber-50 text-amber-700',
};

function displayPlanLabel(plan: string) {
  return planLabel(plan);
}

type Sub = {
  id: string;
  tenant: { id: string; name: string; type: string; city: string; isActive?: boolean };
  plan: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  price: number | null;
  modules: string[];
  extraBranches?: number;
};

type FilterTab = 'all' | 'active' | 'pending' | 'expiring';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function SubscriptionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const panel = (params?.panel as string) || 'bayi';
  const user = getUser();
  const isSuperAdmin = user?.tenantType === 'SUPERADMIN';
  const isDealer = user?.tenantType === 'DEALER';
  const canEdit = isSuperAdmin || isDealer;

  const [tab, setTab] = useState<'subs' | 'plans'>('subs');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [subs, setSubs] = useState<Sub[]>([]);
  const [planTemplates, setPlanTemplates] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planModules, setPlanModules] = useState<string[]>([]);
  const [planPrice, setPlanPrice] = useState('');
  const [planDiscount, setPlanDiscount] = useState('0');
  const [planMaxBranches, setPlanMaxBranches] = useState('0');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editSub, setEditSub] = useState<Sub | null>(null);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editPlan, setEditPlan] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editExtraBranches, setEditExtraBranches] = useState('0');
  const [saving, setSaving] = useState(false);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchSubs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/tenants/subscriptions`, { headers });
      const data = await res.json();
      setSubs(Array.isArray(data) ? data : []);
    } catch {
      setSubs([]);
    }
    setLoading(false);
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API}/tenants/plan-templates`, { headers });
      const data = await res.json();
      setPlanTemplates(Array.isArray(data) ? data : []);
    } catch {
      setPlanTemplates([]);
    }
  };

  const isExpiring = (d: string) => {
    const diff = new Date(d).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000;
  };

  const isExpired = (d: string) => new Date(d) < new Date();

  useEffect(() => {
    fetchSubs();
    fetchPlans();
  }, []);

  useEffect(() => {
    const f = searchParams.get('filter');
    if (f === 'pending' || f === 'active' || f === 'expiring' || f === 'all') {
      setFilterTab(f);
    }
  }, [searchParams]);

  const filtered = subs.filter((s) => {
    const matchSearch = s.tenant?.name?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    const expired = isExpired(s.endDate);
    const expiring = isExpiring(s.endDate);
    const pending = s.tenant?.isActive === false;
    if (filterTab === 'active') return !expired && !pending;
    if (filterTab === 'pending') return pending;
    if (filterTab === 'expiring') return expiring && !expired;
    return true;
  });

  const openEdit = (s: Sub) => {
    setEditSub(s);
    setEditModules([...(s.modules ?? [])]);
    setEditPlan(s.plan);
    setEditPrice(String(s.price ?? ''));
    setEditExtraBranches(String(s.extraBranches ?? 0));
  };

  const applyPreset = async (plan: string) => {
    setEditPlan(plan);
    const tpl = planTemplates.find((p) => p.plan === plan);
    if (tpl) {
      setEditModules([...(tpl.modules ?? [])]);
      setEditPrice(String(tpl.price ?? ''));
    }
  };

  const openPlanEdit = (plan: string) => {
    const tpl = planTemplates.find((p) => p.plan === plan);
    setEditingPlan(plan);
    setPlanModules([...(tpl?.modules ?? [])]);
    setPlanPrice(String(tpl?.price ?? ''));
    setPlanDiscount(String(tpl?.discountPercent ?? 0));
    setPlanMaxBranches(String(tpl?.maxBranches ?? 0));
  };

  const savePlanTemplate = async () => {
    if (!editingPlan) return;
    setSaving(true);
    try {
      await fetch(`${API}/tenants/plan-templates/${editingPlan}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          modules: planModules,
          price: parseFloat(planPrice) || 0,
          discountPercent: parseFloat(planDiscount) || 0,
          maxBranches: parseInt(planMaxBranches, 10) || 0,
        }),
      });
      setEditingPlan(null);
      fetchPlans();
    } catch {}
    setSaving(false);
  };

  const save = async () => {
    if (!editSub) return;
    setSaving(true);
    try {
      await fetch(`${API}/tenants/subscriptions/${editSub.tenant.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: editPlan,
          price: parseFloat(editPrice) || 0,
          modules: editModules,
          extraBranches: parseInt(editExtraBranches, 10) || 0,
        }),
      });
      setEditSub(null);
      fetchSubs();
    } catch {}
    setSaving(false);
  };

  const renew = async (s: Sub) => {
    setRenewingId(s.tenant.id);
    try {
      await fetch(`${API}/tenants/subscriptions/${s.tenant.id}/renew`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ months: 12 }),
      });
      fetchSubs();
    } catch {}
    setRenewingId(null);
  };

  const stats = {
    total: subs.length,
    active: subs.filter((s) => !isExpired(s.endDate) && s.tenant?.isActive !== false).length,
    pending: subs.filter((s) => s.tenant?.isActive === false).length,
    expiring: subs.filter((s) => isExpiring(s.endDate)).length,
    revenue: subs.reduce((sum, s) => sum + safeNum(s.price), 0),
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar
        title="Abonelikler"
        subtitle={
          isDealer
            ? 'İşletme abonelikleri, ödeme durumu ve yenileme'
            : 'Abonelik planları ve modül erişimleri'
        }
      />
      <div className="p-6 space-y-6 flex-1">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="hidden" />
        <div className="flex flex-wrap gap-2 ml-auto">
          {isDealer && (
            <Link href={`/${panel}/businesses`} className="btn-primary text-sm">
              + Yeni İşletme
            </Link>
          )}
          {isSuperAdmin && (
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab('subs')}
              className={`px-4 py-2 rounded text-sm ${tab === 'subs' ? 'tab-pill-active' : 'tab-pill'}`}
            >
              Abonelikler
            </button>
            <button
              onClick={() => setTab('plans')}
              className={`px-4 py-2 rounded text-sm ${tab === 'plans' ? 'tab-pill-active' : 'tab-pill'}`}
            >
              Paket Şablonları
            </button>
          </div>
          )}
        </div>
      </div>

      {tab === 'plans' && isSuperAdmin ? (
        <div className="grid grid-cols-3 gap-4">
          {['BASIC', 'PROFESSIONAL', 'PLATINUM'].map((plan) => {
            const tpl = planTemplates.find((p) => p.plan === plan);
            const pricing = applyDiscount(tpl?.price ?? 0, tpl?.discountPercent ?? 0);
            const hasDiscount = pricing.discountPercent > 0;
            return (
              <div key={plan} className="card relative">
                {hasDiscount && (
                  <span className="absolute -top-3 right-4 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3" /> %{pricing.discountPercent} indirim
                  </span>
                )}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-gray-900 font-semibold">{displayPlanLabel(plan)}</h3>
                    <p className="text-gray-500 text-xs mt-1">{tpl?.description || '—'}</p>
                  </div>
                </div>
                <div className="mb-4">
                  {hasDiscount && (
                    <div className="text-sm text-gray-400 line-through mb-0.5">
                      {fmtMoney(pricing.listPrice)}/yıl
                    </div>
                  )}
                  <div className="text-2xl font-bold text-gray-900">
                    {fmtMoney(pricing.finalPrice)}
                    <span className="text-sm font-normal text-gray-500">/yıl</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-4 min-h-[80px]">
                  {expandLegacyModules(tpl?.modules ?? [])
                    .slice(0, 8)
                    .map((m: string) => (
                      <span
                        key={m}
                        className="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-700"
                      >
                        {getModuleLabel(m)}
                      </span>
                    ))}
                  {(tpl?.modules ?? []).length > 8 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                      +{(tpl?.modules ?? []).length - 8}
                    </span>
                  )}
                </div>
                <button onClick={() => openPlanEdit(plan)} className="btn-secondary w-full text-sm">
                  Fiyat, İndirim & Modüller
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="kpi-card">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">Toplam</span>
                <CreditCard size={18} className="text-indigo-400" />
              </div>
              <div className="page-title">{stats.total}</div>
            </div>
            <div className="kpi-card">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">Aktif</span>
                <Check size={18} className="text-emerald-600" />
              </div>
              <div className="page-title">{stats.active}</div>
            </div>
            {isDealer && (
              <div className="kpi-card">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400 text-sm">Ödeme Bekleyen</span>
                  <AlertCircle size={18} className="text-amber-600" />
                </div>
                <div className="page-title">{stats.pending}</div>
              </div>
            )}
            <div className="kpi-card">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">Süresi Yaklaşan</span>
                <Calendar size={18} className="text-amber-400" />
              </div>
              <div className="page-title">{stats.expiring}</div>
            </div>
            <div className="kpi-card">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">Aylık Gelir</span>
                <Zap size={18} className="text-green-400" />
              </div>
              <div className="page-title">{fmtMoney(stats.revenue)}</div>
            </div>
          </div>

          {isDealer && (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'Tümü'],
                  ['active', 'Aktif'],
                  ['pending', 'Ödeme Bekliyor'],
                  ['expiring', 'Süresi Bitiyor'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilterTab(id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    filterTab === id
                      ? 'bg-[#E0E0FF] text-[#3944B8]'
                      : 'border border-[#EFEDF4] text-gray-600 hover:bg-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <FormField
            label="Firma adı ara"
            hideLabel
            className="input text-sm max-w-sm"
            placeholder="Firma adı ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Table */}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-200">
                  <th className="text-left py-2 pr-4">Firma</th>
                  <th className="text-left py-2 pr-4">Plan</th>
                  <th className="text-left py-2 pr-4">Durum</th>
                  <th className="text-left py-2 pr-4">Modüller</th>
                  <th className="text-left py-2 pr-4">Bitiş</th>
                  <th className="text-right py-2 pr-4">Fiyat/ay</th>
                  <th className="text-right py-2">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-8">
                      Yükleniyor…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-8">
                      Abonelik bulunamadı
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const expired = isExpired(s.endDate);
                    const expiring = isExpiring(s.endDate);
                    const pendingPay = s.tenant?.isActive === false;
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-gray-100 hover:bg-[#FBF8FF] transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="text-gray-900 font-medium">{s.tenant?.name}</div>
                          <div className="text-gray-500 text-xs">
                            {s.tenant?.type} · {s.tenant?.city}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${PLAN_COLORS[s.plan] || PLAN_COLORS.BASIC}`}
                          >
                            {displayPlanLabel(s.plan)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {pendingPay ? (
                            <Link
                              href={`/${panel}/subscribe?tenantId=${s.tenant.id}&plan=${s.plan}`}
                              className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium"
                            >
                              Ödeme Bekliyor →
                            </Link>
                          ) : expired ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                              Süresi doldu
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {expandLegacyModules(s.modules ?? [])
                              .slice(0, 4)
                              .map((m) => (
                                <span
                                  key={m}
                                  className="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-700"
                                >
                                  {getModuleLabel(m)}
                                </span>
                              ))}
                            {(s.modules ?? []).length > 4 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                                +{(s.modules ?? []).length - 4}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div
                            className={`text-sm ${expired ? 'text-red-400' : expiring ? 'text-amber-400' : 'text-gray-600'}`}
                          >
                            {new Date(s.endDate).toLocaleDateString('tr-TR')}
                          </div>
                          {expired && <div className="text-xs text-red-400">Süresi doldu</div>}
                          {expiring && !expired && (
                            <div className="text-xs text-amber-400">Yakında bitiyor</div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right text-gray-600">
                          {s.price != null ? fmtMoney(s.price) : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            {canEdit && (
                              <IconButton
                                label="Modülleri Düzenle"
                                onClick={() => openEdit(s)}
                                className="p-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 transition-colors"
                              >
                                <Settings size={14} />
                              </IconButton>
                            )}
                            <IconButton
                              label="12 Ay Uzat"
                              onClick={() => renew(s)}
                              disabled={renewingId === s.tenant.id}
                              className="p-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 transition-colors disabled:opacity-50"
                            >
                              <RefreshCw
                                size={14}
                                className={renewingId === s.tenant.id ? 'animate-spin' : ''}
                              />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Plan Template Edit */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="modal-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-1">{displayPlanLabel(editingPlan)} Paket Şablonu</h3>
            <p className="text-muted text-sm mb-5 text-gray-500">
              Yıllık liste fiyatı, yüzdesel indirim ve varsayılan modülleri düzenleyin. Yeni
              işletmelere otomatik uygulanır.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <FormField
                label="Yıllık liste fiyatı (₺)"
                type="number"
                className="input w-full"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
              />
              <FormField
                label="İndirim (%)"
                type="number"
                min="0"
                max="100"
                className="input w-full"
                value={planDiscount}
                onChange={(e) => setPlanDiscount(e.target.value)}
              />
            </div>
            {(() => {
              const preview = applyDiscount(parseFloat(planPrice) || 0, parseFloat(planDiscount) || 0);
              if (preview.discountPercent <= 0) return null;
              return (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm">
                  <span className="text-gray-500 line-through mr-2">{fmtMoney(preview.listPrice)}</span>
                  <span className="font-semibold text-emerald-700">{fmtMoney(preview.finalPrice)}/yıl</span>
                  <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    %{preview.discountPercent} indirim
                  </span>
                </div>
              );
            })()}
            <ModulePicker
              modules={planModules}
              onChange={setPlanModules}
              tenantType="BUSINESS"
              variant="light"
              renderExtraNode={(childId) => {
                if (childId !== 'MULTI_BRANCH.MAIN') return null;
                return (
                  <div
                    className="ml-auto"
                    onClick={(e) => e.stopPropagation()} // Prevent toggling the module when clicking input
                  >
                    <input
                      type="number"
                      min="0"
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      placeholder="Adet"
                      value={planMaxBranches}
                      onChange={(e) => setPlanMaxBranches(e.target.value)}
                    />
                  </div>
                );
              }}
            />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setEditingPlan(null)}>
                İptal
              </button>
              <button className="btn-primary flex-1" onClick={savePlanTemplate} disabled={saving}>
                {saving ? 'Kaydediliyor…' : 'Şablonu Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editSub && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="modal-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-1">{editSub.tenant?.name}</h3>
            <p className="text-sm mb-5 text-gray-500">
              {editSub.tenant?.type === 'DEALER'
                ? 'Bayi'
                : editSub.tenant?.type === 'BUSINESS'
                  ? 'İşletme'
                  : editSub.tenant?.type === 'BRANCH'
                    ? 'Şube'
                    : editSub.tenant?.type}
              {' · '}Abonelik planı ve modül erişimlerini düzenle
            </p>

            {/* Plan seç */}
            <div className="mb-5">
              <label className="text-sm text-gray-400 mb-2 block">Plan</label>
              <div className="flex gap-2">
                {['BASIC', 'PROFESSIONAL', 'PLATINUM'].map((p) => (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      editPlan === p
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {displayPlanLabel(p)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Plan seçimi modülleri otomatik ayarlar; sonra tek tek değiştirebilirsiniz.
              </p>
            </div>

            <FormField
              label="Aylık Fiyat (₺)"
              type="number"
              className="input w-full"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              placeholder="0"
            />

            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-3 block">
                Modül & Alt Modül Seçimi ({expandLegacyModules(editModules).length} aktif)
              </label>
              <ModulePicker
                modules={editModules}
                onChange={setEditModules}
                tenantType={editSub.tenant?.type}
                showAll={isSuperAdmin}
                variant="light"
                renderExtraNode={(childId) => {
                  if (childId !== 'MULTI_BRANCH.MAIN') return null;
                  return (
                    <div
                      className="ml-auto flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs text-gray-500">Ekstra:</span>
                      <input
                        type="number"
                        min="0"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="Adet"
                        value={editExtraBranches}
                        onChange={(e) => setEditExtraBranches(e.target.value)}
                      />
                    </div>
                  );
                }}
              />
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setEditSub(null)}>
                İptal
              </button>
              <button className="btn-primary flex-1" onClick={save} disabled={saving}>
                {saving ? 'Kaydediliyor…' : 'Kaydet & Uygula'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
