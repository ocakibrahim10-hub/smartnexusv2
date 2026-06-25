'use client';

import { Check, Sparkles } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { addonDescription, addonLabel } from '@/lib/plans';

const ADDON_ICONS: Record<string, string> = {
  POS_YAZARKASA: '🖥️',
  API_ACCESS: '🔗',
  MARKETPLACE: '🛒',
  HR_PAYROLL: '👥',
  ADVANCED_CRM: '📊',
  MOBILE_ACCESS: '📱',
  AI_FEATURES: '✨',
  B2C_ECOMMERCE: '🌐',
  MANUFACTURING: '🏭',
};

type Addon = {
  code: string;
  name?: string;
  description?: string | null;
  finalPrice?: number;
  basePrice?: number;
};

type Props = {
  addons: Addon[];
  selected: string[];
  onToggle: (code: string) => void;
  emptyMessage?: string;
};

export default function AddonModulePicker({
  addons,
  selected,
  onToggle,
  emptyMessage = 'Seçtiğiniz pakete dahil tüm modüller zaten aktif — ek modül gerekmez.',
}: Props) {
  if (addons.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D4D2DC] bg-white/80 px-5 py-8 text-center">
        <Sparkles className="w-8 h-8 text-[#606BDF] mx-auto mb-2 opacity-70" />
        <p className="text-sm text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {addons.map((a) => {
        const active = selected.includes(a.code);
        const price = a.finalPrice ?? a.basePrice ?? 0;
        const name = addonLabel(a.code, a.name);
        const desc = addonDescription(a.code, a.description);
        const icon = ADDON_ICONS[a.code] ?? '📦';

        return (
          <button
            key={a.code}
            type="button"
            onClick={() => onToggle(a.code)}
            className={`group relative text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
              active
                ? 'border-[#606BDF] bg-gradient-to-br from-[#F0EFFF] to-white shadow-md shadow-[#606BDF]/10 scale-[1.01]'
                : 'border-[#EFEDF4] bg-white hover:border-[#C8C4F0] hover:shadow-sm'
            }`}
          >
            {active && (
              <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#606BDF] text-white flex items-center justify-center shadow">
                <Check className="w-4 h-4" />
              </span>
            )}
            <div className="text-2xl mb-3">{icon}</div>
            <div className="font-bold text-[#1B1B1F] pr-8">{name}</div>
            <p className="text-xs text-[#777680] mt-1.5 leading-relaxed line-clamp-2 min-h-[2.5rem]">
              {desc}
            </p>
            <div className="mt-4 pt-3 border-t border-[#EFEDF4] flex items-end justify-between gap-2">
              <div>
                <div className="text-lg font-bold text-[#606BDF]">{fmtMoney(price)}</div>
                <div className="text-[10px] uppercase tracking-wide text-[#777680]">/ yıl + KDV</div>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  active ? 'bg-[#606BDF] text-white' : 'bg-[#F5F3FA] text-[#606BDF]'
                }`}
              >
                {active ? 'Seçildi' : 'Ekle'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
