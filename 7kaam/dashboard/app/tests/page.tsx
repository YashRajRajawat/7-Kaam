'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { TradeTest } from '@/types';
import { Plus, ToggleLeft, ToggleRight, Trash2, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function TestsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({ trade: '', language: '' });

  const { data: tests, isLoading } = useQuery<TradeTest[]>({
    queryKey: ['tests', filter],
    queryFn: () => api.get('/tests', { params: filter }).then(r => r.data),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/tests/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests'] }),
  });

  const deleteTest = useMutation({
    mutationFn: (id: string) => api.delete(`/tests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tests'] }),
  });

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white">Trade Tests</h2>
          <p className="text-xs text-[#6b7280]">{tests?.length ?? 0} tests available</p>
        </div>
        <Link href="/tests/new" id="create-test-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F6E56] hover:bg-[#1a9070] text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#0F6E56]/30">
          <Plus size={14} />
          Create Test
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-4 flex gap-3">
        {[
          { label: 'Trade', key: 'trade', options: ['', 'ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER'] },
          { label: 'Language', key: 'language', options: ['', 'ENGLISH', 'HINDI', 'KANNADA', 'TAMIL'] },
        ].map(({ label, key, options }) => (
          <select
            key={key}
            value={filter[key as keyof typeof filter]}
            onChange={e => setFilter(f => ({ ...f, [key]: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#0F6E56] appearance-none"
          >
            {options.map(o => <option key={o} value={o} className="bg-[#111827]">{o || `All ${label}s`}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {['Title', 'Trade', 'Language', 'Questions', 'Created', 'Active', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5563] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5 animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-3 bg-white/5 rounded w-3/4" /></td>
                  ))}
                </tr>
              ))
            ) : tests?.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[#4b5563]">No tests yet. Create your first test!</td></tr>
            ) : (
              tests?.map(test => (
                <tr key={test.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-[#0F6E56]" />
                      <span className="text-white text-xs font-medium">{test.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">{test.trade.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">{test.language}</td>
                  <td className="px-4 py-3 text-xs text-white font-medium">{Array.isArray(test.questions) ? test.questions.length : '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#6b7280]">{formatDate(test.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive.mutate({ id: test.id, isActive: !test.isActive })}
                      className="transition-colors"
                    >
                      {test.isActive
                        ? <ToggleRight size={22} className="text-[#0F6E56]" />
                        : <ToggleLeft size={22} className="text-[#4b5563]" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => confirm('Delete this test?') && deleteTest.mutate(test.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[#6b7280] transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
