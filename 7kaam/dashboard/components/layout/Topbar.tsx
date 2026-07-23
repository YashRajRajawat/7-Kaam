'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/workers': 'Workers',
  '/workers/new': 'Onboard Worker',
  '/tests': 'Trade Tests',
  '/tests/new': 'Create Test',
  '/kaamcards': 'KaamCards',
  '/analytics': 'Analytics',
};

export function Topbar() {
  const pathname = usePathname();
  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] || 'Dashboard';

  return (
    <header className="fixed top-0 right-0 left-60 z-20 h-14 flex items-center justify-between px-6 bg-[#0a0e13]/80 backdrop-blur-md border-b border-white/5">
      <h1 className="text-base font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Search hint */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-[#4b5563] text-xs cursor-pointer hover:bg-white/8 transition-colors">
          <Search size={12} />
          <span>Search workers...</span>
          <kbd className="ml-1 px-1 py-0.5 rounded bg-white/10 text-[10px]">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <Bell size={14} className="text-[#6b7280]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0F6E56]" />
        </button>
      </div>
    </header>
  );
}
