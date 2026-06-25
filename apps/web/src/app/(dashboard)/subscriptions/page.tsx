'use client';

import { useState, useEffect } from 'react';
import { CreditCard, RefreshCw, Check, Calendar, Settings, Zap } from 'lucide-react';
import { FormField, IconButton } from '@/components/FormField';
import { getUser } from '@/lib/auth';
import ModulePicker from '@/components/ModulePicker';
import { fmtMoney, safeNum } from '@/lib/format';
import { expandLegacyModules, getModuleLabel } from '@/lib/modules';

const PLAN_COLORS: Record<string, string> = {
  BASIC: 'bg-gray-100 text-gray-700',
  PROFESSIONAL: 'bg-blue-50 text-blue-700',
  PLATINUM: 'bg-amber-50 text-amber-700',
};

const PLAN_LABELS: Record<string, string> = {
  BASIC: 'Basic',
  PROFESSIONAL: 'Professional',
  PLATINUM: 'Platinum',
};

type Sub = {
  id: string;
  tenant: { id: string; name: string; type: string; city: string };
  plan: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  price: number | null;
  modules: string[];
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function SubscriptionsPage() {
  const user = getUser();
  const isSuperAdmin = user?.tenantType === 'SUPERADMIN';
  const canEdit = isSuperAdmin || user?.tenantType === 'DEALER';

  const [tab, setTab] = useState<'subs' | 'plans'>('subs');
  const [subs, setSubs] = useState<Sub[]>([]);
  const [planTemplates, setPlanTemplates] = useState<any[]>([]);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planModules, setPlanModules] = useState<string[]>([]);
  const [planPrice, setPlanPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editSub, setEditSub] = useState<Sub | null>(null);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editPlan, setEditPlan] = useState('');
  const [editPrice, setEditPrice] = useState('');
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

  useEffect(() => {
    fetchSubs();
    fetchPlans();
  }, []);

  const filtered = subs.filter((s) => s.tenant?.name?.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (s: Sub) => {
    setEditSub(s);
    setEditModules([...(s.modules ?? [])]);
    setEditPlan(s.plan);
    setEditPrice(String(s.price ?? ''));
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
  };

  const savePlanTemplate = async () => {
    if (!editingPlan) return;
    setSaving(true);
    try {
      await fetch(`${API}/tenants/plan-templates/${editingPlan}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ modules: planModules, price: parseFloat(planPrice) || 0 }),
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

  const isExpiring = (d: string) => {
    const diff = new Date(d).getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000;
  };

  const isExpired = (d: string) => new Date(d) < new Date();

  const stats = {
    total: subs.length,
    active: subs.filter((s) => !isExpired(s.endDate)).length,
    expiring: subs.filter((s) => isExpiring(s.endDate)).length,
    revenue: subs.reduce((sum, s) => sum + safeNum(s.price), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CreditCard className="text-indigo-400" /> Abonelikler & Paket Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Abonelik planlarını ve modül erişimlerini yönetin
          </p>
        </div>
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

      {tab === 'plans' && isSuperAdmin ? (
        <div className="grid grid-cols-3 gap-4">
          {['BASIC', 'PROFESSIONAL', 'PLATINUM'].map((plan) => {
            const tpl = planTemplates.find((p) => p.plan === plan);
            return (
              <div key={plan} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-gray-900 font-semibold">{PLAN_LABELS[plan]}</h3>
                    <p className="text-gray-500 text-xs mt-1">{tpl?.description || '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
                    {tpl?.price != null ? fmtMoney(tpl.price) : '—'}/ay
                  </span>
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
                  Modülleri Düzenle
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-4 gap-4">
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
                  <th className="text-left py-2 pr-4">Modüller</th>
                  <th className="text-left py-2 pr-4">Bitiş</th>
                  <th className="text-right py-2 pr-4">Fiyat/ay</th>
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
                      Abonelik bulunamadı
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const expired = isExpired(s.endDate);
                    const expiring = isExpiring(s.endDate);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
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
                            {PLAN_LABELS[s.plan] || s.plan}
                          </span>
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
            <h3 className="font-semibold text-lg mb-1">{PLAN_LABELS[editingPlan]} Paket Şablonu</h3>
            <p className="text-muted text-sm mb-5 text-gray-500">
              Bu pakete atanacak varsayılan modülleri düzenleyin. Yeni işletmelere otomatik
              uygulanır.
            </p>
            <FormField
              label="Aylık Fiyat (₺)"
              type="number"
              className="input w-full"
              value={planPrice}
              onChange={(e) => setPlanPrice(e.target.value)}
            />
            <ModulePicker
              modules={planModules}
              onChange={setPlanModules}
              tenantType="BUSINESS"
              variant="light"
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
                    {PLAN_LABELS[p]}
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
  );
}
