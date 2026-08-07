'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { Report, Worker } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { ShieldAlert, CheckCircle2, UserX, Ban } from 'lucide-react';

const STATUS_FILTERS = ['', 'OPEN', 'DISMISSED', 'ACTIONED'];

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-800 border-amber-200',
  DISMISSED: 'bg-gray-100 text-gray-600 border-gray-200',
  ACTIONED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

type ActionType = 'suspend' | 'recert' | 'revoke';

export default function ModerationPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [actionModal, setActionModal] = useState<{ report: Report; type: ActionType } | null>(null);
  const [reason, setReason] = useState('');
  const [recertTestIds, setRecertTestIds] = useState<string[]>([]);

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ['admin', 'reports', statusFilter],
    queryFn: () => api.get('/admin/reports', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data),
  });

  const { data: testsData } = useQuery({
    queryKey: ['tests', 'active'],
    queryFn: () => api.get('/tests', { params: { isActive: 'true' } }).then(r => r.data),
    enabled: actionModal?.type === 'recert',
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => api.post(`/admin/reports/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });

  function closeModal() {
    setActionModal(null);
    setReason('');
    setRecertTestIds([]);
  }

  const runAction = useMutation({
    mutationFn: async () => {
      if (!actionModal) return;
      const { report, type } = actionModal;
      if (type === 'suspend') {
        await api.post(`/admin/workers/${report.workerId}/suspend`, { reason });
      } else if (type === 'recert') {
        await api.post(`/admin/workers/${report.workerId}/require-recertification`, { testIds: recertTestIds, reason });
      } else if (type === 'revoke') {
        const worker = await api.get<Worker>(`/workers/${report.workerId}`).then(r => r.data);
        const latestCard = worker.kaamCards
          ? [...worker.kaamCards].sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())[0]
          : undefined;
        if (!latestCard) throw new Error('This worker has no active KaamCard to revoke.');
        await api.post(`/admin/kaamcards/${latestCard.id}/revoke`, { reason });
      }
      await api.post(`/admin/reports/${report.id}/action`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'reports'] }); closeModal(); },
  });

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto space-y-6 fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-sm">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e] tracking-tight">Moderation Queue</h2>
              <p className="text-xs text-[#565e74]">{reports?.length ?? 0} reports{statusFilter ? ` · ${statusFilter}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {STATUS_FILTERS.map(s => (
              <button
                key={s || 'ALL'}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-bold border transition-all',
                  statusFilter === s ? 'bg-[#4648d4] text-white border-[#4648d4]' : 'bg-[#f2f4f6] text-[#565e74] border-[#e0e3e5] hover:bg-[#e6e8ea]'
                )}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e3e5] bg-[#f2f4f6]">
                  {['Worker', 'Reporter', 'Reason', 'Description', 'Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-[#767586] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e5]">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-[#767586] text-xs">Loading reports...</td></tr>
                ) : !reports || reports.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-[#767586] text-xs">No reports{statusFilter ? ` with status ${statusFilter}` : ''}.</td></tr>
                ) : (
                  reports.map(report => (
                    <tr key={report.id} className="hover:bg-[#f7f9fb] transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/workers/${report.workerId}`} className="text-xs font-bold text-[#4648d4] hover:underline">
                          {report.worker?.fullName || report.workerId}
                        </Link>
                        <p className="text-[11px] text-[#767586]">{report.worker?.trade} · {report.worker?.city}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#565e74]">
                        {report.reporterCustomer?.fullName || '—'}
                        <p className="text-[11px] text-[#767586] font-mono">{report.reporterCustomer?.phoneNumber}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#191c1e]">{report.reason}</td>
                      <td className="px-6 py-4 text-xs text-[#565e74] max-w-[220px] truncate" title={report.description}>{report.description || '—'}</td>
                      <td className="px-6 py-4 text-xs text-[#767586]">{formatDate(report.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border', STATUS_STYLE[report.status])}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {report.status === 'OPEN' ? (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => dismiss.mutate(report.id)} title="Dismiss"
                              className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#565e74] transition-all">
                              <CheckCircle2 size={14} />
                            </button>
                            <button onClick={() => setActionModal({ report, type: 'suspend' })} title="Suspend Worker"
                              className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-red-100 hover:text-red-700 text-[#565e74] transition-all">
                              <UserX size={14} />
                            </button>
                            <button onClick={() => setActionModal({ report, type: 'recert' })} title="Require Recertification"
                              className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-amber-100 hover:text-amber-700 text-[#565e74] transition-all">
                              <ShieldAlert size={14} />
                            </button>
                            <button onClick={() => setActionModal({ report, type: 'revoke' })} title="Revoke KaamCard"
                              className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-red-100 hover:text-red-700 text-[#565e74] transition-all">
                              <Ban size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#767586]">No action</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
              {actionModal.type === 'suspend' && <><UserX size={18} className="text-red-600" /> Suspend {actionModal.report.worker?.fullName}?</>}
              {actionModal.type === 'recert' && <><ShieldAlert size={18} className="text-amber-600" /> Require Recertification</>}
              {actionModal.type === 'revoke' && <><Ban size={18} className="text-red-600" /> Revoke KaamCard</>}
            </h3>

            {actionModal.type === 'recert' && (
              <div>
                <label className="block text-xs font-bold text-[#565e74] mb-1.5">Tests worker must retake</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5]">
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
            )}

            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason (required)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] transition-colors resize-none"
            />
            {runAction.isError && (
              <p className="text-xs text-red-600 font-semibold">
                {(runAction.error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
                  || (runAction.error as Error)?.message
                  || 'Action failed.'}
              </p>
            )}
            <div className="flex gap-2.5 pt-2">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors">Cancel</button>
              <button
                onClick={() => runAction.mutate()}
                disabled={!reason || (actionModal.type === 'recert' && recertTestIds.length === 0) || runAction.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
              >
                {runAction.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
