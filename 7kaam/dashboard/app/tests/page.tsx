'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { TradeTest } from '@/types';
import { Plus, ToggleLeft, ToggleRight, Trash2, FileText, ClipboardList, Filter, Video, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const PRACTICAL_VIDEO_PROMPTS = [
  {
    id: 'prompt-elec-01',
    trade: 'ELECTRICIAN',
    title: 'Conduit Wiring & MCB Distribution Switchboard Setup',
    durationSecs: 120,
    instructions: 'Record 2-minute video showing wire stripping, proper phase color code selection (Red/Yellow/Blue/Green), MCB terminal tightening, and continuity test.',
    rubrics: ['Safety Gloves & Insulated Tools (25%)', 'Clean Wire Stripping (25%)', 'MCB Terminal Tightening (25%)', 'Continuity & Voltage Test (25%)']
  },
  {
    id: 'prompt-plumb-01',
    trade: 'PLUMBER',
    title: 'CPVC Solvent Weld & Concealed Pipe Leak Hydro-Test',
    durationSecs: 120,
    instructions: 'Record 2-minute video demonstrating pipe deburring, heavy-duty CPVC orange solvent application, 90° elbow joint fit, and 5-bar leak test.',
    rubrics: ['Pipe Cut Squareness & Chamfer (25%)', 'Uniform Solvent Cement Coat (25%)', '30-Sec Hold Alignment (25%)', 'Zero-Leak Hydro Test (25%)']
  },
  {
    id: 'prompt-carp-01',
    trade: 'CARPENTER',
    title: 'Mortise & Tenon Wood Joint Assembly & Squareness',
    durationSecs: 120,
    instructions: 'Record 2-minute video showing chisel mortise cleaning, tenon joint snug fit, wood glue application, and Try Square 90° check.',
    rubrics: ['Chisel Precision & Clean Edge (25%)', 'Snug Friction Fit (25%)', 'Glue Spreading (25%)', '90° Try-Square Accuracy (25%)']
  },
  {
    id: 'prompt-ac-01',
    trade: 'AC_TECHNICIAN',
    title: 'Copper Pipe Flaring & Nitrogen Deep Vacuum Evacuation',
    durationSecs: 120,
    instructions: 'Record 2-minute video demonstrating copper tube reaming, flare tool execution, brass flare nut torque, and micron vacuum gauge reading.',
    rubrics: ['Reaming & Burr Removal (25%)', 'Smooth 45° Flare Lip (25%)', 'Flare Nut Torque (25%)', '<500 Micron Deep Vacuum (25%)']
  },
  {
    id: 'prompt-paint-01',
    trade: 'PAINTER',
    title: 'Wall Putty Sanding & Dual-Coat Primer Application',
    durationSecs: 120,
    instructions: 'Record 2-minute video demonstrating 180-grit wall putty levelling, dust wiping, roller load control, and uniform acrylic primer coat.',
    rubrics: ['Surface Moisture Check (25%)', 'Smooth Putty Sanding (25%)', 'Roller Nap Load (25%)', 'Uniform Wet Edge Coat (25%)']
  },
  {
    id: 'prompt-weld-01',
    trade: 'WELDER',
    title: '3G Vertical Up SMAW Arc Welding & Weave Bead Appearance',
    durationSecs: 120,
    instructions: 'Record 2-minute video showing E7018 arc strike, root pass weave motion, slag chipping hammer removal, and uniform bead inspection.',
    rubrics: ['Safety Helmet & Leather Gloves (25%)', 'Stable Arc Gap Control (25%)', 'Slag Clean Chipping (25%)', 'Zero Undercut Bead Finish (25%)']
  }
];

export default function TestsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'mcq' | 'video'>('mcq');
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

  const filteredPrompts = filter.trade
    ? PRACTICAL_VIDEO_PROMPTS.filter(p => p.trade === filter.trade)
    : PRACTICAL_VIDEO_PROMPTS;

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto space-y-6 fade-in">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4648d4] flex items-center justify-center text-white font-bold shadow-sm">
              <ClipboardList size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e] tracking-tight">Trade Assessments & Competency Library</h2>
              <p className="text-xs text-[#565e74]">
                {activeTab === 'mcq' ? `${tests?.length ?? 0} active MCQ written tests` : `${PRACTICAL_VIDEO_PROMPTS.length} practical video demonstration prompts`} available for workers
              </p>
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

        {/* Tab Toggle Navigation */}
        <div className="flex items-center gap-2 bg-[#f2f4f6] p-1.5 rounded-2xl border border-[#e0e3e5] w-fit">
          <button
            onClick={() => setActiveTab('mcq')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'mcq' ? 'bg-white text-[#4648d4] shadow-sm border border-[#e0e3e5]' : 'text-[#767586] hover:text-[#191c1e]'
            }`}
          >
            <FileText size={16} /> Written MCQ Tests ({tests?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'video' ? 'bg-white text-purple-600 shadow-sm border border-[#e0e3e5]' : 'text-[#767586] hover:text-[#191c1e]'
            }`}
          >
            <Video size={16} /> Practical Video Tasks & Prompts ({PRACTICAL_VIDEO_PROMPTS.length})
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Filter size={14} className="text-[#767586] ml-1" />
            <select
              value={filter.trade}
              onChange={e => setFilter(f => ({ ...f, trade: e.target.value }))}
              className="px-3.5 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-xs font-bold text-[#191c1e] focus:outline-none cursor-pointer"
            >
              <option value="">All Worker Trades</option>
              <option value="ELECTRICIAN">Electrician</option>
              <option value="PLUMBER">Plumber</option>
              <option value="CARPENTER">Carpenter</option>
              <option value="AC_TECHNICIAN">AC Technician</option>
              <option value="PAINTER">Painter</option>
              <option value="WELDER">Welder</option>
            </select>
          </div>
        </div>

        {/* Tab 1: MCQ Tests Table */}
        {activeTab === 'mcq' && (
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
                              <><ToggleRight size={22} className="text-[#059669]" /><span className="text-xs font-bold text-[#059669]">Active</span></>
                            ) : (
                              <><ToggleLeft size={22} className="text-[#767586]" /><span className="text-xs font-bold text-[#767586]">Inactive</span></>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => { if (confirm('Delete test?')) deleteTest.mutate(test.id); }}
                            className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-red-100 text-[#767586] hover:text-red-700 transition-colors"
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
        )}

        {/* Tab 2: Practical Video Tasks Grid */}
        {activeTab === 'video' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrompts.map(prompt => (
              <div key={prompt.id} className="bg-white rounded-2xl border border-[#e0e3e5] p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200 uppercase">
                      {prompt.trade.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-bold text-[#767586]">{prompt.durationSecs / 60} Min Max Video</span>
                  </div>

                  <h3 className="font-extrabold text-sm text-[#191c1e] leading-snug">{prompt.title}</h3>

                  <div className="bg-[#f8f9fa] border border-[#e0e3e5] rounded-xl p-3">
                    <p className="text-[10px] font-bold text-[#767586] uppercase mb-1">Mobile App Task Instructions</p>
                    <p className="text-xs text-[#565e74] font-medium leading-relaxed">{prompt.instructions}</p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-[#767586] uppercase flex items-center gap-1">
                      <Sparkles size={12} className="text-purple-600" /> Evaluation Rubric Weights
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {prompt.rubrics.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#565e74]">
                          <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#e0e3e5] flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">● Active on Mobile App</span>
                  <span className="text-[11px] font-bold text-[#4648d4]">35% Final Weight</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
