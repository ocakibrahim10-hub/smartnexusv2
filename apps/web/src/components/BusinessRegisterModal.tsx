'use client';

import { useCallback, useState } from 'react';
import { Building2, CreditCard, FileText, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { FormField, FormSelect } from '@/components/FormField';
import LegalAgreementPanel from '@/components/LegalAgreementPanel';
import type { LegalDocumentId } from '@/lib/legal-documents';
import { planLabel } from '@/lib/plans';

export type BusinessRegisterForm = {
  name: string;
  city: string;
  email: string;
  phone: string;
  taxNo: string;
  taxOffice: string;
  plan: string;
};

const INITIAL: BusinessRegisterForm = {
  name: '',
  city: '',
  email: '',
  phone: '',
  taxNo: '',
  taxOffice: '',
  plan: 'BASIC',
};

type Props = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (form: BusinessRegisterForm, acceptedDocuments: LegalDocumentId[]) => void;
};

const STEPS = [
  { id: 1, label: 'İşletme Bilgileri', icon: Building2 },
  { id: 2, label: 'Sözleşmeler', icon: FileText },
  { id: 3, label: 'Ödeme', icon: CreditCard },
] as const;

export default function BusinessRegisterModal({ open, saving, onClose, onSubmit }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<BusinessRegisterForm>(INITIAL);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [acceptedDocuments, setAcceptedDocuments] = useState<LegalDocumentId[]>([]);

  const onLegalChange = useCallback((ok: boolean, ids: LegalDocumentId[]) => {
    setLegalAccepted(ok);
    setAcceptedDocuments(ids);
  }, []);

  const reset = () => {
    setStep(1);
    setForm(INITIAL);
    setLegalAccepted(false);
    setAcceptedDocuments([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canStep1 =
    form.name.trim().length >= 2 &&
    form.taxNo.trim().length >= 10 &&
    form.taxOffice.trim().length >= 2 &&
    form.city.trim().length >= 2;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50"
      onClick={handleClose}
    >
      <div
        className="modal-card w-full max-w-2xl max-h-[min(92vh,900px)] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-[#EFEDF4]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Yeni İşletme Kaydı</h2>
              <p className="text-xs text-gray-500 mt-1">
                Kayıt sonrası seçilen paket için Sanal POS ödeme ekranına yönlendirilirsiniz.
                Ödeme onayı gelmeden işletme aktif olmaz.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium truncate ${
                    step >= s.id ? 'text-[#606BDF]' : 'text-gray-400'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                      step > s.id
                        ? 'bg-[#606BDF] text-white'
                        : step === s.id
                          ? 'bg-[#E0E0FF] text-[#3944B8]'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {s.id}
                  </span>
                  <span className="hidden sm:inline truncate">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 ${step > s.id ? 'bg-[#606BDF]' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <FormField
                label="Ticari Unvan *"
                className="input w-full sm:col-span-2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Örn. ABC Ticaret Ltd. Şti."
              />
              <FormField
                label="VKN / TCKN *"
                className="input w-full"
                value={form.taxNo}
                onChange={(e) => setForm((f) => ({ ...f, taxNo: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                placeholder="10 veya 11 hane"
              />
              <FormField
                label="Vergi Dairesi *"
                className="input w-full"
                value={form.taxOffice}
                onChange={(e) => setForm((f) => ({ ...f, taxOffice: e.target.value }))}
              />
              <FormField
                label="İl *"
                className="input w-full"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <FormField
                label="Telefon"
                className="input w-full"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="5xx xxx xx xx"
              />
              <FormField
                label="E-posta"
                className="input w-full sm:col-span-2"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <FormSelect
                label="Abonelik Paketi *"
                className="input w-full sm:col-span-2"
                value={form.plan}
                onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              >
                <option value="BASIC">Basic — Temel ERP</option>
                <option value="PROFESSIONAL">Profesyonel — Gelişmiş modüller</option>
                <option value="PLATINUM">Platinyum — Tam kapsam</option>
              </FormSelect>
            </div>
          )}

          {step === 2 && (
            <LegalAgreementPanel context="dealer_business" onChange={onLegalChange} />
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#EFEDF4] bg-[#FBF8FF] p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Kayıt Özeti</h3>
                <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-gray-400">İşletme</dt>
                    <dd className="text-gray-900 font-medium">{form.name}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">VKN</dt>
                    <dd className="text-gray-900 font-medium">{form.taxNo}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Vergi Dairesi</dt>
                    <dd className="text-gray-900">{form.taxOffice}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">İl</dt>
                    <dd className="text-gray-900">{form.city}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-gray-400">Paket</dt>
                    <dd className="text-[#606BDF] font-semibold">{planLabel(form.plan)} (yıllık)</dd>
                  </div>
                </dl>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                &quot;Kayıt Et ve Öde&quot; ile işletme pasif olarak oluşturulur; ardından Sanal POS
                ödeme sayfasına yönlendirilirsiniz. Ödeme onayı sonrası paket aktif edilir ve
                işletme paneli kullanıma açılır.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-[#EFEDF4] flex gap-3 bg-white rounded-b-2xl">
          {step > 1 ? (
            <button
              type="button"
              className="btn-secondary flex items-center justify-center gap-1"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
            >
              <ChevronLeft size={16} /> Geri
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={handleClose}>
              İptal
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              className="btn-primary flex-1 flex items-center justify-center gap-1"
              disabled={step === 1 ? !canStep1 : !legalAccepted}
              onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
            >
              Devam <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={saving || !legalAccepted}
              onClick={() => onSubmit(form, acceptedDocuments)}
            >
              <CreditCard size={16} />
              {saving ? 'Yönlendiriliyor…' : 'Kayıt Et ve Öde'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
