'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  ChevronRight,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Building2,
  User,
  Users,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Contact {
  id: string;
  code: string;
  name: string;
  type: string;
  taxNo?: string;
  phone?: string;
  email?: string;
  city?: string;
  balance: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER: 'Müşteri',
  SUPPLIER: 'Tedarikçi',
  BOTH: 'Her İkisi',
};
const TYPE_COLORS: Record<string, string> = {
  CUSTOMER: 'bg-blue-100 text-blue-700',
  SUPPLIER: 'bg-purple-100 text-purple-700',
  BOTH: 'bg-amber-100 text-amber-700',
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [statement, setStatement] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'CUSTOMER',
    taxNo: '',
    phone: '',
    email: '',
    address: '',
    city: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/contacts', { params: { search, type: typeFilter || undefined } });
      setContacts(r.data.data || r.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, typeFilter]);

  const selectContact = async (c: Contact) => {
    setSelected(c);
    const [st, ag] = await Promise.all([
      api.get(`/contacts/${c.id}/statement`).then((r) => r.data.transactions),
      api.get('/contacts/aging').then((r) => r.data.find((a: any) => a.contactId === c.id)),
    ]);
    setStatement(st || []);
    setAging(ag || null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/contacts', form);
      setShowForm(false);
      setForm({
        name: '',
        type: 'CUSTOMER',
        taxNo: '',
        phone: '',
        email: '',
        address: '',
        city: '',
      });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sol liste */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Cari Yönetimi</h1>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Yeni Cari
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim, VN, kod ara..."
              className="input pl-9 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {['', 'CUSTOMER', 'SUPPLIER', 'BOTH'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors ${typeFilter === t ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {t ? TYPE_LABELS[t] : 'Tümü'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3"><div className="space-y-2">{Array.from({length:8}).map((_,i)=><div key={i} className="flex items-center gap-3 p-3 animate-pulse"><div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0"/><div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-3/4"/><div className="h-2 bg-gray-100 rounded w-1/2"/></div></div>)}</div></div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center"><div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3"><Users className="w-6 h-6 text-indigo-300" strokeWidth={1.5}/></div><p className="text-gray-700 font-medium text-sm">Cari bulunamadı</p><p className="text-gray-400 text-xs mt-1">Arama kriterini değiştirin veya yeni cari ekleyin.</p></div>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => selectContact(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${selected?.id === c.id ? 'bg-indigo-50 border-indigo-100' : ''}`}
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{c.name}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 ${TYPE_COLORS[c.type]}`}
                    >
                      {TYPE_LABELS[c.type]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {c.code} {c.taxNo ? `· VN: ${c.taxNo}` : ''}
                  </div>
                </div>
                <div
                  className={`text-sm font-bold flex-shrink-0 ${c.balance > 0 ? 'text-red-600' : c.balance < 0 ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                  {c.balance !== 0
                    ? `₺${Math.abs(c.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                    : '-'}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Sağ detay */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Building2 className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">Bir cari seçin</p>
            <p className="text-sm mt-1">Detayları görmek için soldan cari seçin</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            {/* Başlık */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selected.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${TYPE_COLORS[selected.type]}`}>
                    {TYPE_LABELS[selected.type]}
                  </span>
                  <span className="text-xs text-gray-400">{selected.code}</span>
                  {selected.city && <span className="text-xs text-gray-400">{selected.city}</span>}
                </div>
              </div>
              <div
                className={`card p-4 text-center ${selected.balance > 0 ? 'border-red-100 bg-red-50' : selected.balance < 0 ? 'border-emerald-100 bg-emerald-50' : ''}`}
              >
                <div className="text-xs text-gray-500 mb-1">
                  {selected.balance > 0 ? 'Borçlu' : selected.balance < 0 ? 'Alacaklı' : 'Bakiye'}
                </div>
                <div
                  className={`text-xl font-bold ${selected.balance > 0 ? 'text-red-600' : selected.balance < 0 ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                  ₺
                  {Math.abs(selected.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* İletişim bilgileri */}
            <div className="card p-4 grid grid-cols-2 gap-4">
              {selected.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {selected.phone}
                </div>
              )}
              {selected.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {selected.email}
                </div>
              )}
              {selected.taxNo && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  VN: {selected.taxNo}
                </div>
              )}
            </div>

            {/* Yaşlandırma */}
            {aging && (
              <div className="card p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Alacak Yaşlandırma</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: '0-30 gün', value: aging.current || 0, color: 'emerald' },
                    { label: '31-60 gün', value: aging.days30 || 0, color: 'yellow' },
                    { label: '61-90 gün', value: aging.days60 || 0, color: 'orange' },
                    { label: '90+ gün', value: aging.days90 || 0, color: 'red' },
                    { label: 'TOPLAM', value: aging.total || 0, color: 'indigo' },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className={`text-sm font-bold text-${item.color}-600`}>
                        ₺{item.value.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hesap özeti */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Hesap Hareketleri</h3>
                <span className="text-xs text-gray-400">{statement.length} hareket</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {statement.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Hareket bulunamadı</div>
                ) : (
                  statement.map((t, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.amount > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}
                      >
                        {t.amount > 0 ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {t.description}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(t.date).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${t.amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}
                        >
                          {t.amount > 0 ? '+' : ''}₺
                          {t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-400">
                          Bak: ₺
                          {(t.runningBalance || 0).toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Yeni cari formu */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Yeni Cari</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Ad / Unvan *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Firma adı"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Tip</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="input"
                    aria-label="Cari tipi"
                  >
                    <option value="CUSTOMER">Müşteri</option>
                    <option value="SUPPLIER">Tedarikçi</option>
                    <option value="BOTH">Her İkisi</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Vergi No / TC
                  </label>
                  <input
                    value={form.taxNo}
                    onChange={(e) => setForm({ ...form, taxNo: e.target.value })}
                    className="input"
                    placeholder="VN / TC"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Telefon</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input"
                    placeholder="05xx..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">E-posta</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input"
                    type="email"
                    placeholder="ornek@mail.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Şehir</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input"
                  placeholder="İstanbul"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || saving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}