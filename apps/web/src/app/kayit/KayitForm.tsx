'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Zap, ChevronLeft, ChevronRight, Building2, CreditCard } from 'lucide-react';
import { FormField, FormSelect } from '@/components/FormField';
import SubscriptionCheckoutPanel from '@/components/SubscriptionCheckoutPanel';
import { setSession } from '@/lib/auth';
import { platformApi } from '@/lib/api';
import { filterAddonsForPlan, planModulesFromPricing } from '@/lib/plan-addons';
import { purchasableExtraModulesFromPricing } from '@/lib/submodule-pricing';
import { PLAN_ORDER, planLabel } from '@/lib/plans';
import { documentsForContext } from '@/lib/legal-documents';
import type { LegalDocumentId } from '@/lib/legal-documents';
import { getApiBaseUrl } from '@/lib/api-url';

const STEPS = [
  { id: 1, label: 'İşletme Bilgileri', icon: Building2 },
  { id: 2, label: 'Paket ve Ödeme', icon: CreditCard },
] as const;

function parseApiError(err: unknown): string {
  const data = (err as any)?.response?.data;
  if (!data) return 'Kayıt veya ödeme başlatılamadı';
  if (Array.isArray(data.message)) return data.message.join(' · ');
  if (typeof data.message === 'string') return data.message;
  return 'Kayıt veya ödeme başlatılamadı';
}

export default function KayitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePlan = searchParams.get('plan') || 'BASIC';
  const preExtras = (searchParams.get('extras') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const validPlan = (PLAN_ORDER as readonly string[]).includes(prePlan) ? prePlan : 'BASIC';

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    taxNo: '',
    taxOffice: '',
    plan: validPlan,
  });
  const [pricing, setPricing] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedExtraModules, setSelectedExtraModules] = useState<string[]>(preExtras);
  const [extraBranchCount, setExtraBranchCount] = useState(0);
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [legalOk, setLegalOk] = useState(false);
  const [registerLegalDocs, setRegisterLegalDocs] = useState<LegalDocumentId[]>([]);
  const [payLegalDocs, setPayLegalDocs] = useState<LegalDocumentId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extensionMonths = 0;
  const includeAnnualRenewal = true;

  const onLegalChange = useCallback((ok: boolean, ids: LegalDocumentId[]) => {
    const dealerIds = documentsForContext('dealer_business').map((d) => d.id);
    const payIds = documentsForContext('subscription_checkout').map((d) => d.id);
    setLegalOk(ok);
    setRegisterLegalDocs(ids.filter((id) => dealerIds.includes(id)));
    setPayLegalDocs(ids.filter((id) => payIds.includes(id)));
  }, []);

  useEffect(() => {
    platformApi.getPublicPricing().then(setPricing).catch(() => {});
  }, []);

  useEffect(() => {
    const extras = purchasableExtraModulesFromPricing(pricing, form.plan);
    const allowedExtraIds = extras.map((m) => m.moduleId);
    setSelectedExtraModules((prev) => prev.filter((id) => allowedExtraIds.includes(id)));

    const mods = planModulesFromPricing(pricing, form.plan);
    const allowed = filterAddonsForPlan(
      mods,
      (pricing?.addons ?? []).filter((a: any) => a?.code !== 'EXTRA_BRANCH'),
    ).map((a: any) => a.code);
    setSelectedAddons((prev) => prev.filter((c) => allowed.includes(c)));
  }, [form.plan, pricing]);

  useEffect(() => {
    setQuoteLoading(true);
    platformApi
      .quoteSubscriptionPublic(form.plan, selectedAddons, extraBranchCount, {
        extensionMonths,
        billingMode: 'new',
        extraModuleIds: selectedExtraModules,
        includeAnnualRenewal,
      })
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setQuoteLoading(false));
  }, [form.plan, selectedAddons, selectedExtraModules, extraBranchCount]);

  const toggleExtraModule = (moduleId: string) => {
    setSelectedExtraModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    );
  };

  const canStep1 =
    form.name.trim().length >= 2 &&
    form.taxNo.trim().length >= 10 &&
    form.taxOffice.trim().length >= 2 &&
    form.city.trim().length >= 2 &&
    form.email.includes('@') &&
    form.phone.replace(/\D/g, '').length >= 10;

  const toggleAddon = (code: string) => {
    setSelectedAddons((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const submitPayment = async () => {
    if (!legalOk) {
      setError('Devam etmek için tüm sözleşmeleri okuyup onaylayın');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${getApiBaseUrl()}/auth/register-business`, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone,
        password: form.password.trim() || undefined,
        city: form.city.trim(),
        taxNo: form.taxNo.trim(),
        taxOffice: form.taxOffice.trim(),
        plan: form.plan,
        acceptedDocuments: registerLegalDocs,
      });
      setSession(res.data);

      const purchase = await platformApi.purchaseSubscription({
        tenantId: res.data.user.tenantId,
        plan: form.plan,
        addonCodes: selectedAddons,
        extraModuleIds: selectedExtraModules,
        extraBranchCount,
        extensionMonths,
        includeAnnualRenewal,
        billingMode: 'new',
        acceptedDocuments: payLegalDocs,
      });

      if (purchase.redirectUrl) {
        window.location.href = purchase.redirectUrl;
        return;
      }
      if (purchase.status === 'SUCCESS' || purchase.success) {
        router.push('/isletme/dashboard?payment=ok');
        return;
      }
      router.push(`/isletme/subscribe?plan=${form.plan}&payment=ok`);
    } catch (err: unknown) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8FF]">
      <header className="border-b border-[#EFEDF4] bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-[#1B1B1F]">
            <span className="w-9 h-9 rounded-xl bg-[#606BDF] text-white flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </span>
            SmartNexus
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/fiyatlandirma" className="text-[#606BDF] font-medium hover:underline">
              Fiyatlandırma
            </Link>
            <Link href="/isletme" className="text-[#777680] hover:text-[#1B1B1F]">
              Giriş
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1B1B1F]">İşletme Kaydı</h1>
          <p className="text-sm text-[#777680] mt-2 max-w-2xl">
            Bilgilerinizi girin, paket ve ek modülleri seçin. Ödeme onayından sonra admin olarak
            sisteme giriş yapabilirsiniz. Telefon numaranız kullanıcı adınızdır (başında 0 olmadan).
          </p>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`flex items-center gap-2 text-xs font-semibold ${
                  step >= s.id ? 'text-[#606BDF]' : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    step > s.id
                      ? 'bg-[#606BDF] text-white'
                      : step === s.id
                        ? 'bg-[#E0E0FF] text-[#3944B8]'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {s.id}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded ${step > s.id ? 'bg-[#606BDF]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-[#1B1B1F] mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#606BDF]" /> Firma bilgileri
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                label="Ticari Unvan *"
                className="input w-full sm:col-span-2"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn. ABC Ticaret Ltd. Şti."
              />
              <FormField
                label="VKN / TCKN *"
                className="input w-full"
                value={form.taxNo}
                onChange={(e) =>
                  setForm({ ...form, taxNo: e.target.value.replace(/\D/g, '').slice(0, 11) })
                }
              />
              <FormField
                label="Vergi Dairesi *"
                className="input w-full"
                value={form.taxOffice}
                onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
              />
              <FormField
                label="İl *"
                className="input w-full"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <FormField
                label="Telefon (giriş kullanıcı adı) *"
                className="input w-full"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="5xx xxx xx xx"
              />
              <FormField
                label="E-posta *"
                className="input w-full"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <FormField
                label="Şifre (isteğe bağlı)"
                className="input w-full sm:col-span-2"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Boş bırakırsanız telefon numaranız şifre olur"
                minLength={6}
              />
              <FormSelect
                label="Başlangıç paketi *"
                className="input w-full sm:col-span-2"
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
              >
                {PLAN_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {planLabel(p)}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex justify-end mt-8">
              <button
                type="button"
                disabled={!canStep1}
                onClick={() => setStep(2)}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                Paket ve ödemeye geç <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <SubscriptionCheckoutPanel
              title={`${planLabel(form.plan)} — yıllık abonelik`}
              subtitle="Paketinize dahil olmayan modülleri ekleyin. Kayıt sonrası 1 yıllık lisans otomatik başlar; uzatma işlemlerini panelden yapabilirsiniz."
              selectedPlan={form.plan}
              onPlanChange={(p) => setForm((f) => ({ ...f, plan: p }))}
              pricing={pricing}
              selectedAddons={selectedAddons}
              onToggleAddon={toggleAddon}
              selectedExtraModules={selectedExtraModules}
              onToggleExtraModule={toggleExtraModule}
              extraBranchCount={extraBranchCount}
              onExtraBranchChange={setExtraBranchCount}
              quote={quote}
              quoteLoading={quoteLoading}
              billingMode="new"
              extensionIndex={0}
              onExtensionIndexChange={() => {}}
              showLicenseDuration={false}
              onLegalChange={onLegalChange}
              onPay={submitPayment}
              payLoading={loading}
              payDisabled={!legalOk}
              payLabel="Kayıt Ol ve Ödeme Yap"
              legalContexts={['dealer_business', 'subscription_checkout']}
            />

            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1"
              onClick={() => setStep(1)}
            >
              <ChevronLeft size={16} /> Firma bilgilerine dön
            </button>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
