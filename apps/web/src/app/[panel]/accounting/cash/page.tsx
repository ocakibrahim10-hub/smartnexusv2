'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Building2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { FormField, FormSelect, FormTextarea } from '@/components/FormField';

const fmt = (n: number) => `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

export default function CashPage() {
  const [tab, setTab] = useState<'cash' | 'bank' | 'flow'>('cash');
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [cashTx, setCashTx] = useState<any[]>([]);
  const [cashSummary, setCashSummary] = useState({ income: 0, expense: 0, net: 0 });
  const [bankTx, setBankTx] = useState<any[]>([]);
  const [dailyFlow, setDailyFlow] = useState<any[]>([]);
  const [selectedCash, setSelectedCash] = useState<any>(null);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [showNewTx, setShowNewTx] = useState(false);
  const [showBankTx, setShowBankTx] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [txForm, setTxForm] = useState({
    type: 'INCOME',
    amount: '',
    description: '',
    reference: '',
  });
  const [bankTxForm, setBankTxForm] = useState({
    type: 'INCOME',
    amount: '',
    description: '',
    reference: '',
    checkNo: '',
    dueDate: '',
    isCheck: false,
  });
  const [transferForm, setTransferForm] = useState({
    fromType: 'CASH',
    fromId: '',
    toType: 'BANK',
    toId: '',
    amount: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const loadAccounts = useCallback(async () => {
    const [ca, ba, cf] = await Promise.all([
      api.get('/cash/accounts').then((r) => r.data),
      api.get('/cash/bank-accounts').then((r) => r.data),
      api.get('/cash/flow', { params: { days: 30 } }).then((r) => r.data),
    ]);
    setCashAccounts(ca);
    setBankAccounts(ba);
    setDailyFlow(cf.daily || []);
    return { ca, ba };
  }, []);

  const loadCashTx = useCallback(async (accountId: string) => {
    const r = await api.get(`/cash/accounts/${accountId}/transactions`);
    setCashTx(r.data.data || []);
    setCashSummary({
      income: r.data.income || 0,
      expense: r.data.expense || 0,
      net: r.data.net || 0,
    });
  }, []);

  const loadBankTx = useCallback(async (accountId: string) => {
    const r = await api.get(`/cash/bank-accounts/${accountId}/transactions`);
    setBankTx(r.data.data || []);
  }, []);

  useEffect(() => {
    loadAccounts().then(({ ca, ba }) => {
      if (ca.length > 0 && !selectedCash) setSelectedCash(ca[0]);
      if (ba.length > 0 && !selectedBank) setSelectedBank(ba[0]);
    });
  }, [loadAccounts]);

  useEffect(() => {
    if (selectedCash) loadCashTx(selectedCash.id);
  }, [selectedCash, loadCashTx]);
  useEffect(() => {
    if (selectedBank) loadBankTx(selectedBank.id);
  }, [selectedBank, loadBankTx]);

  const refresh = async () => {
    const { ca, ba } = await loadAccounts();
    if (selectedCash) await loadCashTx(selectedCash.id);
    else if (ca[0]) await loadCashTx(ca[0].id);
    if (selectedBank) await loadBankTx(selectedBank.id);
    else if (ba[0]) await loadBankTx(ba[0].id);
  };

  const addCashTransaction = async () => {
    if (!selectedCash || !txForm.amount) return;
    setSaving(true);
    try {
      await api.post(`/cash/accounts/${selectedCash.id}/transactions`, {
        type: txForm.type,
        amount: parseFloat(txForm.amount),
        description:
          txForm.description || (txForm.type === 'INCOME' ? 'Kasa geliri' : 'Kasa gideri'),
        reference: txForm.reference || undefined,
      });
      setShowNewTx(false);
      setTxForm({ type: 'INCOME', amount: '', description: '', reference: '' });
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const importBankStatement = async () => {
    if (!selectedBank || !importText.trim()) return;
    setSaving(true);
    try {
      const lines = importText
        .trim()
        .split('\n')
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => {
          const parts = row.split(/[;\t,]/).map((p) => p.trim());
          const amount = parseFloat((parts[2] || parts[1] || '0').replace(',', '.'));
          return {
            date: parts[0]?.match(/\d/) ? parts[0] : undefined,
            description: parts[1] || parts[0] || 'Ekstre',
            amount,
            reference: parts[3],
          };
        })
        .filter((l) => !Number.isNaN(l.amount) && l.amount !== 0);

      const res = await api.post(`/cash/bank-accounts/${selectedBank.id}/import-statement`, {
        lines,
      });
      setShowImport(false);
      setImportText('');
      toast.success(`İçe aktarıldı: ${res.data.imported}, atlandı: ${res.data.skipped}`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'İçe aktarma hatası');
    } finally {
      setSaving(false);
    }
  };

  const syncOpenBanking = async () => {
    if (!selectedBank) return;
    setSaving(true);
    try {
      const res = await api.post(`/cash/bank-accounts/${selectedBank.id}/sync-open-banking`, {});
      toast.success(`Open Banking: ${res.data.imported} hareket içe aktarıldı`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Open Banking senkron hatası');
    } finally {
      setSaving(false);
    }
  };

  const addBankTransaction = async () => {
    if (!selectedBank || !bankTxForm.amount) return;
    setSaving(true);
    try {
      await api.post(`/cash/bank-accounts/${selectedBank.id}/transactions`, {
        type: bankTxForm.type,
        amount: parseFloat(bankTxForm.amount),
        description:
          bankTxForm.description ||
          (bankTxForm.type === 'INCOME' ? 'Banka geliri' : 'Banka gideri'),
        reference: bankTxForm.reference || undefined,
        checkNo: bankTxForm.isCheck ? bankTxForm.checkNo : undefined,
        checkStatus: bankTxForm.isCheck ? 'PENDING' : undefined,
        dueDate: bankTxForm.isCheck && bankTxForm.dueDate ? bankTxForm.dueDate : undefined,
      });
      setShowBankTx(false);
      setBankTxForm({
        type: 'INCOME',
        amount: '',
        description: '',
        reference: '',
        checkNo: '',
        dueDate: '',
        isCheck: false,
      });
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const doTransfer = async () => {
    if (!transferForm.amount) return;
    setSaving(true);
    try {
      await api.post('/cash/transfer', {
        ...transferForm,
        amount: parseFloat(transferForm.amount),
      });
      setShowTransfer(false);
      await refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const totalCash = cashAccounts.reduce((s, a) => s + a.balance, 0);
  const totalBank = bankAccounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Kasa & Banka</h1>
        <p className="text-sm text-gray-500">
          Günlük gelir/gider kaydı · POS satışları otomatik işlenir
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-sm text-gray-500">Toplam Kasa</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{fmt(totalCash)}</div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-sm text-gray-500">Toplam Banka</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{fmt(totalBank)}</div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-sm text-gray-500">Genel Toplam</div>
          </div>
          <div className="text-2xl font-bold text-brand-600">{fmt(totalCash + totalBank)}</div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'cash', label: 'Kasa' },
          { key: 'bank', label: 'Banka' },
          { key: 'flow', label: 'Günlük Akış' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cash' && (
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0 space-y-2">
            {cashAccounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedCash(a)}
                className={`w-full p-4 rounded-xl border text-left ${selectedCash?.id === a.id ? 'border-brand-300 bg-indigo-50' : 'bg-white border-gray-100'}`}
              >
                <div className="text-sm font-semibold">{a.name}</div>
                <div className="text-lg font-bold text-emerald-600">{fmt(a.balance)}</div>
              </button>
            ))}
          </div>
          {selectedCash && (
            <div className="flex-1 card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold">{selectedCash.name}</h3>
                  <div className="flex gap-4 text-xs mt-1">
                    <span className="text-emerald-600">Gelir: {fmt(cashSummary.income)}</span>
                    <span className="text-red-500">Gider: {fmt(cashSummary.expense)}</span>
                    <span className="text-gray-500">Net: {fmt(cashSummary.net)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTransfer(true)}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Virman
                  </button>
                  <button
                    onClick={() => setShowNewTx(true)}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Gelir / Gider
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                {cashTx.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    Henüz hareket yok — Gelir/Gider ile kayıt ekleyin
                  </div>
                ) : (
                  cashTx.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'INCOME' ? 'bg-emerald-50' : 'bg-red-50'}`}
                      >
                        {t.type === 'INCOME' ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{t.description || '—'}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(t.createdAt).toLocaleString('tr-TR')}
                          {t.contact?.name ? ` · ${t.contact.name}` : ''}
                          {t.reference ? ` · ${t.reference}` : ''}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}
                      >
                        {t.type === 'INCOME' ? '+' : '-'}
                        {fmt(t.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'bank' && (
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0 space-y-2">
            {bankAccounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedBank(a)}
                className={`w-full p-4 rounded-xl border text-left ${selectedBank?.id === a.id ? 'border-brand-300 bg-indigo-50' : 'bg-white border-gray-100'}`}
              >
                <div className="text-sm font-semibold">{a.name}</div>
                {a.bankName && <div className="text-xs text-gray-400">{a.bankName}</div>}
                <div className="text-lg font-bold text-blue-600">{fmt(a.balance)}</div>
              </button>
            ))}
          </div>
          {selectedBank && (
            <div className="flex-1 card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold">{selectedBank.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImport(true)}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Ekstre İçe Aktar
                  </button>
                  <button
                    onClick={syncOpenBanking}
                    disabled={saving}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Open Banking Sync
                  </button>
                  <button
                    onClick={() => setShowBankTx(true)}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                  <Plus className="w-3.5 h-3.5" />
                  İşlem / Çek
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                {bankTx.length === 0 ? (
                  <div className="p-8 text-center"><p className="text-gray-500 text-sm font-medium">Hareket bulunamadı</p><p className="text-gray-400 text-xs mt-1">Bu dönem için kayıt bulunmuyor.</p></div>
                ) : (
                  bankTx.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'INCOME' ? 'bg-emerald-50' : 'bg-red-50'}`}
                      >
                        {t.type === 'INCOME' ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{t.description || '—'}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(t.createdAt).toLocaleString('tr-TR')}
                          {t.checkNo ? ` · Çek: ${t.checkNo}` : ''}
                          {t.dueDate
                            ? ` · Vade: ${new Date(t.dueDate).toLocaleDateString('tr-TR')}`
                            : ''}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}
                      >
                        {t.type === 'INCOME' ? '+' : '-'}
                        {fmt(t.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'flow' && (
        <div className="card p-6">
          <h3 className="font-bold mb-4">Son 30 Gün Kasa Giriş / Çıkış</h3>
          {dailyFlow.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Gelir"
                    stroke="#10b981"
                    fill="#10b98122"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Gider"
                    stroke="#ef4444"
                    fill="#ef444422"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-xs text-gray-400">Tarih</th>
                    <th className="text-right text-xs text-emerald-600">Gelir</th>
                    <th className="text-right text-xs text-red-500">Gider</th>
                    <th className="text-right text-xs text-gray-500">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {[...dailyFlow]
                    .reverse()
                    .slice(0, 14)
                    .map((d: any, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2">{d.date}</td>
                        <td className="py-2 text-right text-emerald-600">{fmt(d.income || 0)}</td>
                        <td className="py-2 text-right text-red-500">{fmt(d.expense || 0)}</td>
                        <td
                          className={`py-2 text-right font-medium ${d.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {fmt(d.net || 0)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="text-center text-gray-400 py-12">Henüz günlük hareket yok</div>
          )}
        </div>
      )}

      {showNewTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">Kasa — Gelir / Gider</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                {['INCOME', 'EXPENSE'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTxForm({ ...txForm, type: t })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium ${txForm.type === t ? (t === 'INCOME' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100'}`}
                  >
                    {t === 'INCOME' ? '↑ Gelir' : '↓ Gider'}
                  </button>
                ))}
              </div>
              <FormField
                label="Tutar (₺)"
                type="number"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                className="input"
                placeholder="Tutar (₺)"
                min="0.01"
                step="0.01"
              />
              <FormField
                label="Açıklama"
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                className="input"
                placeholder="Açıklama (ör: kira, elektrik, tahsilat)"
              />
              <FormField
                label="Referans (opsiyonel)"
                value={txForm.reference}
                onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })}
                className="input"
                placeholder="Referans (opsiyonel)"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNewTx(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={addCashTransaction}
                disabled={!txForm.amount || saving}
                className="btn-primary flex-1"
              >
                {saving ? '...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBankTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">Banka İşlemi</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                {['INCOME', 'EXPENSE'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setBankTxForm({ ...bankTxForm, type: t })}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium ${bankTxForm.type === t ? (t === 'INCOME' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100'}`}
                  >
                    {t === 'INCOME' ? 'Gelir' : 'Gider'}
                  </button>
                ))}
              </div>
              <FormField
                label="Tutar"
                type="number"
                value={bankTxForm.amount}
                onChange={(e) => setBankTxForm({ ...bankTxForm, amount: e.target.value })}
                className="input"
                placeholder="Tutar"
              />
              <FormField
                label="Açıklama"
                value={bankTxForm.description}
                onChange={(e) => setBankTxForm({ ...bankTxForm, description: e.target.value })}
                className="input"
                placeholder="Açıklama"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={bankTxForm.isCheck}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, isCheck: e.target.checked })}
                  className="accent-brand-500"
                />
                Çek ile işlem
              </label>
              {bankTxForm.isCheck && (
                <>
                  <FormField
                    label="Çek numarası"
                    value={bankTxForm.checkNo}
                    onChange={(e) => setBankTxForm({ ...bankTxForm, checkNo: e.target.value })}
                    className="input"
                    placeholder="Çek numarası"
                  />
                  <FormField
                    label="Vade tarihi"
                    type="date"
                    value={bankTxForm.dueDate}
                    onChange={(e) => setBankTxForm({ ...bankTxForm, dueDate: e.target.value })}
                    className="input"
                  />
                </>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowBankTx(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={addBankTransaction}
                disabled={!bankTxForm.amount || saving}
                className="btn-primary flex-1"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-4">Virman</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <FormSelect
                  label="Kaynak türü"
                  hideLabel
                  value={transferForm.fromType}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, fromType: e.target.value, fromId: '' })
                  }
                  className="input w-24"
                >
                  <option value="CASH">Kasa</option>
                  <option value="BANK">Banka</option>
                </FormSelect>
                <FormSelect
                  label="Kaynak hesap"
                  hideLabel
                  value={transferForm.fromId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromId: e.target.value })}
                  className="input flex-1"
                >
                  <option value="">Kaynak</option>
                  {(transferForm.fromType === 'CASH' ? cashAccounts : bankAccounts).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex gap-2">
                <FormSelect
                  label="Hedef türü"
                  hideLabel
                  value={transferForm.toType}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, toType: e.target.value, toId: '' })
                  }
                  className="input w-24"
                >
                  <option value="BANK">Banka</option>
                  <option value="CASH">Kasa</option>
                </FormSelect>
                <FormSelect
                  label="Hedef hesap"
                  hideLabel
                  value={transferForm.toId}
                  onChange={(e) => setTransferForm({ ...transferForm, toId: e.target.value })}
                  className="input flex-1"
                >
                  <option value="">Hedef</option>
                  {(transferForm.toType === 'CASH' ? cashAccounts : bankAccounts).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <FormField
                label="Tutar"
                type="number"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className="input"
                placeholder="Tutar"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowTransfer(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={doTransfer}
                disabled={
                  !transferForm.fromId || !transferForm.toId || !transferForm.amount || saving
                }
                className="btn-primary flex-1"
              >
                Virman
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && selectedBank && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="modal-card w-full max-w-lg p-6">
            <h2 className="text-lg font-bold mb-2">Banka Ekstresi İçe Aktar</h2>
            <p className="text-sm text-gray-500 mb-3">
              Her satır: tarih; açıklama; tutar (virgül veya nokta). Open Banking öncesi CSV yapıştırma.
            </p>
            <FormTextarea
              label="Banka ekstresi"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="input w-full h-40 font-mono text-sm"
              placeholder={'2026-06-01; Havale gelen; 1500,00\n2026-06-02; EFT giden; -320,50'}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowImport(false)} className="btn-secondary flex-1">
                İptal
              </button>
              <button
                onClick={importBankStatement}
                disabled={saving || !importText.trim()}
                className="btn-primary flex-1"
              >
                İçe Aktar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
