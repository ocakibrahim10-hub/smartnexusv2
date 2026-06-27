'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

const steps = [
  {
    title: 'SmartERP\'ye Hoş Geldiniz! 🚀',
    description: 'Sistemi en verimli şekilde kullanmanız için hazırladığımız bu kısa tura göz atın. Verilerinizin tamamı örnek senaryolarla doldurulmuştur.',
  },
  {
    title: 'Muhasebe Derinliği 📊',
    description: 'Sol menüden "Muhasebe" sekmesine tıklayarak faturalarınızı yönetebilir, BA/BS formlarını çekebilir ve KDV raporlarınızı anlık olarak hesaplatabilirsiniz.',
  },
  {
    title: 'B2B ve Sipariş Yönetimi 🤝',
    description: '"B2B" menüsü altından müşterilerinize özel Fiyat Listeleri tanımlayabilir ve bayilerinizden gelen siparişleri onaylayıp sevkiyata hazırlayabilirsiniz.',
  },
  {
    title: 'Üretim (MRP) ve İş Emirleri 🏭',
    description: 'Hammaddeden nihai ürüne kadar olan tüm süreçleri "MRP" menüsünde bulabilirsiniz. Üretim Reçeteleri (BOM) tanımlayın ve İş Emirlerini buradan takip edin.',
  },
  {
    title: 'Envanter ve Depo 📦',
    description: 'Stok hareketlerinizi, depo transferlerinizi ve sayım işlemlerinizi "Envanter" modülünden yönetin. Hangi ürünün nerede olduğunu saniyeler içinde bulun.',
  },
  {
    title: 'Hazırsınız! 🎉',
    description: 'Sistem şu an 2800\'den fazla kayıtla test etmeniz için hazır. Sol menüden dilediğiniz modüle tıklayarak keşfetmeye başlayabilirsiniz.',
  }
];

export default function OnboardingGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Sadece ilk girişte otomatik açılması istenirse buraya eklenebilir.
    // Şimdilik test için hep görünür olsun veya butona bağlayalım.
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
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 relative">
              <button title="İşlem" aria-label="İşlem" 
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
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Geri
                </button>
                
                <button
                  onClick={nextStep}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center transition-colors"
                >
                  {currentStep === steps.length - 1 ? (
                    <>Başla <CheckCircle className="w-4 h-4 ml-2" /></>
                  ) : (
                    <>İleri <ChevronRight className="w-4 h-4 ml-2" /></>
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
