'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SubscriptionAlertBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    if (!user) return;

    // Alt hesaplar için parentSubscriptionEndDate, ana işletme için subscriptionEndDate kullanılır.
    // İkisi de varsa (örneğin işletmenin de parent'ı yoksa) hangisi geçerliyse ona bakılır.
    // Parent end date varsa hiyerarşiden dolayı onu baz alırız (çünkü şubeler parent'a tabidir).
    const endDateStr = user.parentSubscriptionEndDate || user.subscriptionEndDate;
    if (!endDateStr) return;

    const end = new Date(endDateStr);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Son 5 gün kala banner çıksın (0 gün kala zaten lockout olacak ama eğer lockout sayfasında değilsek burada da görebilir)
    if (diffDays <= 5 && diffDays > 0) {
      setDaysLeft(diffDays);
      const dismissed = sessionStorage.getItem('subAlertDismissed');
      if (dismissed !== 'true') {
        setIsVisible(true);
      }
    }
  }, []);

  if (!isVisible || daysLeft === null) return null;

  return (
    <div className="bg-red-500 text-white px-4 py-3 shadow-md flex items-center justify-between relative z-50">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" />
        <p className="font-medium">
          DİKKAT: Lisans sürenizin bitmesine <strong>{daysLeft} gün</strong> kaldı. Kesinti yaşamamak için lütfen lisansınızı yenileyin.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/isletme/subscribe')}
          className="px-3 py-1 bg-white text-red-600 rounded-md text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          Şimdi Yenile
        </button>
        <button title="İşlem" aria-label="İşlem"
          onClick={() => {
            setIsVisible(false);
            sessionStorage.setItem('subAlertDismissed', 'true');
          }}
          className="text-white hover:text-red-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
