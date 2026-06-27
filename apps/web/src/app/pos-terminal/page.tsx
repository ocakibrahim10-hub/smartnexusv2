'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api';
import { setSession, setUser, clearSession } from '@/lib/auth';
import { TerminalUI } from './TerminalUI';

export default function POSTerminalPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !pin) {
      toast.error('Lütfen Firma Kodu (Tenant ID) ve PIN giriniz.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login-pos', { tenantId, posPin: pin });
      setSession({
        user: res.data.user,
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      });
      setIsLoggedIn(true);
      toast.success('Giriş başarılı');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Giriş başarısız. PIN yanlış olabilir.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setPin('');
  };

  if (isLoggedIn) {
    return <TerminalUI onLogout={handleLogout} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">POS Girişi</h1>
          <p className="text-gray-500 text-sm mt-1">Hızlı satış terminaline giriş yapın</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma Kodu (Tenant ID)</label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Firma kodu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">POS Şifresi (PIN)</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-center tracking-[0.5em] text-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••"
              maxLength={6}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPin((prev) => prev.length < 6 ? prev + num : prev)}
                className="bg-gray-50 hover:bg-gray-100 py-3 rounded-lg text-xl font-medium border border-gray-200 transition-colors"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-lg text-sm font-bold border border-red-200 transition-colors"
            >
              SİL
            </button>
            <button
              type="button"
              onClick={() => setPin((prev) => prev.length < 6 ? prev + '0' : prev)}
              className="bg-gray-50 hover:bg-gray-100 py-3 rounded-lg text-xl font-medium border border-gray-200 transition-colors"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((prev) => prev.slice(0, -1))}
              className="bg-gray-50 hover:bg-gray-100 py-3 rounded-lg text-sm font-bold border border-gray-200 transition-colors"
            >
              &lt;
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !tenantId || !pin}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
