'use client';

import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { platformApi } from '@/lib/api';

import { getApiBaseUrl } from '@/lib/api-url';

const API = getApiBaseUrl();

export default function CampaignPopup() {
  const [popups, setPopups] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch(`${API}/platform/popups/active`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPopups(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleAck = async (campaignId: string, ackType: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      await fetch(`${API}/platform/popups/${campaignId}/ack`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ackType })
      });
    } catch (e) {}

    if (currentIndex < popups.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setPopups([]);
    }
  };

  if (popups.length === 0 || !popups[currentIndex]) return null;

  const current = popups[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Önemli Bilgilendirme</h3>
              <p className="text-xs text-gray-500 mt-0.5">Fiyat Güncellemesi</p>
            </div>
          </div>
          <button title="Kapat" aria-label="Kapat" onClick={() => handleAck(current.id, 'LATER')} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5">
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            Değerli müşterimiz, <strong>{new Date(current.validFrom).toLocaleDateString('tr-TR')}</strong> tarihinden itibaren geçerli olmak üzere, bazı modül ve planlarımızda <strong>%{current.percent} oranında fiyat güncellemesi</strong> yapılacaktır.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 mb-5">
            <strong>Kapsam:</strong> {current.target === 'ALL' ? 'Tüm plan ve modüller' : current.target === 'PLAN' ? 'Seçili planlar' : 'Seçili modüller'} {current.targetIds?.length > 0 && `(${current.targetIds.join(', ')})`}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleAck(current.id, 'DONT_SHOW_AGAIN')}
              className="flex-1 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Tekrar Gösterme
            </button>
            <button
              onClick={() => handleAck(current.id, 'LATER')}
              className="flex-1 py-2 rounded-xl text-sm font-medium bg-[#606BDF] text-white hover:bg-[#4f59c4]"
            >
              Anladım
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
