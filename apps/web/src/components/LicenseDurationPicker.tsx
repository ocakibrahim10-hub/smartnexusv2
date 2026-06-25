'use client';

import { Calendar, Clock } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { formatShortDate } from '@/lib/subscription-billing';
import type { ExtensionOption } from '@/lib/subscription-billing';

type Props = {
  options: ExtensionOption[];
  activeIndex: number;
  onSelect: (index: number) => void;
  quote: any;
  quoteLoading?: boolean;
  isUpgrade?: boolean;
};

export default function LicenseDurationPicker({
  options,
  activeIndex,
  onSelect,
  quote,
  quoteLoading,
  isUpgrade,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#606BDF]" />
        <h3 className="text-sm font-semibold text-gray-900">
          {isUpgrade ? 'Bitiş tarihinden sonra ek süre' : 'Lisans süresi seçin'}
        </h3>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {options.map((opt, idx) => {
          const active = activeIndex === idx;
          const isPopular = !isUpgrade && idx === 0;

          return (
            <button
              key={`${opt.months}-${opt.label}`}
              type="button"
              onClick={() => onSelect(idx)}
              className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                active
                  ? 'border-[#606BDF] bg-gradient-to-b from-[#E8E7FF] to-white shadow-lg shadow-[#606BDF]/15'
                  : 'border-[#EFEDF4] bg-white hover:border-[#C8C4F0]'
              }`}
            >
              {isPopular && (
                <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#606BDF] text-white">
                  Önerilen
                </span>
              )}
              <div className="flex items-start gap-2">
                <Calendar
                  className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-[#606BDF]' : 'text-gray-400'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{opt.label}</div>
                  {active && !quoteLoading && quote ? (
                    <>
                      <div className="mt-2 text-xl font-bold text-[#606BDF]">
                        {fmtMoney(quote.totalAmount)}
                        <span className="text-xs font-normal text-gray-500"> + KDV</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Bitiş: {formatShortDate(quote.projectedEndDate)}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 mt-2">Fiyat için seçin</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
