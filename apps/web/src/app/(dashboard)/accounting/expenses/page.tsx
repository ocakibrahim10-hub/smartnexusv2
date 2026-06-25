'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { FormField, FormSelect } from '@/components/FormField';
import { fmtMoney } from '@/lib/format';

const CATEGORIES = [
  { value: 'RENT', label: 'Kira' },
  { value: 'UTILITIES', label: 'Fatura (elektrik/su)' },
  { value: 'SALARY', label: 'Maaş / bordro' },
  { value: 'SUPPLIES', label: 'Malzeme' },
  { value: 'TRAVEL', label: 'Seyahat' },
  { value: 'MARKETING', label: 'Pazarlama' },
  { value: 'OTHER', label: 'Diğer' },
];

const fmt = (n: number) => fmtMoney(n);

export default function ExpensesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    category: 'OTHER',
    amount: '',
    description: '',
    vendor: '',
    expenseDate: new Date().toISOString().split('T')[0],
    vatRate: '20',
  });
  const [saving, setSaving] = useState(false);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/expenses');
      setItems(r.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.amount || !form.description) return;
    setSaving(true);
    try {
      await api.post('/expenses', {
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description,
        vendor: form.vendor || undefined,
        expenseDate: form.expenseDate,
        vatRate: parseFloat(form.vatRate),
      });
      setShowNew(false);
      setForm({
        category: 'OTHER',
        amount: '',
        description: '',
        vendor: '',
        expenseDate: new Date().toISOString().split('T')[0],
        vatRate: '20',
      });
      load();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => { setDeleteExpenseId(id); };
  const confirmRemove = async () => {
    if (!deleteExpenseId) return;
    try {
      await api.delete(`/expenses/${deleteExpenseId}`);
      toast.success('Gider silindi');
      load();
    } catch { toast.error('Silme başarısız'); }
    finally { setDeleteExpenseId(null); }
  };

  const total = items.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="page-header">
        <h1 className="page-title">Gider Yönetimi</h1>
        <button type="button" onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yeni Gider
        </button>
      </div>

      <div className="kpi-card max-w-xs">
        <p className="text-sm text-gray-500">Toplam Gider</p>
        <p className="text-2xl font-bold">{fmt(total)}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="p-3">Tarih</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Açıklama</th>
                <th className="p-3">Tedarikçi</th>
                <th className="p-3 text-right">KDV</th>
                <th className="p-3 text-right">Tutar</th>
                <th className="p-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-3">{new Date(e.expenseDate).toLocaleDateString('tr-TR')}</td>
                  <td className="p-3">
                    {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                  </td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-gray-500">{e.vendor || '—'}</td>
                  <td className="p-3 text-right">{fmt(e.vatAmount)}</td>
                  <td className="p-3 text-right font-medium">{fmt(e.amount)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Henüz gider kaydı yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="modal-card w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Yeni Gider</h2>
            <div className="space-y-3">
              <FormSelect
                label="Kategori"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </FormSelect>
              <FormField
                label="Tutar (KDV dahil)"
                type="number"
                placeholder="Tutar (KDV dahil)"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="input w-full"
              />
              <FormField
                label="Açıklama"
                type="text"
                placeholder="Açıklama"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input w-full"
              />
              <FormField
                label="Tedarikçi (opsiyonel)"
                type="text"
                placeholder="Tedarikçi (opsiyonel)"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="input w-full"
              />
              <FormField
                label="Gider tarihi"
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="input w-full"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">
                İptal
              </button>
              <button type="button" onClick={submit} disabled={saving} className="btn-primary">
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteExpenseId !== null}
        title="Gideri Sil"
        message="Bu gideri kalıcı olarak silmek istediğinize emin misiniz?"
        confirmLabel="Sil"
        onConfirm={confirmRemove}
        onCancel={() => setDeleteExpenseId(null)}
      />
    </div>
  );
}
