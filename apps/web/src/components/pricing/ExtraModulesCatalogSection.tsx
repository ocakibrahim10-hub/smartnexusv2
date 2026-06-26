'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Check, Layers, ShoppingCart, Trash2 } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { PLAN_META, PLAN_ORDER, planLabel } from '@/lib/plans';
import { purchasableExtraModulesFromPricing } from '@/lib/submodule-pricing';

type Props = {
  pricing: {
    plans?: Array<{ plan: string; modules?: string[] }>;
    submodulePricing?: Array<{
      moduleId: string;
      yearlyPrice: number;
      label?: string;
      sellableExtra?: boolean;
      isActive?: boolean;
    }>;
  } | null;
  selectedPlan: string;
  onPlanChange?: (plan: string) => void;
  cart: string[];
  onToggleCart: (moduleId: string) => void;
  showProrataHint?: boolean;
  remainingDays?: number;
  prorataPrices?: Record<string, number>;
  checkoutHref?: string;
  checkoutLabel?: string;
  loginHref?: string;
};

export default function ExtraModulesCatalogSection({
  pricing,
  selectedPlan,
  onPlanChange,
  cart,
  onToggleCart,
  showProrataHint,
  remainingDays,
  prorataPrices,
  checkoutHref,
  checkoutLabel = 'Sepetle devam et',
  loginHref,
}: Props) {
  const extras = useMemo(
    () => purchasableExtraModulesFromPricing(pricing, selectedPlan),
    [pricing, selectedPlan],
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, id) => {
        const row = extras.find((e) => e.moduleId === id);
        const price = prorataPrices?.[id] ?? row?.yearlyPrice ?? 0;
        return sum + price;
      }, 0),
    [cart, extras, prorataPrices],
  );

  if (!extras.length) {
    return (
      <section className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#606BDF]" /> Ek Modüller
        </h2>
        <p className="text-sm text-gray-500">
          {planLabel(selectedPlan)} paketine tüm satılabilir modüller dahil — ek modül gerekmez.
        </p>
      </section>
    );
  }

  const checkoutUrl =
    checkoutHref ??
    `/kayit?plan=${selectedPlan}${cart.length ? `&extras=${cart.join(',')}` : ''}`;

  return (
    <section className="mt-12 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#606BDF]" /> Ek Modüller
        </h2>
        <p className="text-sm text-gray-500">
          {planLabel(selectedPlan)} paketine dahil olmayan modüller — tek tek sepete ekleyin.{' '}
          {showProrataHint && remainingDays
            ? `Kalan ${remainingDays} gün için fiyatlar prorata hesaplanır.`
            : 'Yıllık fiyatlar admin tarafından belirlenir; kayıt veya panelden satın alınır.'}
        </p>
      </div>

      {onPlanChange && (
        <div className="flex flex-wrap gap-2">
          {PLAN_ORDER.map((key) => {
            const meta = PLAN_META[key];
            const active = selectedPlan === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPlanChange(key)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                  active
                    ? 'border-[#606BDF] bg-[#F0EFFF] text-[#606BDF]'
                    : 'border-[#EFEDF4] bg-white text-gray-600 hover:border-[#C8C4F0]'
                }`}
              >
                {meta?.label ?? planLabel(key)}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {extras.map((m) => {
          const inCart = cart.includes(m.moduleId);
          const displayPrice = prorataPrices?.[m.moduleId] ?? m.yearlyPrice ?? 0;
          return (
            <button
              key={m.moduleId}
              type="button"
              onClick={() => onToggleCart(m.moduleId)}
              className={`text-left rounded-2xl border-2 p-4 transition-all ${
                inCart
                  ? 'border-[#606BDF] bg-gradient-to-br from-[#F0EFFF] to-white shadow-md'
                  : 'border-[#EFEDF4] bg-white hover:border-[#C8C4F0]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-sm text-[#1B1B1F]">{m.label}</div>
                {inCart && (
                  <span className="w-6 h-6 rounded-full bg-[#606BDF] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-lg font-bold text-[#606BDF]">{fmtMoney(displayPrice)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-[#777680]">
                    {showProrataHint && prorataPrices?.[m.moduleId] != null
                      ? 'prorata + KDV'
                      : '/ yıl + KDV'}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    inCart ? 'bg-[#606BDF] text-white' : 'bg-[#F5F3FA] text-[#606BDF]'
                  }`}
                >
                  {inCart ? 'Sepette' : 'Ekle'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="card p-5 flex flex-wrap items-center justify-between gap-4 border-[#606BDF]/30">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-[#606BDF]" />
            <div>
              <div className="font-semibold text-[#1B1B1F]">Sepet — {cart.length} ek modül</div>
              <div className="text-sm text-[#606BDF] font-bold">{fmtMoney(cartTotal)} + KDV</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                for (const id of [...cart]) onToggleCart(id);
              }}
              className="px-3 py-2 rounded-xl border text-sm text-gray-600 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Temizle
            </button>
            <Link
              href={checkoutUrl}
              className="px-5 py-2 rounded-xl text-white text-sm font-semibold bg-[#606BDF] hover:opacity-95"
            >
              {checkoutLabel}
            </Link>
          </div>
        </div>
      )}

      {loginHref && !cart.length && (
        <p className="text-sm text-gray-500">
          Mevcut lisansınıza ek modül eklemek için{' '}
          <Link href={loginHref} className="text-[#606BDF] font-medium hover:underline">
            giriş yapın
          </Link>
          .
        </p>
      )}
    </section>
  );
}
