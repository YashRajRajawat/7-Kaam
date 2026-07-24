import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: '7 Kaam — Enterprise Skill Certification Workspace',
  description: 'AI-powered skill evaluation & certification platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} ${jakarta.variable} bg-[#f7f9fb] text-[#191c1e] min-h-screen antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
