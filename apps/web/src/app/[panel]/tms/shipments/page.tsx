'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Navigation,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { FormField, FormSelect, FormTextarea } from '@/components/FormField';

type Shipment = {
  id: string;
  code: string;
  status: string;
  route: string | null;
  notes: string | null;
  plannedDate: string | null;
  deliveredAt: string | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverNationalId?: string | null;
  driverAddress?: string | null;
  eDespatchId?: string | null;
  eDespatchStatus?: string | null;
  driver?: { id: string; name: string; phone: string | null } | null;
  vehicle: {
    id: string;
    plate: string;
    type: string;
    brand: string | null;
    model: string | null;
  } | null;
  orders: {
    id: string;
    address: string | null;
    sequence: number;
    b2bOrder: { id: string; contact: { name: string } } | null;
  }[];
};

type Vehicle = {
  id: string;
  plate: string;
  type: string;
  brand: string | null;
  model: string | null;
  driverId?: string | null;
  driver?: { id: string; name: string; phone: string | null } | null;
};
type Driver = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  nationalId?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PLANNED: { label: 'Planlandı', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Calendar },
  IN_TRANSIT: {
    label: 'Yolda',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    icon: Navigation,
  },
  DELIVERED: {
    label: 'Teslim Edildi',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/20',
    icon: CheckCircle,
  },
  FAILED: { label: 'Başarısız', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle },
  CANCELLED: { label: 'İptal', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: XCircle },
};

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
const fmtTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [form, setForm] = useState({
    vehicleId: '',
    driverId: '',
    driverPreview: '',
    plannedDate: '',
    route: '',
    notes: '',
  });

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  const applyDriverProfile = async (driverId: string) => {
    if (!driverId) {
      setForm((f) => ({ ...f, driverId: '', driverPreview: '' }));
      return;
    }
    try {
      const res = await fetch(`${API}/users/drivers/${driverId}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = await res.json();
      const preview = [
        profile.name,
        profile.phone,
        profile.nationalId ? `TC: ${profile.nationalId}` : '',
        profile.fullAddress || profile.address,
      ]
        .filter(Boolean)
        .join(' · ');
      setForm((f) => ({ ...f, driverId, driverPreview: preview }));
    } catch {
      setForm((f) => ({ ...f, driverId }));
    }
  };

  const onVehicleChange = async (vehicleId: string) => {
    setForm((f) => ({ ...f, vehicleId }));
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (vehicle?.driverId) await applyDriverProfile(vehicle.driverId);
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterVehicle) params.set('vehicleId', filterVehicle);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tms/shipments?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setShipments(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setShipments([]);
    }
    setLoading(false);
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tms/vehicles?isActive=true`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch {}
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/users/drivers`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setDrivers(Array.isArray(data) ? data : []);
    } catch {
      setDrivers([]);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [filterStatus, filterVehicle, page]);
  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  const createShipment = async () => {
    setSaving(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tms/shipments`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleId: form.vehicleId || undefined,
            driverId: form.driverId || undefined,
            plannedDate: form.plannedDate || undefined,
            route: form.route || undefined,
            notes: form.notes || undefined,
          }),
        },
      );
      setShowModal(false);
      setForm({ vehicleId: '', driverId: '', driverPreview: '', plannedDate: '', route: '', notes: '' });
      fetchShipments();
    } catch {}
    setSaving(false);
  };

  const sendEDispatch = async () => {
    if (!selected) return;
    setActionLoading('edispatch');
    try {
      const res = await fetch(`${API}/tms/shipments/${selected.id}/edispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.message);
      setSelected(updated);
      fetchShipments();
    } catch (e: any) {
      alert(e?.message || 'E-irsaliye gönderilemedi');
    }
    setActionLoading('');
  };

  const doAction = async (action: string) => {
    if (!selected) return;
    setActionLoading(action);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tms/shipments/${selected.id}/${action}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        },
      );
      fetchShipments();
      // refresh selected
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tms/shipments/${selected.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const updated = await res.json();
      setSelected(updated);
    } catch {}
    setActionLoading('');
  };

  const stats = {
    planned: shipments.filter((s) => s.status === 'PLANNED').length,
    inTransit: shipments.filter((s) => s.status === 'IN_TRANSIT').length,
    delivered: shipments.filter((s) => s.status === 'DELIVERED').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="text-indigo-400" />
            Sevkiyat Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Teslimat seferlerini planlayın ve takip edin</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Yeni Sevkiyat
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Toplam Sefer', value: total, color: 'text-indigo-400' },
          { label: 'Planlandı', value: stats.planned, color: 'text-blue-400' },
          { label: 'Yolda', value: stats.inTransit, color: 'text-yellow-400' },
          { label: 'Teslim Edildi', value: stats.delivered, color: 'text-emerald-600' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="text-gray-400 text-sm mb-2">{k.label}</div>
            <div className={`text-3xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Layout */}
      <div className="flex gap-4 h-[calc(100vh-340px)]">
        {/* Left list */}
        <div className="w-96 flex flex-col gap-3">
          {/* Filters */}
          <div className="flex gap-2">
            <FormSelect
              label="Durum filtresi"
              hideLabel
              className="input text-sm flex-1"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tüm Durumlar</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              label="Araç filtresi"
              hideLabel
              className="input text-sm flex-1"
              value={filterVehicle}
              onChange={(e) => {
                setFilterVehicle(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tüm Araçlar</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate}
                </option>
              ))}
            </FormSelect>
          </div>

          {/* Shipment list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="text-center text-gray-400 py-8">Yükleniyor…</div>
            ) : shipments.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sevkiyat bulunamadı</p>
              </div>
            ) : (
              shipments.map((s) => {
                const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.PLANNED;
                const Icon = cfg.icon;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelected(selected?.id === s.id ? null : s)}
                    className={`card cursor-pointer transition-all border-l-4 ${selected?.id === s.id ? 'border-l-indigo-500 bg-indigo-500/10' : 'border-l-transparent hover:border-l-indigo-500/50'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-gray-900 font-semibold text-sm">{s.code}</div>
                        <div className="text-gray-400 text-xs mt-0.5">
                          {s.vehicle?.plate || 'Araç atanmadı'}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.color}`}
                      >
                        <Icon size={10} />
                        {cfg.label}
                      </span>
                    </div>
                    {s.route && (
                      <div className="text-gray-400 text-xs flex items-center gap-1 mb-1">
                        <MapPin size={10} />
                        {s.route}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{s.orders.length} adres</span>
                      <span>{fmt(s.plannedDate)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex gap-2 justify-center">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-gray-400 text-xs self-center">
                {page} / {Math.ceil(total / 20)}
              </span>
              <button
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary text-xs px-3 py-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Right detail */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Package size={48} className="mx-auto mb-3 opacity-20" />
                <p>Detay görmek için bir sevkiyat seçin</p>
              </div>
            </div>
          ) : (
            (() => {
              const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.PLANNED;
              const Icon = cfg.icon;
              return (
                <div className="space-y-4">
                  {/* Detail header */}
                  <div className="card">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selected.code}</h2>
                        <p className="text-gray-400 text-sm mt-0.5">
                          {selected.route || 'Rota belirtilmedi'}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-sm font-medium ${cfg.bg} ${cfg.color}`}
                      >
                        <Icon size={14} />
                        {cfg.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        {
                          label: 'Araç',
                          value: selected.vehicle
                            ? `${selected.vehicle.plate} — ${selected.vehicle.brand || ''} ${selected.vehicle.model || ''}`
                            : 'Atanmadı',
                        },
                        { label: 'Şoför', value: selected.driverName || selected.driver?.name || 'Atanmadı' },
                        { label: 'Şoför TC', value: selected.driverNationalId || '—' },
                        { label: 'Şoför Adres', value: selected.driverAddress || '—' },
                        { label: 'Planlanan Tarih', value: fmtTime(selected.plannedDate) },
                        { label: 'Teslim Tarihi', value: fmtTime(selected.deliveredAt) },
                      ].map((d) => (
                        <div key={d.label} className="bg-gray-50 rounded p-3">
                          <div className="text-gray-400 text-xs">{d.label}</div>
                          <div className="text-gray-900 text-sm font-medium mt-1">{d.value}</div>
                        </div>
                      ))}
                    </div>

                    {selected.notes && (
                      <p className="text-gray-400 text-sm bg-gray-50 rounded p-3">
                        {selected.notes}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {!selected.eDespatchId && (
                        <button
                          onClick={sendEDispatch}
                          disabled={!!actionLoading}
                          className="btn-secondary flex items-center gap-2 text-sm"
                        >
                          <Truck size={14} />
                          {actionLoading === 'edispatch' ? '…' : 'E-İrsaliye Oluştur'}
                        </button>
                      )}
                      {selected.eDespatchId && (
                        <span className="text-xs px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700">
                          E-İrsaliye: {selected.eDespatchStatus || 'DRAFT'} · {selected.eDespatchId.slice(0, 8)}…
                        </span>
                      )}
                      {selected.status === 'PLANNED' && (
                        <button
                          onClick={() => doAction('start')}
                          disabled={!!actionLoading}
                          className="btn-primary flex items-center gap-2 text-sm"
                        >
                          <Navigation size={14} />
                          {actionLoading === 'start' ? 'İşleniyor…' : 'Yola Çıkar'}
                        </button>
                      )}
                      {selected.status === 'IN_TRANSIT' && (
                        <button
                          onClick={() => doAction('deliver')}
                          disabled={!!actionLoading}
                          className="btn-primary flex items-center gap-2 text-sm"
                        >
                          <CheckCircle size={14} />
                          {actionLoading === 'deliver' ? 'İşleniyor…' : 'Teslim Edildi'}
                        </button>
                      )}
                      {['PLANNED', 'IN_TRANSIT'].includes(selected.status) && (
                        <>
                          <button
                            onClick={() => doAction('fail')}
                            disabled={!!actionLoading}
                            className="btn-secondary text-red-400 border-red-500/30 flex items-center gap-2 text-sm"
                          >
                            <AlertTriangle size={14} />
                            {actionLoading === 'fail' ? '…' : 'Başarısız'}
                          </button>
                          <button
                            onClick={() => doAction('cancel')}
                            disabled={!!actionLoading}
                            className="btn-secondary flex items-center gap-2 text-sm"
                          >
                            <XCircle size={14} />
                            {actionLoading === 'cancel' ? '…' : 'İptal'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="card">
                    <h3 className="text-gray-900 font-semibold mb-4 text-sm">
                      Durum Zaman Çizelgesi
                    </h3>
                    <div className="flex items-center gap-0">
                      {['PLANNED', 'IN_TRANSIT', 'DELIVERED'].map((st, i) => {
                        const cfg2 = STATUS_CONFIG[st];
                        const Icon2 = cfg2.icon;
                        const isDone =
                          ['PLANNED', 'IN_TRANSIT', 'DELIVERED'].indexOf(selected.status) >= i;
                        const isCurrent = selected.status === st;
                        return (
                          <div key={st} className="flex items-center flex-1">
                            <div className={`flex flex-col items-center`}>
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isCurrent ? `border-${cfg2.color.replace('text-', '')} ${cfg2.bg}` : isDone ? 'border-emerald-500 bg-emerald-500/20' : 'border-gray-600 bg-gray-700'}`}
                              >
                                <Icon2
                                  size={14}
                                  className={isDone ? cfg2.color : 'text-gray-500'}
                                />
                              </div>
                              <span
                                className={`text-xs mt-1 ${isCurrent ? cfg2.color : isDone ? 'text-gray-600' : 'text-gray-500'}`}
                              >
                                {cfg2.label}
                              </span>
                            </div>
                            {i < 2 && (
                              <div
                                className={`flex-1 h-0.5 mx-1 ${['PLANNED', 'IN_TRANSIT', 'DELIVERED'].indexOf(selected.status) > i ? 'bg-emerald-500' : 'bg-gray-600'}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Addresses */}
                  <div className="card">
                    <h3 className="text-gray-900 font-semibold mb-3 text-sm">
                      Teslimat Adresleri ({selected.orders.length})
                    </h3>
                    {selected.orders.length === 0 ? (
                      <p className="text-gray-400 text-sm">Adres eklenmemiş</p>
                    ) : (
                      <div className="space-y-2">
                        {selected.orders
                          .sort((a, b) => a.sequence - b.sequence)
                          .map((o) => (
                            <div
                              key={o.id}
                              className="flex items-center gap-3 bg-gray-50 rounded p-3"
                            >
                              <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                                {o.sequence}
                              </div>
                              <div className="flex-1">
                                <div className="text-gray-900 text-sm">
                                  {o.address || 'Adres belirtilmedi'}
                                </div>
                                {o.b2bOrder && (
                                  <div className="text-gray-400 text-xs mt-0.5">
                                    {o.b2bOrder.contact.name}
                                  </div>
                                )}
                              </div>
                              <ChevronRight size={14} className="text-gray-500" />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h3 className="text-gray-900 font-semibold mb-4">Yeni Sevkiyat Oluştur</h3>
            <div className="space-y-3">
              <FormSelect
                label="Araç"
                className="input w-full"
                value={form.vehicleId}
                onChange={(e) => onVehicleChange(e.target.value)}
              >
                <option value="">Araç seçin…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.brand} {v.model}
                  </option>
                ))}
              </FormSelect>
              <FormSelect
                label="Şoför"
                className="input w-full"
                value={form.driverId}
                onChange={(e) => applyDriverProfile(e.target.value)}
              >
                <option value="">Şoför seçin…</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.phone ? ` — ${d.phone}` : ''}
                  </option>
                ))}
              </FormSelect>
              {form.driverPreview && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{form.driverPreview}</p>
              )}
              <FormField
                label="Planlanan Tarih"
                className="input w-full"
                type="datetime-local"
                value={form.plannedDate}
                onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))}
              />
              <FormField
                label="Rota"
                className="input w-full"
                placeholder="Bağcılar → Kadıköy → Maltepe"
                value={form.route}
                onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))}
              />
              <FormTextarea
                label="Notlar"
                className="input w-full"
                rows={2}
                placeholder="Ek bilgi…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                İptal
              </button>
              <button className="btn-primary flex-1" onClick={createShipment} disabled={saving}>
                {saving ? 'Oluşturuluyor…' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
