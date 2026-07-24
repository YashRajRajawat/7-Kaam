'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { TradeTest } from '@/types';
import { Plus, ToggleLeft, ToggleRight, Trash2, FileText, ClipboardList, Filter } from 'lucide-react';
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
      <div className="space-y-6 fade-in">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4648d4] flex items-center justify-center text-white font-bold shadow-sm">
              <ClipboardList size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e] tracking-tight">Trade Competency Tests</h2>
              <p className="text-xs text-[#565e74]">{tests?.length ?? 0} active MCQ test evaluations available</p>
            </div>
          </div>
          <Link
            href="/tests/new"
            id="create-test-btn"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus size={16} />
            Create New Trade Test
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Filter size={14} className="text-[#767586] ml-1" />
            {[
              { label: 'Trade', key: 'trade', options: ['', 'ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER'] },
              { label: 'Language', key: 'language', options: ['', 'ENGLISH', 'HINDI', 'KANNADA', 'TAMIL'] },
            ].map(({ label, key, options }) => (
              <select
                key={key}
                value={filter[key as keyof typeof filter]}
                onChange={e => setFilter(f => ({ ...f, [key]: e.target.value }))}
                className="px-3.5 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-xs text-[#191c1e] focus:outline-none focus:border-[#4648d4] cursor-pointer"
              >
                {options.map(o => <option key={o} value={o} className="bg-white">{o ? o.replace('_', ' ') : `All ${label}s`}</option>)}
              </select>
            ))}
          </div>
        </div>

        {/* Tests Data Table */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e3e5] bg-[#f2f4f6]">
                  {['Test Title', 'Trade', 'Language', 'Question Count', 'Created Date', 'Active Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-[#767586] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e5]">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-3 bg-[#f2f4f6] rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : tests?.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-[#767586] text-xs">No trade tests found matching criteria.</td></tr>
                ) : (
                  tests?.map(test => (
                    <tr key={test.id} className="hover:bg-[#f7f9fb] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#e1e0ff] text-[#4648d4] flex items-center justify-center flex-shrink-0">
                            <FileText size={14} />
                          </div>
                          <span className="text-[#191c1e] text-xs font-bold group-hover:text-[#4648d4] transition-colors">{test.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#565e74] font-semibold">{test.trade.replace('_', ' ')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#e1e0ff] text-[#4648d4] border border-indigo-200">
                          {test.language}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#191c1e] font-bold">{Array.isArray(test.questions) ? test.questions.length : '—'} Questions</td>
                      <td className="px-6 py-4 text-xs text-[#767586]">{formatDate(test.createdAt)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActive.mutate({ id: test.id, isActive: !test.isActive })}
                          className="flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {test.isActive ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#d1fae5] text-[#059669] border border-emerald-200">
                              <ToggleRight size={18} className="text-[#059669]" />
                              <span>Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f2f4f6] text-[#767586] border border-gray-200">
                              <ToggleLeft size={18} className="text-[#767586]" />
                              <span>Inactive</span>
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => confirm('Delete this trade test?') && deleteTest.mutate(test.id)}
                          className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-red-100 hover:text-red-700 text-[#565e74] transition-colors"
                          title="Delete Test"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
