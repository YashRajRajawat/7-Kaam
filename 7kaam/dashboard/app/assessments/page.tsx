'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { Worker } from '@/types';
import { cn, tierColor, tradeLabel, formatDate } from '@/lib/utils';
import { Video, ShieldCheck, Star, Play, CheckCircle2, Sliders, Filter, Sparkles } from 'lucide-react';

export default function VideoAssessmentsPage() {
  const qc = useQueryClient();
  const [tradeFilter, setTradeFilter] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [newVideoScore, setNewVideoScore] = useState<number>(85);
  const [scoringSuccess, setScoringSuccess] = useState<string | null>(null);

  const { data: responseData, isLoading } = useQuery<any>({
    queryKey: ['workers', 'video', tradeFilter],
    queryFn: () => api.get('/workers', { params: { trade: tradeFilter || undefined, limit: 100 } }).then(r => r.data),
  });

  const workerList: Worker[] = Array.isArray(responseData)
    ? responseData
    : responseData?.data || [];
  const videoWorkers = workerList.filter(w => Boolean(w.videoUrl || w.videoScore !== null));

  const updateScore = useMutation({
    mutationFn: (data: { workerId: string; videoScore: number }) =>
      api.post(`/admin/workers/${data.workerId}/assess-video`, { videoScore: data.videoScore }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['workers'] });
      setScoringSuccess(`Video score updated to ${vars.videoScore}/100! KaamCard updated.`);
      setSelectedWorker(null);
      setTimeout(() => setScoringSuccess(null), 3000);
    },
  });

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto space-y-6 fade-in">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Video size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e] tracking-tight">Practical Video Assessments Moderation</h2>
              <p className="text-xs text-[#565e74]">{videoWorkers.length} trade video demonstrations available for review</p>
            </div>
          </div>

          {/* Trade Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#767586]" />
            <select
              value={tradeFilter}
              onChange={e => setTradeFilter(e.target.value)}
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

        {/* Success Banner */}
        {scoringSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 fade-in">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{scoringSuccess}</span>
          </div>
        )}

        {/* Video Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#e0e3e5] p-5 space-y-4 animate-pulse">
                <div className="h-44 bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))
          ) : videoWorkers.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white border border-[#e0e3e5] rounded-2xl">
              <Video size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-[#767586]">No video assessments found for this trade selection.</p>
            </div>
          ) : (
            videoWorkers.map(worker => {
              // Were `|| 80`, which turned a genuine 0 into 80 and showed 80 for
              // a worker who had never been scored.
              const videoScore = worker.videoScore == null ? null : Math.round(worker.videoScore);
              const finalScore = worker.finalScore == null ? null : Math.round(worker.finalScore);
              return (
                <div key={worker.id} className="bg-white rounded-2xl border border-[#e0e3e5] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                  {/* Embedded Player / Video Header */}
                  <div className="relative bg-slate-950 h-48 flex items-center justify-center overflow-hidden">
                    {worker.videoUrl ? (
                      <video
                        src={worker.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                        poster={worker.profilePhotoUrl || undefined}
                      />
                    ) : (
                      <div className="text-center text-slate-400 p-4">
                        <Play size={32} className="mx-auto text-slate-600 mb-1" />
                        <p className="text-[11px] font-bold">Practical Video Submission</p>
                      </div>
                    )}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-black/60 text-white backdrop-blur-md border border-white/20">
                      {tradeLabel(worker.trade)}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-[#191c1e]">{worker.fullName}</h3>
                        {worker.tier && (
                          <span className={cn('px-2.5 py-0.5 rounded text-[10px] font-bold border', tierColor(worker.tier))}>
                            {worker.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#565e74] mt-0.5">{worker.city} · Registered Worker</p>
                    </div>

                    {/* AI Rubrics Evaluation */}
                    <div className="bg-[#f8f9fa] border border-[#e0e3e5] rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#565e74] flex items-center gap-1">
                          <Sparkles size={12} className="text-purple-600" /> AI Rubric Score
                        </span>
                        <span className="font-black text-[#191c1e]">{videoScore == null ? 'Not scored' : `${videoScore}/100`}</span>
                      </div>
                      {/* The per-rubric breakdown that used to sit here was invented:
                          "Safety PPE" and "Tool Handling" were hardcoded 90 and 85,
                          "Technique" was the overall video score relabelled, and
                          "Finishing" was that score minus 2. Real rubric data lives on
                          VideoAssessment.rubricScores, which this page does not fetch,
                          so nothing truthful can be shown here yet. */}
                      <p className="text-[10px] text-[#767586]">
                        Per-rubric breakdown not available on this view.
                      </p>
                    </div>

                    {/* Score Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#e0e3e5]">
                      <div>
                        <p className="text-[10px] font-bold text-[#767586] uppercase">3-Signal Final Score</p>
                        <p className="text-base font-black text-[#4648d4]">{finalScore == null ? 'Not scored' : `${finalScore} / 100`}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedWorker(worker); setNewVideoScore(videoScore ?? 0); }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
                      >
                        <Sliders size={14} /> Review & Score
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Score Review Modal */}
        {selectedWorker && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#e0e3e5] shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-purple-600">
                <Video size={24} />
                <div>
                  <h3 className="text-base font-bold text-[#191c1e]">Evaluate {selectedWorker.fullName}</h3>
                  <p className="text-xs text-[#565e74]">{tradeLabel(selectedWorker.trade)} · {selectedWorker.city}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Assessed Video Score (0 - 100) *</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newVideoScore}
                    onChange={e => setNewVideoScore(Number(e.target.value))}
                    className="flex-1 accent-[#4648d4] cursor-pointer"
                  />
                  <span className="w-12 text-center text-sm font-black text-[#4648d4] bg-[#e1e0ff] py-1 rounded-lg">
                    {newVideoScore}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#e0e3e5] text-xs text-[#565e74] space-y-1">
                <p><strong className="text-[#191c1e]">3-Signal Weighting:</strong> Video (35%) + Test (45%) + Work History (20%)</p>
                <p>Submitting will immediately recalculate final score and update digital KaamCard.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedWorker(null)}
                  className="px-4 py-2 rounded-xl border border-[#e0e3e5] text-xs font-bold text-[#565e74] hover:bg-[#f2f4f6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateScore.mutate({ workerId: selectedWorker.id, videoScore: newVideoScore })}
                  disabled={updateScore.isPending}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  {updateScore.isPending ? 'Saving...' : 'Submit & Update KaamCard'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
