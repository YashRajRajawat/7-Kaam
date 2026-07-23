'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { KaamCard } from '@/types';
import { cn, tierColor, tradeLabel, formatDate } from '@/lib/utils';
import { XCircle, Copy, CheckCheck, ExternalLink } from 'lucide-react';

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

  const statusStyle = { VALID: 'text-green-400 bg-green-500/10', EXPIRED: 'text-orange-400 bg-orange-500/10', REVOKED: 'text-red-400 bg-red-500/10' };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white">KaamCards</h2>
          <p className="text-xs text-[#6b7280]">{cards?.length ?? 0} certificates issued</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Worker', 'Trade', 'Score', 'Tier', 'Issued', 'Expires', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5563] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5 animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-4"><div className="h-3 bg-white/5 rounded w-3/4" /></td>)}
                  </tr>
                ))
              ) : cards?.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#4b5563]">No KaamCards issued yet.</td></tr>
              ) : (
                cards?.map(card => {
                  const status = cardStatus(card);
                  const breakdown = card.scoreBreakdown;
                  return (
                    <tr key={card.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-xs text-white font-medium">{card.worker?.fullName || '—'}</td>
                      <td className="px-4 py-3 text-xs text-[#94a3b8]">{tradeLabel(card.worker?.trade || '')}</td>
                      <td className="px-4 py-3 text-xs font-bold text-white">{Math.round(breakdown?.finalScore || 0)}/100</td>
                      <td className="px-4 py-3">
                        {breakdown?.tier && (
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', tierColor(breakdown.tier))}>
                            {breakdown.tier}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6b7280]">{formatDate(card.issuedAt)}</td>
                      <td className="px-4 py-3 text-xs text-[#6b7280]">{formatDate(card.expiresAt)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', statusStyle[status])}>
                          ● {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => copy(card)} title="Copy verification link"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#6b7280] hover:text-white transition-colors">
                            {copiedId === card.id ? <CheckCheck size={12} className="text-green-400" /> : <Copy size={12} />}
                          </button>
                          <a href={`https://7kaam.in/verify/${card.qrToken}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#6b7280] hover:text-white transition-colors" title="View verification page">
                            <ExternalLink size={12} />
                          </a>
                          {!card.isRevoked && (
                            <button onClick={() => setRevokeId(card.id)} title="Revoke"
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-[#6b7280] transition-colors">
                              <XCircle size={12} />
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

      {/* Revoke Modal */}
      {revokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-bold text-white mb-2">Revoke KaamCard</h3>
            <p className="text-xs text-[#6b7280] mb-4">Enter a reason for revocation. This action cannot be undone.</p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for revocation..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-red-500 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => { setRevokeId(null); setReason(''); }} className="flex-1 py-2 rounded-lg bg-white/5 text-white text-sm">Cancel</button>
              <button onClick={() => revoke.mutate(revokeId)} disabled={!reason || revoke.isPending}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-all">
                {revoke.isPending ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
