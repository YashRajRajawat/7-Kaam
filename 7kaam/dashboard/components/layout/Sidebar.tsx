'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Award,
  BarChart3,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',  label: 'Overview',   icon: LayoutDashboard },
  { href: '/workers',    label: 'Workers',     icon: Users },
  { href: '/tests',      label: 'Tests',       icon: ClipboardList },
  { href: '/kaamcards',  label: 'KaamCards',   icon: Award },
  { href: '/analytics',  label: 'Analytics',   icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAuthStore();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-[#111827] border-r border-white/5 fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F6E56] to-[#22c55e] flex items-center justify-center shadow-md shadow-[#0F6E56]/40">
          <span className="text-white font-black text-sm">7K</span>
        </div>
        <div>
          <p className="font-black text-white text-base leading-none">7 Kaam</p>
          <p className="text-[10px] text-[#0F6E56] font-medium mt-0.5">Admin Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-[#0F6E56]/20 text-[#4ade80] border border-[#0F6E56]/30'
                  : 'text-[#6b7280] hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={16} className={active ? 'text-[#4ade80]' : 'text-[#4b5563] group-hover:text-white'} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-[#4ade80]" />}
            </Link>
          );
        })}
      </nav>

      {/* Admin info + logout */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F6E56] to-[#22c55e] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">{admin?.email?.[0]?.toUpperCase() || 'A'}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{admin?.email}</p>
            <p className="text-[10px] text-[#4b5563]">{admin?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          id="logout-btn"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#6b7280] hover:text-red-400 hover:bg-red-500/10 w-full text-sm transition-all"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
