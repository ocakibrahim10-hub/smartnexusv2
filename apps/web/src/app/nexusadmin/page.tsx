'use client';

import LoginForm from '@/components/LoginForm';

export default function NexusAdminLoginPage() {
  return (
    <LoginForm
      panel="nexusadmin"
      allowPhone
      subtitle="Platform yönetimi, bayi & işletme takibi, paket/modül yönetimi ve sistem sağlığı."
      demoAccounts={[
        {
          role: 'SuperAdmin',
          email: 'admin@smartnexus.com',
          pass: 'SmartNexus2026!',
          variant: 'purple',
        },
      ]}
    />
  );
}
