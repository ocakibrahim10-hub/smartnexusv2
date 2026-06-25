'use client';

import { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Edit2,
  Power,
  Search,
  Package,
  AlertCircle,
  CheckCircle,
  Navigation,
} from 'lucide-react';
import { FormField, FormSelect } from '@/components/FormField';

type Vehicle = {
  id: string;
  plate: string;
  type: string;
  brand: string | null;
  model: string | null;
  capacity: number | null;
  driverId: string | null;
  driver?: { id: string; name: string; phone: string | null } | null;
  isActive: boolean;
  activeShipments: number;
  isOnRoute: boolean;
};

type Driver = { id: string; name: string; phone: string | null };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  TRUCK: { label: 'Kamyon', color: 'bg-blue-500/20 text-blue-400', icon: '🚛' },
  VAN: { label: 'Minivan', color: 'bg-brand-50 text-brand-600', icon: '🚐' },
  MOTORCYCLE: { label: 'Motosiklet', color: 'bg-orange-500/20 text-orange-400', icon: '🏍️' },
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plate: '',
    type: 'VAN',
    brand: '',
    model: '',
    capacity: '',
    driverId: '',
  });
  const [editId, setEditId] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterActive) params.set('isActive', filterActive);
      const res = await fetch(`${API}/tms/vehicles?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch {
      setVehicles([]);
    }
    setLoading(false);
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API}/users/drivers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch {
      setDrivers([]);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, filterType, filterActive]);
  useEffect(() => {
    fetchDrivers();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ plate: '', type: 'VAN', brand: '', model: '', capacity: '', driverId: '' });
    setShowModal(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setForm({
      plate: v.plate,
      type: v.type,
      brand: v.brand || '',
      model: v.model || '',
      capacity: String(v.capacity || ''),
      driverId: v.driverId || '',
    });
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        plate: form.plate,
        type: form.type,
        brand: form.brand || undefined,
        model: form.model || undefined,
        capacity: form.capacity ? parseFloat(form.capacity) : undefined,
        driverId: form.driverId || undefined,
      };
      const url = editId ? `${API}/tms/vehicles/${editId}` : `${API}/tms/vehicles`;
      const method = editId ? 'PATCH' : 'POST';
      await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setShowModal(false);
      fetchVehicles();
    } catch {}
    setSaving(false);
  };

  const toggleActive = async (v: Vehicle) => {
    await fetch(`${API}/tms/vehicles/${v.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !v.isActive }),
    });
    fetchVehicles();
  };

  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.isActive).length,
    onRoute: vehicles.filter((v) => v.isOnRoute).length,
    totalCap: vehicles.reduce((s, v) => s + (v.capacity || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Truck className="text-indigo-400" />
            Araç Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Filosunuzdaki araçları yönetin ve takip edin</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Araç Ekle
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Araç', value: stats.total, icon: Truck, color: 'text-indigo-400' },
          {
            label: 'Aktif Araç',
            value: stats.active,
            icon: CheckCircle,
            color: 'text-emerald-600',
          },
          { label: 'Rotada', value: stats.onRoute, icon: Navigation, color: 'text-yellow-400' },
          {
            label: 'Toplam Kapasite',
            value: `${stats.totalCap.toFixed(1)} ton`,
            icon: Package,
            color: 'text-blue-400',
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
      <div className="card flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <FormField
            label="Plaka veya marka ara"
            hideLabel
            className="input pl-9 text-sm w-full"
            placeholder="Plaka veya marka ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FormSelect
          label="Araç tipi"
          hideLabel
          className="input text-sm w-40"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Tüm Tipler</option>
          <option value="TRUCK">Kamyon</option>
          <option value="VAN">Minivan</option>
          <option value="MOTORCYCLE">Motosiklet</option>
        </FormSelect>
        <FormSelect
          label="Durum"
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

      {/* Vehicle Grid */}
      {loading ? (
        <div className="text-center text-gray-400 py-16">Yükleniyor…</div>
      ) : vehicles.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <Truck size={40} className="mx-auto mb-3 opacity-30" />
          <p>Araç bulunamadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const typeInfo = TYPE_LABELS[v.type] || {
              label: v.type,
              color: 'bg-gray-500/20 text-gray-400',
              icon: '🚗',
            };
            return (
              <div
                key={v.id}
                onClick={() => setSelected(selected?.id === v.id ? null : v)}
                className={`card cursor-pointer transition-all border-2 ${selected?.id === v.id ? 'border-indigo-500' : 'border-transparent hover:border-indigo-500/40'} ${!v.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div>
                      <div className="text-gray-900 font-bold text-lg">{v.plate}</div>
                      <div className="text-gray-400 text-sm">
                        {v.brand} {v.model}
                      </div>
                      {v.driver && (
                        <div className="text-gray-500 text-xs mt-0.5">Şoför: {v.driver.name}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {v.isOnRoute && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1">
                        <Navigation size={10} />
                        Rotada
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-400 text-xs">Kapasite</div>
                    <div className="text-gray-900 font-medium">
                      {v.capacity ? `${v.capacity} ton` : '—'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-gray-400 text-xs">Aktif Sefer</div>
                    <div className="text-gray-900 font-medium">{v.activeShipments}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${v.isActive ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-400'}`}
                  >
                    {v.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      aria-label="Düzenle"
                      title="Düzenle"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(v);
                      }}
                      className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      aria-label={v.isActive ? 'Pasife al' : 'Aktife al'}
                      title={v.isActive ? 'Pasife al' : 'Aktife al'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActive(v);
                      }}
                      className={`p-1.5 rounded transition-colors ${v.isActive ? 'bg-red-500/20 hover:bg-red-500/40 text-red-400' : 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-600'}`}
                    >
                      <Power size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div className="card border border-brand-200">
          <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
            <Truck size={16} className="text-indigo-400" />
            {selected.plate} — Detay
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Plaka', value: selected.plate },
              { label: 'Tip', value: TYPE_LABELS[selected.type]?.label || selected.type },
              { label: 'Marka', value: selected.brand || '—' },
              { label: 'Model', value: selected.model || '—' },
              { label: 'Şoför', value: selected.driver?.name || '—' },
              { label: 'Kapasite', value: selected.capacity ? `${selected.capacity} ton` : '—' },
              { label: 'Aktif Sefer', value: String(selected.activeShipments) },
            ].map((d) => (
              <div key={d.label} className="bg-gray-50 rounded p-3">
                <div className="text-gray-400 text-xs">{d.label}</div>
                <div className="text-gray-900 font-medium mt-1">{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-gray-900 font-semibold mb-4">
              {editId ? 'Araç Düzenle' : 'Yeni Araç'}
            </h3>
            <div className="space-y-3">
              <FormField
                label="Plaka *"
                className="input w-full"
                placeholder="34 ABC 100"
                value={form.plate}
                onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
              />
              <FormSelect
                label="Tip *"
                className="input w-full"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="TRUCK">Kamyon</option>
                <option value="VAN">Minivan</option>
                <option value="MOTORCYCLE">Motosiklet</option>
              </FormSelect>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Marka"
                  className="input w-full"
                  placeholder="Ford"
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                />
                <FormField
                  label="Model"
                  className="input w-full"
                  placeholder="Transit"
                  value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                />
              </div>
              <FormSelect
                label="Şoför"
                className="input w-full"
                value={form.driverId}
                onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
              >
                <option value="">Şoför seçin…</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.phone ? ` — ${d.phone}` : ''}
                  </option>
                ))}
              </FormSelect>
              <FormField
                label="Kapasite (ton)"
                className="input w-full"
                type="number"
                step="0.1"
                placeholder="3.5"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                İptal
              </button>
              <button
                className="btn-primary flex-1"
                onClick={save}
                disabled={saving || !form.plate}
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
