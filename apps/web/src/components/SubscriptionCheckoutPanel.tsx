'use client';

import { useMemo } from 'react';
import { CreditCard, Loader2, Shield } from 'lucide-react';
import LegalAgreementPanel from '@/components/LegalAgreementPanel';
import PricingPlanCards from '@/components/PricingPlanCards';
import type { LegalDocumentId } from '@/lib/legal-documents';
import { LEGAL_PROVIDER } from '@/lib/legal-provider';
import { fmtMoney } from '@/lib/format';
import { PLAN_ORDER, planLabel } from '@/lib/plans';
import { vatBreakdown, VAT_RATE } from '@/lib/vat';
import {
  extensionOptionsForMode,
  formatShortDate,
  type BillingMode,
} from '@/lib/subscription-billing';

type Props = {
  title?: string;
  subtitle?: string;
  selectedPlan: string;
  onPlanChange?: (plan: string) => void;
  showPlanPicker?: boolean;
  pricing: { plans?: any[]; addons?: any[] } | null;
  status?: {
    plan?: string;
    remainingDays?: number;
    endDate?: string;
    tenantName?: string;
    isActive?: boolean;
  } | null;
  selectedAddons: string[];
  onToggleAddon: (code: string) => void;
  extraBranchCount: number;
  onExtraBranchChange: (n: number) => void;
  quote: any;
  quoteLoading?: boolean;
  billingMode: BillingMode;
  extensionIndex: number;
  onExtensionIndexChange: (index: number) => void;
  onLegalChange: (accepted: boolean, ids: LegalDocumentId[]) => void;
  onPay: () => void;
  payLoading?: boolean;
  payDisabled?: boolean;
  payLabel?: string;
  showLegal?: boolean;
  showAddons?: boolean;
};

export default function SubscriptionCheckoutPanel({
  title = 'Paket ve Ödeme',
  subtitle,
  selectedPlan,
  onPlanChange,
  showPlanPicker = true,
  pricing,
  status,
  selectedAddons,
  onToggleAddon,
  extraBranchCount,
  onExtraBranchChange,
  quote,
  quoteLoading,
  billingMode,
  extensionIndex,
  onExtensionIndexChange,
  onLegalChange,
  onPay,
  payLoading,
  payDisabled,
  payLabel = 'Ödeme Yap',
  showLegal = true,
  showAddons = true,
}: Props) {
  const plans = useMemo(() => pricing?.plans ?? [], [pricing]);
  const addons = useMemo(
    () => (pricing?.addons ?? []).filter((a: any) => a && a.code !== 'EXTRA_BRANCH'),
    [pricing],
  );
  const extraBranchAddon = useMemo(
    () => (pricing?.addons ?? []).find((a: any) => a?.code === 'EXTRA_BRANCH'),
    [pricing],
  );

  const extensionOptions = useMemo(() => extensionOptionsForMode(billingMode), [billingMode]);

  const vat = useMemo(
    () => vatBreakdown(quote?.totalAmount ?? 0),
    [quote?.totalAmount],
  );

  const isUpgrade = billingMode === 'upgrade' && (status?.remainingDays ?? 0) > 0;

  return (
    <div className="space-y-6">
      {(title || subtitle) && (
        <div>
          {title && <h2 className="text-lg font-bold text-gray-900">{title}</h2>}
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}

      {isUpgrade && quote && (
        <div className="rounded-xl border border-[#EFEDF4] bg-[#F5F3FA] p-4 text-sm text-gray-700">
          <p>
            Mevcut lisans bitişinize kalan{' '}
            <strong>{status?.remainingDays ?? quote.remainingDays} gün</strong> için yalnızca paket
            farkı tahsil edilir (prorata).
          </p>
          {quote.proratedAmount > 0 && (
            <p className="mt-2 font-semibold text-gray-900">
              Kalan süre prorata tutarı: {fmtMoney(quote.proratedAmount)} + KDV
            </p>
          )}
        </div>
      )}

      {showPlanPicker && onPlanChange && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Abonelik paketi</h3>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            {PLAN_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onPlanChange(key)}
                className={`card p-4 text-left border-2 transition-colors ${
                  selectedPlan === key ? 'border-[#606BDF] bg-indigo-50/40' : 'border-transparent'
                }`}
              >
                <div className="font-bold text-gray-900">{planLabel(key)}</div>
                <div className="text-xs text-gray-500 mt-1">Yıllık abonelik</div>
              </button>
            ))}
          </div>
          {plans.length > 0 && (
            <PricingPlanCards
              plans={plans.filter((p: any) => p.plan === selectedPlan)}
              addons={[]}
              compact
            />
          )}
        </section>
      )}

      {showAddons && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Ek modüller (opsiyonel)</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {addons.map((a: any) => (
              <button
                key={a.code}
                type="button"
                onClick={() => onToggleAddon(a.code)}
                className={`card p-4 text-left border-2 transition-colors ${
                  selectedAddons.includes(a.code)
                    ? 'border-[#606BDF] bg-indigo-50/30'
                    : 'border-transparent'
                }`}
              >
                <div className="font-bold text-gray-900 text-sm">{a.name}</div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                <div className="mt-2 text-base font-bold text-[#606BDF]">
                  {fmtMoney(a.finalPrice ?? a.basePrice ?? 0)}
                  <span className="text-xs font-normal text-gray-500"> / yıl + KDV</span>
                </div>
              </button>
            ))}
          </div>

          {selectedPlan !== 'BASIC' && extraBranchAddon && (
            <div className="mt-3 card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Ekstra şube / alt bayi</div>
                <div className="text-xs text-[#606BDF] font-medium mt-1">
                  {fmtMoney(extraBranchAddon.finalPrice ?? extraBranchAddon.basePrice ?? 0)} / yıl + KDV
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onExtraBranchChange(Math.max(0, extraBranchCount - 1))}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  −
                </button>
                <span className="w-8 text-center font-bold">{extraBranchCount}</span>
                <button
                  type="button"
                  onClick={() => onExtraBranchChange(extraBranchCount + 1)}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {isUpgrade ? 'Bitiş tarihinizden sonra ek süre (isteğe bağlı)' : 'Lisans süresi'}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {extensionOptions.map((opt, idx) => {
            const active = extensionIndex === idx;
            const cardQuote = active ? quote : null;
            const displayTotal = cardQuote?.totalAmount ?? 0;
            return (
              <button
                key={`${opt.months}-${opt.label}`}
                type="button"
                onClick={() => onExtensionIndexChange(idx)}
                className={`card p-4 text-left border-2 transition-colors ${
                  active ? 'border-[#606BDF] bg-indigo-50/30' : 'border-transparent'
                }`}
              >
                <div className="font-semibold text-gray-900 text-sm">{opt.label}</div>
                {active && !quoteLoading && quote ? (
                  <>
                    <div className="mt-2 text-lg font-bold text-[#606BDF]">
                      {fmtMoney(displayTotal)} + KDV
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Bitiş: {formatShortDate(quote.projectedEndDate)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400 mt-2">Seçmek için tıklayın</div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Ödeme özeti</h3>

        {quoteLoading || !quote ? (
          <p className="text-sm text-gray-500">Fiyat hesaplanıyor…</p>
        ) : (
          <>
            <div className="rounded-xl border border-[#EFEDF4] bg-[#FBF8FF] p-4 text-sm">
              <div className="font-semibold text-gray-900">
                {planLabel(selectedPlan)} — {fmtMoney(quote.planAmount)} + KDV
              </div>
              {billingMode === 'new' && (
                <p className="text-xs text-gray-500 mt-1">
                  Ödeme sonrası lisansınız 1 yıl süreyle aktif edilir.
                </p>
              )}
              {billingMode === 'renewal' && status?.endDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Mevcut bitiş tarihinizden ({formatShortDate(status.endDate)}) itibaren uzatılır.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div>
                  <span className="text-gray-400">Başlangıç</span>
                  <div className="font-medium">{formatShortDate(new Date())}</div>
                </div>
                <div>
                  <span className="text-gray-400">Bitiş</span>
                  <div className="font-medium">{formatShortDate(quote.projectedEndDate)}</div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-sm max-w-md">
              <div className="flex justify-between">
                <span className="text-gray-500">Ara toplam (KDV hariç)</span>
                <span>{fmtMoney(vat.subtotalExVat)}</span>
              </div>
              {quote.addonsAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ek modüller</span>
                  <span>{fmtMoney(quote.addonsAmount)}</span>
                </div>
              )}
              {quote.proratedAmount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Prorata fark</span>
                  <span>{fmtMoney(quote.proratedAmount)}</span>
                </div>
              )}
              {quote.extensionAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ek süre ({quote.extensionMonths} ay)</span>
                  <span>{fmtMoney(quote.extensionAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">KDV (%{VAT_RATE})</span>
                <span>{fmtMoney(vat.vatAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span>Ödenecek tutar (KDV dahil)</span>
                <span className="text-red-600">{fmtMoney(vat.totalInclVat)}</span>
              </div>
            </div>
          </>
        )}

        <div className="rounded-xl border border-[#EFEDF4] bg-[#FBF8FF] p-4 text-xs text-gray-600 leading-relaxed">
          <div className="font-semibold text-gray-900">{LEGAL_PROVIDER.legalName}</div>
          <div className="mt-1">{LEGAL_PROVIDER.address}</div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[#606BDF]">
            <span>Mesafeli satış sözleşmesi</span>
            <span>İptal ve iade</span>
            <span>Teslimat</span>
          </div>
        </div>

        {showLegal && (
          <LegalAgreementPanel context="subscription_checkout" onChange={onLegalChange} />
        )}

        <div className="flex items-start gap-2 rounded-xl border border-[#EFEDF4] bg-[#FBF8FF] p-3 text-xs text-gray-600">
          <Shield className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p>
            Ödeme PayTR güvenli ödeme sayfasında tamamlanır. Onay sonrası paketiniz otomatik
            aktif edilir.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={payLoading || payDisabled || !quote}
            onClick={onPay}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold bg-[#606BDF] hover:opacity-95 disabled:opacity-50"
          >
            {payLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {payLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export { type BillingMode };
