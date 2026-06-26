'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Power, 
  Users, 
  ChevronLeft,
  Save,
  Plus,
  Package,
  TrendingUp,
  ArrowRightLeft
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { FormField, FormSelect } from '@/components/FormField';
import { tenantsApi, inventoryApi } from '@/lib/api';

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const panel = params?.panel || 'isletme';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branch, setBranch] = useState<any>(null);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  
  const [form, setForm] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    email: ''
  });

  // Modals state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [parentProducts, setParentProducts] = useState<any[]>([]);

  // Add User Form
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'MANAGER' // Default to Branch Manager
  });

  // Transfer Form
  const [transferForm, setTransferForm] = useState({
    productId: '',
    quantity: 1,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [data, inv] = await Promise.all([
        tenantsApi.getTenant(id),
        tenantsApi.getTenantInventory(id).catch(() => null)
      ]);
      setBranch(data);
      if (inv) setInventoryStats(inv);
      setForm({
        name: data.name || '',
        city: data.city || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || ''
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const saveChanges = async () => {
    setSaving(true);
    try {
      await tenantsApi.updateTenant(id, form);
      await fetchData();
      alert('Şube bilgileri başarıyla güncellendi.');
    } catch (err) {
      alert('Güncelleme sırasında hata oluştu.');
    }
    setSaving(false);
  };

  const toggleActive = async () => {
    if (!branch) return;
    try {
      await tenantsApi.updateTenantStatus(id, { isActive: !branch.isActive });
      fetchData();
    } catch (err) {
      alert('Durum güncellenemedi.');
    }
  };

  const handleAddUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.role) return;
    try {
      await tenantsApi.createTenantUser(id, userForm);
      setShowAddUserModal(false);
      setUserForm({ name: '', email: '', password: '', phone: '', role: 'MANAGER' });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Personel eklenemedi.');
    }
  };

  const openTransferModal = async () => {
    try {
      const res = await inventoryApi.getDashboard();
      // Filter out stock items with zero quantity, getting unique products
      const p = res.data
        .filter((item: any) => item.quantity > 0)
        .map((item: any) => ({
          id: item.product.id || item.productId,
          name: item.product.name,
          unit: item.product.unit,
          currentStock: item.quantity
        }));
      
      // Remove duplicates
      const unique = Array.from(new Map(p.map((item: any) => [item.id, item])).values());
      setParentProducts(unique);
      setShowTransferModal(true);
    } catch (err) {
      alert('Ana depo ürünleri alınamadı.');
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.productId || transferForm.quantity <= 0) return;
    try {
      await inventoryApi.createTransfer({
        toTenantId: id,
        lines: [
          {
            productId: transferForm.productId,
            quantity: Number(transferForm.quantity)
          }
        ]
      });
      setShowTransferModal(false);
      setTransferForm({ productId: '', quantity: 1 });
      fetchData(); // Refresh branch inventory
      alert('Stok transferi başarıyla gerçekleşti!');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Transfer başarısız.');
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="Şube Detayları" />
        <div className="p-6 text-center text-gray-400">Yükleniyor...</div>
      </>
    );
  }

  if (!branch) {
    return (
      <>
        <TopBar title="Şube Detayları" />
        <div className="p-6 text-center text-gray-400">Şube bulunamadı veya erişim yetkiniz yok.</div>
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar 
        title={branch.name} 
        subtitle="Şube profil bilgileri, personel ve stok yönetimi" 
      />
      
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        <button 
          onClick={() => router.push(`/${panel}/branches`)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={16} /> Şubelere Dön
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sol Kolon: Bilgiler & Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Temel Bilgiler</h2>
                <button 
                  onClick={toggleActive}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    branch.isActive 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {branch.isActive ? 'Durum: Aktif' : 'Durum: Pasif'}
                </button>
              </div>
              
              <div className="space-y-4">
                <FormField 
                  label="Şube Adı" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="input w-full"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField 
                    label="Şehir" 
                    value={form.city} 
                    onChange={e => setForm({...form, city: e.target.value})} 
                    className="input w-full"
                  />
                  <FormField 
                    label="Telefon" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})} 
                    className="input w-full"
                  />
                </div>
                
                <FormField 
                  label="E-posta" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})} 
                  className="input w-full"
                  type="email"
                />
                
                <FormField 
                  label="Adres" 
                  value={form.address} 
                  onChange={e => setForm({...form, address: e.target.value})} 
                  className="input w-full"
                />
                
                <div className="flex justify-end pt-4">
                  <button 
                    onClick={saveChanges} 
                    disabled={saving} 
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save size={16} /> {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </div>
            </div>

            {/* Şube Stok Paneli */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package size={20} className="text-indigo-500" /> Şube Stok Özeti
                </h2>
                <button 
                  onClick={openTransferModal}
                  className="btn-secondary text-xs flex items-center gap-2"
                >
                  <ArrowRightLeft size={14} /> Merkezden Transfer Et
                </button>
              </div>

              {inventoryStats ? (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-500 font-medium">Toplam Stok Kalemi</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{inventoryStats.data?.length || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-500 font-medium">Son Hareketler</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{inventoryStats.total || 0}</p>
                    </div>
                  </div>

                  {inventoryStats.data && inventoryStats.data.length > 0 ? (
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="p-3 font-semibold text-gray-600">Ürün</th>
                            <th className="p-3 font-semibold text-gray-600">Mevcut Miktar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryStats.data.slice(0, 5).map((item: any, i: number) => (
                            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                              <td className="p-3 text-gray-900">{item.product?.name || 'Bilinmiyor'}</td>
                              <td className="p-3">
                                <span className="font-medium">{item.quantity}</span> 
                                <span className="text-gray-400 text-xs ml-1">{item.product?.unit}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {inventoryStats.data.length > 5 && (
                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                          Son 5 kalem listeleniyor.
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Şubede henüz stok bulunmuyor.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Stok modülü bilgisine ulaşılamadı.</p>
              )}
            </div>
          </div>

          {/* Sağ Kolon: Kullanıcılar */}
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={16} className="text-gray-400" /> Şube Personeli
                </h3>
                <button 
                  onClick={() => setShowAddUserModal(true)}
                  className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium px-2 py-1 rounded flex items-center gap-1 transition-colors"
                >
                  <Plus size={14} /> Ekle
                </button>
              </div>
              
              {branch.users && branch.users.length > 0 ? (
                <div className="space-y-4">
                  {branch.users.map((u: any) => (
                    <div key={u.id} className="flex flex-col p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 text-sm">{u.name}</span>
                        <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                          {u.role === 'MANAGER' ? 'Yönetici' : u.role}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Mail size={12} /> {u.email}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Bu şubeye atanmış personel bulunmuyor.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="modal-card w-full max-w-md">
            <h3 className="text-gray-900 font-semibold mb-4 text-lg">Şubeye Personel Ekle</h3>
            <div className="space-y-4">
              <FormField 
                label="Ad Soyad *"
                className="input w-full"
                value={userForm.name}
                onChange={e => setUserForm({...userForm, name: e.target.value})}
              />
              <FormField 
                label="E-posta *"
                type="email"
                className="input w-full"
                value={userForm.email}
                onChange={e => setUserForm({...userForm, email: e.target.value})}
              />
              <FormField 
                label="Şifre (Boş bırakılırsa otomatik atanır)"
                type="password"
                className="input w-full"
                value={userForm.password}
                onChange={e => setUserForm({...userForm, password: e.target.value})}
              />
              <FormField 
                label="Telefon"
                className="input w-full"
                value={userForm.phone}
                onChange={e => setUserForm({...userForm, phone: e.target.value})}
              />
              <FormSelect
                label="Rol / Yetki"
                className="input w-full"
                value={userForm.role}
                onChange={e => setUserForm({...userForm, role: e.target.value})}
              >
                <option value="MANAGER">Şube Yöneticisi</option>
                <option value="CASHIER">Kasiyer</option>
                <option value="STAFF">Personel</option>
              </FormSelect>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setShowAddUserModal(false)}>İptal</button>
              <button className="btn-primary flex-1" onClick={handleAddUser} disabled={!userForm.name || !userForm.email}>
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="modal-card w-full max-w-md">
            <h3 className="text-gray-900 font-semibold mb-4 text-lg">Merkezden Şubeye Stok Çıkışı</h3>
            <p className="text-xs text-gray-500 mb-4">
              Ana depo (İşletme) üzerinden bu şubeye stok transferi başlatın. Ürünler ana stoktan düşülüp şubenin stoğuna eklenecektir.
            </p>
            <div className="space-y-4">
              <FormSelect
                label="Ürün Seçin *"
                className="input w-full"
                value={transferForm.productId}
                onChange={e => setTransferForm({...transferForm, productId: e.target.value})}
              >
                <option value="">Seçiniz...</option>
                {parentProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Mevcut: {p.currentStock} {p.unit})
                  </option>
                ))}
              </FormSelect>
              
              <FormField 
                label="Transfer Miktarı *"
                type="number"
                min="1"
                step="any"
                className="input w-full"
                value={transferForm.quantity}
                onChange={e => setTransferForm({...transferForm, quantity: e.target.value as any})}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setShowTransferModal(false)}>İptal</button>
              <button className="btn-primary flex-1" onClick={handleTransfer} disabled={!transferForm.productId || transferForm.quantity <= 0}>
                Transfer Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
