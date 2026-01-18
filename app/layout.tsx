import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Quicksand, Fredoka } from 'next/font/google';
import AuthProvider from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/sonner';

const quicksand = Quicksand({ 
  subsets: ['latin'],
  variable: '--font-quicksand',
  weight: ['400', '500', '600', '700'],
});

const fredoka = Fredoka({ 
  subsets: ['latin'],
  variable: '--font-fredoka',
  weight: ['300', '400', '500', '600', '700'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://talka.app'),
  title: 'LockN - Language Learning',
  description: 'Unlock authentic conversations through immersive, story-driven language mastery.',
  openGraph: {
    images: [
      {
        url: process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/og-image.png`
          : '/og-image.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: process.env.NEXT_PUBLIC_SITE_URL 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/og-image.png`
          : '/og-image.png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Blocking script to prevent theme flash - runs before first paint
  // Default to dark mode for both users and guests if no preference is saved
  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('lockn-theme');
        // Default to dark mode if no saved preference exists
        if (theme === 'dark' || !theme) {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" className={`${quicksand.variable} ${fredoka.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={quicksand.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
