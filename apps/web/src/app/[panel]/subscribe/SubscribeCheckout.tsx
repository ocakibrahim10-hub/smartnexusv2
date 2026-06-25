'use client';

import { toast } from '@/lib/toast';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import SubscriptionCheckoutPanel from '@/components/SubscriptionCheckoutPanel';
import { platformApi, tenantsApi } from '@/lib/api';
import { planLabel } from '@/lib/plans';
import { getUser } from '@/lib/auth';
import type { LegalDocumentId } from '@/lib/legal-documents';
import {
  detectBillingMode,
  extensionOptionsForMode,
} from '@/lib/subscription-billing';
import { purchasableExtraModulesFromPricing } from '@/lib/submodule-pricing';

export default function SubscribeCheckout() {
  const params = useParams();
  const panel = params?.panel as string;
  const searchParams = useSearchParams();
  const tenantIdParam = searchParams.get('tenantId');
  const planParam = searchParams.get('plan');
  const paymentOk = searchParams.get('payment') === 'ok';

  const user = getUser();
  const targetTenantId = tenantIdParam || user?.tenantId || '';

  const [pricing, setPricing] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState(planParam || 'BASIC');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedExtraModules, setSelectedExtraModules] = useState<string[]>([]);
  const [extraBranchCount, setExtraBranchCount] = useState(0);
  const [extensionIndex, setExtensionIndex] = useState(0);
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [acceptedDocuments, setAcceptedDocuments] = useState<LegalDocumentId[]>([]);

  const billingMode = useMemo(
    () => detectBillingMode(status, selectedPlan),
    [status, selectedPlan],
  );
  const extensionOptions = useMemo(() => extensionOptionsForMode(billingMode), [billingMode]);
  const selectedExtension = extensionOptions[extensionIndex] ?? extensionOptions[0];

  const onLegalChange = useCallback((ok: boolean, ids: LegalDocumentId[]) => {
    setLegalAccepted(ok);
    setAcceptedDocuments(ids);
  }, []);

  useEffect(() => {
    if (planParam) setSelectedPlan(planParam);
  }, [planParam]);

  useEffect(() => {
    platformApi.getPublicPricing().then(setPricing).catch(() => {});
    if (targetTenantId) {
      tenantsApi.getSubscriptionStatus(targetTenantId).then(setStatus).catch(() => {});
    }
  }, [targetTenantId]);

  useEffect(() => {
    const extras = purchasableExtraModulesFromPricing(pricing, selectedPlan);
    const allowedExtraIds = extras.map((m) => m.moduleId);
    setSelectedExtraModules((prev) => prev.filter((id) => allowedExtraIds.includes(id)));

    const planRow = pricing?.plans?.find((p: any) => p.plan === selectedPlan);
    const allowed = (planRow?.purchasableAddons ?? [])
      .filter((a: any) => a?.code !== 'EXTRA_BRANCH')
      .map((a: any) => a.code);
    if (allowed.length) {
      setSelectedAddons((prev) => prev.filter((c) => allowed.includes(c)));
    }
  }, [selectedPlan, pricing]);

  useEffect(() => {
    setExtensionIndex(0);
  }, [billingMode, selectedPlan]);

  useEffect(() => {
    if (!selectedPlan) return;
    setQuoteLoading(true);
    platformApi
      .quoteSubscription(selectedPlan, selectedAddons, extraBranchCount, {
        tenantId: targetTenantId || undefined,
        extensionMonths: selectedExtension.months,
        billingMode,
        includeAnnualRenewal: selectedExtension.includeAnnualRenewal,
        extraModuleIds: selectedExtraModules,
      })
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setQuoteLoading(false));
  }, [
    selectedPlan,
    selectedAddons,
    selectedExtraModules,
    extraBranchCount,
    targetTenantId,
    selectedExtension.months,
    selectedExtension.includeAnnualRenewal,
    billingMode,
  ]);

  useEffect(() => {
    if (paymentOk && targetTenantId) {
      tenantsApi.getSubscriptionStatus(targetTenantId).then(setStatus).catch(() => {});
    }
  }, [paymentOk, targetTenantId]);

  const toggleAddon = (code: string) => {
    setSelectedAddons((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const toggleExtraModule = (moduleId: string) => {
    setSelectedExtraModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    );
  };

  const checkout = async () => {
    if (!targetTenantId) return;
    if (!legalAccepted) {
      toast.info('Ödeme için sözleşmeleri kabul edin');
      return;
    }
    setLoading(true);
    try {
      const res = await platformApi.purchaseSubscription({
        tenantId: targetTenantId,
        plan: selectedPlan,
        addonCodes: selectedAddons,
        extraModuleIds: selectedExtraModules,
        extraBranchCount,
        extensionMonths: selectedExtension.months,
        includeAnnualRenewal: selectedExtension.includeAnnualRenewal,
        billingMode,
        acceptedDocuments,
      });
      if (res.redirectUrl) window.location.href = res.redirectUrl;
      else toast.info('Ödeme başlatıldı');
    } catch (e: any) {
      toast.info(
        e.response?.data?.message || 'Ödeme başlatılamadı — Sanal POS yapılandırmasını kontrol edin',
      );
    } finally {
      setLoading(false);
    }
  };

  const isDealerBuyingForBusiness = user?.tenantType === 'DEALER' && !!tenantIdParam;
  const pageTitle =
    billingMode === 'upgrade'
      ? 'Paket Yükseltme'
      : billingMode === 'renewal'
        ? 'Lisans Yenileme'
        : 'Paket Satın Al';

  return (
    <>
      <TopBar
        title={pageTitle}
        subtitle={`${planLabel(selectedPlan)} — güvenli ödeme PayTR ile gerçekleştirilir`}
      />
      <div className="p-6 max-w-4xl">
        {status && (
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <div className="text-sm text-gray-500">Abonelik durumu</div>
              <div className="font-semibold text-gray-900">
                {status.tenantName || 'İşletme'} · {planLabel(status.plan || selectedPlan)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Kalan süre</div>
              <div
                className={`text-2xl font-bold ${status.remainingDays <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}
              >
                {status.remainingDays ?? 0} gün
              </div>
              {status.endDate && (
                <div className="text-xs text-gray-400">
                  Bitiş: {new Date(status.endDate).toLocaleDateString('tr-TR')}
                </div>
              )}
            </div>
          </div>
        )}

        {paymentOk && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-6">
            Ödeme onayı alındıysa paket birkaç saniye içinde tanımlanır ve hesap aktif edilir.
            {isDealerBuyingForBusiness && (
              <a href={`/${panel}/businesses`} className="block font-semibold text-[#606BDF] mt-2">
                İşletme listesine dön →
              </a>
            )}
          </div>
        )}

        {isDealerBuyingForBusiness && !paymentOk && (
          <div className="card p-4 border-l-4 border-l-[#606BDF] mb-6 text-sm">
            <p className="font-medium text-gray-900">İşletme kaydı — ödeme adımı</p>
            <p className="text-xs text-gray-500 mt-1">
              Onay sonrası işletme paneli seçilen modüllerle aktif olur.
            </p>
          </div>
        )}

        <SubscriptionCheckoutPanel
          selectedPlan={selectedPlan}
          onPlanChange={setSelectedPlan}
          pricing={pricing}
          status={status}
          selectedAddons={selectedAddons}
          onToggleAddon={toggleAddon}
          selectedExtraModules={selectedExtraModules}
          onToggleExtraModule={toggleExtraModule}
          extraBranchCount={extraBranchCount}
          onExtraBranchChange={setExtraBranchCount}
          quote={quote}
          quoteLoading={quoteLoading}
          billingMode={billingMode}
          extensionIndex={extensionIndex}
          onExtensionIndexChange={setExtensionIndex}
          onLegalChange={onLegalChange}
          onPay={checkout}
          payLoading={loading}
          payDisabled={!legalAccepted || !targetTenantId}
          payLabel="Sanal POS ile Öde"
        />

        {!targetTenantId && (
          <p className="text-sm text-amber-700 mt-4">Ödeme için giriş yapın veya işletme seçin.</p>
        )}
      </div>
    </>
  );
}
