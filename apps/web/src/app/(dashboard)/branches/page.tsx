'use client';

import { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Search,
  Power,
  Building2,
  Store,
  MapPin,
  Users,
  CreditCard,
} from 'lucide-react';
import { getUser } from '@/lib/auth';
import { FormField, FormSelect, IconButton } from '@/components/FormField';

type Branch = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  city: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  createdAt: string;
  parent: { id: string; name: string; parent?: { id: string; name: string } | null } | null;
  subscription: { plan: string; endDate: string; price: number | null; modules: string[] } | null;
  users: { id: string; name: string; email: string; role: string; isActive: boolean }[];
};

const PLAN_CFG: Record<string, { label: string; color: string }> = {
  BASIC: { label: 'Basic', color: 'bg-gray-500/20 text-gray-400' },
  PROFESSIONAL: { label: 'Profesyonel', color: 'bg-blue-500/20 text-blue-400' },
  PLATINUM: { label: 'Platinyum', color: 'bg-amber-50 text-amber-700' },
};

export default function BranchesPage() {
  const user = getUser();
  const canCreate =
    user?.tenantType === 'SUPERADMIN' ||
    user?.tenantType === 'DEALER' ||
    user?.tenantType === 'BUSINESS';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selected, setSelected] = useState<Branch | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', email: '', phone: '', parentId: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (filterActive) p.set('isActive', filterActive);
      const res = await fetch(`${API}/tenants/branches?${p}`, { headers });
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      setBranches([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, [search, filterActive]);

  const create = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/tenants`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          type: 'BRANCH',
          parentId: form.parentId || user?.tenantId,
          plan: 'BASIC',
        }),
      });
      setShowModal(false);
      setForm({ name: '', city: '', email: '', phone: '', parentId: '' });
      fetchBranches();
    } catch {}
    setSaving(false);
  };

  const toggleActive = async (b: Branch) => {
    await fetch(`${API}/tenants/${b.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    fetchBranches();
  };

  const stats = {
    total: branches.length,
    active: branches.filter((b) => b.isActive).length,
    users: branches.reduce((s, b) => s + b.users.length, 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <GitBranch className="text-indigo-400" /> Şube Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            İşletmelere bağlı şubeleri görüntüleyin ve yönetin
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Yeni Şube
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Toplam Şube', value: stats.total, icon: GitBranch, color: 'text-indigo-400' },
          { label: 'Aktif', value: stats.active, icon: Power, color: 'text-emerald-600' },
          { label: 'Kullanıcı', value: stats.users, icon: Users, color: 'text-blue-400' },
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

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <FormField
            label="Şube adı veya kod"
            hideLabel
            className="input pl-9 text-sm w-full"
            placeholder="Şube adı veya kod…"
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
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Yükleniyor…</div>
          ) : branches.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <GitBranch size={40} className="mx-auto mb-2 opacity-30" />
              <p>Şube bulunamadı</p>
            </div>
          ) : (
            branches.map((b) => {
              const planCfg = PLAN_CFG[b.subscription?.plan || b.plan] || PLAN_CFG.BASIC;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelected(selected?.id === b.id ? null : b)}
                  className={`card cursor-pointer transition-all border-l-4 ${selected?.id === b.id ? 'border-l-indigo-500 bg-indigo-500/10' : 'border-l-transparent hover:border-l-indigo-500/40'} ${!b.isActive ? 'opacity-60' : ''}`}
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
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        {b.parent && (
                          <span className="flex items-center gap-1">
                            <Building2 size={10} />
                            {b.parent.name}
                          </span>
                        )}
                        {b.parent?.parent && (
                          <span className="flex items-center gap-1">
                            <Store size={10} />
                            {b.parent.parent.name}
                          </span>
                        )}
                        {b.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {b.city}
                          </span>
                        )}
                      </div>
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
              );
            })
          )}
        </div>

        {selected && (
          <div className="w-80 space-y-3 overflow-y-auto">
            <div className="card">
              <h3 className="text-gray-900 font-semibold mb-3">{selected.name}</h3>
              <div className="space-y-2 text-sm">
                {selected.code && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Kod</span>
                    <span className="text-gray-900 font-medium">{selected.code}</span>
                  </div>
                )}
                {selected.parent && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">İşletme</span>
                    <span className="text-gray-900 font-medium">{selected.parent.name}</span>
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
              </div>
            </div>
            {selected.subscription && (
              <div className="card">
                <h4 className="text-gray-400 text-xs uppercase mb-2 flex items-center gap-1">
                  <CreditCard size={12} /> Abonelik
                </h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plan</span>
                    <span className="text-gray-900 font-medium">
                      {PLAN_CFG[selected.subscription.plan]?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Modül</span>
                    <span className="text-gray-900 font-medium">
                      {selected.subscription.modules?.length ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {selected.users.length > 0 && (
              <div className="card">
                <h4 className="text-gray-400 text-xs uppercase mb-2">Kullanıcılar</h4>
                {selected.users.map((u) => (
                  <div
                    key={u.id}
                    className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-gray-600">{u.name}</span>
                    <span className="text-xs text-indigo-400">{u.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-gray-900 font-semibold mb-4">Yeni Şube Ekle</h3>
            <div className="space-y-3">
              <FormField
                label="Şube Adı *"
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
    </div>
  );
}
