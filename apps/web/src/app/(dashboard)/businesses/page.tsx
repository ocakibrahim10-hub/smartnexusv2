'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Power,
  CreditCard,
  GitBranch,
  Store,
  MapPin,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { FormField, FormSelect, IconButton } from '@/components/FormField';

type Business = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  city: string | null;
  email: string | null;
  phone: string | null;
  taxNo: string | null;
  plan: string;
  createdAt: string;
  parent: { id: string; name: string } | null;
  subscription: { plan: string; endDate: string; autoRenew: boolean; price: number | null } | null;
  children: { id: string; name: string; isActive: boolean }[];
};

const PLAN_CFG: Record<string, { label: string; color: string }> = {
  BASIC: { label: 'Basic', color: 'bg-gray-500/20 text-gray-400' },
  PROFESSIONAL: { label: 'Profesyonel', color: 'bg-blue-500/20 text-blue-400' },
  PLATINUM: { label: 'Platinyum', color: 'bg-amber-50 text-amber-700' },
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');
const isExpiringSoon = (d: string) => {
  const diff = new Date(d).getTime() - Date.now();
  return diff < 30 * 24 * 60 * 60 * 1000;
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selected, setSelected] = useState<Business | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: '',
    email: '',
    phone: '',
    taxNo: '',
    plan: 'BASIC',
  });
  const [subForm, setSubForm] = useState({
    plan: 'BASIC',
    endDate: '',
    price: '',
    autoRenew: false,
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (filterActive) p.set('isActive', filterActive);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants/businesses?${p}`,
        { headers },
      );
      setBusinesses(await res.json());
    } catch {
      setBusinesses([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBusinesses();
  }, [search, filterActive]);

  const create = async () => {
    setSaving(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, type: 'BUSINESS' }),
      });
      setShowModal(false);
      fetchBusinesses();
    } catch {}
    setSaving(false);
  };

  const saveSub = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants/subscriptions/${selected.id}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...subForm,
            price: subForm.price ? parseFloat(subForm.price) : null,
          }),
        },
      );
      setShowSubModal(false);
      fetchBusinesses();
    } catch {}
    setSaving(false);
  };

  const toggleActive = async (b: Business) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants/${b.id}`,
      { method: 'PATCH', headers, body: JSON.stringify({ isActive: !b.isActive }) },
    );
    fetchBusinesses();
  };

  const stats = {
    total: businesses.length,
    active: businesses.filter((b) => b.isActive).length,
    expiringSoon: businesses.filter((b) => b.subscription && isExpiringSoon(b.subscription.endDate))
      .length,
    branches: businesses.reduce((s, b) => s + b.children.length, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="text-indigo-400" />
            İşletme Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Tüm işletmeleri ve aboneliklerini yönetin</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Yeni İşletme
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Toplam İşletme',
            value: stats.total,
            icon: Building2,
            color: 'text-indigo-400',
          },
          { label: 'Aktif', value: stats.active, icon: Power, color: 'text-emerald-600' },
          {
            label: 'Süre Bitiyor',
            value: stats.expiringSoon,
            icon: Calendar,
            color: 'text-red-400',
          },
          { label: 'Toplam Şube', value: stats.branches, icon: GitBranch, color: 'text-blue-400' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{k.label}</span>
              <k.icon size={18} className={k.color} />
            </div>
            <div className="page-title">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <FormField
            label="İşletme adı veya VKN"
            hideLabel
            className="input pl-9 text-sm w-full"
            placeholder="İşletme adı veya VKN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FormSelect
          label="Durum filtresi"
          hideLabel
          className="input text-sm w-36"
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
        >
          <option value="">Tüm Durum</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </FormSelect>
      </div>

      <div className="flex gap-4 h-[calc(100vh-360px)]">
        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Yükleniyor…</div>
          ) : businesses.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <Building2 size={40} className="mx-auto mb-2 opacity-30" />
              <p>İşletme bulunamadı</p>
            </div>
          ) : (
            businesses.map((b) => {
              const sub = b.subscription;
              const planCfg = PLAN_CFG[sub?.plan || b.plan] || PLAN_CFG.BASIC;
              const expiring = sub && isExpiringSoon(sub.endDate);
              return (
                <div
                  key={b.id}
                  onClick={() => setSelected(selected?.id === b.id ? null : b)}
                  className={`card cursor-pointer transition-all border-l-4 ${selected?.id === b.id ? 'border-l-indigo-500 bg-indigo-500/10' : expiring ? 'border-l-red-500/50' : 'border-l-transparent hover:border-l-indigo-500/40'} ${!b.isActive ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-gray-900 font-semibold">{b.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${planCfg.color}`}>
                          {planCfg.label}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-400'}`}
                        >
                          {b.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                        {expiring && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                            ⚠ Süresi Bitiyor
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        {b.parent && (
                          <span className="flex items-center gap-1">
                            <Store size={10} />
                            {b.parent.name}
                          </span>
                        )}
                        {b.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {b.city}
                          </span>
                        )}
                        {sub && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            Bitiş: {fmtDate(sub.endDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <div className="text-center">
                        <div className="text-gray-900 font-bold">{b.children.length}</div>
                        <div className="text-gray-400 text-xs">Şube</div>
                      </div>
                      <IconButton
                        label={b.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(b);
                        }}
                        className={`p-1.5 rounded transition-colors ${b.isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30'}`}
                      >
                        <Power size={12} />
                      </IconButton>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail */}
        {selected && (
          <div className="w-72 space-y-3 overflow-y-auto">
            <div className="card">
              <h3 className="text-gray-900 font-semibold mb-3">{selected.name}</h3>
              <div className="space-y-2 text-sm">
                {selected.parent && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bayi</span>
                    <span className="text-gray-900 font-medium">{selected.parent.name}</span>
                  </div>
                )}
                {selected.city && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Şehir</span>
                    <span className="text-gray-900 font-medium">{selected.city}</span>
                  </div>
                )}
                {selected.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">E-posta</span>
                    <span className="text-gray-900 text-xs">{selected.email}</span>
                  </div>
                )}
                {selected.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Telefon</span>
                    <span className="text-gray-900 font-medium">{selected.phone}</span>
                  </div>
                )}
                {selected.taxNo && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">VKN</span>
                    <span className="text-gray-900 font-medium">{selected.taxNo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Kayıt</span>
                  <span className="text-gray-900 font-medium">{fmtDate(selected.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-gray-400 text-xs uppercase">Abonelik</h4>
                <button
                  onClick={() => {
                    setSubForm({
                      plan: selected.subscription?.plan || 'BASIC',
                      endDate: selected.subscription?.endDate?.split('T')[0] || '',
                      price: String(selected.subscription?.price || ''),
                      autoRenew: selected.subscription?.autoRenew || false,
                    });
                    setShowSubModal(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-brand-600"
                >
                  Düzenle
                </button>
              </div>
              {selected.subscription ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plan</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${PLAN_CFG[selected.subscription.plan]?.color}`}
                    >
                      {PLAN_CFG[selected.subscription.plan]?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bitiş</span>
                    <span
                      className={
                        isExpiringSoon(selected.subscription.endDate)
                          ? 'text-red-400'
                          : 'text-gray-900'
                      }
                    >
                      {fmtDate(selected.subscription.endDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Oto. Yenile</span>
                    <span
                      className={
                        selected.subscription.autoRenew ? 'text-emerald-600' : 'text-gray-500'
                      }
                    >
                      {selected.subscription.autoRenew ? 'Evet' : 'Hayır'}
                    </span>
                  </div>
                  {selected.subscription.price && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fiyat</span>
                      <span className="text-gray-900 font-medium">
                        {selected.subscription.price.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Abonelik yok</p>
              )}
            </div>

            {selected.children.length > 0 && (
              <div className="card">
                <h4 className="text-gray-400 text-xs uppercase mb-2">
                  Şubeler ({selected.children.length})
                </h4>
                {selected.children.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm py-1">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <GitBranch size={11} className="text-indigo-400" />
                      {c.name}
                    </span>
                    <span
                      className={`text-xs ${c.isActive ? 'text-emerald-600' : 'text-gray-500'}`}
                    >
                      {c.isActive ? '●' : '○'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-gray-900 font-semibold mb-4">Yeni İşletme Ekle</h3>
            <div className="space-y-3">
              <FormField
                label="İşletme Adı *"
                className="input w-full"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <FormField
                label="Şehir"
                className="input w-full"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <FormField
                label="E-posta"
                className="input w-full"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <FormField
                label="VKN"
                className="input w-full"
                value={form.taxNo}
                onChange={(e) => setForm((f) => ({ ...f, taxNo: e.target.value }))}
              />
              <FormSelect
                label="Plan"
                className="input w-full"
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              >
                <option value="BASIC">Basic</option>
                <option value="PROFESSIONAL">Profesyonel</option>
                <option value="PLATINUM">Platinyum</option>
              </FormSelect>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                İptal
              </button>
              <button
                className="btn-primary flex-1"
                onClick={create}
                disabled={saving || !form.name}
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubModal && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-sm">
            <h3 className="text-gray-900 font-semibold mb-4">{selected.name} — Abonelik</h3>
            <div className="space-y-3">
              <FormSelect
                label="Plan"
                className="input w-full"
                value={subForm.plan}
                onChange={(e) => setSubForm((f) => ({ ...f, plan: e.target.value }))}
              >
                <option value="BASIC">Basic</option>
                <option value="PROFESSIONAL">Profesyonel</option>
                <option value="PLATINUM">Platinyum</option>
              </FormSelect>
              <FormField
                label="Bitiş Tarihi *"
                className="input w-full"
                type="date"
                value={subForm.endDate}
                onChange={(e) => setSubForm((f) => ({ ...f, endDate: e.target.value }))}
              />
              <FormField
                label="Aylık Fiyat (₺)"
                className="input w-full"
                type="number"
                value={subForm.price}
                onChange={(e) => setSubForm((f) => ({ ...f, price: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRenew"
                  checked={subForm.autoRenew}
                  onChange={(e) => setSubForm((f) => ({ ...f, autoRenew: e.target.checked }))}
                />
                <label htmlFor="autoRenew" className="text-sm text-gray-600">
                  Otomatik Yenile
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowSubModal(false)}>
                İptal
              </button>
              <button
                className="btn-primary flex-1"
                onClick={saveSub}
                disabled={saving || !subForm.endDate}
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
