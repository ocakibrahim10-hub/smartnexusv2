import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hızlı Satış (POS) Terminali',
  description: 'SmartERP Hızlı Satış Sistemi',
};

export default function POSTerminalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBF8FF] flex flex-col font-sans text-[#1B1B1F]">
      {children}
    </div>
  );
}
