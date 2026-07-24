'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, Search, Plus } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview Dashboard',
  '/workers': 'Worker & Team Directory',
  '/workers/new': 'Onboard Worker',
  '/tests': 'Trade Competency Tests',
  '/tests/new': 'Create Trade Test',
  '/kaamcards': 'KaamCards Certification',
  '/analytics': 'Analytics & Insights',
  '/settings': 'System Settings',
};

export function Topbar() {
  const pathname = usePathname();
  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] || 'Dashboard';

  return (
    <header className="fixed top-0 right-0 left-[280px] z-40 h-16 flex items-center justify-between px-8 bg-white border-b border-[#e0e3e5] shadow-sm">
      <h1 className="text-base font-extrabold text-[#191c1e] tracking-tight">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#767586]" />
          <input
            type="text"
            placeholder="Search workers, tests..."
            className="pl-9 pr-4 py-2 bg-[#f2f4f6] border border-[#e0e3e5] rounded-xl text-xs text-[#191c1e] placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] w-64 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#464554] transition-colors relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#4648d4]" />
        </button>

        {/* Action */}
        <Link
          href="/tests/new"
          className="px-4 py-2 bg-[#4648d4] text-white hover:bg-[#3738b8] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span>New Test</span>
        </Link>
      </div>
    </header>
  );
}
