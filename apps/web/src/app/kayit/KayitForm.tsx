'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Zap, ChevronLeft, ChevronRight, Building2, CreditCard } from 'lucide-react';
import { FormField, FormSelect } from '@/components/FormField';
import LegalAgreementPanel from '@/components/LegalAgreementPanel';
import SubscriptionCheckoutPanel from '@/components/SubscriptionCheckoutPanel';
import { setSession } from '@/lib/auth';
import { platformApi } from '@/lib/api';
import { extensionOptionsForMode } from '@/lib/subscription-billing';
import type { LegalDocumentId } from '@/lib/legal-documents';
import { PLAN_ORDER, planLabel } from '@/lib/plans';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const STEPS = [
  { id: 1, label: 'İşletme Bilgileri', icon: Building2 },
  { id: 2, label: 'Paket ve Ödeme', icon: CreditCard },
] as const;

export default function KayitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prePlan = searchParams.get('plan') || 'BASIC';
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
  const [extraBranchCount, setExtraBranchCount] = useState(0);
  const [extensionIndex, setExtensionIndex] = useState(0);
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [registerLegalOk, setRegisterLegalOk] = useState(false);
  const [registerLegalDocs, setRegisterLegalDocs] = useState<LegalDocumentId[]>([]);
  const [payLegalOk, setPayLegalOk] = useState(false);
  const [payLegalDocs, setPayLegalDocs] = useState<LegalDocumentId[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extensionOptions = useMemo(() => extensionOptionsForMode('new'), []);
  const selectedExtension = extensionOptions[extensionIndex] ?? extensionOptions[0];

  const onRegisterLegalChange = useCallback((ok: boolean, ids: LegalDocumentId[]) => {
    setRegisterLegalOk(ok);
    setRegisterLegalDocs(ids);
  }, []);

  const onPayLegalChange = useCallback((ok: boolean, ids: LegalDocumentId[]) => {
    setPayLegalOk(ok);
    setPayLegalDocs(ids);
  }, []);

  useEffect(() => {
    platformApi.getPublicPricing().then(setPricing).catch(() => {});
  }, []);

  useEffect(() => {
    setQuoteLoading(true);
    platformApi
      .quoteSubscriptionPublic(form.plan, selectedAddons, extraBranchCount, {
        extensionMonths: selectedExtension.months,
        billingMode: 'new',
      })
      .then(setQuote)
      .catch(() => setQuote(null))
      .finally(() => setQuoteLoading(false));
  }, [form.plan, selectedAddons, extraBranchCount, selectedExtension.months]);

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
    if (!registerLegalOk || !payLegalOk) {
      setError('Devam etmek için tüm sözleşmeleri okuyup onaylayın');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/register-business`, {
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
        extraBranchCount,
        extensionMonths: selectedExtension.months,
        includeAnnualRenewal: selectedExtension.includeAnnualRenewal,
        billingMode: 'new',
        acceptedDocuments: payLegalDocs,
      });

      if (purchase.redirectUrl) {
        window.location.href = purchase.redirectUrl;
        return;
      }
      router.push(`/isletme/subscribe?plan=${form.plan}&payment=ok`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kayıt veya ödeme başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8FF]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900">
            <Zap className="w-5 h-5 text-[#606BDF]" /> SmartNexus
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/fiyatlandirma" className="text-indigo-600 hover:underline">
              Fiyatlandırma
            </Link>
            <Link href="/isletme" className="text-gray-600 hover:text-gray-900">
              Giriş
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">İşletme Kaydı</h1>
        <p className="text-sm text-gray-500 mb-6">
          Bilgilerinizi girin, paketinizi seçin ve ödeme sonrası admin olarak sistemi kullanmaya
          başlayın. Giriş için telefon numaranız kullanıcı adınızdır (başında 0 olmadan).
        </p>

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  step >= s.id ? 'text-[#606BDF]' : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
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
                <div className={`h-px flex-1 ${step > s.id ? 'bg-[#606BDF]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card p-6">
            <div className="grid sm:grid-cols-2 gap-3">
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
                placeholder="5xx xxx xx xx — başında 0 yok"
              />
              <FormField
                label="E-posta *"
                className="input w-full sm:col-span-2"
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
                label="Abonelik Paketi *"
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

            <div className="flex justify-end mt-6">
              <button
                type="button"
                disabled={!canStep1}
                onClick={() => setStep(2)}
                className="btn-primary inline-flex items-center gap-1"
              >
                Devam <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <LegalAgreementPanel context="dealer_business" onChange={onRegisterLegalChange} />

            <SubscriptionCheckoutPanel
              title={`${planLabel(form.plan)} paketi`}
              subtitle="Ek modülleri seçin, tutarı görün ve güvenli ödeme ile kaydı tamamlayın."
              selectedPlan={form.plan}
              onPlanChange={(p) => setForm((f) => ({ ...f, plan: p }))}
              pricing={pricing}
              selectedAddons={selectedAddons}
              onToggleAddon={toggleAddon}
              extraBranchCount={extraBranchCount}
              onExtraBranchChange={setExtraBranchCount}
              quote={quote}
              quoteLoading={quoteLoading}
              billingMode="new"
              extensionIndex={extensionIndex}
              onExtensionIndexChange={setExtensionIndex}
              onLegalChange={onPayLegalChange}
              onPay={submitPayment}
              payLoading={loading}
              payDisabled={!registerLegalOk || !payLegalOk}
              payLabel="Kayıt Ol ve Ödeme Yap"
            />

            <div className="flex gap-3">
              <button
                type="button"
                className="btn-secondary inline-flex items-center gap-1"
                onClick={() => setStep(1)}
              >
                <ChevronLeft size={16} /> Geri
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
