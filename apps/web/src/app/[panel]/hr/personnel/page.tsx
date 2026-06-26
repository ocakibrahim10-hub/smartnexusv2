'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, Phone, Briefcase, Calendar, ShieldCheck, Mail, Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import { ModuleGuide } from '@/components/ui/ModuleGuide';

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editModal, setEditModal] = useState<{ isOpen: boolean; contactId: string; data: any }>({
    isOpen: false, contactId: '', data: {}
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [deptModal, setDeptModal] = useState(false);
  const [posModal, setPosModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newPosName, setNewPosName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    nationalId: '',
    departmentId: '',
    positionId: '',
    hireDate: '',
    baseSalary: '',
    createLogin: false,
    password: '',
    role: 'STAFF',
    permissions: [] as string[],
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [res, deps, poss] = await Promise.all([
        api.get('/hr/personnel'),
        api.get('/hr/departments'),
        api.get('/hr/positions')
      ]);
      setPersonnel(res.data.items || res.data || []);
      setDepartments(deps.data || []);
      setPositions(poss.data || []);
    } catch (err) {
      toast.error('Personel listesi yüklenemedi');
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
      await api.post('/hr/personnel', formData);
      toast.success('Yeni personel başarıyla eklendi');
      setIsAdding(false);
      setFormData({
        name: '', phone: '', email: '', nationalId: '', departmentId: '', positionId: '', hireDate: '', baseSalary: '',
        createLogin: false, password: '', role: 'STAFF', permissions: []
      });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Personel eklenemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditLogin = (p: any) => {
    const u = p.personnelUser;
    setEditModal({
      isOpen: true,
      contactId: p.id,
      data: {
        email: u?.email || p.email || '',
        password: '',
        role: u?.role || 'STAFF',
        permissions: u?.permissions || [],
      }
    });
  };

  const handleEditLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/hr/personnel/${editModal.contactId}/login`, editModal.data);
      toast.success('Sistem giriş bilgileri güncellendi');
      setEditModal({ isOpen: false, contactId: '', data: {} });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDept = async () => {
    if(!newDeptName.trim()) return;
    try {
      const res = await api.post('/hr/departments', { name: newDeptName });
      setDepartments([...departments, res.data]);
      setFormData({...formData, departmentId: res.data.id});
      setDeptModal(false);
      setNewDeptName('');
    } catch {
      toast.error('Departman eklenemedi');
    }
  };

  const handleAddPos = async () => {
    if(!newPosName.trim()) return;
    try {
      const res = await api.post('/hr/positions', { name: newPosName });
      setPositions([...positions, res.data]);
      setFormData({...formData, positionId: res.data.id});
      setPosModal(false);
      setNewPosName('');
    } catch {
      toast.error('Görev eklenemedi');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <ModuleGuide
        moduleKey="hr_personnel"
        title="Personel Yönetimi"
        description="Şirketinizde çalışan tüm personellerin kayıtlarını, özlük dosyalarını, görev ve departman atamalarını buradan yönetebilirsiniz."
        features={[
          "Personel kartı oluşturma ve düzenleme",
          "Departman ve görev atamaları yapabilme",
          "Maaş, SGK ve izin bilgilerini kayıt altında tutma",
          "Gelişmiş personel arama ve filtreleme"
        ]}
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600" />
            Personel Yönetimi
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Şirket çalışanları, özlük hakları ve görev atamaları</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span className="font-bold text-sm">Yeni Personel</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Yeni Personel Kaydı</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Ad Soyad *</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">T.C. Kimlik</label>
              <input type="text" value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Telefon</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                Departman
                <button type="button" onClick={() => setDeptModal(true)} className="text-brand-600 hover:text-brand-800">
                  <Plus className="w-4 h-4" />
                </button>
              </label>
              <select value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500">
                <option value="">Seçiniz...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                Görev / Ünvan
                <button type="button" onClick={() => setPosModal(true)} className="text-brand-600 hover:text-brand-800">
                  <Plus className="w-4 h-4" />
                </button>
              </label>
              <select value={formData.positionId} onChange={e => setFormData({...formData, positionId: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500">
                <option value="">Seçiniz...</option>
                {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">İşe Giriş Tarihi</label>
              <input type="date" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Temel Net Maaş (₺)</label>
              <input type="number" step="0.01" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" />
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-brand-50/50 rounded-xl border border-brand-100">
                <input 
                  type="checkbox" 
                  checked={formData.createLogin}
                  onChange={(e) => setFormData({...formData, createLogin: e.target.checked})}
                  className="w-5 h-5 text-brand-600 rounded border-brand-300 focus:ring-brand-500"
                />
                <span className="text-sm font-black text-brand-900">Bu Personel İçin Sistem Giriş Hesabı Oluştur</span>
              </label>
            </div>

            {formData.createLogin && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">E-Posta (Giriş ID) *</label>
                  <input type="email" required={formData.createLogin} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" placeholder="personel@firma.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Şifre *</label>
                  <input type="password" required={formData.createLogin} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Yetki Rolü *</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500 font-bold">
                    <option value="STAFF">Standart Personel (STAFF)</option>
                    <option value="MANAGER">Yönetici (MANAGER)</option>
                    <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Modül İzinleri</label>
                  <input type="text" value={formData.permissions.join(',')} onChange={e => setFormData({...formData, permissions: e.target.value.split(',')})} className="w-full text-sm border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:ring-brand-500" placeholder="Örn: TMS.VIEW, WMS.VIEW" />
                </div>
              </>
            )}
            
            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end gap-3 pt-2 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">İptal</button>
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-colors">
                <Save className="w-4 h-4" /> Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-gray-500 text-sm font-medium">Yükleniyor...</div>
        ) : personnel.length === 0 ? (
          <div className="col-span-full p-12 text-center text-gray-500 text-sm font-medium">Kayıtlı personel bulunamadı.</div>
        ) : (
          personnel.map(p => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-50 flex items-start gap-4">
                <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-xl font-black text-brand-600">{p.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-gray-900">{p.name}</h3>
                  <div className="text-xs font-semibold text-brand-600 mt-0.5">{p.personnelProfile?.position?.name || 'Ünvan Belirtilmedi'}</div>
                  <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">
                    {p.personnelProfile?.department?.name || 'Departman Yok'}
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3 flex-1 bg-gray-50/30">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" /> <span className="font-medium">{p.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-gray-400" /> <span className="font-medium">TC: {p.nationalId || '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" /> 
                  <span className="font-medium">Giriş: {p.personnelProfile?.hireDate ? p.personnelProfile.hireDate.substring(0,10) : '-'}</span>
                </div>
              </div>
              
              {/* Sistem Görev Bağlantıları */}
              <div className="px-5 py-3 border-t border-gray-50 bg-brand-50/20 text-[10px] text-brand-700 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Net Maaş: ₺{(p.personnelProfile?.baseSalary || 0).toLocaleString('tr-TR')}</span>
                <span className="text-gray-500">Kalan İzin: {p.personnelProfile?.leaveDaysTotal - p.personnelProfile?.leaveDaysUsed} Gün</span>
              </div>

              {((p.drivenVehicles && p.drivenVehicles.length > 0) || (p.managedWarehouses && p.managedWarehouses.length > 0)) && (
                <div className="px-5 py-3 border-t border-blue-50 bg-blue-50/50">
                  <p className="text-[10px] font-bold text-blue-800 uppercase mb-2">Aktif Sistem Görevleri</p>
                  <div className="flex flex-wrap gap-2">
                    {p.drivenVehicles?.map((v: any) => (
                      <span key={v.id} className="text-[10px] font-bold bg-white border border-blue-100 text-blue-700 px-2 py-1 rounded-md shadow-sm">🚗 Araç: {v.plate}</span>
                    ))}
                    {p.managedWarehouses?.map((w: any) => (
                      <span key={w.id} className="text-[10px] font-bold bg-white border border-blue-100 text-blue-700 px-2 py-1 rounded-md shadow-sm">📦 Depo: {w.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {p.personnelUser ? (
                <div className="px-5 py-3 border-t border-emerald-50 bg-emerald-50/50 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">Sistem Girişi Aktif</p>
                    <p className="text-xs text-emerald-600 font-medium">{p.personnelUser.email} ({p.personnelUser.role})</p>
                  </div>
                  <button onClick={() => openEditLogin(p)} className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900">Düzenle</button>
                </div>
              ) : (
                <div className="px-5 py-3 border-t border-gray-50 bg-gray-50 flex justify-between items-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Sistem Erişimi Yok</p>
                  <button onClick={() => openEditLogin(p)} className="text-xs font-bold text-brand-600 underline hover:text-brand-800">Erişim Ver</button>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900">Sistem Girişi Yönetimi</h3>
              <p className="text-xs text-gray-500 mt-1">Personelin sisteme giriş ayarlarını ve yetkilerini düzenleyin.</p>
            </div>
            <form onSubmit={handleEditLoginSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">E-Posta (Giriş ID)</label>
                <input required type="email" value={editModal.data.email} onChange={e => setEditModal({...editModal, data: {...editModal.data, email: e.target.value}})} className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Şifre (Değiştirmek için yazın)</label>
                <input type="password" value={editModal.data.password} onChange={e => setEditModal({...editModal, data: {...editModal.data, password: e.target.value}})} className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-gray-50" placeholder="********" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Yetki Rolü</label>
                <select value={editModal.data.role} onChange={e => setEditModal({...editModal, data: {...editModal.data, role: e.target.value}})} className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-gray-50 font-bold">
                  <option value="STAFF">Standart Personel (STAFF)</option>
                  <option value="MANAGER">Yönetici (MANAGER)</option>
                  <option value="ADMIN">Sistem Yöneticisi (ADMIN)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Modül İzinleri</label>
                <input type="text" value={editModal.data.permissions.join(',')} onChange={e => setEditModal({...editModal, data: {...editModal.data, permissions: e.target.value.split(',')}})} className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-gray-50" placeholder="Örn: TMS.VIEW, WMS.VIEW" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setEditModal({ isOpen: false, contactId: '', data: {} })} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900">İptal</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-brand-600 transition-colors">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-lg font-black text-gray-900 mb-4">Yeni Departman Ekle</h3>
            <input type="text" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-gray-50 mb-4" placeholder="Departman Adı..." />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeptModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600">İptal</button>
              <button type="button" onClick={handleAddDept} className="px-6 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {posModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-lg font-black text-gray-900 mb-4">Yeni Görev / Ünvan Ekle</h3>
            <input type="text" value={newPosName} onChange={e => setNewPosName(e.target.value)} className="w-full text-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 p-2.5 bg-gray-50 mb-4" placeholder="Görev Adı..." />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setPosModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600">İptal</button>
              <button type="button" onClick={handleAddPos} className="px-6 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold">Kaydet</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
