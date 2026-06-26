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
  Save
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { FormField } from '@/components/FormField';
import { tenantsApi } from '@/lib/api';

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const panel = params?.panel || 'isletme';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branch, setBranch] = useState<any>(null);
  
  const [form, setForm] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    email: ''
  });

  const fetchBranch = async () => {
    setLoading(true);
    try {
      const data = await tenantsApi.getTenant(id);
      setBranch(data);
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
    if (id) fetchBranch();
  }, [id]);

  const saveChanges = async () => {
    setSaving(true);
    try {
      await tenantsApi.updateTenant(id, form);
      await fetchBranch();
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
      fetchBranch();
    } catch (err) {
      alert('Durum güncellenemedi.');
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
        subtitle="Şube profil bilgileri, personel ve durum yönetimi" 
      />
      
      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        <button 
          onClick={() => router.push(`/${panel}/branches`)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft size={16} /> Şubelere Dön
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Sol Kolon: Bilgiler & Form */}
          <div className="md:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Temel Bilgiler</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${branch.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {branch.isActive ? 'Aktif' : 'Pasif'}
                </span>
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
          </div>

          {/* Sağ Kolon: Durum & Kullanıcılar */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
              
              <button 
                onClick={toggleActive}
                className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors border ${
                  branch.isActive 
                    ? 'border-red-200 text-red-600 hover:bg-red-50' 
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <Power size={16} /> {branch.isActive ? 'Şubeyi Pasife Al' : 'Şubeyi Aktifleştir'}
              </button>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={16} className="text-gray-400" /> Şube Personeli
                </h3>
              </div>
              
              {branch.users && branch.users.length > 0 ? (
                <div className="space-y-4">
                  {branch.users.map((u: any) => (
                    <div key={u.id} className="flex flex-col p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 text-sm">{u.name}</span>
                        <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {u.role}
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
    </div>
  );
}
