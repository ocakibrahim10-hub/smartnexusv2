import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hızlı Satış (POS) Terminali',
  description: 'SmartERP Hızlı Satış Sistemi',
};

export default function POSTerminalLayout({ children }: { children: React.ReactNode }) {
  // No sidebar, no topbar, full screen container.
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {children}
    </div>
  );
}
