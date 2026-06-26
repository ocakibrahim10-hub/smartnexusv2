'use client';

import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Phone,
  User,
  TrendingDown,
  X,
  CreditCard,
  FileText,
  Edit2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ListFilter,
  TrendingUp,
  Banknote,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Contact {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  type: string;
  taxNo?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  balance: number;
  creditLimit?: number;
}

interface StatementRow {
  date: string;
  type?: string;
  ref?: string;
  description?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  dueDate?: string;
  status?: string;
  checkNo?: string;
}

interface AgingRow {
  id: string;
  contactId?: string;
  current?: number;
  days30?: number;
  days60?: number;
  days90?: number;
  over90?: number;
  total: number;
}

function normalizeContacts(payload: unknown): Contact[] {
  if (Array.isArray(payload)) return payload as Contact[];
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: Contact[] }).data;
    return Array.isArray(data) ? data : [];
  }
  return [];
}

function calcGlobalStats(all: Contact[]) {
  return {
    receivables: all.filter((c) => c.balance > 0).reduce((s, c) => s + c.balance, 0),
    payables: all.filter((c) => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0),
  };
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

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  APPROVED: 'Bekliyor',
  SENT: 'Gönderildi',
  PAID: 'Ödendi',
  PARTIAL: 'Kısmi Ödenmiş',
  CANCELLED: 'İptal',
  PENDING: 'Tahsilat Bekliyor'
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 border-gray-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  SENT: 'bg-purple-50 text-purple-700 border-purple-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  PENDING: 'bg-orange-50 text-orange-700 border-orange-200'
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [selected, setSelected] = useState<Contact | null>(null);
  
  // Dashboard details
  const [statement, setStatement] = useState<StatementRow[]>([]);
  const [aging, setAging] = useState<AgingRow | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Dropdown ref for click outside
  const searchRef = useRef<HTMLDivElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Tum Liste Popup
  const [showAllList, setShowAllList] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [listSearch, setListSearch] = useState('');

  // Modal
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    type: 'CUSTOMER',
    taxNo: '',
    phone: '',
    email: '',
    address: '',
    city: '',
  });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Global stat mock
  const [globalStats, setGlobalStats] = useState({ receivables: 0, payables: 0 });

  // Quick actions
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [showQuickCollection, setShowQuickCollection] = useState(false);
  const [quickActionSaving, setQuickActionSaving] = useState(false);
  
  const [quickSaleForm, setQuickSaleForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [quickCollectionForm, setQuickCollectionForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
  });

  const [accounts, setAccounts] = useState<{id: string, name: string, type: 'cash'|'bank'}[]>([]);
  
  useEffect(() => {
    Promise.all([
      api.get('/api/cash/accounts'),
      api.get('/api/cash/bank-accounts')
    ]).then(([cashRes, bankRes]) => {
      const mapped = [
        ...(cashRes.data?.data || cashRes.data || []).map((a: any) => ({ ...a, type: 'cash' })),
        ...(bankRes.data?.data || bankRes.data || []).map((a: any) => ({ ...a, type: 'bank' }))
      ];
      setAccounts(mapped);
      if (mapped.length > 0) {
        setQuickCollectionForm(prev => ({ ...prev, accountId: mapped[0].id }));
      }
    }).catch(() => {});
  }, []);

  const handleQuickSale = async () => {
    if (!quickSaleForm.amount || !quickSaleForm.description) return toast.error('Tutar ve açıklama zorunludur.');
    setQuickActionSaving(true);
    try {
      await api.post('/api/invoices', {
        type: 'SALES_INVOICE',
        contactId: selected?.id,
        date: new Date(quickSaleForm.date).toISOString(),
        notes: quickSaleForm.description,
        lines: [
          {
            description: quickSaleForm.description,
            quantity: 1,
            unitPrice: Number(quickSaleForm.amount),
            vatRate: 0
          }
        ]
      });
      toast.success('Hızlı satış kaydedildi');
      setShowQuickSale(false);
      setQuickSaleForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      if (selected) selectContact(selected);
      refreshAllContacts();
    } catch (error) {
      toast.error('Kayıt başarısız oldu');
    } finally {
      setQuickActionSaving(false);
    }
  };

  const handleQuickCollection = async () => {
    if (!quickCollectionForm.amount || !quickCollectionForm.accountId) return toast.error('Tutar ve hesap seçimi zorunludur.');
    setQuickActionSaving(true);
    try {
      const account = accounts.find(a => a.id === quickCollectionForm.accountId);
      const isBank = account?.type === 'bank';
      const endpoint = isBank 
        ? `/api/cash/bank-accounts/${quickCollectionForm.accountId}/transactions`
        : `/api/cash/accounts/${quickCollectionForm.accountId}/transactions`;
      
      await api.post(endpoint, {
        type: 'INCOME',
        amount: Number(quickCollectionForm.amount),
        date: new Date(quickCollectionForm.date).toISOString(),
        description: quickCollectionForm.description || 'Cari Tahsilat',
        contactId: selected?.id
      });
      
      toast.success('Tahsilat kaydedildi');
      setShowQuickCollection(false);
      setQuickCollectionForm(prev => ({ ...prev, amount: '', description: '' }));
      if (selected) selectContact(selected);
      refreshAllContacts();
    } catch (error) {
      toast.error('Kayıt başarısız oldu');
    } finally {
      setQuickActionSaving(false);
    }
  };

  const refreshAllContacts = async () => {
    const r = await api.get('/contacts', { params: { limit: 500 } });
    const all = normalizeContacts(r.data);
    setAllContacts(all);
    setGlobalStats(calcGlobalStats(all));
    return all;
  };

  useEffect(() => {
    refreshAllContacts().catch(() => toast.error('Cari listesi yüklenemedi'));
  }, []);

  const loadSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setContacts([]);
      return;
    }
    setLoading(true);
    try {
      const r = await api.get('/contacts', {
        params: { search: query, limit: 50 },
      });
      setContacts(normalizeContacts(r.data));
      setIsSearchOpen(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search.length >= 2) {
        loadSearch(search);
      } else {
        setContacts([]);
        setIsSearchOpen(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectContact = async (c: Contact) => {
    setSelected(c);
    setIsSearchOpen(false);
    setShowAllList(false); // Popupçı da kapat
    setSearch('');
    setIsLoadingDetails(true);
    try {
      const [stRes, agRes] = await Promise.all([
        api.get(`/contacts/${c.id}/statement`),
        api.get('/contacts/aging'),
      ]);
      const movements: StatementRow[] = stRes.data?.movements || stRes.data?.transactions || [];
      setStatement(Array.isArray(movements) ? movements : []);
      const agingList: AgingRow[] = Array.isArray(agRes.data) ? agRes.data : [];
      setAging(agingList.find((a) => a.id === c.id || a.contactId === c.id) || null);
    } catch {
      toast.error('Cari ekstre bilgisi yüklenemedi');
      setStatement([]);
      setAging(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      await api.delete(`/contacts/${id}`);
      toast.success('Cari başarıyla silindi');
      const nextAll = allContacts.filter((c) => c.id !== id);
      setContacts(contacts.filter((c) => c.id !== id));
      setAllContacts(nextAll);
      setGlobalStats(calcGlobalStats(nextAll));
      if (selected?.id === id) setSelected(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Silme başarısız');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await api.post('/contacts', form);
      toast.success('Cari başarıyla oluşturuldu');
      setShowForm(false);
      setForm({
        name: '',
        contactPerson: '',
        type: 'CUSTOMER',
        taxNo: '',
        phone: '',
        email: '',
        address: '',
        city: '',
      });
      await refreshAllContacts();
      if (r.data) await selectContact(r.data as Contact);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenListModal = () => {
    setShowAllList(true);
    setListSearch('');
  };

  const filteredAllContacts = allContacts.filter(c => 
    c.name.toLowerCase().includes(listSearch.toLowerCase()) || 
    (c.taxNo && c.taxNo.includes(listSearch)) ||
    (c.phone && c.phone.includes(listSearch)) ||
    (c.code && c.code.toLowerCase().includes(listSearch.toLowerCase()))
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 p-6 lg:p-10 relative">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* ÜST BÖLÜM: Sol (Özetler & Buton) / Sağ (Arama) */}
        <div className="flex flex-col xl:flex-row justify-between items-start gap-8">
          
          {/* Sol: Başlık, Özet ve Yeni Cari Butonu */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Cari Hesaplar</h1>
              <div className="hidden md:flex gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 min-w-[150px] shadow-sm">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Toplam Alacak
                  </div>
                  <div className="text-sm font-black text-emerald-700">
                    ₺{globalStats.receivables.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 min-w-[150px] shadow-sm">
                  <div className="text-[10px] font-bold text-red-600 uppercase mb-0.5 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" /> Toplam Borç
                  </div>
                  <div className="text-sm font-black text-red-700">
                    ₺{globalStats.payables.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 shadow-sm font-semibold h-fit"
            >
              <Plus className="w-4 h-4" /> Yeni Cari
            </button>
          </div>

          {/* Sağ: Arama Kutusu ve Liste Butonu */}
          <div className="w-full xl:w-[400px] relative z-30" ref={searchRef}>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-brand-500" /> Hızlı Cari Arama
              </h2>
              <div className="flex gap-2 relative">
                <div className="relative flex-1">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (e.target.value.length > 0) setIsSearchOpen(true);
                    }}
                    onFocus={() => {
                      if (search.length >= 2) setIsSearchOpen(true);
                    }}
                    placeholder="İsim, TC, VN veya Cari Kodu..."
                    aria-label="Cari ara"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-8 pr-3 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-inner"
                  />
                  {loading && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleOpenListModal}
                  title="Tüm Listeyi Göster"
                  className="flex-shrink-0 bg-white border border-gray-200 text-gray-600 rounded-lg px-3 py-2 flex items-center justify-center hover:bg-gray-50 hover:text-brand-600 transition-colors shadow-sm"
                >
                  <ListFilter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Arama Sonuçları Dropdown */}
            {isSearchOpen && search.length >= 2 && (
              <div className="absolute top-full left-0 w-full mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 max-h-[300px] overflow-y-auto z-40">
                {loading ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                          <div className="h-2 bg-gray-100 rounded w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-xs font-medium">
                    Arama kriterlerinize uygun cari bulunamadı.
                  </div>
                ) : (
                  <div className="py-1.5">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectContact(c)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-brand-50/50 transition-colors text-left border-l-2 border-transparent hover:border-brand-500"
                      >
                        <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 shadow-sm flex-shrink-0 text-sm">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{c.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${TYPE_COLORS[c.type]}`}>
                              {TYPE_LABELS[c.type]}
                            </span>
                            <span className="text-[10px] text-gray-500">{c.taxNo || c.phone}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-sm font-bold tracking-tight ${c.balance > 0 ? 'text-emerald-600' : c.balance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            ₺{Math.abs(c.balance).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ALT BÖLÜM: Detaylar */}
        <div className="relative z-10 pt-2">
          {!selected ? (
            <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm p-12 text-center h-[300px]">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-brand-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-2">
                Cari Hesaplar Yönetimi
              </h2>
              <p className="text-gray-500 text-sm max-w-lg leading-relaxed">
                İşlem yapmak veya hesap ekstresini görüntülemek istediğiniz cariyi <strong>sağ üst köşedeki arama çubuğunu</strong> kullanarak anında bulabilirsiniz. Tüm listeyi görmek için arama kutusunun yanındaki liste ikonuna tıklayın.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* VIP Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200 rounded-xl flex items-center justify-center text-2xl font-black text-brand-600 shadow-sm flex-shrink-0">
                      {selected.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                          {selected.name}
                        </h2>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm ${TYPE_COLORS[selected.type]}`}>
                          {TYPE_LABELS[selected.type]}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-1">
                        <div className="text-xs font-medium text-gray-600 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {selected.contactPerson || 'Yetkili Belirtilmedi'}
                        </div>
                        <div className="text-xs font-medium text-gray-600 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {selected.phone || 'Telefon Yok'}
                        </div>
                        <div className="text-xs font-medium text-gray-600 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          VN / TC: <span className="text-gray-900 font-bold">{selected.taxNo || 'Yok'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 w-full lg:w-auto mt-3 lg:mt-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => setShowQuickSale(true)} className="btn-secondary text-[11px] px-3 py-1.5 flex items-center gap-1.5 text-brand-700 font-bold bg-brand-50 border-brand-100 shadow-sm hover:bg-brand-100 rounded-lg transition-colors">
                        <TrendingUp className="w-3.5 h-3.5" /> Hızlı Satış
                      </button>
                      <button onClick={() => setShowQuickCollection(true)} className="btn-secondary text-[11px] px-3 py-1.5 flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 border-emerald-100 shadow-sm hover:bg-emerald-100 rounded-lg transition-colors">
                        <Banknote className="w-3.5 h-3.5" /> Tahsilat Al
                      </button>
                      <button onClick={() => { setForm({ ...selected, contactPerson: selected.contactPerson || '', taxNo: selected.taxNo || '', phone: selected.phone || '', email: selected.email || '', address: selected.address || '', city: selected.city || '' } as any); setShowForm(true); }} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-gray-700 font-semibold bg-white border-gray-200 shadow-sm hover:bg-gray-50 rounded-lg">
                        <Edit2 className="w-3 h-3 text-gray-400" /> Düzenle
                      </button>
                    </div>
                    <div className={`p-3 rounded-xl border min-w-[200px] text-right shadow-sm ${
                      selected.balance > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : selected.balance < 0 ? 'bg-red-50 border-red-100 text-red-900' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}>
                      <div className={`text-[10px] font-bold uppercase mb-0.5 flex items-center justify-end gap-1 ${
                        selected.balance > 0 ? 'text-emerald-600' : selected.balance < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {selected.balance > 0 ? <ArrowUpRight className="w-3 h-3" /> : selected.balance < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                        {selected.balance > 0 ? 'BİZDEN ALACAKLI' : selected.balance < 0 ? 'BİZE BORÇLU' : 'KAPALI BAKİYE'}
                      </div>
                      <div className={`text-xl font-black tracking-tight ${
                        selected.balance > 0 ? 'text-emerald-700' : selected.balance < 0 ? 'text-red-700' : 'text-gray-900'
                      }`}>
                        ₺{Math.abs(selected.balance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Analizi ve Hareket Tablosu */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                
                {/* Risk Analizi */}
                <div className="space-y-4 lg:col-span-1">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4 flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-brand-500" />
                      Risk Analizi
                    </h3>
                    
                    {!aging || aging.total === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Wallet className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-500">Vadesi geçmiş risk yok.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {[
                          { label: '0-30 Gün', value: aging.current || 0, color: 'bg-emerald-500' },
                          { label: '31-60 Gün', value: aging.days30 || 0, color: 'bg-yellow-500' },
                          { label: '61-90 Gün', value: aging.days60 || 0, color: 'bg-orange-500' },
                          { label: '90+ Gün', value: (aging.days90 || 0) + (aging.over90 || 0), color: 'bg-red-500' },
                        ].map((item, idx) => {
                          const percentage = aging.total > 0 ? (item.value / aging.total) * 100 : 0;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-gray-500">{item.label}</span>
                                <span className="text-gray-900">₺{item.value.toLocaleString('tr-TR')}</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-3 border-t border-gray-100 flex justify-between font-bold text-sm">
                          <span className="text-gray-900">Toplam Risk</span>
                          <span className="text-red-600">₺{aging.total.toLocaleString('tr-TR')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hesap Hareketleri Tablosu */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
                  <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-brand-500" />
                      Son İşlemler ve Hareket Ekstresi
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                        <div className="w-3 h-3 rounded bg-red-50 border border-red-200"></div> Vadesi Geçmiş
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                        <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200"></div> Vadesi Yaklaşan (7 Gün)
                      </div>
                      <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-1 rounded-md shadow-sm border border-brand-100 ml-2">
                        {statement.length} İşlem
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-gray-50/30 rounded-b-2xl">
                    {isLoadingDetails ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-3 py-16">
                        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-semibold text-gray-500">Finansal geçmiş taranıyor...</p>
                      </div>
                    ) : statement.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500 py-16">
                        <div className="w-12 h-12 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">Henüz Finansal Hareket Yok</p>
                        <p className="text-xs text-gray-500 mt-1">Bu cariyle ilgili kesilmiş bir fatura, çek veya tahsilat bulunamadı.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-white sticky top-0 border-b border-gray-100 shadow-sm z-10">
                          <tr>
                            <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tarih / Tür</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Açıklama</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Borç (₺)</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Alacak (₺)</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right bg-gray-50/50">Kalan Bakiye (₺)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {statement.map((t, i) => {
                            const debit = Number(t.debit || 0);
                            const credit = Number(t.credit || 0);
                            const running = Number(t.balance ?? 0);
                            
                            const nowTime = new Date().getTime();
                            const dueDateObj = t.dueDate ? new Date(t.dueDate) : null;
                            const isOverdue = t.status !== 'PAID' && dueDateObj && dueDateObj.getTime() < nowTime;
                            const isUpcoming = !isOverdue && t.status !== 'PAID' && dueDateObj && dueDateObj.getTime() <= nowTime + (7 * 24 * 60 * 60 * 1000);
                            
                            let rowBg = 'hover:bg-brand-50/20 transition-colors';
                            if (isOverdue) rowBg = 'bg-red-50/30 hover:bg-red-50/60 transition-colors';
                            else if (isUpcoming) rowBg = 'bg-amber-50/30 hover:bg-amber-50/60 transition-colors';
                            
                            return (
                              <tr key={`${t.ref || t.type}-${t.date}-${i}`} className={rowBg}>
                                <td className="py-3 px-4">
                                  <div className="text-xs font-bold text-gray-900">
                                    {new Date(t.date).toLocaleDateString('tr-TR')}
                                  </div>
                                  <div className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 tracking-wider bg-gray-50 border border-gray-100 inline-block px-1.5 py-0.5 rounded">{t.ref || 'İŞLEM'}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-xs font-medium text-gray-700">{t.description}</div>
                                  {(t.dueDate || t.status || t.checkNo) && (
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      {t.dueDate && (
                                        <span className="text-[9px] font-semibold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                          Vade: {new Date(t.dueDate).toLocaleDateString('tr-TR')}
                                        </span>
                                      )}
                                      {t.checkNo && (
                                        <span className="text-[9px] font-semibold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                          Çek No: {t.checkNo}
                                        </span>
                                      )}
                                      {t.status && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${INVOICE_STATUS_COLORS[t.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                          {INVOICE_STATUS_LABELS[t.status] || t.status}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {debit > 0 ? (
                                    <span className="text-xs font-bold text-red-600">
                                      {debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {credit > 0 ? (
                                    <span className="text-xs font-bold text-emerald-600">
                                      {credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="py-3 px-4 text-right bg-gray-50/30">
                                  <span className={`text-xs font-bold ${running > 0 ? 'text-red-700' : running < 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                                    {Math.abs(running).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* TÜM LİSTE POPUP MODALI */}
      {showAllList && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                  <ListFilter className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">Tüm Cari Hesaplar</h2>
                  <p className="text-xs text-gray-500 font-medium">Sistemdeki tüm kayıtlı cariler ({filteredAllContacts.length})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllList(false)}
                aria-label="Listeyi kapat"
                className="p-2 hover:bg-gray-200 rounded-xl text-gray-500 transition-colors bg-white shadow-sm border border-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Search */}
            <div className="p-5 border-b border-gray-100">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Liste içerisinde cari ara (İsim, Kodu, TC/VN)..."
                  aria-label="Liste içinde cari ara"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all shadow-inner"
                  autoFocus
                />
              </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto p-2 bg-gray-50/30">
              {filteredAllContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Search className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm font-bold">Kayıt Bulunamadı</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                  {filteredAllContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectContact(c)}
                      className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-brand-400 hover:shadow-md transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 flex-shrink-0 text-sm">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">{c.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${TYPE_COLORS[c.type]}`}>
                            {TYPE_LABELS[c.type]}
                          </span>
                          <span className="text-[10px] text-gray-500">{c.taxNo || c.phone}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-black tracking-tight ${c.balance > 0 ? 'text-emerald-600' : c.balance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          ₺{Math.abs(c.balance).toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Yeni Cari Ekleme Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-end z-50">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right border-l border-gray-100">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Yeni Cari Tanımla</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Formu kapat"
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors bg-white shadow-sm border border-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Firma / Ünvan *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full shadow-sm text-sm py-2 font-medium"
                  placeholder="ABC Teknoloji A.Ş."
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Yetkili Kişi</label>
                <input
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  className="input w-full shadow-sm text-sm py-2"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="contact-type" className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Cari Tipi</label>
                  <select
                    id="contact-type"
                    aria-label="Cari tipi"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="input w-full shadow-sm text-sm py-2 font-medium"
                  >
                    <option value="CUSTOMER">Müşteri (Alıcı)</option>
                    <option value="SUPPLIER">Tedarikçi (Satıcı)</option>
                    <option value="BOTH">Her İkisi</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Vergi No / TC</label>
                  <input
                    value={form.taxNo}
                    onChange={(e) => setForm({ ...form, taxNo: e.target.value })}
                    className="input w-full shadow-sm text-sm py-2"
                    placeholder="1111111111"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Telefon</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input w-full shadow-sm text-sm py-2"
                    placeholder="05..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">E-posta</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input w-full shadow-sm text-sm py-2"
                    type="email"
                    placeholder="mail@ornek.com"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50/80">
              <button
                onClick={handleSave}
                disabled={!form.name || saving}
                className="btn-primary w-full py-2.5 text-sm font-bold tracking-wide shadow-sm uppercase"
              >
                {saving ? 'KAYDEDİLİYOR...' : 'CARİYİ KAYDET'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Cari Sil"
        message="Bu cariyi silmek istediğinize emin misiniz? (Geçmiş faturaları varsa sadece arşive kaldırılır)"
        confirmLabel="Sil"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) deleteContact(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}