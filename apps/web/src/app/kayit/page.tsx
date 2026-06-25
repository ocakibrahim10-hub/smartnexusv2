import { Suspense } from 'react';
import KayitForm from './KayitForm';

export default function KayitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF8FF] flex items-center justify-center text-gray-500">
          Yükleniyor…
        </div>
      }
    >
      <KayitForm />
    </Suspense>
  );
}
