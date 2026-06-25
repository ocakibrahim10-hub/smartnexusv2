'use client';

import LoginForm from '@/components/LoginForm';

export default function IsletmeLoginPage() {
  return (
    <LoginForm
      panel="isletme"
      allowPhone
      defaultMode="phone"
      subtitle="İşletme, şube ve alt bayi personeli — cep telefonu veya e-posta ile giriş."
      demoAccounts={[
        {
          role: 'İşletme',
          email: 'isletme@demo.com',
          pass: 'Isletme2026!',
          variant: 'emerald',
        },
      ]}
      phoneDemoAccounts={[
        {
          role: 'Kasiyer',
          phone: '5321234567',
          pass: 'Isletme2026!',
          variant: 'violet',
        },
        {
          role: 'Depo',
          phone: '5321234568',
          pass: 'Isletme2026!',
          variant: 'orange',
        },
        {
          role: 'Şoför',
          phone: '5321234569',
          pass: 'Isletme2026!',
          variant: 'sky',
        },
        {
          role: 'Personel',
          phone: '5321234570',
          pass: 'Isletme2026!',
          variant: 'blue',
        },
      ]}
    />
  );
}
