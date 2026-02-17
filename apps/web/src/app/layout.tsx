import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Ndiipano - Medical Home Care',
    template: '%s | Ndiipano',
  },
  description:
    'Connecting Zambian patients with verified healthcare practitioners for quality home-based medical care. Book home visits, virtual consultations, and manage your health records securely.',
  keywords: [
    'medical home care',
    'Zambia healthcare',
    'home visits',
    'virtual consultations',
    'practitioners',
    'Ndiipano',
    'telemedicine',
  ],
  authors: [{ name: 'Ndiipano Health' }],
  openGraph: {
    title: 'Ndiipano - Medical Home Care',
    description:
      'Connecting Zambian patients with verified healthcare practitioners for quality home-based medical care.',
    type: 'website',
    locale: 'en_ZM',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#fff',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
            },
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
