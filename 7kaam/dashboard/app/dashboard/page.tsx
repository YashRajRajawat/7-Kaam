'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Users, Award, TrendingUp, MapPin,
  Zap, BarChart2, Activity, Plus, ShieldCheck, ArrowUpRight, ClipboardCheck,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import type { AnalyticsOverview, CertificationDataPoint, PendingReviewResponse, ScoreBand, ScoringLog } from '@/types';
import { timeAgo, formatScore } from '@/lib/utils';

const TIER_COLORS: Record<string, string> = {
  EXPERT: '#7c3aed',
  GOLD:   '#d97706',
  SILVER: '#64748b',
  BRONZE: '#ea580c',
};

const SIGNAL_BADGES: Record<string, { label: string; icon: string; style: string }> = {
  VIDEO: { label: 'Video Evaluation', icon: '🎬', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  TEST: { label: 'Trade Test', icon: '📝', style: 'bg-purple-50 text-purple-700 border-purple-200' },
  WORK_HISTORY: { label: 'Work History', icon: '💼', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  FINAL: { label: 'KaamCard Certified', icon: '⭐', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function KpiCard({ title, value, sub, icon: Icon, color, trend }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color: string; trend?: string;
}) {
  return (
    <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[#767586] uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-extrabold text-[#191c1e] mt-1 tracking-tight">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-[#f2f4f6] flex items-center justify-between text-xs">
        <span className="text-[#565e74] font-medium">{sub}</span>
        {trend && (
          <span className="flex items-center text-[#059669] font-bold text-[11px] bg-[#d1fae5] px-2.5 py-0.5 rounded-full border border-emerald-200">
            <ArrowUpRight size={12} className="mr-0.5" />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const qc = useQueryClient();

  const { data: overview } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data),
  });

  const { data: pendingReview } = useQuery<PendingReviewResponse>({
    queryKey: ['admin', 'pending-review'],
    queryFn: () => api.get('/admin/workers/pending-review').then(r => r.data),
  });

  const quickIssue = useMutation({
    mutationFn: (workerId: string) => api.post(`/admin/workers/${workerId}/issue-kaamcard`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pending-review'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'overview'] });
    },
  });

  const { data: certData } = useQuery<CertificationDataPoint[]>({
    queryKey: ['analytics', 'certs-over-time'],
    queryFn: () => api.get('/analytics/certifications-over-time').then(r => r.data),
  });

  const { data: scoreBands } = useQuery<ScoreBand[]>({
    queryKey: ['analytics', 'score-dist'],
    queryFn: () => api.get('/analytics/score-distribution').then(r => r.data),
  });

  const { data: scoringLogs } = useQuery<ScoringLog[]>({
    queryKey: ['scoring-logs'],
    queryFn: () => api.get('/workers').then(r => r.data.data?.flatMap((w: { scoringLogs?: ScoringLog[] }) => w.scoringLogs || []) || []),
  });

  const tierData = overview?.tierBreakdown?.map(t => ({
    name: t.tier,
    value: t.count,
    color: TIER_COLORS[t.tier] || '#4648d4',
  })) || [];

  const customTooltipStyle = {
    background: '#ffffff',
    border: '1px solid #e0e3e5',
    borderRadius: 12,
    fontSize: 12,
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    color: '#191c1e',
  };

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto space-y-6 fade-in">
        {/* Welcome Banner Card (Stitch Spec) */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#e1e0ff] text-[#4648d4] border border-[#c0c1ff] mb-2 inline-block">
              Enterprise Dashboard
            </span>
            <h2 className="text-2xl font-bold text-[#191c1e] tracking-tight">Welcome back to 7 Kaam Workspace</h2>
            <p className="text-sm text-[#565e74] mt-1 max-w-2xl">
              Real-time monitoring of blue-collar skill verifications, AI scoring engine logs, and KaamCard issuing.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/workers/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={16} />
              Onboard Worker
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold border border-[#e0e3e5] transition-all"
            >
              <BarChart2 size={16} className="text-[#4648d4]" />
              View Analytics
            </Link>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Total Workers"
            value={overview?.totalWorkers ?? '—'}
            sub="Registered on platform"
            icon={Users}
            color="bg-[#4648d4]"
            trend="+12% this mo"
          />
          <KpiCard
            title="Certified Today"
            value={overview?.certifiedToday ?? '—'}
            sub="KaamCards issued today"
            icon={Award}
            color="bg-[#7c3aed]"
            trend="Active"
          />
          <KpiCard
            title="Average Score"
            value={overview?.averageScore ? `${overview.averageScore}/100` : '—'}
            sub="Platform-wide average"
            icon={TrendingUp}
            color="bg-[#2563eb]"
            trend="High Quality"
          />
          <KpiCard
            title="Active Cities"
            value={overview?.activeCities ?? '—'}
            sub="Regional operational hubs"
            icon={MapPin}
            color="bg-[#d97706]"
            trend="Expanded"
          />
        </div>

        {/* Secondary KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Workers', value: overview?.activeWorkers },
            { label: 'Suspended', value: overview?.suspendedWorkers },
            { label: 'KaamCards Issued', value: overview?.totalKaamCardsIssued },
            { label: 'New This Week', value: overview?.newRegistrationsThisWeek },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#e0e3e5] rounded-xl px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold text-[#767586] uppercase tracking-wider">{label}</p>
              <p className="text-xl font-black text-[#191c1e] mt-0.5">{value ?? '—'}</p>
            </div>
          ))}
        </div>

        {/* Pending KaamCard Review Queue */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f2f4f6]">
            <div>
              <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                <ClipboardCheck size={18} className="text-[#4648d4]" />
                Pending KaamCard Review
              </h3>
              <p className="text-xs text-[#565e74] mt-0.5">
                {pendingReview?.total ?? 0} workers with at least one assessment, ready for a KaamCard decision.
              </p>
            </div>
            <Link href="/workers" className="text-xs text-[#4648d4] hover:underline font-bold">
              View All Workers →
            </Link>
          </div>

          {pendingReview && pendingReview.workers.length > 0 ? (
            <div className="space-y-2.5">
              {pendingReview.workers.slice(0, 5).map(w => (
                <div key={w.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5]">
                  <div className="min-w-0">
                    <Link href={`/workers/${w.id}`} className="text-xs font-bold text-[#191c1e] hover:text-[#4648d4] transition-colors">
                      {w.fullName}
                    </Link>
                    <p className="text-[11px] text-[#767586] mt-0.5">
                      {w.trade} · {w.city} · Score: <span className="font-bold text-[#4648d4]">{formatScore(w.finalScore)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => quickIssue.mutate(w.id)}
                    disabled={quickIssue.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d1fae5] hover:bg-[#a7f3d0] text-[#059669] text-xs font-bold border border-emerald-200 transition-all disabled:opacity-50 flex-shrink-0 ml-3"
                  >
                    <Award size={13} />
                    {quickIssue.isPending ? 'Issuing...' : 'Issue KaamCard'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[#767586] text-xs">No workers awaiting KaamCard review right now.</div>
          )}
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tier Pie Chart */}
          <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f2f4f6]">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-[#4648d4]" />
                <h3 className="text-base font-bold text-[#191c1e]">Tier Distribution</h3>
              </div>
              <span className="text-xs text-[#767586] font-medium">Verified Tiers</span>
            </div>

            {tierData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={tierData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {tierData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2.5 justify-center mt-3 pt-3 border-t border-[#f2f4f6]">
                  {tierData.map(t => (
                    <span key={t.name} className="flex items-center gap-1.5 text-xs text-[#565e74] font-semibold bg-[#f2f4f6] px-2.5 py-1 rounded-lg border border-[#e0e3e5]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                      {t.name} ({t.value})
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-[#767586] text-xs">No tier data available</div>
            )}
          </div>

          {/* Score Histogram */}
          <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f2f4f6]">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-[#4648d4]" />
                <h3 className="text-base font-bold text-[#191c1e]">Score Distribution</h3>
              </div>
              <span className="text-xs text-[#767586]">0 - 100 Bands</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={scoreBands || []} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#565e74' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#565e74' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(70,72,212,0.04)' }} />
                <Bar dataKey="count" fill="#4648d4" radius={[6, 6, 0, 0]} name="Workers" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Certifications Line Chart */}
          <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f2f4f6]">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-[#4648d4]" />
                <h3 className="text-base font-bold text-[#191c1e]">Certification Velocity</h3>
              </div>
              <span className="text-xs text-[#767586]">Last 30 Days</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={certData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#565e74' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v.substring(5)} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#565e74' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#4648d4" strokeWidth={2.5} dot={{ fill: '#4648d4', r: 4 }}
                  name="Certs Issued" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f2f4f6]">
            <div>
              <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#059669]" />
                Recent Platform Verification & Evaluation Logs
              </h3>
              <p className="text-xs text-[#565e74] mt-0.5">Real-time evaluation logs across video AI, tests, and work history.</p>
            </div>
            <Link href="/workers" className="text-xs text-[#4648d4] hover:underline font-bold">
              View All Workers →
            </Link>
          </div>

          {(scoringLogs && scoringLogs.length > 0) ? (
            <div className="space-y-2.5">
              {scoringLogs.slice(0, 8).map((log) => {
                const badge = SIGNAL_BADGES[log.signalType] || { label: log.signalType, icon: '📊', style: 'bg-slate-100 text-slate-700' };
                return (
                  <div key={log.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] hover:border-[#c7c4d7] transition-all">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-lg flex-shrink-0">{badge.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${badge.style}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-[#191c1e] font-bold">
                            Score: <span className="text-[#4648d4] font-extrabold">{Math.round(log.outputScore)}/100</span>
                          </span>
                        </div>
                        <p className="text-xs text-[#565e74] mt-1 truncate">{log.notes || 'Automated verification check'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#767586] font-medium flex-shrink-0 ml-4">
                      {timeAgo(log.scoredAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-[#767586] text-xs">
              No recent scoring events logged. Onboard a new worker to generate real-time AI scoring entries.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
