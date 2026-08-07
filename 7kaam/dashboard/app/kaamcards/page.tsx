'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { KaamCard, Worker } from '@/types';
import { cn, tierColor, tradeLabel, formatDate } from '@/lib/utils';
import { XCircle, Copy, CheckCheck, ExternalLink, Award, ShieldCheck, Download, CheckCircle2, Clock } from 'lucide-react';

export default function KaamCardsPage() {
  const qc = useQueryClient();
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);

  // 1. Fetch Issued KaamCards
  const { data: cards, isLoading: isLoadingCards } = useQuery<KaamCard[]>({
    queryKey: ['kaamcards'],
    queryFn: () => api.get('/kaamcards').then(r => r.data),
  });

  // 2. Fetch All Workers to find Pending Verification Queue
  const { data: workersResponse, isLoading: isLoadingWorkers } = useQuery<any>({
    queryKey: ['workers', 'all'],
    queryFn: () => api.get('/workers', { params: { limit: 100 } }).then(r => r.data),
  });

  const workerList: Worker[] = Array.isArray(workersResponse)
    ? workersResponse
    : workersResponse?.data || [];

  // Filter unverified workers who have no active KaamCard yet
  const pendingQueue = workerList.filter(w => !w.kaamCards || w.kaamCards.length === 0 || w.kaamCards.every(c => c.isRevoked));

  // Issue KaamCard Mutation
  const issueKaamCard = useMutation({
    mutationFn: (workerId: string) => api.post(`/admin/workers/${workerId}/issue-kaamcard`),
    onSuccess: (res, workerId) => {
      qc.invalidateQueries({ queryKey: ['kaamcards'] });
      qc.invalidateQueries({ queryKey: ['workers'] });
      const w = workerList.find(x => x.id === workerId);
      setIssueSuccess(`Official KaamCard verified and issued for ${w?.fullName || 'Worker'}! Status is now VALID.`);
      setTimeout(() => setIssueSuccess(null), 4000);
    },
  });

  // Revoke Mutation
  const revoke = useMutation({
    mutationFn: (id: string) => api.post(`/kaamcards/${id}/revoke`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kaamcards'] }); setRevokeId(null); setReason(''); },
  });

  function copy(card: KaamCard) {
    const url = `http://localhost:8000/api/v1/verify/${card.qrToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function cardStatus(card: KaamCard): 'VALID' | 'EXPIRED' | 'REVOKED' {
    if (card.isRevoked) return 'REVOKED';
    if (new Date(card.expiresAt) < new Date()) return 'EXPIRED';
    return 'VALID';
  }

  const statusStyle = {
    VALID: 'text-[#059669] bg-[#d1fae5] border-emerald-200',
    EXPIRED: 'text-amber-700 bg-amber-50 border-amber-200',
    REVOKED: 'text-red-700 bg-red-50 border-red-200',
  };

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto space-y-8 fade-in">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4648d4] flex items-center justify-center text-white font-bold shadow-sm">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e] tracking-tight">KaamCard Digital Verification & Issuance System</h2>
              <p className="text-xs text-[#565e74]">
                {cards?.length ?? 0} active digital certificates issued · {pendingQueue.length} pending admin review
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#d1fae5] border border-emerald-200 text-[#059669] text-xs font-bold">
            <ShieldCheck size={16} />
            <span>QR Verification Engine Active</span>
          </div>
        </div>

        {/* Success Alert Banner */}
        {issueSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-sm fade-in">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span>{issueSuccess}</span>
          </div>
        )}

        {/* SECTION 1: Pending Admin Verification Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-600" />
              <h3 className="text-sm font-extrabold text-[#191c1e] uppercase tracking-wider">
                1. Workers Pending Verification ({pendingQueue.length})
              </h3>
            </div>
            <span className="text-xs text-[#767586]">Admin review required before issuing valid KaamCard</span>
          </div>

          <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e3e5] bg-[#f8f9fa]">
                    {['Worker Name & Phone', 'Skilled Trade', 'City', 'Score & Tier', 'Verification Status', 'Action'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-bold text-[#767586] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e3e5]">
                  {isLoadingWorkers ? (
                    <tr><td colSpan={6} className="text-center py-6 text-xs text-[#767586]">Loading pending queue...</td></tr>
                  ) : pendingQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-xs text-[#059669] font-semibold bg-emerald-50/50">
                        ✓ All registered workers have been verified and issued KaamCards!
                      </td>
                    </tr>
                  ) : (
                    pendingQueue.map(worker => (
                      <tr key={worker.id} className="hover:bg-[#f7f9fb] transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-xs text-[#191c1e]">{worker.fullName}</p>
                          <p className="text-[11px] font-mono text-[#565e74]">{worker.phoneNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#565e74]">{tradeLabel(worker.trade)}</td>
                        <td className="px-6 py-4 text-xs text-[#767586]">{worker.city}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#191c1e]">{Math.round(worker.finalScore || 80)}/100</span>
                            {worker.tier && (
                              <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', tierColor(worker.tier))}>
                                {worker.tier}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ⏳ Pending Admin Review
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => issueKaamCard.mutate(worker.id)}
                            disabled={issueKaamCard.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold transition-all shadow-sm active:scale-[0.98]"
                          >
                            <CheckCircle2 size={14} /> Verify & Issue KaamCard
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

        {/* SECTION 2: Issued Digital KaamCards Table */}
        <div className="space-y-3 pt-4 border-t border-[#e0e3e5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-[#4648d4]" />
              <h3 className="text-sm font-extrabold text-[#191c1e] uppercase tracking-wider">
                2. Issued & Certified KaamCards ({cards?.length ?? 0})
              </h3>
            </div>
            <span className="text-xs text-[#767586]">Active digital certificates accessible via Mobile Apps & QR Codes</span>
          </div>

          <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e3e5] bg-[#f2f4f6]">
                    {['Worker Name & Phone', 'Skilled Trade', 'Final Score', 'Tier', 'Issue Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-[#767586] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e3e5]">
                  {isLoadingCards ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-6 py-4"><div className="h-3 bg-[#f2f4f6] rounded w-3/4" /></td>)}
                      </tr>
                    ))
                  ) : cards?.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-[#767586] text-xs">No KaamCards issued yet. Click "Verify & Issue" above to issue certificates.</td></tr>
                  ) : (
                    cards?.map(card => {
                      const status = cardStatus(card);
                      const breakdown = card.scoreBreakdown;
                      const verifyUrl = `http://localhost:8000/api/v1/verify/${card.qrToken}`;
                      const pdfUrl = card.pdfUrl || `http://localhost:8000/api/v1/kaamcards/${card.workerId}/pdf`;
                      return (
                        <tr key={card.id} className="hover:bg-[#f7f9fb] transition-colors group">
                          <td className="px-6 py-4 font-bold text-xs text-[#191c1e] group-hover:text-[#4648d4] transition-colors">
                            <p>{card.worker?.fullName || '—'}</p>
                            <p className="text-[11px] font-mono text-[#565e74] font-normal">{card.worker?.phoneNumber}</p>
                          </td>
                          <td className="px-6 py-4 text-xs text-[#565e74] font-semibold">{tradeLabel(card.worker?.trade || '')}</td>
                          <td className="px-6 py-4 text-xs font-black text-[#191c1e]">{Math.round(breakdown?.finalScore || 0)}/100</td>
                          <td className="px-6 py-4">
                            {breakdown?.tier && (
                              <span className={cn('px-2.5 py-0.5 rounded text-[10px] font-bold border', tierColor(breakdown.tier))}>
                                {breakdown.tier}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-[#767586]">{formatDate(card.issuedAt)}</td>
                          <td className="px-6 py-4">
                            <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border', statusStyle[status])}>
                              ● {status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copy(card)}
                                title="Copy verification link"
                                className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e1e0ff] text-[#565e74] hover:text-[#4648d4] transition-colors"
                              >
                                {copiedId === card.id ? <CheckCheck size={14} className="text-[#059669]" /> : <Copy size={14} />}
                              </button>
                              <a
                                href={verifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e1e0ff] text-[#565e74] hover:text-[#4648d4] transition-colors"
                                title="View public QR verification JSON/API"
                              >
                                <ExternalLink size={14} />
                              </a>
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white transition-colors"
                                title="Download PDF KaamCard Certificate"
                              >
                                <Download size={14} />
                              </a>
                              {!card.isRevoked && (
                                <button
                                  onClick={() => setRevokeId(card.id)}
                                  title="Revoke Certificate"
                                  className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-red-100 text-[#565e74] hover:text-red-700 transition-colors"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Revocation Modal */}
        {revokeId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#e0e3e5] shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <XCircle size={24} />
                <h3 className="text-lg font-bold text-[#191c1e]">Revoke KaamCard Certificate</h3>
              </div>
              <p className="text-xs text-[#565e74]">
                This will immediately invalidate the QR verification token and mark this card as REVOKED across all public endpoints and mobile apps.
              </p>
              <div>
                <label className="block text-xs font-bold text-[#191c1e] mb-1">Reason for Revocation *</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Identity discrepancy, failed re-verification audit..."
                  className="w-full px-3 py-2 border border-[#e0e3e5] rounded-xl text-xs text-[#191c1e] focus:outline-none focus:border-red-500 h-24 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRevokeId(null)}
                  className="px-4 py-2 rounded-xl border border-[#e0e3e5] text-xs font-bold text-[#565e74] hover:bg-[#f2f4f6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => revoke.mutate(revokeId)}
                  disabled={!reason.trim() || revoke.isPending}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  {revoke.isPending ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
