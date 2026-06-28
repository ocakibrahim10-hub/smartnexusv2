'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronRight, ChevronLeft, CheckCircle, Monitor, Users, Wallet, Package } from 'lucide-react';
import { panelNavigate } from '@/lib/panel-navigate';
import { getUser } from '@/lib/auth';

const steps = [
  {
    title: 'SmartNexus\'a Hoş Geldiniz',
    description:
      'İşletme paneliniz hazır. Bu kısa turda POS satışı, cari hesaplar ve stok modüllerini nasıl kullanacağınızı öğreneceksiniz.',
    icon: HelpCircle,
  },
  {
    title: 'POS Satış Ekranı',
    description:
      'Üst bardaki "POS\'u Aç" veya sol menüdeki "POS Satış" ile kasa ekranına geçin. Barkod okutun, ödeme alın, fiş yazdırın.',
    icon: Monitor,
    action: { label: 'POS\'a Git', href: '/pos' },
  },
  {
    title: 'Cari Listesi',
    description:
      'Müşteri ve tedarikçi hesaplarını "Cari Listesi" menüsünden yönetin. Bakiye, ekstre ve yaşlandırma raporlarını buradan takip edin.',
    icon: Users,
    action: { label: 'Cari Listesine Git', href: '/accounting/contacts' },
  },
  {
    title: 'Stok ve Muhasebe',
    description:
      'Ürün kartları, depo hareketleri, satış faturaları ve kasa işlemleri sol menüdeki ilgili modüllerden erişilebilir.',
    icon: Package,
  },
  {
    title: 'Kısayol Masaüstü',
    description:
      'Sık kullandığınız sayfaları sol menüden "+" ile masaüstüne ekleyin. Masaüstündeki kartlara tıklayarak hızlıca geçiş yapın.',
    icon: Wallet,
  },
  {
    title: 'Hazırsınız',
    description:
      'Menü dar moddaysa simgeye tıklayınca alt menü açılır. Sorun yaşarsanız sağ alttaki yardım simgesinden bu kılavuza dönebilirsiniz.',
    icon: CheckCircle,
  },
];

export default function OnboardingGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const panel = getUser()?.panel || 'isletme';

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('smartnexus_guide_seen');
    if (!hasSeenGuide) setIsOpen(true);
  }, []);

  const handleClose = () => {
    localStorage.setItem('smartnexus_guide_seen', 'true');
    setIsOpen(false);
  };

  const goTo = (path: string) => {
    handleClose();
    panelNavigate(path, panel as 'isletme');
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else handleClose();
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#606BDF] text-white p-4 rounded-full shadow-lg hover:opacity-90 transition-all flex items-center justify-center z-40"
        title="Sistem Kılavuzu"
        aria-label="Sistem kılavuzunu aç"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="modal-card max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="bg-[#606BDF] px-6 py-5 text-white relative">
              <button
                type="button"
                title="Kapat"
                aria-label="Kapat"
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <StepIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-white/80 font-medium">Başlangıç Kılavuzu</p>
                  <h2 className="text-lg font-bold">{step.title}</h2>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-1">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentStep ? 'w-6 bg-[#606BDF]' : 'w-2 bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-gray-400">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed min-h-[72px]">{step.description}</p>

              {'action' in step && step.action && (
                <button
                  type="button"
                  onClick={() => goTo(step.action!.href)}
                  className="mt-4 text-sm font-medium text-[#606BDF] hover:underline"
                >
                  {step.action.label} →
                </button>
              )}

              <div className="mt-6 flex justify-between items-center">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center text-sm font-medium ${
                    currentStep === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-[#606BDF]'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Geri
                </button>

                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-[#606BDF] hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium flex items-center"
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      Başla <CheckCircle className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      İleri <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
