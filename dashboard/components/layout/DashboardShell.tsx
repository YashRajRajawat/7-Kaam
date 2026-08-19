'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated } = useAuthStore();

  // The sidebar is a permanent column from lg up and an overlay drawer below it.
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Close the drawer on navigation so it never covers the page it just opened.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  // Escape closes the drawer, matching the modals elsewhere in the app.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb]">
        <div className="w-8 h-8 border-2 border-[#4648d4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <Topbar onOpenNav={() => setNavOpen(true)} />
      <main className="lg:ml-[280px] pt-16 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
