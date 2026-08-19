'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, Menu } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview Dashboard',
  '/workers': 'Worker & Team Directory',
  '/workers/new': 'Onboard Worker',
  '/businesses': 'Local Business Directory',
  '/tests': 'Trade Competency Tests',
  '/tests/new': 'Create Trade Test',
  '/assessments': 'Video Assessments',
  '/kaamcards': 'KaamCards Certification',
  '/moderation': 'Moderation Queue',
  '/analytics': 'Analytics & Insights',
  '/settings': 'System Settings',
};

export function Topbar({ onOpenNav }: { onOpenNav?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] || 'Dashboard';

  // Search jumps to the worker directory pre-filtered. Businesses have their
  // own search on /businesses, so this stays scoped to workers.
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/workers?search=${encodeURIComponent(q)}`);
  }

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[280px] z-40 h-16 flex items-center justify-between gap-3 px-4 sm:px-8 bg-white border-b border-[#e0e3e5] shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenNav}
          className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#464554] transition-colors lg:hidden flex-shrink-0"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-sm sm:text-base font-extrabold text-[#191c1e] tracking-tight truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        <form onSubmit={handleSearch} className="relative hidden md:block" role="search">
          <label htmlFor="global-search" className="sr-only">Search workers</label>
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#767586] pointer-events-none" />
          <input
            id="global-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search workers..."
            className="pl-9 pr-4 py-2 bg-[#f2f4f6] border border-[#e0e3e5] rounded-xl text-xs text-[#191c1e] placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] w-48 lg:w-64 transition-all"
          />
        </form>

        <Link
          href="/tests/new"
          className="px-3 sm:px-4 py-2 bg-[#4648d4] text-white hover:bg-[#3738b8] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Test</span>
        </Link>
      </div>
    </header>
  );
}
