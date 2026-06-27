/* eslint-disable jsx-a11y/control-has-associated-label, jsx-a11y/heading-has-content, jsx-a11y/alt-text, jsx-a11y/anchor-has-content, jsx-a11y/label-has-associated-control */
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

    // Alt hesaplar iÃ§in parentSubscriptionEndDate, ana iÅŸletme iÃ§in subscriptionEndDate kullanÄ±lÄ±r.
    // Ä°kisi de varsa (Ã¶rneÄŸin iÅŸletmenin de parent'Ä± yoksa) hangisi geÃ§erliyse ona bakÄ±lÄ±r.
    // Parent end date varsa hiyerarÅŸiden dolayÄ± onu baz alÄ±rÄ±z (Ã§Ã¼nkÃ¼ ÅŸubeler parent'a tabidir).
    const endDateStr = user.parentSubscriptionEndDate || user.subscriptionEndDate;
    if (!endDateStr) return;

    const end = new Date(endDateStr);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Son 5 gÃ¼n kala banner Ã§Ä±ksÄ±n (0 gÃ¼n kala zaten lockout olacak ama eÄŸer lockout sayfasÄ±nda deÄŸilsek burada da gÃ¶rebilir)
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
          DÄ°KKAT: Lisans sÃ¼renizin bitmesine <strong>{daysLeft} gÃ¼n</strong> kaldÄ±. Kesinti yaÅŸamamak iÃ§in lÃ¼tfen lisansÄ±nÄ±zÄ± yenileyin.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/isletme/subscribe')}
          className="px-3 py-1 bg-white text-red-600 rounded-md text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          Åimdi Yenile
        </button>
        <button title="Ä°ÅŸlem" aria-label="Ä°ÅŸlem"
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

