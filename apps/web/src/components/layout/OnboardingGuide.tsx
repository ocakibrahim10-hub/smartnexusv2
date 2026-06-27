/* eslint-disable jsx-a11y/control-has-associated-label, jsx-a11y/heading-has-content, jsx-a11y/alt-text, jsx-a11y/anchor-has-content, jsx-a11y/label-has-associated-control */
'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

const steps = [
  {
    title: 'SmartERP\'ye HoÅŸ Geldiniz! ğŸš€',
    description: 'Sistemi en verimli ÅŸekilde kullanmanÄ±z iÃ§in hazÄ±rladÄ±ÄŸÄ±mÄ±z bu kÄ±sa tura gÃ¶z atÄ±n. Verilerinizin tamamÄ± Ã¶rnek senaryolarla doldurulmuÅŸtur.',
  },
  {
    title: 'Muhasebe DerinliÄŸi ğŸ“Š',
    description: 'Sol menÃ¼den "Muhasebe" sekmesine tÄ±klayarak faturalarÄ±nÄ±zÄ± yÃ¶netebilir, BA/BS formlarÄ±nÄ± Ã§ekebilir ve KDV raporlarÄ±nÄ±zÄ± anlÄ±k olarak hesaplatabilirsiniz.',
  },
  {
    title: 'B2B ve SipariÅŸ YÃ¶netimi ğŸ¤',
    description: '"B2B" menÃ¼sÃ¼ altÄ±ndan mÃ¼ÅŸterilerinize Ã¶zel Fiyat Listeleri tanÄ±mlayabilir ve bayilerinizden gelen sipariÅŸleri onaylayÄ±p sevkiyata hazÄ±rlayabilirsiniz.',
  },
  {
    title: 'Ãœretim (MRP) ve Ä°ÅŸ Emirleri ğŸ­',
    description: 'Hammaddeden nihai Ã¼rÃ¼ne kadar olan tÃ¼m sÃ¼reÃ§leri "MRP" menÃ¼sÃ¼nde bulabilirsiniz. Ãœretim ReÃ§eteleri (BOM) tanÄ±mlayÄ±n ve Ä°ÅŸ Emirlerini buradan takip edin.',
  },
  {
    title: 'Envanter ve Depo ğŸ“¦',
    description: 'Stok hareketlerinizi, depo transferlerinizi ve sayÄ±m iÅŸlemlerinizi "Envanter" modÃ¼lÃ¼nden yÃ¶netin. Hangi Ã¼rÃ¼nÃ¼n nerede olduÄŸunu saniyeler iÃ§inde bulun.',
  },
  {
    title: 'HazÄ±rsÄ±nÄ±z! ğŸ‰',
    description: 'Sistem ÅŸu an 2800\'den fazla kayÄ±tla test etmeniz iÃ§in hazÄ±r. Sol menÃ¼den dilediÄŸiniz modÃ¼le tÄ±klayarak keÅŸfetmeye baÅŸlayabilirsiniz.',
  }
];

export default function OnboardingGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Sadece ilk giriÅŸte otomatik aÃ§Ä±lmasÄ± istenirse buraya eklenebilir.
    // Åimdilik test iÃ§in hep gÃ¶rÃ¼nÃ¼r olsun veya butona baÄŸlayalÄ±m.
    const hasSeenGuide = localStorage.getItem('smarterp_guide_seen');
    if (!hasSeenGuide) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('smarterp_guide_seen', 'true');
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center z-40"
        title="Sistem Kılavuzu"
        aria-label="Sistem Kılavuzunu Aç"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 relative">
              <button title="Kapat" aria-label="Kapat" 
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="mt-4">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex space-x-1">
                    {steps.map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-6 bg-indigo-600' : 'w-2 bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    {currentStep + 1} / {steps.length}
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-3">{steps[currentStep].title}</h2>
                <p className="text-gray-600 text-base leading-relaxed min-h-[80px]">
                  {steps[currentStep].description}
                </p>
              </div>

              <div className="mt-8 flex justify-between items-center">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center text-sm font-medium transition-colors ${currentStep === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-indigo-600'}`}
                 title="Buton">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Geri
                </button>
                
                <button
                  onClick={nextStep}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center transition-colors"
                 title="Buton">
                  {currentStep === steps.length - 1 ? (
                    <>BaÅŸla <CheckCircle className="w-4 h-4 ml-2" /></>
                  ) : (
                    <>Ä°leri <ChevronRight className="w-4 h-4 ml-2" /></>
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

