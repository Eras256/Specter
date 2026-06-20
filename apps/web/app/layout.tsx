import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Nav } from '@/components/Nav';
import { SuppressExtensionNoise } from '@/components/SuppressExtensionNoise';
import { AuthProvider } from '@/lib/auth';
import { LanguageProvider } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'Specter — security for AI agents that spend money',
  description:
    'AI agents are starting to spend real money — and one poisoned web page can trick one into paying a scammer. Specter catches the hijack, stops the payment before it happens, and leaves proof you can check.',
  metadataBase: new URL('https://specter-ia.vercel.app'),
  openGraph: {
    title: 'Specter — security for AI agents that spend money',
    description: 'Watch Specter catch a hijacked AI agent — live. Catch it, stop it, prove it.',
    type: 'website',
    url: 'https://specter-ia.vercel.app',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <LanguageProvider>
          <AuthProvider>
            <SuppressExtensionNoise />
            <Nav />
            <main>{children}</main>
            <Footer />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
