'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Download, FileText, BarChart2, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { FormField } from '@/components/FormField';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('babs');
  
  // Date states
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [data, setData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    setData(null);
    try {
      if (reportType === 'babs') {
        const res = await api.get('/ledger/babs', { params: { year, month } });
        setData(res.data);
      } else if (reportType === 'tax') {
        const res = await api.get('/ledger/tax-report', { params: { startDate, endDate } });
        setData(res.data);
      } else if (reportType === 'income') {
        const res = await api.get('/ledger/income-statement', { params: { startDate, endDate } });
        setData(res.data);
      } else if (reportType === 'close') {
        const res = await api.post('/ledger/close-period', { endDate });
        toast.success(res.data.message);
        setData(res.data);
      }
    } catch (err: any) {
      toast.error('Rapor alınırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const renderBaBs = () => {
    if (!data) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-lg text-indigo-600 border-b pb-2 mb-3">Form BA (Mal ve Hizmet Alımları)</h3>
          {data.ba.length === 0 ? <p className="text-gray-500 text-sm">Limit aşan alım faturası bulunamadı.</p> : (
            <table className="w-full text-sm text-left">
              <thead><tr className="border-b"><th className="py-2">Vergi Kimlik</th><th className="py-2">Unvan</th><th className="py-2">Belge</th><th className="py-2 text-right">Tutar</th></tr></thead>
              <tbody>
                {data.ba.map((r: any) => (
                  <tr key={r.taxNumber} className="border-b border-gray-50"><td className="py-2">{r.taxNumber}</td><td className="py-2">{r.name}</td><td className="py-2">{r.documentCount}</td><td className="py-2 text-right">{r.totalAmount.toLocaleString('tr-TR')} ₺</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <h3 className="font-semibold text-lg text-indigo-600 border-b pb-2 mb-3">Form BS (Mal ve Hizmet Satışları)</h3>
          {data.bs.length === 0 ? <p className="text-gray-500 text-sm">Limit aşan satış faturası bulunamadı.</p> : (
            <table className="w-full text-sm text-left">
              <thead><tr className="border-b"><th className="py-2">Vergi Kimlik</th><th className="py-2">Unvan</th><th className="py-2">Belge</th><th className="py-2 text-right">Tutar</th></tr></thead>
              <tbody>
                {data.bs.map((r: any) => (
                  <tr key={r.taxNumber} className="border-b border-gray-50"><td className="py-2">{r.taxNumber}</td><td className="py-2">{r.name}</td><td className="py-2">{r.documentCount}</td><td className="py-2 text-right">{r.totalAmount.toLocaleString('tr-TR')} ₺</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderTax = () => {
    if (!data) return null;
    return (
      <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200 w-full max-w-2xl mx-auto">
        <h3 className="font-semibold text-lg text-gray-900 border-b pb-3 mb-4 flex items-center justify-between">
          <span>KDV Beyannamesi Özeti</span>
          <span className="text-sm font-normal text-gray-500">{data.period.startDate} - {data.period.endDate}</span>
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-gray-600">İndirilecek KDV (191)</span>
            <span className="font-medium text-blue-600">{data.vat.indirilecekKdv.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-gray-600">Hesaplanan KDV (391)</span>
            <span className="font-medium text-blue-600">{data.vat.hesaplananKdv.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg mt-4">
            <span className="font-semibold text-gray-900">Ödenecek KDV</span>
            <span className="font-bold text-red-600">{data.vat.odenecekKdv.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg">
            <span className="font-semibold text-gray-900">Sonraki Döneme Devreden KDV</span>
            <span className="font-bold text-green-600">{data.vat.devredenKdv.toLocaleString('tr-TR')} ₺</span>
          </div>
        </div>
      </div>
    );
  };

  const renderIncome = () => {
    if (!data) return null;
    return (
      <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200 w-full max-w-3xl mx-auto">
        <h3 className="font-semibold text-lg text-gray-900 border-b pb-3 mb-4">Gelir Tablosu Özeti</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2"><span className="text-gray-600">Brüt Satışlar</span><span className="font-medium">{data.summary.revenue.toLocaleString('tr-TR')} ₺</span></div>
          <div className="flex justify-between items-center py-2 text-red-600"><span className="">Satış İndirimleri / İadeler</span><span>- {data.summary.returns.toLocaleString('tr-TR')} ₺</span></div>
          <div className="flex justify-between items-center py-2 font-semibold border-t"><span className="text-gray-900">Net Satışlar</span><span>{data.summary.netSales.toLocaleString('tr-TR')} ₺</span></div>
          
          <div className="flex justify-between items-center py-2 mt-4 text-red-600"><span className="">Satışların Maliyeti (SMM)</span><span>- {data.summary.cogs.toLocaleString('tr-TR')} ₺</span></div>
          <div className="flex justify-between items-center py-2 font-semibold border-t"><span className="text-gray-900">Brüt Satış Karı/Zararı</span><span>{data.summary.grossProfit.toLocaleString('tr-TR')} ₺</span></div>
          
          <div className="flex justify-between items-center py-2 mt-4 text-red-600"><span className="">Faaliyet Giderleri</span><span>- {data.summary.operatingExpenses.toLocaleString('tr-TR')} ₺</span></div>
          <div className="flex justify-between items-center py-2 font-semibold border-t"><span className="text-gray-900">Faaliyet Karı/Zararı</span><span>{data.summary.operatingProfit.toLocaleString('tr-TR')} ₺</span></div>
          
          <div className="flex justify-between items-center py-3 bg-indigo-50 px-4 rounded-lg mt-6 border border-indigo-100">
            <span className="font-bold text-indigo-900">DÖNEM NET KARI / ZARARI</span>
            <span className="font-bold text-indigo-700">{data.summary.netIncome.toLocaleString('tr-TR')} ₺</span>
          </div>
        </div>
      </div>
    );
  };

  const renderClose = () => {
    if (!data) return null;
    return (
      <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200 max-w-lg mx-auto text-center">
        {data.success ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Dönem Kapanışı Tamamlandı</h3>
            <p className="text-gray-500 mb-4">Belirtilen tarihe kadar olan tüm gelir ve gider (6xx) hesapları kapatılarak dönem net kar/zarar hesabına devredildi.</p>
            <div className="bg-gray-50 p-4 rounded-lg font-medium text-lg">
              Net Gelir/Gider Etkisi: <span className={data.netIncome > 0 ? 'text-green-600' : 'text-red-600'}>{data.netIncome.toLocaleString('tr-TR')} ₺</span>
            </div>
          </>
        ) : (
          <p className="text-red-500">{data.message}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">İleri Düzey Mali Raporlar</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 border-r border-gray-100 pr-6 space-y-2">
            {[
              { id: 'babs', name: 'BA / BS Formları', icon: FileText },
              { id: 'tax', name: 'KDV Beyannamesi', icon: BarChart2 },
              { id: 'income', name: 'Gelir Tablosu', icon: BarChart2 },
              { id: 'close', name: 'Dönem Sonu Kapanış', icon: CheckCircle2 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setReportType(tab.id); setData(null); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  reportType === tab.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className={`w-5 h-5 ${reportType === tab.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                  {tab.name}
                </div>
                {reportType === tab.id && <ArrowRight className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <div className="col-span-3">
            <div className="bg-gray-50 p-4 rounded-xl mb-6">
              <h3 className="font-medium text-gray-900 mb-4">Rapor Parametreleri</h3>
              <div className="flex items-end gap-4">
                {reportType === 'babs' ? (
                  <>
                    <FormField label="Yıl" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                    <FormField label="Ay" type="number" value={month} onChange={(e) => setMonth(e.target.value)} min="1" max="12" />
                  </>
                ) : reportType === 'close' ? (
                  <FormField label="Kapanış Tarihi" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                ) : (
                  <>
                    <FormField label="Başlangıç Tarihi" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <FormField label="Bitiş Tarihi" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </>
                )}
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 h-[42px]"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Oluştur / Çalıştır
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20 text-indigo-600">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
            ) : (
              <div>
                {reportType === 'babs' && renderBaBs()}
                {reportType === 'tax' && renderTax()}
                {reportType === 'income' && renderIncome()}
                {reportType === 'close' && renderClose()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
