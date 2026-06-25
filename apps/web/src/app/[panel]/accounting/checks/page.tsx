'use client';

import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  ArrowRight,
  ArrowLeft,
  Banknote,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Building2,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ChecksPage() {
  const [checks, setChecks] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Quick Sale Modal State
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickSaleData, setQuickSaleData] = useState({
    contactId: '',
    amount: '',
    checkNo: '',
    dueDate: '',
    bankName: '',
    collectionMethod: 'MANUAL', // MANUAL | BANK_COLLECTION | ENDORSEMENT
    collectionBankId: '',
    endorsedContactId: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resChecks, resContacts, resBanks] = await Promise.all([
        api.get('/cash/check-register'),
        api.get('/contacts'),
        api.get('/cash/bank-accounts'),
      ]);

      setChecks(resChecks.data.items || []);
      setContacts(resContacts.data.items || []);
      setBankAccounts(resBanks.data.items || []);

      // Calculate Summary
      let incoming = 0;
      let outgoing = 0;
      let pending = 0;
      let cleared = 0;

      (resChecks.data.items || []).forEach((c: any) => {
        if (c.direction === 'INCOMING') incoming += c.amount;
        if (c.direction === 'OUTGOING') outgoing += c.amount;
        if (c.status === 'PENDING') pending += c.amount;
        if (c.status === 'CLEARED') cleared += c.amount;
      });

      setSummary({ incoming, outgoing, pending, cleared });
    } catch (err: any) {
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSaleData.contactId || !quickSaleData.amount || !quickSaleData.checkNo || !quickSaleData.dueDate) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/cash/quick-sale-check', {
        ...quickSaleData,
        amount: parseFloat(quickSaleData.amount),
      });
      toast.success('Hızlı satış ve çek tahsilatı başarıyla oluşturuldu');
      setShowQuickSale(false);
      setQuickSaleData({
        contactId: '',
        amount: '',
        checkNo: '',
        dueDate: '',
        bankName: '',
        collectionMethod: 'MANUAL',
        collectionBankId: '',
        endorsedContactId: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const STATUS_COLORS: any = {
    PENDING: 'bg-amber-100 text-amber-700',
    CLEARED: 'bg-emerald-100 text-emerald-700',
    BOUNCED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };

  const STATUS_LABELS: any = {
    PENDING: 'Bekliyor',
    CLEARED: 'Tahsil Edildi',
    BOUNCED: 'Karşılıksız',
    CANCELLED: 'İptal',
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-600" />
            Çek Defteri ve Portföy
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Alınan, verilen ve ciro edilen tüm çeklerin yönetimi</p>
        </div>
        <button
          onClick={() => setShowQuickSale(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="font-bold text-sm">Hızlı Satış & Tahsilat</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Alınan Çekler</p>
            <p className="text-lg font-black text-emerald-700">₺{(summary.incoming || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Verilen Çekler</p>
            <p className="text-lg font-black text-red-700">₺{(summary.outgoing || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Tahsil Bekleyen</p>
            <p className="text-lg font-black text-amber-700">₺{(summary.pending || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase">Kapanan / Tahsil</p>
            <p className="text-lg font-black text-blue-700">₺{(summary.cleared || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Checks Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-brand-500" /> Çek Portföyü
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Çek No veya Cari ara..."
              className="pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm font-medium">Yükleniyor...</div>
        ) : checks.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm font-medium">Kayıtlı çek bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Çek Bilgileri</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cari / İlgili</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vade</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Tutar</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {checks.map((c, i) => (
                  <tr key={i} className="hover:bg-brand-50/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{c.checkNo}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            c.direction === 'INCOMING' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {c.direction === 'INCOMING' ? 'ALINAN' : 'VERİLEN'}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {c.bankName || 'Banka Belirtilmedi'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-brand-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900">{c.contact?.name || c.drawerName || 'Bilinmiyor'}</span>
                          {c.collectionMethod && (
                            <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-1">
                              {c.collectionMethod === 'MANUAL' && 'Elden Tahsilat'}
                              {c.collectionMethod === 'BANK_COLLECTION' && `Banka Tahsilatı (${c.collectionBank?.name || ''})`}
                              {c.collectionMethod === 'ENDORSEMENT' && `Ciro Edildi (${c.endorsedContact?.name || ''})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">{new Date(c.dueDate).toLocaleDateString('tr-TR')}</span>
                        {new Date(c.dueDate).getTime() < Date.now() && c.status === 'PENDING' && (
                          <span className="text-[9px] font-bold text-red-500 mt-0.5">Vadesi Geçmiş!</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-black text-gray-900">
                        ₺{c.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Sale Modal */}
      {showQuickSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-600" />
                Hızlı Satış & Çek Tahsilatı
              </h2>
              <button onClick={() => setShowQuickSale(false)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-xs text-gray-500 mb-6 bg-brand-50 p-3 rounded-xl border border-brand-100 font-medium leading-relaxed">
                Bu ekran aracılığıyla seçeceğiniz cariye otomatik olarak <strong>Satış Faturası</strong> kesilecek, tahsilatı <strong>Çek</strong> olarak kaydedilecek ve Çek Portföyünüze eklenecektir. Tüm kayıtlar birbiriyle eşzamanlı ve tutarlı olarak bağlanır.
              </p>
              
              <form onSubmit={handleQuickSaleSubmit} id="quick-sale-form" className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Müşteri (Cari Seçimi) *</label>
                    <select
                      className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 p-2.5 bg-gray-50 font-medium"
                      value={quickSaleData.contactId}
                      onChange={(e) => setQuickSaleData({...quickSaleData, contactId: e.target.value})}
                      required
                    >
                      <option value="">Cari Seçin...</option>
                      {contacts.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Satış & Çek Tutarı *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">₺</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-8 pr-3 text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-white font-black text-gray-900"
                        value={quickSaleData.amount}
                        onChange={(e) => setQuickSaleData({...quickSaleData, amount: e.target.value})}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Çek Numarası *</label>
                    <input
                      type="text"
                      className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-white font-medium uppercase"
                      value={quickSaleData.checkNo}
                      onChange={(e) => setQuickSaleData({...quickSaleData, checkNo: e.target.value})}
                      required
                      placeholder="Örn: CHK-12345"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Çek Vadesi *</label>
                    <input
                      type="date"
                      className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-white font-medium text-gray-700"
                      value={quickSaleData.dueDate}
                      onChange={(e) => setQuickSaleData({...quickSaleData, dueDate: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Çek Hangi Bankaya Ait? *</label>
                    <input
                      type="text"
                      className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-white font-medium"
                      value={quickSaleData.bankName}
                      onChange={(e) => setQuickSaleData({...quickSaleData, bankName: e.target.value})}
                      required
                      placeholder="Örn: Garanti Bankası"
                    />
                  </div>

                  <div className="col-span-2 pt-2 border-t border-gray-100">
                    <label className="block text-xs font-bold text-gray-700 mb-3 uppercase tracking-wider">Çeki Nasıl Tahsil Ettiniz?</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'MANUAL', label: 'Elden / Kasaya' },
                        { id: 'BANK_COLLECTION', label: 'Banka Tahsilata Verildi' },
                        { id: 'ENDORSEMENT', label: 'Başka Cariye Ciro Edildi' },
                      ].map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => setQuickSaleData({...quickSaleData, collectionMethod: opt.id})}
                          className={`cursor-pointer border rounded-xl p-3 text-center transition-colors ${
                            quickSaleData.collectionMethod === opt.id 
                              ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500' 
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-xs font-bold">{opt.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {quickSaleData.collectionMethod === 'BANK_COLLECTION' && (
                    <div className="col-span-2 mt-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Hangi Banka Hesabınıza Verildi? *</label>
                      <select
                        className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-gray-50 font-medium"
                        value={quickSaleData.collectionBankId}
                        onChange={(e) => setQuickSaleData({...quickSaleData, collectionBankId: e.target.value})}
                        required
                      >
                        <option value="">Banka Hesabı Seçin...</option>
                        {bankAccounts.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {quickSaleData.collectionMethod === 'ENDORSEMENT' && (
                    <div className="col-span-2 mt-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Hangi Cariye Ciro Edildi? *</label>
                      <select
                        className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-gray-50 font-medium"
                        value={quickSaleData.endorsedContactId}
                        onChange={(e) => setQuickSaleData({...quickSaleData, endorsedContactId: e.target.value})}
                        required
                      >
                        <option value="">Ciro Edilen Cariyi Seçin...</option>
                        {contacts.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQuickSale(false)}
                className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                disabled={isSubmitting}
              >
                İptal Et
              </button>
              <button
                type="submit"
                form="quick-sale-form"
                disabled={isSubmitting}
                className="btn-primary px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Kaydediliyor...' : 'Satışı ve Tahsilatı Tamamla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
