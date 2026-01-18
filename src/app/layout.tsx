import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vexyl.io';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'VEXYL | Solana Portfolio OS',
    template: '%s | VEXYL',
  },
  description:
    'Your portfolio story, told through time. A cyberpunk timeline-first portfolio tracker for Solana. Track transactions, analyze holdings, reclaim dust, and get AI insights.',
  keywords: [
    'Solana',
    'Portfolio',
    'Tracker',
    'NFT',
    'DeFi',
    'Timeline',
    'Helius',
    'Crypto',
    'Web3',
    'Wallet',
    'SOL',
    'Token',
    'Analytics',
  ],
  authors: [{ name: 'VEXYL', url: SITE_URL }],
  creator: 'VEXYL',
  publisher: 'VEXYL',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'VEXYL',
    title: 'VEXYL | Solana Portfolio OS',
    description: 'Your portfolio story, told through time. A cyberpunk timeline-first portfolio tracker for Solana.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'VEXYL - Solana Portfolio OS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VEXYL | Solana Portfolio OS',
    description: 'Your portfolio story, told through time. A cyberpunk timeline-first portfolio tracker for Solana.',
    images: ['/og-image.png'],
    creator: '@vexyl_io',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#050a12' },
    { media: '(prefers-color-scheme: light)', color: '#050a12' },
  ],
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'VEXYL',
  description: 'Your portfolio story, told through time. A cyberpunk timeline-first portfolio tracker for Solana.',
  url: SITE_URL,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Solana wallet tracking',
    'Transaction timeline',
    'Portfolio analytics',
    'Dust account reclamation',
    'AI-powered insights',
    'NFT tracking',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
