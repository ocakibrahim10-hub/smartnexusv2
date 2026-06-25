'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { platformApi } from '@/lib/api';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    platformApi.getNotifications().then(setItems).catch(() => {});
  }, []);

  const markRead = async (id: string) => {
    await platformApi.markNotificationRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  return (
    <>
      <TopBar title="Platform Bildirimleri" subtitle="Hakediş faturaları, kontör alımları, yeni kayıtlar" />
      <div className="p-6 space-y-3">
        {items.map((n) => (
          <div
            key={n.id}
            className={`card p-4 flex gap-4 ${!n.isRead ? 'border-l-4 border-indigo-500' : ''}`}
          >
            <Bell className={`w-5 h-5 flex-shrink-0 ${n.isRead ? 'text-gray-300' : 'text-indigo-500'}`} />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{n.title}</div>
              <div className="text-sm text-gray-600">{n.body}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(n.createdAt).toLocaleString('tr-TR')} · {n.type}
              </div>
            </div>
            {!n.isRead && (
              <button onClick={() => markRead(n.id)} className="text-xs text-indigo-600 hover:underline">
                Okundu
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="card p-8 text-center text-gray-400">Bildirim yok</div>}
      </div>
    </>
  );
}
