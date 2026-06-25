'use client';

import React from 'react';

export default function MrpDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Üretim Yönetimi (MRP)</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-2">Üretim Özeti</h2>
        <p className="text-sm text-gray-500">Üretim emirleri, reçeteler (BOM) ve stok tüketimleri bu ekrandan yönetilir.</p>
      </div>
    </div>
  );
}
