import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';

export const metadata: Metadata = {
  title: {
    default: 'SmartNexus',
    template: '%s | SmartNexus',
  },
  description: 'SmartNexus — ERP · WMS · TMS · B2B SaaS Platformu',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SmartNexus',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
  keywords: ['erp', 'wms', 'tms', 'b2b', 'saas', 'fatura', 'stok', 'muhasebe'],
};

export const viewport: Viewport = {
  themeColor: '#606BDF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
