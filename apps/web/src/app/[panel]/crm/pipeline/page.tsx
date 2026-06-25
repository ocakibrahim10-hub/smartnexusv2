'use client';

import React, { useEffect, useState } from 'react';
import { crmApi } from '@/lib/api';

const STAGES = ['PROSPECTING', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: 'Aday',
  QUALIFIED: 'Nitelikli',
  PROPOSAL: 'Teklif Verildi',
  NEGOTIATION: 'Müzakere',
  CLOSED_WON: 'Kazanıldı',
  CLOSED_LOST: 'Kaybedildi',
};

export default function CrmPipelinePage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    value: 10000,
    stage: 'PROSPECTING',
  });

  const loadData = async () => {
    try {
      const data = await crmApi.getDeals();
      setDeals(data);
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
      await crmApi.createDeal(formData);
      setShowModal(false);
      loadData();
      setFormData({ title: '', value: 10000, stage: 'PROSPECTING' });
    } catch (e) {
      alert('Hata oluştu');
    }
  };

  const updateStage = async (id: string, stage: string) => {
    try {
      await crmApi.updateDealStage(id, stage);
      loadData();
    } catch (e) {
      alert('Hata oluştu');
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Satış Hunisi (Pipeline)</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[var(--theme-primary)] text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"
        >
          + Fırsat Ekle
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter(d => d.stage === stage);
          const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage} className="flex-shrink-0 w-80 flex flex-col bg-gray-50 rounded-xl border border-gray-200">
              <div className="p-3 border-b border-gray-200 bg-gray-100/50 rounded-t-xl flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">{STAGE_LABELS[stage]}</h3>
                <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-500 font-medium border border-gray-200">
                  ₺{totalValue.toLocaleString()}
                </span>
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {stageDeals.map((deal) => (
                  <div key={deal.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-[var(--theme-primary)] transition-colors cursor-pointer group">
                    <div className="font-medium text-sm text-gray-900 mb-1">{deal.title}</div>
                    <div className="text-xs text-gray-500 mb-3">{deal.tenant?.name || 'Müşteri'}</div>
                    <div className="flex justify-between items-center">
                      <div className="text-[var(--theme-primary)] font-bold text-sm">₺{deal.value.toLocaleString()}</div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <select 
                          className="text-xs border border-gray-200 rounded px-1 py-0.5 outline-none"
                          value={deal.stage}
                          onChange={(e) => updateStage(deal.id, e.target.value)}
                        >
                          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-400">Fırsat yok</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Fırsat (Deal) Oluştur</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Yeni Yazılım Projesi"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺)</label>
                  <input
                    type="number"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aşama</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                </div>
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
