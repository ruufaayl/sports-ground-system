import type { Metadata } from 'next';
import { Bebas_Neue, Roboto_Flex } from 'next/font/google';
import './globals.css';
import GlobalCursor from './components/GlobalCursor';
import ParticleField from './components/ParticleField';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const robotoFlex = Roboto_Flex({
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Executive Champions Field — Book Your Ground',
  description: '5 Premium Football Grounds • Karachi • 24/7 Open • Instant Confirmation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${robotoFlex.variable}`}>
      <body>
        <GlobalCursor />
        <ParticleField />
        {children}
      </body>
    </html>
  );
}
