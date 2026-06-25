'use client';

import React, { useEffect, useState } from 'react';
import { crmApi } from '@/lib/api';

export default function CrmLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    source: 'Website',
  });

  const loadData = async () => {
    try {
      const data = await crmApi.getLeads();
      setLeads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmApi.createLead(formData);
      setShowModal(false);
      loadData();
      setFormData({ firstName: '', lastName: '', email: '', phone: '', company: '', source: 'Website' });
    } catch (e) {
      alert('Hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Aday Müşteriler (Leads)</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[var(--theme-primary)] text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"
        >
          + Yeni Aday Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Ad Soyad</th>
              <th className="py-3 px-4">Şirket</th>
              <th className="py-3 px-4">İletişim</th>
              <th className="py-3 px-4">Kaynak</th>
              <th className="py-3 px-4">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">Yükleniyor...</td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">Henüz aday müşteri yok.</td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{l.firstName} {l.lastName}</td>
                  <td className="py-3 px-4 text-gray-600">{l.company || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="text-gray-900">{l.email}</div>
                    <div className="text-gray-500 text-xs">{l.phone}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{l.source}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${l.status === 'NEW' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Aday Müşteri Ekle</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Posta</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kaynak (Source)</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                >
                  <option value="Website">Web Sitesi</option>
                  <option value="Referral">Tavsiye</option>
                  <option value="Cold Call">Soğuk Arama</option>
                  <option value="Social Media">Sosyal Medya</option>
                </select>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-[var(--theme-primary)] text-white py-2 rounded-xl font-medium hover:opacity-90">
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
