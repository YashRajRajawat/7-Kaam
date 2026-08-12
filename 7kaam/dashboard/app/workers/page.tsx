'use client';

import { Suspense, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { Worker, PaginatedResponse } from '@/types';
import { cn, tierColor, statusColor, tradeLabel, formatScore, formatDate } from '@/lib/utils';

import {
  Plus, Search, ChevronLeft, ChevronRight, Eye,
  UserX, UserCheck, Award, Users, Filter, Pencil, Trash2,
} from 'lucide-react';

const TRADES = ['', 'ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER'];
const TIERS = ['', 'BRONZE', 'SILVER', 'GOLD', 'EXPERT'];
const STATUSES = ['', 'PENDING', 'ACTIVE', 'SUSPENDED'];

/**
 * Reading ?search= makes this component client-only, so Next requires it to sit
 * behind a Suspense boundary or the route cannot be prerendered.
 */
export default function WorkersPage() {
  return (
    <Suspense fallback={
      <DashboardShell>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#4648d4] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardShell>
    }>
      <WorkersDirectory />
    </Suspense>
  );
}

function WorkersDirectory() {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  // Seeded from ?search= so the Topbar's search lands here pre-filtered.
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [trade, setTrade] = useState('');
  const [tier, setTier] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [suspendTarget, setSuspendTarget] = useState<Worker | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const [editTarget, setEditTarget] = useState<Worker | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    trade: '',
    city: '',
    locality: '',
    status: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);

  const limit = 10;

  const { data, isLoading } = useQuery<PaginatedResponse<Worker>>({
    queryKey: ['workers', search, trade, tier, status, page],
    queryFn: () =>
      api.get('/workers', { params: { search, trade, tier, status, page, limit } })
         .then(r => r.data),
    placeholderData: prev => prev,
  });

  const suspend = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/workers/${id}/suspend`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
      setSuspendTarget(null);
      setSuspendReason('');
      toast.success('Worker suspended successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to suspend worker');
    },
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => api.post(`/admin/workers/${id}/reactivate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Worker reactivated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to reactivate worker');
    },
  });

  const updateWorker = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editForm }) =>
      api.patch(`/workers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
      setEditTarget(null);
      toast.success('Worker details updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update worker');
    },
  });

  const deleteWorker = useMutation({
    mutationFn: (id: string) => api.delete(`/workers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workers'] });
      setDeleteTarget(null);
      toast.success('Worker deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to delete worker');
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto space-y-6 fade-in">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4648d4] flex items-center justify-center text-white font-bold shadow-sm">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e] tracking-tight">Worker & Team Directory</h2>
              <p className="text-xs text-[#565e74]">{data?.total ?? 0} registered skilled workers</p>
            </div>
          </div>
          <Link
            href="/workers/new"
            id="onboard-worker-btn"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus size={16} />
            Onboard New Worker
          </Link>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#767586]" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, phone, city..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-xs text-[#191c1e] placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] transition-all"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter size={14} className="text-[#767586] ml-1 hidden sm:block" />
              {[
                { value: trade, onChange: setTrade, options: TRADES, label: 'Trade' },
                { value: tier,  onChange: setTier,  options: TIERS,  label: 'Tier' },
                { value: status, onChange: setStatus, options: STATUSES, label: 'Status' },
              ].map(({ value, onChange, options, label }) => (
                <select
                  key={label}
                  value={value}
                  onChange={e => { onChange(e.target.value); setPage(1); }}
                  className="px-3 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-xs text-[#191c1e] focus:outline-none focus:border-[#4648d4] cursor-pointer"
                >
                  <option value="" className="bg-white">All {label}s</option>
                  {options.filter(Boolean).map(o => (
                    <option key={o} value={o} className="bg-white">{tradeLabel(o)}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        </div>

        {/* Workers Data Table */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e3e5] bg-[#f2f4f6]">
                  {['Worker Info', 'Trade', 'City', 'Score & Tier', 'Status', 'KaamCard', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-[#767586] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e5]">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-3 bg-[#f2f4f6] rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#767586] text-xs">
                      No matching workers found. Try adjusting filters or onboard a new worker.
                    </td>
                  </tr>
                ) : (
                  data?.data?.map(worker => (
                    <tr key={worker.id} className="hover:bg-[#f7f9fb] transition-colors group">
                      {/* Avatar + Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#4648d4] flex items-center justify-center flex-shrink-0 text-white font-black text-xs shadow-sm">
                            {worker.fullName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[#191c1e] text-xs group-hover:text-[#4648d4] transition-colors">{worker.fullName}</p>
                            <p className="text-[11px] text-[#767586] mt-0.5">{worker.phoneNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#565e74] font-semibold">{tradeLabel(worker.trade)}</td>
                      <td className="px-6 py-4 text-xs text-[#565e74]">{worker.city}</td>
                      
                      {/* Score & Tier */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#191c1e]">{formatScore(worker.finalScore)}</span>
                          {worker.tier && (
                            <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', tierColor(worker.tier))}>
                              {worker.tier}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold', statusColor(worker.status))}>
                            ● {worker.status}
                          </span>
                          {worker.underReview && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Under Review
                            </span>
                          )}
                        </div>
                      </td>

                      {/* KaamCard Status */}
                      <td className="px-6 py-4">
                        {(() => {
                          const activeCard = worker.kaamCards?.find(c => !c.isRevoked);
                          if (activeCard || worker.kaamCardIssuedAt) {
                            return (
                              <div className="flex items-center gap-1.5 text-[#059669] text-xs font-bold bg-[#d1fae5] px-2.5 py-1 rounded-full border border-emerald-200 w-fit">
                                <Award size={14} />
                                <span>✓ Issued ({formatDate(activeCard?.issuedAt || worker.kaamCardIssuedAt)})</span>
                              </div>
                            );
                          }
                          return (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              ⏳ Pending Verification
                            </span>
                          );
                        })()}
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => router.push(`/workers/${worker.id}`)}
                            className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e1e0ff] hover:text-[#4648d4] text-[#565e74] transition-all"
                            title="View Full Profile"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => {
                              setEditTarget(worker);
                              setEditForm({
                                fullName: worker.fullName || '',
                                phoneNumber: worker.phoneNumber || '',
                                trade: worker.trade || 'ELECTRICIAN',
                                city: worker.city || '',
                                locality: worker.locality || '',
                                status: worker.status || 'ACTIVE',
                              });
                            }}
                            className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-amber-100 hover:text-amber-700 text-[#565e74] transition-all"
                            title="Edit Worker Details"
                          >
                            <Pencil size={14} />
                          </button>

                          {worker.status === 'SUSPENDED' ? (
                            <button
                              onClick={() => reactivate.mutate(worker.id)}
                              disabled={reactivate.isPending}
                              className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-emerald-100 hover:text-emerald-700 text-[#565e74] transition-all disabled:opacity-50"
                              title="Reactivate Worker"
                            >
                              <UserCheck size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setSuspendTarget(worker)}
                              className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-amber-100 hover:text-amber-700 text-[#565e74] transition-all"
                              title="Suspend Worker"
                            >
                              <UserX size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteTarget(worker)}
                            className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-red-100 hover:text-red-700 text-[#565e74] transition-all"
                            title="Delete Worker Permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#e0e3e5] bg-[#f7f9fb]">
              <p className="text-xs text-[#767586]">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, data?.total || 0)} of {data?.total}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl bg-white border border-[#e0e3e5] hover:bg-[#f2f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} className="text-[#191c1e]" />
                </button>
                <span className="px-3 py-1 text-xs font-bold text-[#191c1e]">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-xl bg-white border border-[#e0e3e5] hover:bg-[#f2f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} className="text-[#191c1e]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Worker Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
              <Pencil size={18} className="text-[#4648d4]" />
              Edit Worker Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#565e74] font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] focus:outline-none focus:border-[#4648d4]"
                />
              </div>
              <div>
                <label className="block text-[#565e74] font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phoneNumber}
                  onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] focus:outline-none focus:border-[#4648d4]"
                />
              </div>
              <div>
                <label className="block text-[#565e74] font-bold mb-1">Trade</label>
                <select
                  value={editForm.trade}
                  onChange={e => setEditForm({ ...editForm, trade: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] focus:outline-none focus:border-[#4648d4]"
                >
                  {TRADES.filter(Boolean).map(t => (
                    <option key={t} value={t}>{tradeLabel(t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#565e74] font-bold mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] focus:outline-none focus:border-[#4648d4]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
              <div>
                <label className="block text-[#565e74] font-bold mb-1">City</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] focus:outline-none focus:border-[#4648d4]"
                />
              </div>
              <div>
                <label className="block text-[#565e74] font-bold mb-1">Locality</label>
                <input
                  type="text"
                  value={editForm.locality}
                  onChange={e => setEditForm({ ...editForm, locality: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] focus:outline-none focus:border-[#4648d4]"
                />
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updateWorker.mutate({ id: editTarget.id, data: editForm })}
                disabled={updateWorker.isPending}
                className="flex-1 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
              >
                {updateWorker.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Worker Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 size={18} />
              Delete {deleteTarget.fullName} Permanently?
            </h3>
            <p className="text-xs text-[#565e74]">
              This action cannot be undone. All associated certificates, test submissions, and history logs for this worker will be permanently removed from the system.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteWorker.mutate(deleteTarget.id)}
                disabled={deleteWorker.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
              >
                {deleteWorker.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-amber-600 flex items-center gap-2">
              <UserX size={18} />
              Suspend {suspendTarget.fullName}?
            </h3>
            <p className="text-xs text-[#565e74]">
              The worker will immediately disappear from customer discovery and cannot take new tests until reactivated.
            </p>
            <textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension (required)..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => { setSuspendTarget(null); setSuspendReason(''); }}
                className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => suspend.mutate({ id: suspendTarget.id, reason: suspendReason })}
                disabled={!suspendReason || suspend.isPending}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
              >
                {suspend.isPending ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
