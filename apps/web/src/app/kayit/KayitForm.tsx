'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Zap } from 'lucide-react';
import { FormField } from '@/components/FormField';
import { setSession } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function KayitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePlan = searchParams.get('plan') || 'BASIC';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    taxNo: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/register-business`, form);
      setSession(res.data);
      router.push(`/isletme/subscribe?plan=${prePlan}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kayıt oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8FF]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
            <Zap className="w-5 h-5 text-[#606BDF]" /> SmartNexus
          </Link>
          <Link href="/fiyatlandirma" className="text-sm text-indigo-600 hover:underline">
            Fiyatlandırma
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">İşletme Kaydı</h1>
        <p className="text-sm text-gray-500 mb-8">
          Kayıt sonrası yıllık paketinizi seçip Sanal POS ile ödeme yapabilirsiniz.
        </p>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <FormField
            label="Firma adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
            required
          />
          <FormField
            label="E-posta"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
            required
          />
          <FormField
            label="Telefon"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
            required
          />
          <FormField
            label="Şifre"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
            minLength={6}
            required
          />
          <FormField
            label="Şehir"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
          />
          <FormField
            label="Vergi no"
            value={form.taxNo}
            onChange={(e) => setForm({ ...form, taxNo: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200"
          />

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold bg-[#606BDF] disabled:opacity-60"
          >
            {loading ? 'Kaydediliyor…' : 'Kayıt Ol ve Paket Seç'}
          </button>
        </form>
      </main>
    </div>
  );
}
