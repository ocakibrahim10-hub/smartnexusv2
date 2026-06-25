'use client';

import React, { useState, useRef, useEffect } from 'react';
import { aiApi } from '@/lib/api';

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Merhaba! Ben Nexus AI. Size sistemdeki verilerinizle ilgili nasıl yardımcı olabilirim? (Örn: "Bugün kaç satış yaptık?", "Stokta azalan ürünler neler?")' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiApi.chat(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response.message || response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--theme-primary)] to-blue-600 rounded-full flex items-center justify-center shadow-inner">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Nexus AI Asistan</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Çevrimiçi
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-[var(--theme-primary)] text-white rounded-tr-sm shadow-md' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-1 items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Bir soru sorun..."
            className="w-full bg-gray-50 border border-gray-300 rounded-full py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent transition-shadow text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 w-8 h-8 flex items-center justify-center bg-[var(--theme-primary)] text-white rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            ↑
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          Nexus AI hata yapabilir. Lütfen önemli bilgileri doğrulayın.
        </p>
      </div>
    </div>
  );
}
