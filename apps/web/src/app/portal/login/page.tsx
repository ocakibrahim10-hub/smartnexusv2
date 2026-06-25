'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ShoppingBag } from 'lucide-react';
import { FormField } from '@/components/FormField';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/portal/login`, { email, password });
      localStorage.setItem('portalToken', res.data.accessToken);
      localStorage.setItem('portalContact', JSON.stringify(res.data.contact));
      router.push('/portal/orders');
    } catch {
      setError('Geçersiz e-posta veya şifre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen dashboard-main flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">B2B Müşteri Portalı</h1>
          <p className="text-sm text-gray-500 mt-1">Sipariş ve fatura takibi</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <FormField
            label="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input w-full"
            placeholder="abc@abc.com"
            required
          />
          <FormField
            label="Şifre"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input w-full"
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400">
          Demo: abc@abc.com / Portal2026!
        </p>
      </div>
    </div>
  );
}
