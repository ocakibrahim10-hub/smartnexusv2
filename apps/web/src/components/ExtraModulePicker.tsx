'use client';

import { Check, Layers } from 'lucide-react';
import { fmtMoney } from '@/lib/format';

export type ExtraModule = {
  moduleId: string;
  label: string;
  groupId?: string;
  yearlyPrice: number;
};

type Props = {
  modules: ExtraModule[];
  selected: string[];
  onToggle: (moduleId: string) => void;
  emptyMessage?: string;
};

export default function ExtraModulePicker({
  modules,
  selected,
  onToggle,
  emptyMessage = 'Seçtiğiniz pakete dahil tüm modüller zaten aktif — ek modül gerekmez.',
}: Props) {
  if (modules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D4D2DC] bg-white/80 px-5 py-8 text-center">
        <Layers className="w-8 h-8 text-[#606BDF] mx-auto mb-2 opacity-70" />
        <p className="text-sm text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  const byGroup = modules.reduce<Record<string, ExtraModule[]>>((acc, m) => {
    const g = m.groupId ?? m.moduleId.split('.')[0] ?? 'Diğer';
    (acc[g] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(byGroup).map(([groupId, items]) => (
        <div key={groupId}>
          <div className="text-xs font-semibold uppercase tracking-wide text-[#777680] mb-3">
            {groupId.replace(/_/g, ' ')}
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((m) => {
              const active = selected.includes(m.moduleId);
              return (
                <button
                  key={m.moduleId}
                  type="button"
                  onClick={() => onToggle(m.moduleId)}
                  className={`group relative text-left rounded-2xl border-2 p-4 transition-all ${
                    active
                      ? 'border-[#606BDF] bg-gradient-to-br from-[#F0EFFF] to-white shadow-md'
                      : 'border-[#EFEDF4] bg-white hover:border-[#C8C4F0]'
                  }`}
                >
                  {active && (
                    <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#606BDF] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <div className="font-semibold text-sm text-[#1B1B1F] pr-8">{m.label}</div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-base font-bold text-[#606BDF]">
                        {fmtMoney(m.yearlyPrice)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-[#777680]">
                        / yıl + KDV
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
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
        </div>
      ))}
    </div>
  );
}
