'use client';

import React from 'react';

export default function WorkOrdersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">İş Emirleri</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-2">Üretim Emirleri Yönetimi</h2>
        <p className="text-sm text-gray-500">Reçetelere dayalı üretim emirleri (Work Orders) oluşturup, tamamlandığında otomatik stok tüketimlerini başlatabilirsiniz.</p>
      </div>
    </div>
  );
}
