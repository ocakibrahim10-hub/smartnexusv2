'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import { CalendarRange, Plus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    contactId: '',
    type: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resLeaves, resPersonnel] = await Promise.all([
        api.get('/hr/leaves'),
        api.get('/hr/personnel')
      ]);
      setLeaves(resLeaves.data.items || []);
      setPersonnel(resPersonnel.data.items || []);
    } catch (err) {
      toast.error('İzin talepleri yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/hr/leaves', formData);
      toast.success('İzin talebi oluşturuldu ve onaylandı');
      setIsAdding(false);
      setFormData({ contactId: '', type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      loadData();
    } catch (err: any) {
      toast.error('Kayıt başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-brand-600" />
            İzin ve Rapor Yönetimi
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Personel izin planlaması, rapor ve onay süreçleri</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="font-bold text-sm">Yeni İzin Talebi</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">İzin Kaydı Oluştur</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Personel *</label>
              <select required value={formData.contactId} onChange={e => setFormData({...formData, contactId: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500 font-bold">
                <option value="">Seçiniz...</option>
                {personnel.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.personnelProfile?.department || ''})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">İzin Türü *</label>
              <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500 font-bold">
                <option value="ANNUAL">Yıllık İzin (Ücretli)</option>
                <option value="SICK">Hastalık / Sağlık Raporu</option>
                <option value="UNPAID">Mazeret İzni (Ücretsiz)</option>
                <option value="MATERNITY">Doğum İzni</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Açıklama</label>
              <input type="text" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" placeholder="Örn: Yıllık İzin, Bel Fıtığı Raporu vb." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Başlangıç Tarihi *</label>
              <input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Bitiş Tarihi *</label>
              <input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" />
            </div>
            
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">İptal</button>
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
                Kaydet ve Onayla
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm font-medium">Yükleniyor...</div>
        ) : leaves.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm font-medium">Kayıtlı izin talebi bulunamadı.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Personel</th>
                <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">İzin Türü</th>
                <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tarih Aralığı</th>
                <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gün</th>
                <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaves.map((l, i) => (
                <tr key={i} className="hover:bg-brand-50/20">
                  <td className="py-4 px-6">
                    <span className="text-sm font-bold text-gray-900">{l.contact?.name}</span>
                    <div className="text-[10px] text-gray-500 font-medium mt-0.5">{l.reason || '-'}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                      {l.type === 'ANNUAL' && 'Yıllık İzin'}
                      {l.type === 'SICK' && 'Sağlık Raporu'}
                      {l.type === 'UNPAID' && 'Ücretsiz İzin'}
                      {l.type === 'MATERNITY' && 'Doğum İzni'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-xs font-semibold text-gray-700 flex flex-col">
                      <span>{new Date(l.startDate).toLocaleDateString('tr-TR')}</span>
                      <span className="text-[10px] text-gray-400">den itibaren</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-black text-gray-900">{l.days} Gün</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {l.status === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded uppercase">
                        <CheckCircle2 className="w-3 h-3" /> Onaylandı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded uppercase">
                        <Clock className="w-3 h-3" /> Bekliyor
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
