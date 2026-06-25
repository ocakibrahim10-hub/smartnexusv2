import Link from 'next/link';
import { Coins } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { kontorDescription, kontorLabel } from '@/lib/plans';

type KontorPackage = {
  id: string;
  name: string;
  totalPrice: number;
};

type KontorModule = {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  kontorPackages?: KontorPackage[];
};

type Props = {
  modules: KontorModule[];
  loginHref?: string;
  showLoginCta?: boolean;
  className?: string;
};

export default function KontorPackagesSection({
  modules,
  loginHref = '/',
  showLoginCta = false,
  className = 'mt-12',
}: Props) {
  if (!modules.length) return null;

  return (
    <section className={className}>
      <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
        <Coins className="w-5 h-5 text-amber-500" /> Kontör Paketleri
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        E-Fatura, E-Arşiv ve SMS — ihtiyacınız kadar kontör yükleyin
      </p>
      <div className="grid md:grid-cols-3 gap-5">
        {modules.map((mod) => {
          const code = mod.code ?? mod.id;
          const title = kontorLabel(code, mod.name);
          const desc = kontorDescription(code, mod.description);
          return (
            <div key={mod.id} className="card p-5 flex flex-col">
              <h3 className="font-bold text-gray-900">{title}</h3>
              {desc && <p className="text-sm text-gray-500 mt-1 mb-4">{desc}</p>}
              <div className="space-y-2 flex-1">
                {(mod.kontorPackages || []).map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded-lg border border-gray-100"
                  >
                    <span>{p.name}</span>
                    <span className="font-semibold text-[#606BDF]">{fmtMoney(p.totalPrice)}</span>
                  </div>
                ))}
              </div>
              {showLoginCta && (
                <Link
                  href={loginHref}
                  className="mt-4 block text-center text-sm text-[#606BDF] font-medium hover:underline"
                >
                  Satın almak için giriş yapın
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
