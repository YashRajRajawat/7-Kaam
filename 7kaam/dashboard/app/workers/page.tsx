'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { Worker, PaginatedResponse } from '@/types';
import { cn, tierColor, statusColor, tradeLabel, formatScore, formatDate } from '@/lib/utils';
import {
  Plus, Search, ChevronLeft, ChevronRight, Eye,
  UserX, UserCheck, Award,
} from 'lucide-react';

const TRADES = ['', 'ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER'];
const TIERS = ['', 'BRONZE', 'SILVER', 'GOLD', 'EXPERT'];
const STATUSES = ['', 'PENDING', 'ACTIVE', 'SUSPENDED'];

export default function WorkersPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [trade, setTrade] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery<PaginatedResponse<Worker>>({
    queryKey: ['workers', search, trade, tier, status, page],
    queryFn: () =>
      api.get('/workers', { params: { search, trade, tier, status, page, limit } })
         .then(r => r.data),
    placeholderData: prev => prev,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/workers/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workers'] }),
  });

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white">Workers</h2>
          <p className="text-xs text-[#6b7280]">{data?.total ?? 0} total registered</p>
        </div>
        <Link
          href="/workers/new"
          id="onboard-worker-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F6E56] hover:bg-[#1a9070] text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#0F6E56]/30"
        >
          <Plus size={14} />
          Onboard Worker
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or phone..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#0F6E56] transition-colors"
            />
          </div>

          {[
            { value: trade, onChange: setTrade, options: TRADES, label: 'Trade' },
            { value: tier,  onChange: setTier,  options: TIERS,  label: 'Tier' },
            { value: status, onChange: setStatus, options: STATUSES, label: 'Status' },
          ].map(({ value, onChange, options, label }) => (
            <select
              key={label}
              value={value}
              onChange={e => { onChange(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#0F6E56] transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#111827]">All {label}s</option>
              {options.filter(Boolean).map(o => (
                <option key={o} value={o} className="bg-[#111827]">{tradeLabel(o)}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Worker', 'Trade', 'City', 'Score', 'Status', 'KaamCard', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5563] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5 animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-3 bg-white/5 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#4b5563]">No workers found. Onboard your first worker!</td>
                </tr>
              ) : (
                data?.data?.map(worker => (
                  <tr key={worker.id} className="border-b border-white/5 hover:bg-white/3 transition-colors group">
                    {/* Avatar + Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F6E56] to-[#22c55e] flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">{worker.fullName[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-white text-xs">{worker.fullName}</p>
                          <p className="text-[10px] text-[#4b5563]">{worker.phoneNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#94a3b8]">{tradeLabel(worker.trade)}</td>
                    <td className="px-4 py-3 text-xs text-[#94a3b8]">{worker.city}</td>
                    {/* Score + tier */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{formatScore(worker.finalScore)}</span>
                        {worker.tier && (
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border', tierColor(worker.tier))}>
                            {worker.tier}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', statusColor(worker.status))}>
                        {worker.status}
                      </span>
                    </td>
                    {/* KaamCard */}
                    <td className="px-4 py-3">
                      {worker.kaamCardIssuedAt ? (
                        <div className="flex items-center gap-1 text-green-400 text-xs">
                          <Award size={12} />
                          <span className="hidden sm:inline">{formatDate(worker.kaamCardIssuedAt)}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#4b5563]">Not issued</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => router.push(`/workers/${worker.id}`)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#0F6E56]/20 hover:text-[#4ade80] text-[#6b7280] transition-colors"
                          title="View"
                        >
                          <Eye size={13} />
                        </button>
                        {worker.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => toggleStatus.mutate({ id: worker.id, status: 'ACTIVE' })}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-green-500/20 hover:text-green-400 text-[#6b7280] transition-colors"
                            title="Activate"
                          >
                            <UserCheck size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleStatus.mutate({ id: worker.id, status: 'SUSPENDED' })}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[#6b7280] transition-colors"
                            title="Suspend"
                          >
                            <UserX size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-[#4b5563]">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, data?.total || 0)} of {data?.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} className="text-white" />
              </button>
              <span className="px-3 py-1 text-xs text-white">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} className="text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
