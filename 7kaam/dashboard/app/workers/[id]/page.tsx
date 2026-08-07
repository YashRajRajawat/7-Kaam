'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { Worker, SkillCertificate } from '@/types';
import { cn, tierColor, statusColor, tradeLabel, formatDate } from '@/lib/utils';
import {
  CheckCircle2, Clock, ChevronDown, ChevronUp, ChevronLeft,
  Video, FileText, Briefcase, Calculator, Award, XCircle,
  ExternalLink, Download, Copy, CheckCheck, UserX, UserCheck,
  ShieldAlert, BadgeCheck,
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
      <circle cx="64" cy="64" r={r} fill="none" stroke="#e0e3e5" strokeWidth="8" />
      <circle
        cx="64" cy="64" r={r} fill="none" stroke="#4648d4" strokeWidth="8"
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="64" y="60" textAnchor="middle" fill="#191c1e" fontSize="22" fontWeight="900">{Math.round(score)}</text>
      <text x="64" y="76" textAnchor="middle" fill="#767586" fontSize="10">/100</text>
    </svg>
  );
}

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [addHistoryOpen, setAddHistoryOpen] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    clientName: '', clientType: 'HOUSEHOLD', clientPhone: '', clientCity: '',
    projectTitle: '', projectDescription: '', startDate: '', endDate: '',
    projectScale: 'SMALL', isVerified: false,
  });
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [copied, setCopied] = useState(false);
  const [testAssignOpen, setTestAssignOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [manualVideoScore, setManualVideoScore] = useState('');
  const [videoScoreNotes, setVideoScoreNotes] = useState('');
  const [issueCardOpen, setIssueCardOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [recertOpen, setRecertOpen] = useState(false);
  const [recertTestIds, setRecertTestIds] = useState<string[]>([]);
  const [recertReason, setRecertReason] = useState('');

  const { data: worker, isLoading } = useQuery<Worker>({
    queryKey: ['worker', id],
    queryFn: () => api.get(`/workers/${id}`).then(r => r.data),
  });

  const { data: testsData } = useQuery({
    queryKey: ['tests', 'active'],
    queryFn: () => api.get('/tests', { params: { isActive: 'true' } }).then(r => r.data),
  });

  const { data: certificates } = useQuery<SkillCertificate[]>({
    queryKey: ['worker', id, 'certificates'],
    queryFn: () => api.get(`/workers/${id}/certificates`).then(r => r.data),
  });

  const scoreVideo = useMutation({
    mutationFn: (data?: { score?: number; notes?: string }) => api.post(`/workers/${id}/score-video`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setManualVideoScore(''); setVideoScoreNotes(''); toast.success('Video scored successfully'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to score video'),
  });

  const computeScore = useMutation({
    mutationFn: () => api.post(`/workers/${id}/compute-score`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); toast.success('Score recomputed'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to compute score'),
  });

  const issueKaamCard = useMutation({
    mutationFn: () => api.post(`/admin/workers/${id}/issue-kaamcard`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setIssueCardOpen(false); toast.success('KaamCard issued! Worker is now certified.'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to issue KaamCard'),
  });

  const suspendWorker = useMutation({
    mutationFn: () => api.post(`/admin/workers/${id}/suspend`, { reason: suspendReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setSuspendOpen(false); setSuspendReason(''); toast.success('Worker suspended'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to suspend worker'),
  });

  const reactivateWorker = useMutation({
    mutationFn: () => api.post(`/admin/workers/${id}/reactivate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); toast.success('Worker reactivated'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to reactivate worker'),
  });

  const requireRecertification = useMutation({
    mutationFn: () => api.post(`/admin/workers/${id}/require-recertification`, { testIds: recertTestIds, reason: recertReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setRecertOpen(false); setRecertTestIds([]); setRecertReason(''); toast.success('Worker flagged for recertification'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to require recertification'),
  });

  const addWorkHistory = useMutation({
    mutationFn: () => api.post(`/workers/${id}/add-work-history`, historyForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setAddHistoryOpen(false); toast.success('Work history added'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to add work history'),
  });

  const submitTest = useMutation({
    mutationFn: () => api.post(`/workers/${id}/submit-test`, { testId: selectedTestId, answers }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setTestAssignOpen(false); toast.success('Test submitted & scored'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to submit test'),
  });

  const revokeCard = useMutation({
    mutationFn: () => {
      const latestCard = worker?.kaamCards?.[0];
      if (!latestCard?.id) throw new Error('No active KaamCard to revoke.');
      return api.post(`/admin/kaamcards/${latestCard.id}/revoke`, { reason: revokeReason });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worker', id] }); setRevokeOpen(false); toast.success('KaamCard revoked'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to revoke KaamCard'),
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
          <div className="w-8 h-8 border-2 border-[#4648d4] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!worker) {
    return (
      <DashboardShell>
        <div className="text-center py-24 text-[#565e74]">Worker not found. <Link href="/workers" className="text-[#4648d4] font-bold">Go back</Link></div>
      </DashboardShell>
    );
  }

  const latestCard = worker.kaamCards
    ? [...worker.kaamCards].sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())[0]
    : undefined;

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto space-y-5 fade-in">
        {/* Top Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/workers')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#e0e3e5] hover:bg-[#e1e0ff] text-[#191c1e] hover:text-[#4648d4] text-xs font-bold transition-colors shadow-sm"
          >
            <ChevronLeft size={14} /> Back to Directory
          </button>
        </div>

        {/* Top Hero Section */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {worker.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={worker.profilePhotoUrl} alt={worker.fullName} className="w-20 h-20 rounded-2xl object-cover border border-[#e0e3e5]" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#4648d4] flex items-center justify-center shadow-sm">
                  <span className="text-white font-black text-2xl">{worker.fullName[0]}</span>
                </div>
              )}
              {worker.aadhaarVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#059669] flex items-center justify-center border-2 border-white shadow-sm" title="Aadhaar Verified">
                  <CheckCircle2 size={13} className="text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-2 mb-1">
                <h2 className="text-xl font-black text-[#191c1e]">{worker.fullName}</h2>
                <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold border', statusColor(worker.status))}>{worker.status}</span>
                {worker.underReview && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <ShieldAlert size={12} /> Under Review
                  </span>
                )}
                {worker.aadhaarVerified && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#d1fae5] text-[#059669] border border-emerald-200 font-bold">✓ Aadhaar Verified</span>
                )}
              </div>
              <p className="text-[#565e74] text-xs font-semibold">{tradeLabel(worker.trade)} · {worker.city}{worker.locality ? `, ${worker.locality}` : ''}</p>
              <p className="text-[#767586] text-xs mt-1 font-mono">{worker.phoneNumber}</p>
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
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[#191c1e] mb-4">Certification Pipeline</h3>
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {PIPELINE_STEPS.map((step, i) => {
              const done = stepDone(worker, step.key);
              return (
                <div key={step.key} className="flex items-start flex-shrink-0">
                  <div className="flex flex-col items-center w-28">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-all',
                      done ? 'bg-[#4648d4] text-white shadow-sm' : 'bg-[#f2f4f6] text-[#767586] border border-[#e0e3e5]'
                    )}>
                      {done ? <CheckCircle2 size={14} /> : <Clock size={12} />}
                    </div>
                    <p className="text-xs font-bold text-center text-[#191c1e] leading-tight">{step.label}</p>
                    <p className="text-[11px] text-[#767586] text-center mt-0.5">{step.desc(worker)}</p>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className={cn('mt-4 w-8 h-0.5 flex-shrink-0', done ? 'bg-[#4648d4]' : 'bg-[#e0e3e5]')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Skill Demonstration Video Player */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Video size={16} className="text-[#4648d4]" />
            <h3 className="text-sm font-bold text-[#191c1e]">Skill Demonstration Video</h3>
          </div>
          {worker.videoUrl ? (
            <div className="space-y-3">
              <video
                src={worker.videoUrl}
                controls
                className="w-full max-h-64 rounded-xl border border-[#e0e3e5] bg-black"
              />
              <div className="flex flex-wrap items-end gap-3 bg-[#f8f9fa] p-3 rounded-xl border border-[#e0e3e5]">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[11px] font-bold text-[#565e74] mb-1">Manual Video Score (0–100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={manualVideoScore}
                    onChange={e => setManualVideoScore(e.target.value)}
                    placeholder="e.g. 85"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#e0e3e5] text-xs font-bold text-[#191c1e]"
                  />
                </div>
                <div className="flex-[2] min-w-[180px]">
                  <label className="block text-[11px] font-bold text-[#565e74] mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={videoScoreNotes}
                    onChange={e => setVideoScoreNotes(e.target.value)}
                    placeholder="Reviewer notes..."
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#e0e3e5] text-xs text-[#191c1e]"
                  />
                </div>
                <button
                  onClick={() => scoreVideo.mutate({ score: Number(manualVideoScore), notes: videoScoreNotes || undefined })}
                  disabled={!manualVideoScore || scoreVideo.isPending}
                  className="px-4 py-2 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {scoreVideo.isPending ? 'Saving...' : 'Submit Video Score'}
                </button>
              </div>
              <p className="text-[10px] text-[#767586]">Video scoring is admin-manual only — there is no automated CV model yet.</p>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#f8f9fa] text-center border border-[#e0e3e5]">
              <Video size={24} className="mx-auto text-[#767586] mb-2" />
              <p className="text-xs font-bold text-[#191c1e]">No skill video uploaded yet</p>
              <p className="text-[11px] text-[#767586] mt-0.5">Worker can upload a 60-second practical demonstration video via the Worker Mobile App.</p>
            </div>
          )}
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Video Score', value: worker.videoScore, date: worker.videoScoredAt, sub: 'AI Vision Model', icon: Video },
            { label: 'Test Score',  value: worker.testScore,  date: worker.testScoredAt,  sub: 'Groq LLaMA 3',    icon: FileText },
            { label: 'Work History',value: worker.workHistoryScore, date: null, sub: `${worker.workHistories?.length || 0} employer entries`, icon: Briefcase },
          ].map(({ label, value, date, sub, icon: Icon }) => (
            <div key={label} className="bg-white border border-[#e0e3e5] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className="text-[#4648d4]" />
                <p className="text-xs font-bold text-[#767586]">{label}</p>
              </div>
              <p className="text-2xl font-black text-[#191c1e]">{value != null ? `${Math.round(value)}/100` : '—'}</p>
              <p className="text-[11px] text-[#565e74] mt-1">{sub}</p>
              {date && <p className="text-[10px] text-[#767586]">{formatDate(date)}</p>}
            </div>
          ))}
        </div>

        {/* Action Panel */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[#191c1e] mb-4">Actions</h3>
          <div className="flex flex-wrap gap-2.5">
            <ActionBtn icon={FileText} label="Assign Test" color="purple" onClick={() => setTestAssignOpen(true)} />
            <ActionBtn icon={Briefcase} label="Add Work History" color="orange" onClick={() => setAddHistoryOpen(true)} />
            <ActionBtn icon={Calculator} label="Compute Score" color="teal" onClick={() => computeScore.mutate()} loading={computeScore.isPending} disabled={!worker.videoScore || !worker.testScore} />
            <ActionBtn icon={Award} label="Issue KaamCard" color="teal" onClick={() => setIssueCardOpen(true)} disabled={!worker.finalScore} />
            {latestCard && !latestCard.isRevoked && (
              <ActionBtn icon={XCircle} label="Revoke KaamCard" color="red" onClick={() => setRevokeOpen(true)} />
            )}
            <ActionBtn icon={ShieldAlert} label="Require Recertification" color="orange" onClick={() => setRecertOpen(true)} />
            {worker.status === 'SUSPENDED' ? (
              <ActionBtn icon={UserCheck} label="Reactivate Worker" color="teal" onClick={() => reactivateWorker.mutate()} loading={reactivateWorker.isPending} />
            ) : (
              <ActionBtn icon={UserX} label="Suspend Worker" color="red" onClick={() => setSuspendOpen(true)} />
            )}
          </div>
        </div>

        {/* Work History */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#191c1e]">Work History</h3>
            <button onClick={() => setAddHistoryOpen(v => !v)} className="text-xs text-[#4648d4] hover:underline font-bold transition-colors">+ Add Entry</button>
          </div>

          {worker.workHistories && worker.workHistories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#e0e3e5] bg-[#f2f4f6]">
                    {['Client', 'Project', 'Period', 'Scale', 'Verified'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-bold text-[#767586] uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e3e5]">
                  {worker.workHistories.map(wh => (
                    <tr key={wh.id} className="hover:bg-[#f7f9fb]">
                      <td className="px-3 py-2.5 text-[#191c1e] font-bold">
                        {wh.clientName}
                        <p className="text-[10px] text-[#767586] font-normal">{wh.clientType} · {wh.clientCity}</p>
                      </td>
                      <td className="px-3 py-2.5 text-[#565e74] font-medium">
                        {wh.projectTitle}
                        {wh.projectDescription && <p className="text-[10px] text-[#767586] font-normal">{wh.projectDescription}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-[#767586]">
                        {formatDate(wh.startDate)} — {wh.endDate ? formatDate(wh.endDate) : 'Present'}
                        <p className="text-[10px]">{wh.durationMonths} mo</p>
                      </td>
                      <td className="px-3 py-2.5 text-[#565e74]">{wh.projectScale}</td>
                      <td className="px-3 py-2.5">
                        {wh.isVerified ? <span className="text-[#059669] font-bold">✓</span> : <span className="text-[#767586]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-xs text-[#767586]">No work history entries yet.</p>}

          {addHistoryOpen && (
            <div className="mt-4 p-4 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] space-y-3 fade-in">
              <h4 className="text-xs font-bold text-[#191c1e]">Add Work History Entry</h4>
              {[
                { label: 'Client Name', key: 'clientName', type: 'text' },
                { label: 'Client City', key: 'clientCity', type: 'text' },
                { label: 'Client Phone', key: 'clientPhone', type: 'tel' },
                { label: 'Project Title', key: 'projectTitle', type: 'text' },
                { label: 'Project Description', key: 'projectDescription', type: 'text' },
                { label: 'Start Date', key: 'startDate', type: 'date' },
                { label: 'End Date', key: 'endDate', type: 'date' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-[#565e74] mb-1">{label}</label>
                  <input type={type} value={historyForm[key as keyof typeof historyForm] as string}
                    onChange={e => setHistoryForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e3e5] text-[#191c1e] text-xs focus:outline-none focus:border-[#4648d4]" />
                </div>
              ))}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-[#565e74] mb-1">Client Type</label>
                  <select value={historyForm.clientType}
                    onChange={e => setHistoryForm(f => ({ ...f, clientType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e3e5] text-[#191c1e] text-xs">
                    {['HOUSEHOLD', 'BUSINESS', 'CONTRACTOR'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-[#565e74] mb-1">Project Scale</label>
                  <select value={historyForm.projectScale}
                    onChange={e => setHistoryForm(f => ({ ...f, projectScale: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e3e5] text-[#191c1e] text-xs">
                    {['SMALL', 'MEDIUM', 'LARGE'].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#565e74] font-bold self-end pb-2">
                  <input type="checkbox" checked={historyForm.isVerified}
                    onChange={e => setHistoryForm(f => ({ ...f, isVerified: e.target.checked }))}
                    className="accent-[#4648d4] w-4 h-4 rounded" />
                  Verified
                </label>
              </div>
              <button onClick={() => addWorkHistory.mutate()} disabled={addWorkHistory.isPending}
                className="px-4 py-2 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm">
                {addWorkHistory.isPending ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          )}
        </div>

        {/* Test History */}
        {worker.testSubmissions && worker.testSubmissions.length > 0 && (
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#191c1e] mb-4">Test History</h3>
            <div className="space-y-2">
              {worker.testSubmissions.map(sub => (
                <div key={sub.id}>
                  <div
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] cursor-pointer hover:bg-[#e1e0ff]/30 transition-colors"
                    onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                  >
                    <FileText size={14} className="text-[#4648d4]" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[#191c1e]">{sub.test?.title || 'Trade Test'}</p>
                      <p className="text-[11px] text-[#767586]">{formatDate(sub.submittedAt)} · Status: {sub.status}</p>
                    </div>
                    <span className="text-xs font-black text-[#059669]">{sub.rawScore != null ? `${Math.round(sub.rawScore)}/100` : '—'}</span>
                    {expandedSub === sub.id ? <ChevronUp size={14} className="text-[#767586]" /> : <ChevronDown size={14} className="text-[#767586]" />}
                  </div>
                  {expandedSub === sub.id && sub.aiEvaluation && (
                    <div className="mt-2 ml-4 p-4 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] space-y-2 fade-in">
                      <p className="text-xs text-[#565e74] italic font-medium">{(sub.aiEvaluation as { overallFeedback: string }).overallFeedback}</p>
                      {(sub.aiEvaluation as { breakdown?: Array<{ question: string; workerAnswer: string; score: number; feedback: string }> }).breakdown?.map((b, i) => (
                        <div key={i} className="text-xs border-b border-[#e0e3e5] pb-2">
                          <p className="text-[#191c1e] font-bold">Q{i + 1}: {b.question}</p>
                          <p className="text-[#565e74]">Answer: {b.workerAnswer} · Score: {b.score}/10</p>
                          <p className="text-[#767586] text-[11px]">{b.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certificates */}
        {certificates && certificates.length > 0 && (
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#191c1e] mb-4 flex items-center gap-2">
              <BadgeCheck size={16} className="text-[#4648d4]" />
              Skill Certificates ({certificates.length})
            </h3>
            <div className="flex flex-wrap gap-3">
              {certificates.map(c => (
                <div key={c.id} className="min-w-[180px] p-3 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5]">
                  <p className="text-xs font-bold text-[#191c1e]">{c.testTitle}</p>
                  <p className="text-[11px] text-[#565e74] mt-0.5">{c.category} · {c.difficulty}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-black text-[#059669]">{Math.round(c.score)}/100</span>
                    <span className="text-[10px] text-[#767586]">{formatDate(c.issuedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KaamCard Preview */}
        {latestCard && (
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#191c1e] mb-4">KaamCard Verification</h3>
            <div className="bg-gradient-to-br from-[#1e232a] to-[#2d3440] rounded-xl p-6 border border-slate-700 shadow-md text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[#4ade80] text-xs font-bold uppercase tracking-widest">7 Kaam Certified</p>
                  <p className="text-white font-black text-lg mt-0.5">{worker.fullName}</p>
                  <p className="text-slate-300 text-xs">{tradeLabel(worker.trade)} · {worker.city}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white">{worker.finalScore ? Math.round(worker.finalScore) : '—'}</p>
                  <p className="text-slate-400 text-xs">/100</p>
                  {worker.tier && <span className={cn('px-2 py-0.5 rounded text-xs font-bold border', tierColor(worker.tier))}>{worker.tier}</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-700">
                <div className="text-xs text-slate-400">
                  <p>Issued: {formatDate(latestCard.issuedAt)}</p>
                  <p className="mt-0.5">{latestCard.isRevoked ? <span className="text-red-400 font-bold">● Revoked</span> : <span className="text-emerald-400 font-bold">● Valid</span>}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  {latestCard.pdfUrl && (
                    <a href={latestCard.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold transition-all shadow-sm">
                      <Download size={12} /> Download PDF
                    </a>
                  )}
                  <button onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all">
                    {copied ? <><CheckCheck size={12} className="text-emerald-400" /> Copied!</> : <><Copy size={12} /> Copy Link</>}
                  </button>
                  {worker.qrCodeUrl && (
                    <a href={worker.qrCodeUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#191c1e]">Assign & Submit Test</h3>
            <div>
              <label className="block text-xs font-bold text-[#565e74] mb-1.5">Select Test</label>
              <select
                value={selectedTestId}
                onChange={e => { setSelectedTestId(e.target.value); setAnswers([]); }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs focus:outline-none focus:border-[#4648d4]"
              >
                <option value="" className="bg-white text-[#191c1e]">Choose a test...</option>
                {testsData?.map((t: { id: string; title: string; trade: string }) => (
                  <option key={t.id} value={t.id} className="bg-white text-[#191c1e]">{t.title} ({t.trade})</option>
                ))}
              </select>
            </div>
            {selectedTest && (
              <div className="space-y-4 pt-2">
                {(selectedTest.questions as Array<{ question: string; options: string[] }>).map((q, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5]">
                    <p className="text-xs font-bold text-[#191c1e] mb-2">Q{i + 1}: {q.question}</p>
                    <div className="space-y-1.5">
                      {q.options.map((opt: string) => (
                        <label key={opt} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-[#e1e0ff]/30 transition-colors">
                          <input type="radio" name={`q-${i}`} value={opt}
                            checked={answers[i] === opt}
                            onChange={() => {
                              const a = [...answers];
                              a[i] = opt;
                              setAnswers(a);
                            }}
                            className="accent-[#4648d4]" />
                          <span className="text-xs text-[#565e74] font-semibold">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => setTestAssignOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors">Cancel</button>
              <button
                onClick={() => submitTest.mutate()}
                disabled={submitTest.isPending || !selectedTestId}
                className="flex-1 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
              >
                {submitTest.isPending ? 'Evaluating...' : 'Submit & Evaluate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <XCircle size={18} />
              Revoke KaamCard
            </h3>
            <p className="text-xs text-[#565e74]">This action cannot be undone. The worker&apos;s KaamCard will be marked as revoked immediately.</p>
            <textarea
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              placeholder="Reason for revocation (required)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => setRevokeOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors">Cancel</button>
              <button onClick={() => revokeCard.mutate()} disabled={!revokeReason || revokeCard.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm">
                {revokeCard.isPending ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue KaamCard Modal */}
      {issueCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
              <Award size={18} className="text-[#059669]" />
              Issue KaamCard to {worker.fullName}?
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Video Score', value: worker.videoScore },
                { label: 'Test Score', value: worker.testScore },
                { label: 'Work History Score', value: worker.workHistoryScore },
                { label: 'Final Score', value: worker.finalScore },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5]">
                  <p className="text-[10px] font-bold text-[#767586] uppercase">{label}</p>
                  <p className="text-lg font-black text-[#191c1e]">{value != null ? Math.round(value) : '—'}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#767586]">Score is recomputed from all current assessments at the moment of issuance.</p>
            {issueKaamCard.isError && (
              <p className="text-xs text-red-600 font-semibold">
                {(issueKaamCard.error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not issue KaamCard.'}
              </p>
            )}
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => setIssueCardOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors">Cancel</button>
              <button onClick={() => issueKaamCard.mutate()} disabled={issueKaamCard.isPending}
                className="flex-1 py-2.5 rounded-xl bg-[#059669] hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm">
                {issueKaamCard.isPending ? 'Issuing...' : 'Confirm Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <UserX size={18} />
              Suspend {worker.fullName}?
            </h3>
            <p className="text-xs text-[#565e74]">The worker will immediately disappear from customer discovery and cannot take new tests until reactivated.</p>
            <textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension (required)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => setSuspendOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors">Cancel</button>
              <button onClick={() => suspendWorker.mutate()} disabled={!suspendReason || suspendWorker.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm">
                {suspendWorker.isPending ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Require Recertification Modal */}
      {recertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-xl space-y-4">
            <h3 className="text-base font-bold text-amber-700 flex items-center gap-2">
              <ShieldAlert size={18} />
              Require Recertification
            </h3>
            <p className="text-xs text-[#565e74]">Worker stays listed with an &quot;Under Review&quot; badge until they pass every test selected below.</p>
            <div>
              <label className="block text-xs font-bold text-[#565e74] mb-1.5">Tests worker must retake</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5]">
                {testsData?.map((t: { id: string; title: string; trade: string }) => (
                  <label key={t.id} className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-lg hover:bg-white text-xs text-[#191c1e]">
                    <input type="checkbox" checked={recertTestIds.includes(t.id)}
                      onChange={e => setRecertTestIds(ids => e.target.checked ? [...ids, t.id] : ids.filter(x => x !== t.id))}
                      className="accent-[#4648d4]" />
                    {t.title} <span className="text-[#767586]">({t.trade})</span>
                  </label>
                ))}
              </div>
            </div>
            <textarea
              value={recertReason}
              onChange={e => setRecertReason(e.target.value)}
              placeholder="Reason (e.g. complaint details)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
            <div className="flex gap-2.5 pt-2">
              <button onClick={() => setRecertOpen(false)} className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors">Cancel</button>
              <button onClick={() => requireRecertification.mutate()} disabled={recertTestIds.length === 0 || requireRecertification.isPending}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm">
                {requireRecertification.isPending ? 'Saving...' : 'Confirm'}
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
    teal:   'bg-[#d1fae5] text-[#059669] border-emerald-200 hover:bg-[#a7f3d0]',
    blue:   'bg-[#e1e0ff] text-[#4648d4] border-[#c7c4d7] hover:bg-[#c7c4d7]',
    purple: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
    orange: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
    red:    'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm',
        colorMap[color] || colorMap.teal
      )}
    >
      <Icon size={13} />
      {loading ? 'Processing...' : label}
    </button>
  );
}
