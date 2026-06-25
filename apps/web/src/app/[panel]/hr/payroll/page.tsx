'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import { Receipt, Play, Calendar, User, Wallet } from 'lucide-react';
import { api } from '@/lib/api';

type PayrollRow = {
  id: string;
  periodMonth: number;
  periodYear: number;
  baseSalary: number;
  netSalary: number;
  status: string;
  contact?: { name?: string };
};

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<PayrollRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; slipId: string; bankId: string }>({
    isOpen: false, slipId: '', bankId: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resPayrolls, resBanks] = await Promise.all([
        api.get('/hr/payroll'),
        api.get('/cash/bank-accounts'),
      ]);
      const rows = Array.isArray(resPayrolls.data) ? resPayrolls.data : resPayrolls.data.items || [];
      setPayrolls(rows);
      setBankAccounts(resBanks.data || []);
    } catch (err: any) {
      toast.error('Bordrolar yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await api.post('/hr/payroll/generate', { month: selectedMonth, year: selectedYear });
      toast.success(`${selectedMonth}/${selectedYear} dönemi maaş tahakkukları oluşturuldu`);
      loadData();
    } catch (err: any) {
      toast.error('Bordro hesaplanırken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePay = async () => {
    if (!paymentModal.bankId) {
      toast.error('Lütfen ödemenin çıkacağı banka hesabını seçin');
      return;
    }
    try {
      await api.post(`/hr/payroll/${paymentModal.slipId}/pay`, { bankAccountId: paymentModal.bankId });
      toast.success('Maaş ödendi. Muhasebe Gider kayıtlarına otomatik işlendi!');
      setPaymentModal({ isOpen: false, slipId: '', bankId: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ödeme yapılamadı');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-600" />
            Bordro ve Maaş Ödemeleri
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Maaş tahakkukları ve Muhasebe/Banka tam entegrasyonu
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
          <select
            id="payroll-month"
            aria-label="Bordro ayı"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-sm font-bold border-none bg-gray-50 rounded-lg px-3 py-1.5 focus:ring-0 cursor-pointer"
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m}. Ay</option>
            ))}
          </select>
          <select
            id="payroll-year"
            aria-label="Bordro yılı"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm font-bold border-none bg-gray-50 rounded-lg px-3 py-1.5 focus:ring-0 cursor-pointer"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2 px-4 py-1.5 bg-brand-600 text-white rounded-lg shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span className="font-bold text-xs">{isGenerating ? 'Hesaplanıyor...' : 'Maaşları Tahakkuk Et'}</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Wallet className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-blue-900">Muhasebe Entegrasyonu Devrede</h3>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            Buradan ödenen her maaş bordrosu, anında şirketinizin <strong>Giderler</strong> tablosuna "Aylık Maaş Gideri" olarak işlenir. 
            Ayrıca seçtiğiniz Banka hesabının bakiyesinden otomatik olarak düşülerek finansal tutarlılık sağlanır.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
           <div className="p-12 text-center text-gray-500 text-sm font-medium">Yükleniyor...</div>
        ) : payrolls.length === 0 ? (
           <div className="p-12 text-center text-gray-500 text-sm font-medium">Henüz oluşturulmuş bordro yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dönem</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Personel</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Brüt / Temel</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Net Ödenecek</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Durum</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payrolls.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-50/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-900">{p.periodMonth} / {p.periodYear}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-brand-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{p.contact?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-semibold text-gray-500">
                        ₺{p.baseSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm font-black text-gray-900">
                        ₺{p.netSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.status === 'PAID' ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700 uppercase">Ödendi</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-100 text-amber-700 uppercase">Tahakkuk / Bekliyor</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status !== 'PAID' && (
                        <button
                          onClick={() => setPaymentModal({ isOpen: true, slipId: p.id, bankId: '' })}
                          className="text-xs font-bold bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors"
                        >
                          Ödeme Yap
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900">Maaş Ödemesi</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-600 font-medium">
                Bu maaş ödemesi seçtiğiniz banka hesabından düşülecek ve Muhasebe Giderlerine işlenecektir.
              </p>
              <div>
                <label htmlFor="payroll-bank-account" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Banka Hesabı Seçin</label>
                <select
                  id="payroll-bank-account"
                  aria-label="Maaş ödeme banka hesabı"
                  className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-gray-50"
                  value={paymentModal.bankId}
                  onChange={(e) => setPaymentModal({ ...paymentModal, bankId: e.target.value })}
                >
                  <option value="">Banka Seçin...</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setPaymentModal({ isOpen: false, slipId: '', bankId: '' })}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900"
              >
                İptal
              </button>
              <button
                onClick={handlePay}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-brand-600 transition-colors"
              >
                Ödemeyi Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
