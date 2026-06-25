'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Power, Edit2, Key, Shield, Lock } from 'lucide-react';
import { getUser, canManageUsers } from '@/lib/auth';
import { ROLE_CFG } from '@/lib/role-permissions';
import ModulePicker from '@/components/ModulePicker';
import { FormField, FormSelect, IconButton } from '@/components/FormField';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  contact?: {
    nationalId?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
  } | null;
};

type RoleTemplate = { id: string; label: string; description: string; defaultModules: string[] };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const fmtTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Hiç giriş yapmadı';

const ASSIGNABLE_ROLES = Object.keys(ROLE_CFG).filter((r) => r !== 'OWNER');

export default function UsersPage() {
  const router = useRouter();
  const currentUser = getUser();
  const [users, setUsers] = useState<User[]>([]);
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    phone: '',
    nationalId: '',
    address: '',
    city: '',
    district: '',
    permissions: [] as string[],
    useCustomPermissions: false,
  });
  const [newPassword, setNewPassword] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (
      currentUser &&
      !canManageUsers(currentUser.role) &&
      currentUser.tenantType !== 'SUPERADMIN'
    ) {
      router.replace(currentUser.homeRoute || '/dashboard');
    }
  }, [currentUser, router]);

  const loadRolePreview = useCallback(
    async (role: string) => {
      try {
        const res = await fetch(`${API}/users/role-preview/${role}`, { headers });
        const data = await res.json();
        return (data.modules || []) as string[];
      } catch {
        return [];
      }
    },
    [token],
  );

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (filterRole) p.set('role', filterRole);
      if (filterActive) p.set('isActive', filterActive);
      const res = await fetch(`${API}/users?${p}`, { headers });
      if (res.status === 403) {
        router.replace('/dashboard');
        return;
      }
      setUsers(await res.json());
    } catch {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch(`${API}/users/role-templates`, { headers })
      .then((r) => r.json())
      .then(setRoleTemplates)
      .catch(() => setRoleTemplates([]));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, filterRole, filterActive]);

  const onRoleChange = async (role: string) => {
    const perms = await loadRolePreview(role);
    setForm((f) => ({
      ...f,
      role,
      permissions: perms,
      useCustomPermissions: false,
    }));
  };

  const openCreate = () => {
    setEditId(null);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'STAFF',
      phone: '',
      nationalId: '',
      address: '',
      city: '',
      district: '',
      permissions: [],
      useCustomPermissions: false,
    });
    loadRolePreview('STAFF').then((perms) => setForm((f) => ({ ...f, permissions: perms })));
    setShowModal(true);
  };

  const openEdit = async (u: User) => {
    setEditId(u.id);
    const hasCustom = (u.permissions?.length ?? 0) > 0;
    const perms = hasCustom ? u.permissions : await loadRolePreview(u.role);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      phone: u.phone || '',
      nationalId: u.contact?.nationalId || '',
      address: u.contact?.address || '',
      city: u.contact?.city || '',
      district: u.contact?.district || '',
      permissions: perms,
      useCustomPermissions: hasCustom,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (form.role === 'DRIVER' && !form.nationalId.trim()) {
      alert('Şoför rolü için TC Kimlik No zorunludur');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        role: form.role,
        phone: form.phone || undefined,
        nationalId: form.nationalId || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        district: form.district || undefined,
      };
      if (form.useCustomPermissions && form.role !== 'ADMIN') {
        body.permissions = form.permissions;
      } else if (editId) {
        body.permissions = [];
      }
      if (!editId) {
        body.email = form.email;
        body.password = form.password;
        if (form.useCustomPermissions) body.permissions = form.permissions;
      }
      const url = editId ? `${API}/users/${editId}` : `${API}/users`;
      await fetch(url, { method: editId ? 'PATCH' : 'POST', headers, body: JSON.stringify(body) });
      setShowModal(false);
      fetchUsers();
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const toggleActive = async (u: User) => {
    await fetch(`${API}/users/${u.id}/toggle-active`, { method: 'PATCH', headers });
    fetchUsers();
    if (selected?.id === u.id)
      setSelected((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
  };

  const changePassword = async () => {
    if (!selected || !newPassword) return;
    setSaving(true);
    try {
      await fetch(`${API}/users/${selected.id}/password`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ password: newPassword }),
      });
      setShowPwModal(false);
      setNewPassword('');
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    byRole: Object.keys(ROLE_CFG).reduce(
      (acc, r) => {
        acc[r] = users.filter((u) => u.role === r).length;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };

  const roleHint = roleTemplates.find((r) => r.id === form.role);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="text-indigo-400" />
            Personel & Rol Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            İşletme, şube ve bayi çalışanlarını ekleyin; rol ve modül yetkilerini atayın
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Yeni Personel
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Toplam</span>
            <Users size={18} className="text-indigo-400" />
          </div>
          <div className="page-title">{stats.total}</div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Aktif</span>
            <Power size={18} className="text-emerald-600" />
          </div>
          <div className="page-title">{stats.active}</div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Yönetici</span>
            <Shield size={18} className="text-yellow-500" />
          </div>
          <div className="page-title">{(stats.byRole.OWNER || 0) + (stats.byRole.ADMIN || 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Saha / Operasyon</span>
            <Lock size={18} className="text-sky-500" />
          </div>
          <div className="page-title">
            {(stats.byRole.CASHIER || 0) +
              (stats.byRole.WAREHOUSE || 0) +
              (stats.byRole.DRIVER || 0)}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <FormField
            label="Ad veya e-posta ara"
            hideLabel
            className="input pl-9 text-sm w-full"
            placeholder="Ad veya e-posta ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FormSelect
          label="Rol filtresi"
          hideLabel
          className="input text-sm w-40"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">Tüm Roller</option>
          {Object.entries(ROLE_CFG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </FormSelect>
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

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-200">
              <th className="text-left py-2 pr-4">Personel</th>
              <th className="text-left py-2 pr-4">E-posta</th>
              <th className="text-left py-2 pr-4">Rol</th>
              <th className="text-left py-2 pr-4">Son Giriş</th>
              <th className="text-center py-2 pr-4">Durum</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-8">
                  Personel bulunamadı
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const roleCfg = ROLE_CFG[u.role] || ROLE_CFG.STAFF;
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${!u.isActive ? 'opacity-60' : ''}`}
                    onClick={() => setSelected(u)}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-gray-900 font-medium">{u.name}</div>
                          {u.phone && <div className="text-gray-500 text-xs">{u.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${roleCfg.bg} ${roleCfg.color}`}
                      >
                        {roleCfg.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{fmtTime(u.lastLoginAt)}</td>
                    <td className="py-3 pr-4 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-500'}`}
                      >
                        {u.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <IconButton
                          label="Düzenle"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(u);
                          }}
                          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                        >
                          <Edit2 size={12} />
                        </IconButton>
                        <IconButton
                          label="Şifre değiştir"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(u);
                            setShowPwModal(true);
                          }}
                          className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                        >
                          <Key size={12} />
                        </IconButton>
                        {u.role !== 'OWNER' && (
                          <IconButton
                            label={u.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive(u);
                            }}
                            className={`p-1.5 rounded ${u.isActive ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-600'}`}
                          >
                            <Power size={12} />
                          </IconButton>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="modal-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-gray-900 font-semibold mb-1">
              {editId ? 'Personel Düzenle' : 'Yeni Personel'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Her personel kendi e-posta ve şifresiyle giriş yapar
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Ad Soyad *"
                  className="input w-full"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <FormField
                  label="Telefon"
                  className="input w-full"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label={form.role === 'DRIVER' ? 'TC Kimlik No *' : 'TC Kimlik No'}
                  className="input w-full"
                  maxLength={11}
                  placeholder="11 haneli"
                  value={form.nationalId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nationalId: e.target.value.replace(/\D/g, '').slice(0, 11) }))
                  }
                />
                <FormField
                  label="İl"
                  className="input w-full"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="İlçe"
                  className="input w-full"
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                />
                <FormField
                  label="Adres"
                  className="input w-full"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              {!editId && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="E-posta (giriş) *"
                    className="input w-full"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <FormField
                    label="Şifre *"
                    className="input w-full"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <FormSelect
                  label="Rol"
                  className="input w-full"
                  value={form.role}
                  onChange={(e) => onRoleChange(e.target.value)}
                  disabled={form.role === 'OWNER' && !!editId}
                >
                  {ASSIGNABLE_ROLES.map((k) => (
                    <option key={k} value={k}>
                      {ROLE_CFG[k]?.label || k}
                    </option>
                  ))}
                  {editId && form.role === 'OWNER' && <option value="OWNER">Sahip</option>}
                </FormSelect>
                {roleHint && <p className="text-xs text-gray-400 mt-1">{roleHint.description}</p>}
              </div>

              {form.role !== 'OWNER' && form.role !== 'ADMIN' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.useCustomPermissions}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, useCustomPermissions: e.target.checked }))
                      }
                      className="rounded border-gray-300"
                    />
                    Özel modül yetkileri tanımla (işaretlenmezse rol şablonu uygulanır)
                  </label>
                  {form.useCustomPermissions ? (
                    <ModulePicker
                      modules={form.permissions}
                      onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
                      tenantType={currentUser?.tenantType}
                    />
                  ) : (
                    <p className="text-xs text-gray-500">
                      Bu rol için önerilen {form.permissions.length} modül girişte otomatik açılır.
                    </p>
                  )}
                </div>
              )}

              {(form.role === 'OWNER' || form.role === 'ADMIN') && (
                <p className="text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                  Yönetici rolleri abonelik kapsamındaki tüm modüllere erişir.
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                İptal
              </button>
              <button
                className="btn-primary flex-1"
                onClick={save}
                disabled={saving || !form.name || (!editId && (!form.email || !form.password))}
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPwModal && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="modal-card w-full max-w-sm">
            <h3 className="text-gray-900 font-semibold mb-4">{selected.name} — Şifre Değiştir</h3>
            <FormField
              label="Yeni şifre"
              className="input w-full"
              type="password"
              placeholder="Yeni şifre (min. 6 karakter)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex gap-3 mt-5">
              <button
                className="btn-secondary flex-1"
                onClick={() => {
                  setShowPwModal(false);
                  setNewPassword('');
                }}
              >
                İptal
              </button>
              <button
                className="btn-primary flex-1"
                onClick={changePassword}
                disabled={saving || newPassword.length < 6}
              >
                Değiştir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
