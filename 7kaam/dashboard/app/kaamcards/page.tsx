'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { KaamCard } from '@/types';
import { cn, tierColor, tradeLabel, formatDate } from '@/lib/utils';
import { XCircle, Copy, CheckCheck, ExternalLink, Award, ShieldCheck } from 'lucide-react';

export default function KaamCardsPage() {
  const qc = useQueryClient();
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: cards, isLoading } = useQuery<KaamCard[]>({
    queryKey: ['kaamcards'],
    queryFn: () => api.get('/kaamcards').then(r => r.data),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.post(`/kaamcards/${id}/revoke`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kaamcards'] }); setRevokeId(null); setReason(''); },
  });

  function copy(card: KaamCard) {
    navigator.clipboard.writeText(`https://7kaam.in/verify/${card.qrToken}`);
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
      <div className="space-y-6 fade-in">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4648d4] flex items-center justify-center text-white font-bold shadow-sm">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e] tracking-tight">KaamCard Digital Verification System</h2>
              <p className="text-xs text-[#565e74]">{cards?.length ?? 0} total digital certificates issued & recorded</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#d1fae5] border border-emerald-200 text-[#059669] text-xs font-bold">
            <ShieldCheck size={16} />
            <span>QR Verification Active</span>
          </div>
        </div>

        {/* KaamCards Table */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e3e5] bg-[#f2f4f6]">
                  {['Worker Name', 'Skilled Trade', 'Final Score', 'Tier', 'Issue Date', 'Expiry Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-[#767586] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e5]">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-6 py-4"><div className="h-3 bg-[#f2f4f6] rounded w-3/4" /></td>)}
                    </tr>
                  ))
                ) : cards?.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-[#767586] text-xs">No KaamCards issued yet.</td></tr>
                ) : (
                  cards?.map(card => {
                    const status = cardStatus(card);
                    const breakdown = card.scoreBreakdown;
                    return (
                      <tr key={card.id} className="hover:bg-[#f7f9fb] transition-colors group">
                        <td className="px-6 py-4 font-bold text-xs text-[#191c1e] group-hover:text-[#4648d4] transition-colors">
                          {card.worker?.fullName || '—'}
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
                        <td className="px-6 py-4 text-xs text-[#767586]">{formatDate(card.expiresAt)}</td>
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
                              href={`https://7kaam.in/verify/${card.qrToken}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e1e0ff] text-[#565e74] hover:text-[#4648d4] transition-colors"
                              title="View public verification page"
                            >
                              <ExternalLink size={14} />
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

        {/* Revoke Certificate Modal */}
        {revokeId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-md mx-4 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2 text-red-600">
                <XCircle size={18} />
                Revoke KaamCard Certificate
              </h3>
              <p className="text-xs text-[#565e74]">
                Provide a reason for revoking this certificate. This will invalidate the QR code verification page immediately.
              </p>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Reason for revocation (e.g., Audit failure, Fraudulent credentials)..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-red-500 resize-none"
              />
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => { setRevokeId(null); setReason(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => revoke.mutate(revokeId)}
                  disabled={!reason || revoke.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
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
