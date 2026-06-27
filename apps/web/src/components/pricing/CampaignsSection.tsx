'use client';

import { useState, useEffect } from 'react';
import { FormField, FormSelect } from '@/components/FormField';
import { fmtMoney } from '@/lib/format';
import { Trash2, Plus, Calendar, Tag } from 'lucide-react';
import { platformApi } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function CampaignsSection() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    type: 'DISCOUNT',
    target: 'ALL',
    targetIds: '',
    percent: 0,
    validFrom: new Date().toISOString().slice(0, 16),
    validTo: '',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadCampaigns = async () => {
    try {
      const res = await fetch(`${API}/platform/campaigns`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API}/platform/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          targetIds: form.targetIds ? form.targetIds.split(',').map(s => s.trim()) : [],
        })
      });
      setShowForm(false);
      loadCampaigns();
      setForm({
        name: '',
        type: 'DISCOUNT',
        target: 'ALL',
        targetIds: '',
        percent: 0,
        validFrom: new Date().toISOString().slice(0, 16),
        validTo: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Kampanyayı silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`${API}/platform/campaigns/${id}`, { method: 'DELETE', headers });
      loadCampaigns();
    } catch (e) {}
  };

  return (
    <div className="card p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[#1B1B1F]">Kampanya Yönetimi</h2>
          <p className="text-sm text-[#777680] mt-1">
            İndirim ve Zam kampanyalarını zamanlayın. Fiyatlar otomatik güncellenir ve kullanıcılara bildirim gönderilir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#606BDF] text-white rounded-xl text-sm font-medium hover:bg-[#4f59c4]"
        >
          <Plus className="w-4 h-4" /> Yeni Kampanya
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <FormField
              label="Kampanya Adı"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <FormSelect
                label="Tür"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                <option value="DISCOUNT">İndirim</option>
                <option value="INCREASE">Zam</option>
              </FormSelect>
              <FormField
                label="Yüzde (%)"
                type="number"
                min="0"
                step="0.01"
                value={form.percent}
                onChange={e => setForm({ ...form, percent: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <FormSelect
              label="Hedef Kitle"
              value={form.target}
              onChange={e => setForm({ ...form, target: e.target.value })}
            >
              <option value="ALL">Tümü</option>
              <option value="PLAN">Sadece Seçili Planlar</option>
              <option value="MODULE">Sadece Seçili Modüller</option>
            </FormSelect>
            {form.target !== 'ALL' && (
              <FormField
                label="Hedef ID'ler (Virgülle ayırın)"
                placeholder="Örn: BASIC, PROFESSIONAL veya EINVOICE"
                value={form.targetIds}
                onChange={e => setForm({ ...form, targetIds: e.target.value })}
              />
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <FormField
              label="Başlangıç Tarihi"
              type="datetime-local"
              value={form.validFrom}
              onChange={e => setForm({ ...form, validFrom: e.target.value })}
              required
            />
            <FormField
              label="Bitiş Tarihi (Opsiyonel)"
              type="datetime-local"
              value={form.validTo}
              onChange={e => setForm({ ...form, validTo: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border font-medium text-gray-700 hover:bg-gray-100"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#606BDF] text-white font-medium hover:bg-[#4f59c4]"
            >
              {loading ? 'Kaydediliyor...' : 'Kampanya Oluştur ve Bildir'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Henüz kampanya bulunmuyor.</p>
        ) : (
          campaigns.map(c => {
            const isActive = c.isActive && new Date(c.validFrom) <= new Date() && (!c.validTo || new Date(c.validTo) >= new Date());
            const isFuture = new Date(c.validFrom) > new Date();

            return (
              <div key={c.id} className={`flex items-center justify-between p-4 rounded-xl border ${isActive ? 'border-emerald-200 bg-emerald-50' : isFuture ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === 'DISCOUNT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {c.type === 'DISCOUNT' ? 'İNDİRİM' : 'ZAM'} %{c.percent}
                    </span>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    {isActive && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">Aktif</span>}
                    {isFuture && <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full">Yaklaşan</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Hedef: {c.target} {c.targetIds.length > 0 && `(${c.targetIds.join(', ')})`}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(c.validFrom).toLocaleDateString('tr-TR')} {c.validTo && `- ${new Date(c.validTo).toLocaleDateString('tr-TR')}`}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Kampanyayı Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
