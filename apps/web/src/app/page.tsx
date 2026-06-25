import Link from 'next/link';
import { Shield, Store, Building2, Zap } from 'lucide-react';

const panels = [
  {
    href: '/nexusadmin',
    title: 'Nexus Admin',
    desc: 'Platform yönetimi, boss ekranı, paket/modül, sistem sağlığı',
    icon: Shield,
    color: 'from-purple-600 to-indigo-700',
  },
  {
    href: '/bayi',
    title: 'Bayi Paneli',
    desc: 'İşletme satışları, hakediş, abonelik ve kontör yönetimi',
    icon: Store,
    color: 'from-blue-600 to-cyan-600',
  },
  {
    href: '/isletme',
    title: 'İşletme Paneli',
    desc: 'ERP, muhasebe, stok, POS — personel telefon ile giriş',
    icon: Building2,
    color: 'from-emerald-600 to-teal-600',
  },
];

export default function RootPage() {
  return (
    <div className="min-h-screen bg-[#FBF8FF] flex flex-col items-center justify-center p-8">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-[#606BDF]"
        >
          <Zap className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">SmartNexus ERP</h1>
      </div>
      <p className="text-gray-500 mb-10 text-center max-w-lg">
        Giriş yapmak istediğiniz paneli seçin. Her panel ayrı yetkilendirme ve arayüz ile
        çalışır.
      </p>
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full">
        {panels.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="card p-6 hover:shadow-lg transition-shadow group"
          >
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform`}
            >
              <p.icon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">{p.title}</h2>
            <p className="text-sm text-gray-500">{p.desc}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/kayit"
          className="px-8 py-3 rounded-xl text-white font-semibold bg-[#606BDF] hover:opacity-95 shadow-sm"
        >
          Kayıt Ol — Paket Satın Al
        </Link>
        <Link href="/fiyatlandirma" className="text-sm text-indigo-600 font-medium hover:underline">
          Fiyatlandırma ve paketleri inceleyin →
        </Link>
      </div>
    </div>
  );
}
