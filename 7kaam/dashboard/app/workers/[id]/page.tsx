'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { Worker } from '@/types';
import { cn, tierColor, statusColor, tradeLabel, formatDate } from '@/lib/utils';
import {
  CheckCircle2, Clock, ChevronDown, ChevronUp,
  Video, FileText, Briefcase, Calculator, Award, XCircle,
  Star, ExternalLink, Download, Copy, CheckCheck,
} from 'lucide-react';

const PIPELINE_STEPS = [
  { key: 'video', label: 'Video Upload',     desc: (w: Worker) => w.videoUrl ? 'Uploaded' : 'Pending' },
  { key: 'scored', label: 'Video Scored',    desc: (w: Worker) => w.videoScore != null ? `Score: ${Math.round(w.videoScore)}` : 'Pending' },
  { key: 'test',  label: 'Test Completed',   desc: (w: Worker) => w.testScore != null ? `Score: ${Math.round(w.testScore)}` : 'Pending' },
  { key: 'final', label: 'Score Computed',   desc: (w: Worker) => w.finalScore != null ? `${Math.round(w.finalScore)}/100` : 'Pending' },
  { key: 'card',  label: 'KaamCard Issued',  desc: (w: Worker) => w.kaamCardIssuedAt ? formatDate(w.kaamCardIssuedAt) : 'Pending' },
];

function stepDone(worker: Worker, key: string) {
  switch (key) {
    case 'video':  return !!worker.videoUrl;
    case 'scored': return worker.videoScore != null;
    case 'test':   return worker.testScore != null;
    case 'final':  return worker.finalScore != null;
    case 'card':   return !!worker.kaamCardIssuedAt;
    default: return false;
  }
}

function ScoreRing({ score }: { score: number }) {
  const r = 52, circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
      <circle
        cx="64" cy="64" r={r} fill="none" stroke="#0F6E56" strokeWidth="8"
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="64" y="60" textAnchor="middle" fill="white" fontSize="22" fontWeight="900">{Math.round(score)}</text>
      <text x="64" y="76" textAnchor="middle" fill="#6b7280" fontSize="10">/100</text>
    </svg>
  );
}

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [addHistoryOpen, setAddHistoryOpen] = useState(false);
  const [historyForm, setHistoryForm] = useState({ employerName: '', role: '', startDate: '', endDate: '', rating: '4', verified: false, employerPhone: '' });
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [copied, setCopied] = useState(false);
  const [testAssignOpen, setTestAssignOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);

  const { data: worker, isLoading } = useQuery<Worker>({
    queryKey: ['worker', id],
    queryFn: () => api.get(`/workers/${id}`).then(r => r.data),
  });

  const { data: testsData } = useQuery({
    queryKey: ['tests', 'active'],
    queryFn: () => api.get('/tests', { params: { isActive: 'true' } }).then(r => r.data),
  });

  const scoreVideo = useMutation({
    mutationFn: () => api.post(`/workers/${id}/score-video`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worker', id] }),
  });

  const computeScore = useMutation({
    mutationFn: () => api.post(`/workers/${id}/compute-score`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worker', id] }),
  });

  const issueKaamCard = useMutation({
    mutationFn: () => api.post(`/workers/${id}/issue-kaamcard`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worker', id] }),
  });

  const addWorkHistory = useMutation({
    mutationFn: () => api.post(`/workers/${id}/add-work-history`, { ...historyForm, rating: Number(historyForm.rating) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setAddHistoryOpen(false); },
  });

  const submitTest = useMutation({
    mutationFn: () => api.post(`/workers/${id}/submit-test`, { testId: selectedTestId, answers }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setTestAssignOpen(false); },
  });

  const revokeCard = useMutation({
    mutationFn: () => {
      const latestCard = worker?.kaamCards?.[0];
      return api.post(`/kaamcards/${latestCard?.id}/revoke`, { reason: revokeReason });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setRevokeOpen(false); },
  });

  function copyLink() {
    if (worker?.qrCodeUrl) {
      navigator.clipboard.writeText(worker.qrCodeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const selectedTest = testsData?.find((t: { id: string }) => t.id === selectedTestId);

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#0F6E56] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!worker) {
    return (
      <DashboardShell>
        <div className="text-center py-24 text-[#4b5563]">Worker not found. <Link href="/workers" className="text-[#0F6E56]">Go back</Link></div>
      </DashboardShell>
    );
  }

  const latestCard = worker.kaamCards?.[0];

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Top Hero Section */}
        <div className="glass-card p-6 fade-in">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {worker.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={worker.profilePhotoUrl} alt={worker.fullName} className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0F6E56] to-[#22c55e] flex items-center justify-center">
                  <span className="text-white font-black text-2xl">{worker.fullName[0]}</span>
                </div>
              )}
              {worker.aadhaarVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0F6E56] flex items-center justify-center" title="Aadhaar Verified">
                  <CheckCircle2 size={13} className="text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-2 mb-1">
                <h2 className="text-xl font-black text-white">{worker.fullName}</h2>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', statusColor(worker.status))}>{worker.status}</span>
                {worker.aadhaarVerified && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#0F6E56]/20 text-[#4ade80] border border-[#0F6E56]/30">✓ Aadhaar</span>
                )}
              </div>
              <p className="text-[#94a3b8] text-sm">{tradeLabel(worker.trade)} · {worker.city}{worker.locality ? `, ${worker.locality}` : ''}</p>
              <p className="text-[#4b5563] text-xs mt-1">{worker.phoneNumber}</p>
            </div>

            {/* Score Ring */}
            {worker.finalScore != null && (
              <div className="flex flex-col items-center gap-1">
                <ScoreRing score={worker.finalScore} />
                {worker.tier && (
                  <span className={cn('px-3 py-1 rounded-full text-xs font-bold border', tierColor(worker.tier))}>
                    {worker.tier}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Tracker */}
        <div className="glass-card p-5 fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">Certification Pipeline</h3>
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {PIPELINE_STEPS.map((step, i) => {
              const done = stepDone(worker, step.key);
              return (
                <div key={step.key} className="flex items-start flex-shrink-0">
                  <div className="flex flex-col items-center w-24">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2',
                      done ? 'bg-[#0F6E56] text-white' : 'bg-white/5 text-[#4b5563] border border-white/10'
                    )}>
                      {done ? <CheckCircle2 size={14} /> : <Clock size={12} />}
                    </div>
                    <p className="text-[10px] font-medium text-center text-white leading-tight">{step.label}</p>
                    <p className="text-[9px] text-[#4b5563] text-center mt-0.5">{step.desc(worker)}</p>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className={cn('mt-4 w-8 h-0.5 flex-shrink-0', done ? 'bg-[#0F6E56]' : 'bg-white/10')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 fade-in">
          {[
            { label: 'Video Score', value: worker.videoScore, date: worker.videoScoredAt, sub: 'AI Vision Model', icon: Video },
            { label: 'Test Score',  value: worker.testScore,  date: worker.testScoredAt,  sub: 'Groq LLaMA 3',    icon: FileText },
            { label: 'Work History',value: worker.workHistoryScore, date: null, sub: `${worker.workHistories?.length || 0} employer entries`, icon: Briefcase },
          ].map(({ label, value, date, sub, icon: Icon }) => (
            <div key={label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} className="text-[#0F6E56]" />
                <p className="text-xs font-semibold text-[#94a3b8]">{label}</p>
              </div>
              <p className="text-2xl font-black text-white">{value != null ? `${Math.round(value)}/100` : '—'}</p>
              <p className="text-[10px] text-[#4b5563] mt-1">{sub}</p>
              {date && <p className="text-[10px] text-[#4b5563]">{formatDate(date)}</p>}
            </div>
          ))}
        </div>

        {/* Action Panel */}
        <div className="glass-card p-5 fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <ActionBtn icon={Video} label="Score Video" color="blue" onClick={() => scoreVideo.mutate()} loading={scoreVideo.isPending} />
            <ActionBtn icon={FileText} label="Assign Test" color="purple" onClick={() => setTestAssignOpen(true)} />
            <ActionBtn icon={Briefcase} label="Add Work History" color="orange" onClick={() => setAddHistoryOpen(true)} />
            <ActionBtn icon={Calculator} label="Compute Score" color="teal" onClick={() => computeScore.mutate()} loading={computeScore.isPending} disabled={!worker.videoScore || !worker.testScore} />
            <ActionBtn icon={Award} label="Issue KaamCard" color="teal" onClick={() => issueKaamCard.mutate()} loading={issueKaamCard.isPending} disabled={!worker.finalScore} />
            {latestCard && !latestCard.isRevoked && (
              <ActionBtn icon={XCircle} label="Revoke KaamCard" color="red" onClick={() => setRevokeOpen(true)} />
            )}
          </div>
        </div>

        {/* Work History */}
        <div className="glass-card p-5 fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Work History</h3>
            <button onClick={() => setAddHistoryOpen(v => !v)} className="text-xs text-[#0F6E56] hover:text-[#4ade80] transition-colors">+ Add Entry</button>
          </div>

          {worker.workHistories && worker.workHistories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Employer', 'Role', 'Period', 'Rating', 'Verified'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-[#4b5563]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {worker.workHistories.map(wh => (
                    <tr key={wh.id} className="border-b border-white/5 hover:bg-white/3">
                      <td className="px-3 py-2 text-white font-medium">{wh.employerName}</td>
                      <td className="px-3 py-2 text-[#94a3b8]">{wh.role}</td>
                      <td className="px-3 py-2 text-[#6b7280]">{formatDate(wh.startDate)} — {wh.endDate ? formatDate(wh.endDate) : 'Present'}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={10} className={i < wh.rating ? 'text-yellow-400 fill-yellow-400' : 'text-[#374151]'} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {wh.verified ? <span className="text-green-400">✓</span> : <span className="text-[#4b5563]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-[#4b5563]">No work history entries yet.</p>}

          {addHistoryOpen && (
            <div className="mt-4 p-4 rounded-xl bg-white/3 border border-white/8 space-y-3 fade-in">
              <h4 className="text-xs font-semibold text-white">Add Work History Entry</h4>
              {[
                { label: 'Employer Name', key: 'employerName', type: 'text' },
                { label: 'Role', key: 'role', type: 'text' },
                { label: 'Employer Phone', key: 'employerPhone', type: 'tel' },
                { label: 'Start Date', key: 'startDate', type: 'date' },
                { label: 'End Date', key: 'endDate', type: 'date' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-[10px] text-[#6b7280] mb-0.5">{label}</label>
                  <input type={type} value={historyForm[key as keyof typeof historyForm] as string}
                    onChange={e => setHistoryForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-[#0F6E56]" />
                </div>
              ))}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] text-[#6b7280] mb-0.5">Rating (1–5)</label>
                  <input type="range" min={1} max={5} value={historyForm.rating}
                    onChange={e => setHistoryForm(f => ({ ...f, rating: e.target.value }))}
                    className="w-full accent-[#0F6E56]" />
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className={i < Number(historyForm.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-[#374151]'} />
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94a3b8]">
                  <input type="checkbox" checked={historyForm.verified}
                    onChange={e => setHistoryForm(f => ({ ...f, verified: e.target.checked }))}
                    className="accent-[#0F6E56]" />
                  Verified
                </label>
              </div>
              <button onClick={() => addWorkHistory.mutate()} disabled={addWorkHistory.isPending}
                className="px-4 py-1.5 rounded-lg bg-[#0F6E56] hover:bg-[#1a9070] disabled:opacity-50 text-white text-xs font-semibold transition-all">
                {addWorkHistory.isPending ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          )}
        </div>

        {/* Test History */}
        {worker.testSubmissions && worker.testSubmissions.length > 0 && (
          <div className="glass-card p-5 fade-in">
            <h3 className="text-sm font-semibold text-white mb-4">Test History</h3>
            <div className="space-y-2">
              {worker.testSubmissions.map(sub => (
                <div key={sub.id}>
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                  >
                    <FileText size={13} className="text-[#0F6E56]" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-white">{sub.test?.title || 'Trade Test'}</p>
                      <p className="text-[10px] text-[#4b5563]">{formatDate(sub.submittedAt)} · Status: {sub.status}</p>
                    </div>
                    <span className="text-sm font-bold text-[#4ade80]">{sub.rawScore != null ? `${Math.round(sub.rawScore)}/100` : '—'}</span>
                    {expandedSub === sub.id ? <ChevronUp size={12} className="text-[#4b5563]" /> : <ChevronDown size={12} className="text-[#4b5563]" />}
                  </div>
                  {expandedSub === sub.id && sub.aiEvaluation && (
                    <div className="mt-1 ml-4 p-3 rounded-lg bg-[#111827] border border-white/5 space-y-2 fade-in">
                      <p className="text-[10px] text-[#94a3b8] italic">{(sub.aiEvaluation as { overallFeedback: string }).overallFeedback}</p>
                      {(sub.aiEvaluation as { breakdown?: Array<{ question: string; workerAnswer: string; score: number; feedback: string }> }).breakdown?.map((b, i) => (
                        <div key={i} className="text-[10px] border-b border-white/5 pb-2">
                          <p className="text-[#94a3b8]">Q{i + 1}: {b.question}</p>
                          <p className="text-white">Answer: {b.workerAnswer} · Score: {b.score}/10</p>
                          <p className="text-[#6b7280]">{b.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KaamCard Preview */}
        {latestCard && (
          <div className="glass-card p-5 fade-in">
            <h3 className="text-sm font-semibold text-white mb-4">KaamCard</h3>
            <div className="bg-gradient-to-br from-[#0a2e25] to-[#0F6E56]/20 rounded-xl p-5 border border-[#0F6E56]/30">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[#4ade80] text-xs font-bold uppercase tracking-widest">7 Kaam Certified</p>
                  <p className="text-white font-black text-lg mt-0.5">{worker.fullName}</p>
                  <p className="text-[#94a3b8] text-xs">{tradeLabel(worker.trade)} · {worker.city}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{worker.finalScore ? Math.round(worker.finalScore) : '—'}</p>
                  <p className="text-[#4b5563] text-xs">/100</p>
                  {worker.tier && <span className={cn('px-2 py-0.5 rounded text-xs font-bold border', tierColor(worker.tier))}>{worker.tier}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                <div className="text-xs text-[#6b7280]">
                  <p>Issued: {formatDate(latestCard.issuedAt)}</p>
                  <p>Expires: {formatDate(latestCard.expiresAt)}</p>
                  <p className="mt-1">{latestCard.isRevoked ? <span className="text-red-400">● Revoked</span> : <span className="text-green-400">● Valid</span>}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  {latestCard.pdfUrl && (
                    <a href={latestCard.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F6E56] hover:bg-[#1a9070] text-white text-xs font-semibold transition-all">
                      <Download size={12} /> Download PDF
                    </a>
                  )}
                  <button onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all">
                    {copied ? <><CheckCheck size={12} /> Copied!</> : <><Copy size={12} /> Copy Link</>}
                  </button>
                  {worker.qrCodeUrl && (
                    <a href={worker.qrCodeUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all">
                      <ExternalLink size={12} /> Verify QR
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Assignment Modal */}
      {testAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-4">Assign & Submit Test</h3>
            <div className="mb-4">
              <label className="block text-xs text-[#94a3b8] mb-1">Select Test</label>
              <select
                value={selectedTestId}
                onChange={e => { setSelectedTestId(e.target.value); setAnswers([]); }}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#0F6E56]"
              >
                <option value="" className="bg-[#111827]">Choose a test...</option>
                {testsData?.map((t: { id: string; title: string; trade: string }) => (
                  <option key={t.id} value={t.id} className="bg-[#111827]">{t.title} ({t.trade})</option>
                ))}
              </select>
            </div>
            {selectedTest && (
              <div className="space-y-4">
                {(selectedTest.questions as Array<{ question: string; options: string[] }>).map((q, i) => (
                  <div key={i}>
                    <p className="text-xs text-white mb-2">Q{i + 1}: {q.question}</p>
                    <div className="space-y-1">
                      {q.options.map((opt: string) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white/5">
                          <input type="radio" name={`q-${i}`} value={opt}
                            checked={answers[i] === opt}
                            onChange={() => {
                              const a = [...answers];
                              a[i] = opt;
                              setAnswers(a);
                            }}
                            className="accent-[#0F6E56]" />
                          <span className="text-xs text-[#94a3b8]">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setTestAssignOpen(false)} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors">Cancel</button>
              <button
                onClick={() => submitTest.mutate()}
                disabled={submitTest.isPending || !selectedTestId}
                className="flex-1 py-2 rounded-lg bg-[#0F6E56] hover:bg-[#1a9070] disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {submitTest.isPending ? 'Evaluating...' : 'Submit & Evaluate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-white mb-2">Revoke KaamCard</h3>
            <p className="text-xs text-[#6b7280] mb-4">This action cannot be undone. The worker&apos;s KaamCard will be marked as revoked.</p>
            <textarea
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              placeholder="Reason for revocation (required)..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setRevokeOpen(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-white text-sm transition-colors">Cancel</button>
              <button onClick={() => revokeCard.mutate()} disabled={!revokeReason || revokeCard.isPending}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-all">
                {revokeCard.isPending ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function ActionBtn({ icon: Icon, label, color, onClick, loading, disabled }: {
  icon: React.ElementType; label: string; color: string; onClick: () => void; loading?: boolean; disabled?: boolean;
}) {
  const colorMap: Record<string, string> = {
    teal:   'bg-[#0F6E56]/20 text-[#4ade80] border-[#0F6E56]/30 hover:bg-[#0F6E56]/30',
    blue:   'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30',
    red:    'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-30 disabled:cursor-not-allowed',
        colorMap[color] || colorMap.teal
      )}
    >
      <Icon size={12} />
      {loading ? 'Processing...' : label}
    </button>
  );
}
