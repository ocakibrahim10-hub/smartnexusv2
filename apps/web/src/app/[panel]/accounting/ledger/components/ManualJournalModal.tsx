'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FormField } from '@/components/FormField';
import { Plus, Trash } from 'lucide-react';
import { toast } from '@/lib/toast';

export function ManualJournalModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<{ id: number; accountId: string; debit: number; credit: number }[]>([
    { id: 1, accountId: '', debit: 0, credit: 0 },
    { id: 2, accountId: '', debit: 0, credit: 0 },
  ]);

  useEffect(() => {
    api.get('/ledger/accounts').then((r) => setAccounts(r.data));
  }, []);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      toast.error('Borç ve Alacak toplamı eşit olmalıdır.');
      return;
    }
    const validLines = lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      toast.error('En az iki geçerli satır girilmelidir.');
      return;
    }

    try {
      await api.post('/ledger/journal', {
        date,
        description,
        reference,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      });
      toast.success('Fiş kaydedildi');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hata oluştu');
    }
  };

  const addLine = () => {
    setLines([...lines, { id: Date.now(), accountId: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (id: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((l) => l.id !== id));
    }
  };

  const updateLine = (id: number, field: string, value: any) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Yeni Yevmiye Fişi (Mahsup/Tediye/Tahsilat)</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <FormField label="Tarih" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <FormField label="Fiş Açıklaması" value={description} onChange={(e) => setDescription(e.target.value)} required className="col-span-2" />
            <FormField label="Belge / Referans No" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          <table className="w-full text-sm mb-4">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="p-3 font-medium text-left">Hesap Kodu ve Adı</th>
                <th className="p-3 font-medium text-right w-32">Borç (₺)</th>
                <th className="p-3 font-medium text-right w-32">Alacak (₺)</th>
                <th className="p-3 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-gray-50">
                  <td className="p-2">
                    <select title="Seçim" aria-label="Seçim"
                      className="input w-full"
                      value={l.accountId}
                      onChange={(e) => updateLine(l.id, 'accountId', e.target.value)}
                      required
                    >
                      <option value="">-- Hesap Seçiniz --</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input title="Veri Girişi" aria-label="Veri Girişi" placeholder="Değer"
                      type="number"
                      step="0.01"
                      className="input w-full text-right"
                      value={l.debit || ''}
                      onChange={(e) => updateLine(l.id, 'debit', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input title="Veri Girişi" aria-label="Veri Girişi" placeholder="Değer"
                      type="number"
                      step="0.01"
                      className="input w-full text-right"
                      value={l.credit || ''}
                      onChange={(e) => updateLine(l.id, 'credit', e.target.value)}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button title="İşlem" aria-label="İşlem" type="button" onClick={() => removeLine(l.id)} className="text-gray-400 hover:text-red-500">
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="p-2">
                  <button type="button" onClick={addLine} className="text-brand-600 hover:text-brand-700 text-sm flex items-center gap-1 font-medium">
                    <Plus className="w-4 h-4" /> Satır Ekle
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="flex justify-end gap-6 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-gray-500">Toplam Borç</span>
              <span className="font-bold text-lg">{totalDebit.toFixed(2)} ₺</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-gray-500">Toplam Alacak</span>
              <span className="font-bold text-lg">{totalCredit.toFixed(2)} ₺</span>
            </div>
          </div>
          {!isBalanced && (
            <div className="text-red-500 text-sm text-right mt-2 font-medium">Borç ve Alacak eşit değil! (Fark: {Math.abs(totalDebit - totalCredit).toFixed(2)})</div>
          )}
        </form>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button type="button" onClick={onClose} className="btn-secondary">İptal</button>
          <button type="button" onClick={handleSubmit} className="btn-primary" disabled={!isBalanced || totalDebit === 0}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
