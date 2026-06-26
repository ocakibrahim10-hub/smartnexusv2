'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash, Edit2 } from 'lucide-react';
import { FormField } from '@/components/FormField';
import { toast } from '@/lib/toast';

export function LedgerAccountsTab() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', type: 'ASSET' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ledger/accounts');
      setAccounts(res.data);
    } catch (e) {
      toast.error('Hesaplar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/ledger/accounts/${editingId}`, formData);
        toast.success('Hesap güncellendi');
      } else {
        await api.post('/ledger/accounts', formData);
        toast.success('Hesap oluşturuldu');
      }
      setIsModalOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Bir hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/ledger/accounts/${id}`);
      toast.success('Hesap silindi');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Hesap silinirken hata oluştu');
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Yükleniyor...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Tek Düzen Hesap Planı</h2>
        <button
          onClick={() => {
            setFormData({ code: '', name: '', type: 'ASSET' });
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Hesap Ekle
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
            <tr>
              <th className="p-3 font-medium">Hesap Kodu</th>
              <th className="p-3 font-medium">Hesap Adı</th>
              <th className="p-3 font-medium">Tip</th>
              <th className="p-3 font-medium text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="p-3 font-mono">{acc.code}</td>
                <td className="p-3">{acc.name}</td>
                <td className="p-3">{acc.type}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => {
                      setFormData({ code: acc.code, name: acc.name, type: acc.type });
                      setEditingId(acc.id);
                      setIsModalOpen(true);
                    }}
                    className="text-gray-400 hover:text-brand-600 p-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="text-gray-400 hover:text-red-600 p-1 ml-2"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                {editingId ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <FormField
                label="Hesap Kodu"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <FormField
                label="Hesap Adı"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hesap Tipi</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input"
                >
                  <option value="ASSET">Varlık (Aktif)</option>
                  <option value="LIABILITY">Borç (Pasif)</option>
                  <option value="EQUITY">Özkaynak</option>
                  <option value="REVENUE">Gelir</option>
                  <option value="EXPENSE">Gider</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  İptal
                </button>
                <button type="submit" className="btn-primary">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
