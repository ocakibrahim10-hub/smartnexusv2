'use client';

import LoginForm from '@/components/LoginForm';

export default function BayiLoginPage() {
  return (
    <LoginForm
      panel="bayi"
      allowPhone
      subtitle="İşletme satışları, hakediş takibi, abonelik yönetimi ve kontör alımları."
      demoAccounts={[
        {
          role: 'Bayi',
          email: 'bayi@demo.com',
          pass: '123456',
          variant: 'blue',
        },
      ]}
    />
  );
}
