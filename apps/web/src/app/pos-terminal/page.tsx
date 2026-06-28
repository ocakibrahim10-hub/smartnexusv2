'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api';
import { setSession, clearSession, isAuthenticated, getUser } from '@/lib/auth';
import { TerminalUI } from './TerminalUI';

export default function POSTerminalPage() {
  const [tenantId, setTenantId] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      const user = getUser();
      if (user?.tenantId) setTenantId(user.tenantId);
      setIsLoggedIn(true);
    }
    setBooting(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !pin) {
      toast.error('Firma kodu ve PIN giriniz.');
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
      toast.success('POS oturumu açıldı');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setPin('');
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8FF]">
        <div className="text-sm text-gray-500">POS yükleniyor…</div>
      </div>
    );
  }

  if (isLoggedIn) {
    return <TerminalUI onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF8FF] p-4">
      <div className="card max-w-sm w-full p-8 shadow-lg border border-[#EFEDF4]">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#606BDF] text-white flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            SN
          </div>
          <h1 className="text-xl font-bold text-[#1B1B1F]">POS Terminali</h1>
          <p className="text-gray-500 text-sm mt-1">SmartNexus hızlı satış girişi</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma Kodu</label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full border border-[#EFEDF4] rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#606BDF]/30 focus:border-[#606BDF] outline-none"
              placeholder="Tenant ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">POS PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border border-[#EFEDF4] rounded-lg px-4 py-2.5 text-center tracking-[0.4em] text-xl focus:ring-2 focus:ring-[#606BDF]/30 outline-none"
              placeholder="••••"
              maxLength={6}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPin((prev) => (prev.length < 6 ? prev + num : prev))}
                className="py-3 rounded-lg text-lg font-medium border border-[#EFEDF4] hover:bg-[#E0E0FF] transition-colors"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-3 rounded-lg text-sm font-semibold text-red-600 border border-red-100 hover:bg-red-50"
            >
              Sil
            </button>
            <button
              type="button"
              onClick={() => setPin((prev) => (prev.length < 6 ? prev + '0' : prev))}
              className="py-3 rounded-lg text-lg font-medium border border-[#EFEDF4] hover:bg-[#E0E0FF]"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((prev) => prev.slice(0, -1))}
              className="py-3 rounded-lg text-sm font-medium border border-[#EFEDF4] hover:bg-gray-50"
            >
              ←
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !tenantId || !pin}
            className="w-full mt-2 bg-[#606BDF] hover:opacity-90 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor…' : 'POS\'u Aç'}
          </button>
        </form>
      </div>
    </div>
  );
}
