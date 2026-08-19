import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';

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
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e2024',
              color: '#f2f4f6',
              fontSize: '13px',
              fontWeight: '500',
              borderRadius: '10px',
              border: '1px solid #2d3035',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#f2f4f6' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#f2f4f6' } },
          }}
        />
      </body>
    </html>
  );
}
