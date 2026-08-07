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
  Settings,
  LogOut,
  Plus,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',   label: 'Overview',    icon: LayoutDashboard },
  { href: '/workers',     label: 'Workers',      icon: Users },
  { href: '/tests',       label: 'Tests',        icon: ClipboardList },
  { href: '/kaamcards',   label: 'KaamCards',    icon: Award },
  { href: '/moderation',  label: 'Moderation',   icon: ShieldAlert },
  { href: '/analytics',   label: 'Analytics',    icon: BarChart3 },
  { href: '/settings',    label: 'Settings',     icon: Settings },
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
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-[#1e232a] text-white flex flex-col py-6 border-r border-slate-800 z-50 shadow-md">
      {/* Brand Header */}
      <div className="px-6 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#4648d4] flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-[#4648d4]/30">
          7K
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight leading-none">7 Kaam</h1>
          <p className="text-[11px] text-[#94a3b8] mt-1 font-medium">Enterprise Admin Portal</p>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="px-6 mb-6">
        <Link
          href="/workers/new"
          className="w-full py-2.5 px-4 bg-[#4648d4] hover:bg-[#3738b8] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#4648d4]/20 active:scale-[0.98]"
        >
          <Plus size={16} />
          Onboard Worker
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all group',
                active
                  ? 'bg-[#4648d4]/20 text-white border-l-4 border-[#4648d4]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#4648d4]/10 border-l-4 border-transparent'
              )}
            >
              <Icon size={18} className={active ? 'text-[#a5b4fc]' : 'text-[#64748b] group-hover:text-white'} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin Profile & Logout */}
      <div className="mt-auto px-4 pt-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-[#4648d4] flex items-center justify-center text-white font-bold text-xs">
            {admin?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{admin?.email || 'admin@7kaam.in'}</p>
            <p className="text-[10px] text-[#94a3b8] flex items-center gap-1 mt-0.5">
              <Shield size={10} className="text-[#a5b4fc]" />
              {admin?.role?.replace('_', ' ') || 'SUPER ADMIN'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#94a3b8] hover:text-red-400 hover:bg-red-500/10 w-full transition-all"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
