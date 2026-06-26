'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { Plus, Search, ShoppingCart, Loader2, ChevronRight, Check, XCircle, Truck } from 'lucide-react';
import { FormField } from '@/components/FormField';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/b2b/orders', { params: { status: statusFilter } });
      setOrders(res.data.items || res.data); // in case it returns paginated or direct array
    } catch (err: any) {
      toast.error('Siparişler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, action: string) => {
    try {
      await api.patch(`/b2b/orders/${id}/${action}`);
      toast.success('Sipariş durumu güncellendi');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Durum güncellenirken hata oluştu');
    }
  };

  const filteredOrders = Array.isArray(orders) ? orders.filter(o => 
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) || 
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      PROCESSING: 'bg-indigo-100 text-indigo-700',
      SHIPPED: 'bg-purple-100 text-purple-700',
      DELIVERED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700'
    };
    return map[status] || map.DRAFT;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'Taslak',
      PENDING: 'Onay Bekliyor',
      APPROVED: 'Onaylandı',
      PROCESSING: 'Hazırlanıyor',
      SHIPPED: 'Kargoda',
      DELIVERED: 'Teslim Edildi',
      CANCELLED: 'İptal'
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">B2B Siparişler</h1>
        {/* Placeholder for new order if needed later, usually B2B orders are created by customers */}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['', 'DRAFT', 'PENDING', 'APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === s 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'Tümü' : getStatusLabel(s)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Sipariş no veya müşteri ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
            <ShoppingCart className="w-12 h-12 text-gray-300 mb-3" />
            <p>Sipariş bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Sipariş No</th>
                  <th className="py-3 px-4">Müşteri</th>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4 text-right">Tutar</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{order.orderNumber}</td>
                    <td className="py-3 px-4">{order.customer?.name}</td>
                    <td className="py-3 px-4">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: order.currency || 'TRY' }).format(order.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        {order.status === 'PENDING' && (
                          <>
                            <button onClick={() => updateStatus(order.id, 'approve')} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Onayla">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => updateStatus(order.id, 'cancel')} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="İptal Et">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {order.status === 'APPROVED' && (
                          <button onClick={() => updateStatus(order.id, 'process')} className="text-xs font-medium text-indigo-600 hover:underline">
                            Hazırla
                          </button>
                        )}
                        {order.status === 'PROCESSING' && (
                          <button onClick={() => updateStatus(order.id, 'ship')} className="text-xs font-medium text-purple-600 hover:underline flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Kargola
                          </button>
                        )}
                        {order.status === 'SHIPPED' && (
                          <button onClick={() => updateStatus(order.id, 'deliver')} className="text-xs font-medium text-green-600 hover:underline">
                            Teslim Edildi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
