'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Send,
  ChevronDown,
} from 'lucide-react';

type TicketMessage = {
  id: string;
  body: string;
  isAdmin: boolean;
  senderId: string;
  createdAt: string;
};
type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  tenant: { id: string; name: string; type: string };
  messages: TicketMessage[];
  _count?: { messages: number };
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  OPEN: { label: 'Açık', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Clock },
  IN_PROGRESS: {
    label: 'İşlemde',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    icon: AlertTriangle,
  },
  RESOLVED: {
    label: 'Çözüldü',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/20',
    icon: CheckCircle,
  },
  CLOSED: { label: 'Kapalı', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: XCircle },
};
const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Düşük', color: 'text-gray-400' },
  MEDIUM: { label: 'Orta', color: 'text-blue-400' },
  HIGH: { label: 'Yüksek', color: 'text-orange-400' },
  URGENT: { label: 'Acil', color: 'text-red-400' },
};

const fmt = (d: string) =>
  new Date(d).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ subject: '', priority: 'MEDIUM', body: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterStatus) p.set('status', filterStatus);
      if (filterPriority) p.set('priority', filterPriority);
      if (search) p.set('search', search);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/support/tickets?${p}`,
        { headers },
      );
      setTickets(await res.json());
    } catch {
      setTickets([]);
    }
    setLoading(false);
  };

  const fetchTicket = async (id: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/support/tickets/${id}`,
      { headers },
    );
    const data = await res.json();
    setSelected(data);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority, search]);

  const createTicket = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/support/tickets`,
        { method: 'POST', headers, body: JSON.stringify(form) },
      );
      const data = await res.json();
      setShowModal(false);
      setForm({ subject: '', priority: 'MEDIUM', body: '' });
      await fetchTickets();
      fetchTicket(data.id);
    } catch {}
    setSaving(false);
  };

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/support/tickets/${selected.id}/messages`,
        { method: 'POST', headers, body: JSON.stringify({ body: replyText }) },
      );
      setReplyText('');
      await fetchTickets();
      fetchTicket(selected.id);
    } catch {}
    setSending(false);
  };

  const updateStatus = async (action: 'resolve' | 'close') => {
    if (!selected) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/support/tickets/${selected.id}/${action}`,
      { method: 'PATCH', headers },
    );
    await fetchTickets();
    fetchTicket(selected.id);
  };

  const counts: Record<string, number> = {};
  for (const t of tickets) counts[t.status] = (counts[t.status] || 0) + 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Headphones className="text-indigo-400" />
            Destek Merkezi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Destek taleplerini yönetin</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Yeni Talep
        </button>
      </div>

      {/* Status pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterStatus ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Tümü ({tickets.length})
        </button>
        {Object.entries(STATUS_CFG).map(([k, v]) => {
          const Icon = v.icon;
          return (
            <button
              key={k}
              onClick={() => setFilterStatus(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${filterStatus === k ? `${v.bg} ${v.color}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Icon size={10} />
              {v.label} {counts[k] ? `(${counts[k]})` : ''}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 h-[calc(100vh-320px)]">
        {/* List */}
        <div className="w-96 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="input pl-9 text-sm w-full"
                placeholder="Konu ara…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input text-sm w-32"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="">Öncelik</option>
              {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="text-center text-gray-400 py-8">Yükleniyor…</div>
            ) : tickets.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Headphones size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Talep bulunamadı</p>
              </div>
            ) : (
              tickets.map((t) => {
                const sCfg = STATUS_CFG[t.status] || STATUS_CFG.OPEN;
                const pCfg = PRIORITY_CFG[t.priority] || PRIORITY_CFG.MEDIUM;
                const Icon = sCfg.icon;
                return (
                  <div
                    key={t.id}
                    onClick={() => fetchTicket(t.id)}
                    className={`card cursor-pointer transition-all border-l-4 ${selected?.id === t.id ? 'border-l-indigo-500 bg-indigo-500/10' : 'border-l-transparent hover:border-l-indigo-500/40'}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-gray-900 font-semibold text-sm truncate flex-1 pr-2">
                        {t.subject}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 ${sCfg.bg} ${sCfg.color}`}
                      >
                        <Icon size={9} />
                        {sCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-2">
                        <span>{t.tenant?.name || 'Sistem'}</span>
                        <span className={pCfg.color}>● {pCfg.label}</span>
                      </span>
                      <span>{fmt(t.updatedAt)}</span>
                    </div>
                    {(t._count?.messages || 0) > 0 && (
                      <div className="mt-1 text-xs text-gray-500">{t._count?.messages} mesaj</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail / Chat */}
        <div className="flex-1 flex flex-col">
          {!selected ? (
            <div className="card flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Headphones size={48} className="mx-auto mb-3 opacity-20" />
                <p>Bir talep seçin</p>
              </div>
            </div>
          ) : (
            (() => {
              const sCfg = STATUS_CFG[selected.status] || STATUS_CFG.OPEN;
              const Icon = sCfg.icon;
              const canReply = selected.status !== 'CLOSED';
              return (
                <div className="flex flex-col h-full gap-3">
                  {/* Header */}
                  <div className="card">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-gray-900 font-bold">{selected.subject}</h2>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{selected.tenant?.name}</span>
                          <span className={`flex items-center gap-1 ${sCfg.color}`}>
                            <Icon size={10} />
                            {sCfg.label}
                          </span>
                          <span className={PRIORITY_CFG[selected.priority]?.color}>
                            ● {PRIORITY_CFG[selected.priority]?.label}
                          </span>
                          <span>{fmt(selected.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {selected.status === 'OPEN' || selected.status === 'IN_PROGRESS' ? (
                          <button
                            onClick={() => updateStatus('resolve')}
                            className="text-xs px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 flex items-center gap-1"
                          >
                            <CheckCircle size={12} />
                            Çözüldü
                          </button>
                        ) : null}
                        {selected.status !== 'CLOSED' && (
                          <button
                            onClick={() => updateStatus('close')}
                            className="text-xs px-3 py-1.5 rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 flex items-center gap-1"
                          >
                            <XCircle size={12} />
                            Kapat
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="card flex-1 overflow-y-auto space-y-3">
                    {selected.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-xl px-4 py-3 ${msg.isAdmin ? 'bg-brand-50 border border-brand-200' : 'bg-gray-100'}`}
                        >
                          <div
                            className={`text-xs mb-1 ${msg.isAdmin ? 'text-indigo-400' : 'text-gray-400'}`}
                          >
                            {msg.isAdmin ? '🛠 Destek Ekibi' : '👤 Kullanıcı'} ·{' '}
                            {fmt(msg.createdAt)}
                          </div>
                          <p className="text-gray-900 text-sm whitespace-pre-wrap">{msg.body}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply */}
                  {canReply && (
                    <div className="card">
                      <div className="flex gap-3">
                        <textarea
                          className="input flex-1 resize-none text-sm"
                          rows={3}
                          placeholder="Yanıt yazın… (Ctrl+Enter ile gönder)"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) sendReply();
                          }}
                        />
                        <button
                          onClick={sendReply}
                          disabled={sending || !replyText.trim()}
                          className="btn-primary flex items-center gap-1 self-end px-4"
                        >
                          <Send size={14} />
                          {sending ? '…' : 'Gönder'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg">
            <h3 className="text-gray-900 font-semibold mb-4">Yeni Destek Talebi</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Konu *</label>
                <input
                  className="input w-full"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Öncelik</label>
                <select
                  className="input w-full"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                >
                  <option value="LOW">Düşük</option>
                  <option value="MEDIUM">Orta</option>
                  <option value="HIGH">Yüksek</option>
                  <option value="URGENT">Acil</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Açıklama *</label>
                <textarea
                  className="input w-full"
                  rows={5}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>
                İptal
              </button>
              <button
                className="btn-primary flex-1"
                onClick={createTicket}
                disabled={saving || !form.subject || !form.body}
              >
                {saving ? 'Oluşturuluyor…' : 'Talebi Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
