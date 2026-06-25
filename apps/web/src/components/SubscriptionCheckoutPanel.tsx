'use client';

import { useMemo } from 'react';
import { CreditCard, Loader2, Shield, Sparkles } from 'lucide-react';
import LegalAgreementPanel from '@/components/LegalAgreementPanel';
import AddonModulePicker from '@/components/AddonModulePicker';
import LicenseDurationPicker from '@/components/LicenseDurationPicker';
import type { LegalDocumentId } from '@/lib/legal-documents';
import { LEGAL_PROVIDER } from '@/lib/legal-provider';
import { fmtMoney } from '@/lib/format';
import { PLAN_META, PLAN_ORDER, planLabel } from '@/lib/plans';
import { filterAddonsForPlan, planModulesFromPricing } from '@/lib/plan-addons';
import { vatBreakdown, VAT_RATE } from '@/lib/vat';
import { extensionOptionsForMode, formatShortDate, type BillingMode } from '@/lib/subscription-billing';

type LegalContext = 'dealer_business' | 'subscription_checkout';

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
  legalContexts?: LegalContext[];
};

export default function SubscriptionCheckoutPanel({
  title,
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
  legalContexts,
}: Props) {
  const planModules = useMemo(
    () => planModulesFromPricing(pricing, selectedPlan),
    [pricing, selectedPlan],
  );

  const purchasableAddons = useMemo(() => {
    const all = (pricing?.addons ?? []).filter((a: any) => a?.code !== 'EXTRA_BRANCH');
    const planRow = pricing?.plans?.find((p: any) => p.plan === selectedPlan);
    if (planRow?.purchasableAddons?.length) return planRow.purchasableAddons;
    return filterAddonsForPlan(planModules, all);
  }, [pricing, selectedPlan, planModules]);

  const extraBranchAddon = useMemo(
    () => (pricing?.addons ?? []).find((a: any) => a?.code === 'EXTRA_BRANCH'),
    [pricing],
  );

  const extensionOptions = useMemo(() => extensionOptionsForMode(billingMode), [billingMode]);
  const vat = useMemo(() => vatBreakdown(quote?.totalAmount ?? 0), [quote?.totalAmount]);
  const isUpgrade = billingMode === 'upgrade' && (status?.remainingDays ?? 0) > 0;
  const planMeta = PLAN_META[selectedPlan];

  return (
    <div className="space-y-8">
      {(title || subtitle) && (
        <div className="rounded-2xl border border-[#EFEDF4] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {title && <h2 className="text-xl font-bold text-[#1B1B1F]">{title}</h2>}
              {subtitle && <p className="text-sm text-[#777680] mt-1 max-w-xl">{subtitle}</p>}
            </div>
            {planMeta?.badge && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-[#606BDF] text-white">
                <Sparkles className="w-3.5 h-3.5" /> {planMeta.badge}
              </span>
            )}
          </div>
        </div>
      )}

      {isUpgrade && quote && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 text-sm text-amber-900">
          <p>
            Mevcut lisans bitişinize kalan{' '}
            <strong>{status?.remainingDays ?? quote.remainingDays} gün</strong> için yalnızca paket
            farkı tahsil edilir (prorata).
          </p>
          {quote.proratedAmount > 0 && (
            <p className="mt-2 font-semibold">
              Kalan süre prorata: {fmtMoney(quote.proratedAmount)} + KDV
            </p>
          )}
        </div>
      )}

      {showPlanPicker && onPlanChange && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-[#1B1B1F]">Abonelik paketi</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLAN_ORDER.map((key) => {
              const meta = PLAN_META[key];
              const planRow = pricing?.plans?.find((p: any) => p.plan === key);
              const price = planRow?.finalPrice ?? planRow?.price ?? 0;
              const selected = selectedPlan === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPlanChange(key)}
                  className={`rounded-2xl border-2 p-5 text-left transition-all ${
                    selected
                      ? 'border-[#606BDF] bg-gradient-to-br from-[#F0EFFF] to-white shadow-md'
                      : 'border-[#EFEDF4] bg-white hover:border-[#C8C4F0]'
                  }`}
                >
                  <div className="font-bold text-[#1B1B1F]">{meta?.label ?? planLabel(key)}</div>
                  <p className="text-xs text-[#777680] mt-1 line-clamp-2">{meta?.tagline}</p>
                  <div className="mt-3 text-lg font-bold text-[#606BDF]">
                    {fmtMoney(price)}
                    <span className="text-xs font-normal text-gray-500"> / yıl</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {showAddons && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#1B1B1F]">Ek modüller</h3>
            <p className="text-xs text-[#777680] mt-1">
              Seçtiğiniz <strong>{planLabel(selectedPlan)}</strong> paketine dahil olmayan modüller
              aşağıda listelenir.
            </p>
          </div>
          <AddonModulePicker
            addons={purchasableAddons}
            selected={selectedAddons}
            onToggle={onToggleAddon}
          />

          {selectedPlan !== 'BASIC' && extraBranchAddon && (
            <div className="rounded-2xl border-2 border-[#EFEDF4] bg-white p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-[#1B1B1F]">Ekstra şube / alt bayi</div>
                <p className="text-xs text-[#777680] mt-1">Paket şube limitini aşmak için</p>
                <div className="text-sm font-bold text-[#606BDF] mt-2">
                  {fmtMoney(extraBranchAddon.finalPrice ?? extraBranchAddon.basePrice ?? 0)} / yıl + KDV
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#F5F3FA] rounded-xl px-3 py-2">
                <button
                  type="button"
                  onClick={() => onExtraBranchChange(Math.max(0, extraBranchCount - 1))}
                  className="w-9 h-9 rounded-lg bg-white border border-[#EFEDF4] text-gray-600 hover:bg-gray-50"
                >
                  −
                </button>
                <span className="text-xl font-bold w-8 text-center">{extraBranchCount}</span>
                <button
                  type="button"
                  onClick={() => onExtraBranchChange(extraBranchCount + 1)}
                  className="w-9 h-9 rounded-lg bg-[#606BDF] text-white hover:opacity-90"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <LicenseDurationPicker
        options={extensionOptions}
        activeIndex={extensionIndex}
        onSelect={onExtensionIndexChange}
        quote={quote}
        quoteLoading={quoteLoading}
        isUpgrade={isUpgrade}
      />

      <section className="card p-6 space-y-5 shadow-sm">
        <h3 className="text-base font-bold text-[#1B1B1F]">Ödeme özeti</h3>

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

        <div className="rounded-xl border border-[#EFEDF4] bg-[#FBF8FF] p-4 text-xs text-gray-600">
          <div className="font-semibold text-gray-900">{LEGAL_PROVIDER.legalName}</div>
          <div className="mt-1">{LEGAL_PROVIDER.address}</div>
        </div>

        {showLegal && (
          <LegalAgreementPanel
            contexts={legalContexts ?? ['subscription_checkout']}
            onChange={onLegalChange}
          />
        )}

        <div className="flex items-start gap-2 rounded-xl border border-[#EFEDF4] bg-[#FBF8FF] p-3 text-xs text-gray-600">
          <Shield className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p>
            Ödeme PayTR güvenli ödeme sayfasında tamamlanır. Onay sonrası paketiniz otomatik aktif
            edilir.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={payLoading || payDisabled || !quote}
            onClick={onPay}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-semibold bg-[#606BDF] hover:opacity-95 disabled:opacity-50 shadow-lg shadow-[#606BDF]/25"
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
