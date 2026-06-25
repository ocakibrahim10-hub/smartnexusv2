import { Suspense } from 'react';
import SubscribeCheckout from './SubscribeCheckout';

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Yükleniyor…</div>}>
      <SubscribeCheckout />
    </Suspense>
  );
}
