'use client';

import { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  ChevronRight,
  Building2,
  GitBranch,
  Power,
  Edit2,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Settings,
} from 'lucide-react';
import { fmtMoney, safeNum } from '@/lib/format';
import { expandLegacyModules, getModuleLabel } from '@/lib/modules';
import { FormField, FormSelect, IconButton } from '@/components/FormField';

type Dealer = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  city: string | null;
  region: string | null;
  email: string | null;
  phone: string | null;
  taxNo: string | null;
  plan: string;
  createdAt: string;
  subscription: { plan: string; endDate: string; price: number | null; modules?: string[] } | null;
  children: { id: string; type: string; name: string; isActive: boolean }[];
};

const PLAN_CFG: Record<string, { label: string; color: string }> = {
  BASIC: { label: 'Basic', color: 'bg-gray-100 text-gray-700' },
  PROFESSIONAL: { label: 'Profesyonel', color: 'bg-blue-50 text-blue-700' },
  PLATINUM: { label: 'Platinyum', color: 'bg-amber-50 text-amber-700' },
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

export default function DealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selected, setSelected] = useState<Dealer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    city: '',
    region: '',
    email: '',
    phone: '',
    taxNo: '',
    plan: 'BASIC',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchDealers = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (filterActive) p.set('isActive', filterActive);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants/dealers?${p}`,
        { headers },
      );
      setDealers(await res.json());
    } catch {
      setDealers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDealers();
  }, [search, filterActive]);

  const createDealer = async () => {
    setSaving(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, type: 'DEALER' }),
      });
      setShowModal(false);
      setForm({ name: '', city: '', region: '', email: '', phone: '', taxNo: '', plan: 'BASIC' });
      fetchDealers();
    } catch {}
    setSaving(false);
  };

  const toggleActive = async (d: Dealer) => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants/${d.id}`,
      { method: 'PATCH', headers, body: JSON.stringify({ isActive: !d.isActive }) },
    );
    fetchDealers();
  };

  const stats = {
    total: dealers.length,
    active: dealers.filter((d) => d.isActive).length,
    totalBusinesses: dealers.reduce(
      (s, d) => s + d.children.filter((c) => c.type === 'BUSINESS').length,
      0,
    ),
    monthlyRevenue: dealers.reduce((s, d) => s + safeNum(d.subscription?.price), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Store className="text-indigo-400" />
            Bayi Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Bayileri ve alt işletmelerini yönetin</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Yeni Bayi
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Bayi', value: stats.total, icon: Store, color: 'text-indigo-400' },
          { label: 'Aktif Bayi', value: stats.active, icon: Power, color: 'text-emerald-600' },
          {
            label: 'İşletme Sayısı',
            value: stats.totalBusinesses,
            icon: Building2,
            color: 'text-blue-400',
          },
          {
            label: 'Aylık Gelir',
            value: fmtMoney(stats.monthlyRevenue),
            icon: CreditCard,
            color: 'text-yellow-400',
          },
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
            label="Bayi adı veya şehir"
            hideLabel
            className="input pl-9 text-sm w-full"
            placeholder="Bayi adı veya şehir…"
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
          ) : dealers.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <Store size={40} className="mx-auto mb-2 opacity-30" />
              <p>Bayi bulunamadı</p>
            </div>
          ) : (
            dealers.map((d) => {
              const planCfg = PLAN_CFG[d.subscription?.plan || d.plan] || PLAN_CFG.BASIC;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelected(selected?.id === d.id ? null : d)}
                  className={`card cursor-pointer transition-all border-l-4 ${selected?.id === d.id ? 'border-l-indigo-500 bg-indigo-500/10' : 'border-l-transparent hover:border-l-indigo-500/40'} ${!d.isActive ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-900 font-semibold">{d.name}</span>
                        {d.code && <span className="text-xs text-gray-500">{d.code}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${planCfg.color}`}>
                          {planCfg.label}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${d.isActive ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-400'}`}
                        >
                          {d.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {d.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {d.city}
                            {d.region ? ` / ${d.region}` : ''}
                          </span>
                        )}
                        {d.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={10} />
                            {d.email}
                          </span>
                        )}
                        {d.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={10} />
                            {d.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <div className="text-center">
                        <div className="text-gray-900 font-bold">
                          {d.children.filter((c) => c.type === 'BUSINESS').length}
                        </div>
                        <div className="text-gray-400 text-xs">İşletme</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-900 font-bold">
                          {d.children.filter((c) => c.type === 'BRANCH').length}
                        </div>
                        <div className="text-gray-400 text-xs">Şube</div>
                      </div>
                      <div className="flex gap-1">
                        <IconButton
                          label={d.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActive(d);
                          }}
                          className={`p-1.5 rounded text-xs transition-colors ${d.isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30'}`}
                        >
                          <Power size={12} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail */}
        {selected && (
          <div className="w-80 space-y-3 overflow-y-auto">
            <div className="card">
              <h3 className="text-gray-900 font-semibold mb-3">{selected.name}</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Kod', value: selected.code || '—' },
                  { label: 'Şehir', value: selected.city || '—' },
                  { label: 'Bölge', value: selected.region || '—' },
                  { label: 'E-posta', value: selected.email || '—' },
                  { label: 'Telefon', value: selected.phone || '—' },
                  { label: 'VKN', value: selected.taxNo || '—' },
                  { label: 'Kayıt', value: fmtDate(selected.createdAt) },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-gray-400">{r.label}</span>
                    <span className="text-gray-900 font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {selected.subscription && (
              <div className="card">
                <h4 className="text-gray-400 text-xs uppercase mb-2">Abonelik</h4>
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
                    <span className="text-gray-900 font-medium">
                      {fmtDate(selected.subscription.endDate)}
                    </span>
                  </div>
                  {selected.subscription.price != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fiyat</span>
                      <span className="text-emerald-600">
                        {fmtMoney(selected.subscription.price)}
                      </span>
                    </div>
                  )}
                </div>
                {(selected.subscription.modules?.length ?? 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-gray-400 text-xs mb-2">Aktif Modüller</div>
                    <div className="flex flex-wrap gap-1">
                      {expandLegacyModules(selected.subscription.modules ?? []).map((m) => (
                        <span
                          key={m}
                          className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-brand-600"
                        >
                          {getModuleLabel(m)}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Settings size={10} /> Modülleri Abonelikler sayfasından düzenleyin
                    </p>
                  </div>
                )}
              </div>
            )}

            {selected.children.length > 0 && (
              <div className="card">
                <h4 className="text-gray-400 text-xs uppercase mb-2">Alt İşletmeler</h4>
                <div className="space-y-1">
                  {selected.children.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-gray-600">
                        {c.type === 'BUSINESS' ? (
                          <Building2 size={12} className="text-blue-400" />
                        ) : (
                          <GitBranch size={12} className="text-indigo-400" />
                        )}
                        {c.name}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${c.isActive ? 'text-emerald-600' : 'text-gray-500'}`}
                      >
                        {c.isActive ? '●' : '○'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-gray-900 font-semibold mb-4">Yeni Bayi Ekle</h3>
            <div className="space-y-3">
              <FormField
                label="Bayi Adı *"
                className="input w-full"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Şehir"
                  className="input w-full"
                  placeholder="İstanbul"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
                <FormField
                  label="Bölge"
                  className="input w-full"
                  placeholder="Marmara"
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                />
              </div>
              <FormField
                label="E-posta"
                className="input w-full"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <FormField
                label="Telefon"
                className="input w-full"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
                onClick={createDealer}
                disabled={saving || !form.name}
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
