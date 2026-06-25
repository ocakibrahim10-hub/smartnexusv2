'use client';

import { toast } from '@/lib/toast';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import PricingPlanCards from '@/components/PricingPlanCards';
import { platformApi, tenantsApi } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { PLAN_ORDER, planLabel } from '@/lib/plans';
import { getUser } from '@/lib/auth';
import { CreditCard, Loader2 } from 'lucide-react';
import LegalAgreementPanel from '@/components/LegalAgreementPanel';
import type { LegalDocumentId } from '@/lib/legal-documents';

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
  const [extraBranchCount, setExtraBranchCount] = useState(0);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [acceptedDocuments, setAcceptedDocuments] = useState<LegalDocumentId[]>([]);

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
    if (!selectedPlan) return;
    platformApi
      .quoteSubscription(selectedPlan, selectedAddons, extraBranchCount)
      .then(setQuote)
      .catch(() => setQuote(null));
  }, [selectedPlan, selectedAddons, extraBranchCount]);

  useEffect(() => {
    if (paymentOk && targetTenantId) {
      tenantsApi.getSubscriptionStatus(targetTenantId).then(setStatus).catch(() => {});
    }
  }, [paymentOk, targetTenantId]);

  const plans = useMemo(() => pricing?.plans ?? [], [pricing]);
  const addons = useMemo(() => (pricing?.addons ?? []).filter((a: any) => a && a.code !== 'EXTRA_BRANCH'), [pricing]);
  const extraBranchAddon = useMemo(() => (pricing?.addons ?? []).find((a: any) => a?.code === 'EXTRA_BRANCH'), [pricing]);

  const toggleAddon = (code: string) => {
    setSelectedAddons((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
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
        extraBranchCount,
        acceptedDocuments,
      });
      if (res.redirectUrl) window.location.href = res.redirectUrl;
      else toast.info('Ödeme başlatıldı');
    } catch (e: any) {
      toast.info(e.response?.data?.message || 'Ödeme başlatılamadı — Sanal POS yapılandırmasını kontrol edin');
    } finally {
      setLoading(false);
    }
  };

  const isDealerBuyingForBusiness = user?.tenantType === 'DEALER' && !!tenantIdParam;

  return (
    <>
      <TopBar
        title="Paket Satın Al"
        subtitle="Yıllık abonelik planı ve ek paketler — ödeme admin Sanal POS üzerinden"
      />
      <div className="p-6 space-y-8 max-w-6xl">
        {status && (
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
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
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 space-y-2">
            <p>
              Ödeme onayı alındıysa paket birkaç saniye içinde işletmeye tanımlanır ve hesap aktif
              edilir.
            </p>
            {isDealerBuyingForBusiness && (
              <p>
                <a href={`/${panel}/businesses`} className="font-semibold text-[#606BDF] hover:underline">
                  İşletme listesine dön →
                </a>
              </p>
            )}
          </div>
        )}

        {isDealerBuyingForBusiness && !paymentOk && (
          <div className="card p-4 border-l-4 border-l-[#606BDF]">
            <p className="text-sm font-medium text-gray-900">İşletme kaydı — ödeme adımı</p>
            <p className="text-xs text-gray-500 mt-1">
              Seçili paket için Sanal POS ile ödeme yapın. Onay sonrası işletme paneli seçilen
              modüllerle aktif olur.
            </p>
          </div>
        )}

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">1. Plan seçin</h2>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            {PLAN_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPlan(key)}
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

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">2. Ek paketler (opsiyonel)</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {addons.map((a: any) => (
              <button
                key={a.code}
                type="button"
                onClick={() => toggleAddon(a.code)}
                className={`card p-5 text-left border-2 transition-colors ${
                  selectedAddons.includes(a.code) ? 'border-[#606BDF] bg-indigo-50/30' : 'border-transparent'
                }`}
              >
                <div className="font-bold text-gray-900">{a.name}</div>
                <p className="text-sm text-gray-500 mt-1">{a.description}</p>
                <div className="mt-3 text-lg font-bold text-indigo-600">
                  {fmtMoney(a.finalPrice ?? a.basePrice ?? 0)}
                  <span className="text-sm font-normal text-gray-500">/yıl</span>
                </div>
              </button>
            ))}
          </div>

          {selectedPlan !== 'BASIC' && extraBranchAddon && (
            <div className="mt-4 card p-5 border-2 border-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900">Ekstra Şube / Alt Bayi Paketi</div>
                  <p className="text-sm text-gray-500 mt-1">Paketinizin ücretsiz limiti aşıldığında ekstra şube alabilirsiniz.</p>
                  <div className="mt-2 text-sm font-semibold text-indigo-600">
                    {fmtMoney(extraBranchAddon.finalPrice ?? extraBranchAddon.basePrice ?? 0)} / yıl (Adet)
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setExtraBranchCount(Math.max(0, extraBranchCount - 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-8 text-center">{extraBranchCount}</span>
                  <button 
                    onClick={() => setExtraBranchCount(extraBranchCount + 1)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">3. Ödeme özeti</h2>
          {quote ? (
            <div className="space-y-2 text-sm max-w-md">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan ({planLabel(selectedPlan)})</span>
                <span>{fmtMoney(quote.planAmount)}</span>
              </div>
              {quote.addonsAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ek paketler (Şube dahil)</span>
                  <span>{fmtMoney(quote.addonsAmount)}</span>
                </div>
              )}
              {quote.proratedAmount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span className="flex items-center gap-1">Kalan Süre Farkı (Yükseltme)</span>
                  <span>+{fmtMoney(quote.proratedAmount)}</span>
                </div>
              )}
              {quote.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>İndirim</span>
                  <span>-{fmtMoney(quote.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span>Toplam (yıllık)</span>
                <span className="text-indigo-600">{fmtMoney(quote.totalAmount)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Fiyat hesaplanıyor…</p>
          )}

          <div className="mt-6">
            <LegalAgreementPanel context="subscription_checkout" onChange={onLegalChange} />
          </div>

          <button
            type="button"
            disabled={loading || !quote || !targetTenantId || !legalAccepted}
            onClick={checkout}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold bg-[#606BDF] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Sanal POS ile Öde
          </button>

          {!targetTenantId && (
            <p className="text-sm text-amber-700 mt-3">Ödeme için giriş yapın veya işletme seçin.</p>
          )}
        </section>
      </div>
    </>
  );
}
