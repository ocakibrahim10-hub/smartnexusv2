'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Inbox,
  SendHorizonal,
  Eye,
  Clock,
  Users,
  Building2,
  Store,
  Globe,
} from 'lucide-react';
import { FormField, FormSelect, FormTextarea } from '@/components/FormField';

type Message = {
  id: string;
  title: string;
  body: string;
  targetType: string;
  sentAt: string | null;
  createdAt: string;
  isScheduled: boolean;
  fromTenant: { id: string; name: string; type: string };
  recipients?: { tenantId: string; isRead: boolean; tenant: { name: string } }[];
};

type ReceivedMsg = {
  id: string;
  isRead: boolean;
  readAt: string | null;
  message: Message & { fromTenant: { id: string; name: string; type: string } };
};

const TARGET_CFG: Record<string, { label: string; icon: any }> = {
  ALL: { label: 'Herkes', icon: Globe },
  DEALERS: { label: 'Bayiler', icon: Store },
  BUSINESSES: { label: 'İşletmeler', icon: Building2 },
  BRANCHES: { label: 'Şubeler', icon: Users },
  SPECIFIC: { label: 'Seçili', icon: Users },
};

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export default function MessagesPage() {
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  const [received, setReceived] = useState<ReceivedMsg[]>([]);
  const [sent, setSent] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', targetType: 'ALL', scheduledAt: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messages`,
        { headers },
      );
      const data = await res.json();
      setReceived(data.received || []);
      setSent(data.sent || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const openMessage = async (msg: Message) => {
    setSelected(msg);
    if (tab === 'inbox') {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messages/${msg.id}`,
        { headers },
      );
      fetchMessages();
    }
  };

  const sendMessage = async () => {
    setSaving(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, scheduledAt: form.scheduledAt || undefined }),
      });
      setShowCompose(false);
      setForm({ title: '', body: '', targetType: 'ALL', scheduledAt: '' });
      fetchMessages();
    } catch {}
    setSaving(false);
  };

  const markAllRead = async () => {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/messages/mark-all-read`,
      { method: 'PATCH', headers },
    );
    fetchMessages();
  };

  const unreadCount = received.filter((r) => !r.isRead).length;
  const listItems = tab === 'inbox' ? received : sent;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MessageSquare className="text-indigo-400" />
            Mesaj Merkezi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Duyuru ve bildirimler</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-2">
              <Eye size={14} />
              Tümünü Okundu İşaretle
            </button>
          )}
          <button
            onClick={() => setShowCompose(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Yeni Mesaj
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Gelen</span>
            <Inbox size={18} className="text-indigo-400" />
          </div>
          <div className="page-title">{received.length}</div>
          {unreadCount > 0 && (
            <div className="text-red-400 text-xs mt-1">{unreadCount} okunmamış</div>
          )}
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Gönderilen</span>
            <SendHorizonal size={18} className="text-blue-400" />
          </div>
          <div className="page-title">{sent.length}</div>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Zamanlanmış</span>
            <Clock size={18} className="text-yellow-400" />
          </div>
          <div className="page-title">{sent.filter((m) => m.isScheduled).length}</div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="flex gap-4 h-[calc(100vh-320px)]">
        {/* Left */}
        <div className="w-96 flex flex-col">
          <div className="flex gap-1 mb-3">
            {[
              { key: 'inbox', label: 'Gelen Kutusu', icon: Inbox },
              { key: 'sent', label: 'Gönderilenler', icon: SendHorizonal },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key as any);
                  setSelected(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <t.icon size={14} />
                {t.label}
                {t.key === 'inbox' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center text-gray-400 py-8">Yükleniyor…</div>
            ) : listItems.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Mesaj yok</p>
              </div>
            ) : (
              (tab === 'inbox'
                ? received
                : sent.map((s) => ({ message: s, isRead: true, id: s.id, readAt: null }) as any)
              ).map((item: any) => {
                const msg = tab === 'inbox' ? item.message : item;
                const isUnread = tab === 'inbox' && !item.isRead;
                const TIcon = TARGET_CFG[msg.targetType]?.icon || Globe;
                return (
                  <div
                    key={item.id}
                    onClick={() => openMessage(msg)}
                    className={`card cursor-pointer transition-all border-l-4 ${selected?.id === msg.id ? 'border-l-indigo-500 bg-indigo-500/10' : isUnread ? 'border-l-yellow-400' : 'border-l-transparent hover:border-l-indigo-500/40'}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span
                        className={`font-semibold text-sm ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}
                      >
                        {msg.title}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">
                        {tab === 'inbox' ? (
                          msg.fromTenant?.name
                        ) : (
                          <span className="flex items-center gap-1">
                            <TIcon size={10} />
                            {TARGET_CFG[msg.targetType]?.label}
                          </span>
                        )}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {fmtDate(msg.sentAt || msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="card h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
                <p>Bir mesaj seçin</p>
              </div>
            </div>
          ) : (
            <div className="card h-full flex flex-col">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <h2 className="text-gray-900 font-bold text-lg mb-2">{selected.title}</h2>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>Gönderen: {selected.fromTenant?.name}</span>
                  <span>{fmtDate(selected.sentAt || selected.createdAt)}</span>
                  {selected.targetType &&
                    (() => {
                      const TIcon = TARGET_CFG[selected.targetType]?.icon || Globe;
                      return (
                        <span className="flex items-center gap-1">
                          <TIcon size={10} />
                          {TARGET_CFG[selected.targetType]?.label}
                        </span>
                      );
                    })()}
                </div>
              </div>
              <div className="flex-1 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </div>
              {tab === 'sent' && selected.recipients && selected.recipients.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-gray-400 text-xs mb-2">
                    {selected.recipients.length} alıcı ·{' '}
                    {selected.recipients.filter((r) => r.isRead).length} okundu
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selected.recipients.slice(0, 10).map((r) => (
                      <span
                        key={r.tenantId}
                        className={`text-xs px-2 py-0.5 rounded ${r.isRead ? 'bg-emerald-500/20 text-emerald-600' : 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {r.tenant?.name}
                      </span>
                    ))}
                    {selected.recipients.length > 10 && (
                      <span className="text-xs text-gray-500">
                        +{selected.recipients.length - 10} daha
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg">
            <h3 className="text-gray-900 font-semibold mb-4">Yeni Mesaj Gönder</h3>
            <div className="space-y-3">
              <FormSelect
                label="Alıcı"
                className="input w-full"
                value={form.targetType}
                onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value }))}
              >
                <option value="ALL">Herkes</option>
                <option value="DEALERS">Tüm Bayiler</option>
                <option value="BUSINESSES">Tüm İşletmeler</option>
                <option value="BRANCHES">Tüm Şubeler</option>
              </FormSelect>
              <FormField
                label="Başlık *"
                className="input w-full"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <FormTextarea
                label="Mesaj *"
                className="input w-full"
                rows={6}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
              <FormField
                label="Zamanlanmış Gönderim (opsiyonel)"
                className="input w-full"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowCompose(false)}>
                İptal
              </button>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={sendMessage}
                disabled={saving || !form.title || !form.body}
              >
                <Send size={14} />
                {saving ? 'Gönderiliyor…' : form.scheduledAt ? 'Zamanla' : 'Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
