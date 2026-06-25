'use client';

import React, { useEffect, useState } from 'react';
import { b2cApi } from '@/lib/api';

const SUPPORTED_PLATFORMS = [
  { id: 'SHOPIFY', name: 'Shopify', icon: '🛍️' },
  { id: 'WOOCOMMERCE', name: 'WooCommerce', icon: '🛒' },
  { id: 'TRENTYOL', name: 'Trendyol', icon: '📦' },
  { id: 'HEPSIBURADA', name: 'Hepsiburada', icon: '🚚' },
];

export default function B2cDashboardPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  
  const [formData, setFormData] = useState({
    apiKey: '',
    apiSecret: '',
    storeUrl: '',
    sellerId: '',
    integrationRef: '',
  });

  const loadData = async () => {
    try {
      const data = await b2cApi.getIntegrations();
      setIntegrations(data);
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
      await b2cApi.setupIntegration(selectedPlatform, formData);
      setShowModal(false);
      loadData();
      setFormData({ apiKey: '', apiSecret: '', storeUrl: '', sellerId: '', integrationRef: '' });
      setSelectedPlatform('');
    } catch (e) {
      alert('Hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">E-Ticaret & Pazaryeri (B2C)</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {SUPPORTED_PLATFORMS.map(platform => {
          const activeInt = integrations.find(i => i.provider === platform.id);
          return (
            <div key={platform.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col items-center justify-center text-center gap-3">
              <div className="text-4xl">{platform.icon}</div>
              <h3 className="font-semibold">{platform.name}</h3>
              {activeInt ? (
                <div className="flex flex-col gap-2 w-full mt-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Bağlı</span>
                  <p className="text-xs text-gray-500 truncate" title={activeInt.config?.storeUrl}>
                    {activeInt.config?.storeUrl || 'Aktif'}
                  </p>
                  <button className="text-xs text-[var(--theme-primary)] border border-[var(--theme-primary)] rounded px-2 py-1 mt-1 hover:bg-gray-50">
                    Ayarları Güncelle
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setSelectedPlatform(platform.id);
                    setShowModal(true);
                  }}
                  className="w-full mt-2 text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 font-medium transition-colors"
                >
                  Bağla
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Son Senkronizasyonlar</h2>
        {integrations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Henüz bağlı bir platformunuz bulunmamaktadır.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="py-2 px-3">Platform</th>
                <th className="py-2 px-3">Durum</th>
                <th className="py-2 px-3">Son İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {integrations.map((i) => (
                <tr key={i.id}>
                  <td className="py-3 px-3 font-medium">{i.provider}</td>
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Aktif
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-500">
                    {i.lastSyncAt ? new Date(i.lastSyncAt).toLocaleString() : 'Henüz senkronize edilmedi'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-lg">{SUPPORTED_PLATFORMS.find(p => p.id === selectedPlatform)?.name} Bağlantısı</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {selectedPlatform === 'TRENTYOL' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cari ID (Satıcı ID)</label>
                    <input
                      type="text"
                      required
                      value={formData.sellerId}
                      onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entegrasyon Referans Kodu</label>
                    <input
                      type="text"
                      required
                      value={formData.integrationRef}
                      onChange={(e) => setFormData({ ...formData, integrationRef: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza URL</label>
                  <input
                    type="url"
                    placeholder="https://magaza-adiniz.myshopify.com"
                    value={formData.storeUrl}
                    onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{selectedPlatform === 'TRENTYOL' ? 'API Key' : 'API Key / Client ID'}</label>
                <input
                  type="text"
                  required
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                <input
                  type="password"
                  required
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
              </div>
              
              <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex gap-2">
                <span className="font-bold">ℹ</span>
                <span>Bağlantı kurulduktan sonra ürün ve siparişleriniz SmartERP ile otomatik olarak senkronize edilecektir. Webhook URL otomatik tanımlanacaktır.</span>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-[var(--theme-primary)] text-white py-2 rounded-xl font-medium hover:opacity-90">
                  Bağlantıyı Kur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
