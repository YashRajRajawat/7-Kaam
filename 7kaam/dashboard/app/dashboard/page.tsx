'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import {
  Users, Award, TrendingUp, MapPin,
  Zap, BarChart2, Activity,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import type { AnalyticsOverview, CertificationDataPoint, ScoreBand, ScoringLog } from '@/types';
import { timeAgo } from '@/lib/utils';

const TIER_COLORS: Record<string, string> = {
  EXPERT: '#a78bfa',
  GOLD:   '#fbbf24',
  SILVER: '#94a3b8',
  BRONZE: '#fb923c',
};

const SIGNAL_ICONS: Record<string, string> = {
  VIDEO: '🎬',
  TEST: '📝',
  WORK_HISTORY: '💼',
  FINAL: '⭐',
};

function KpiCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="glass-card p-5 flex items-start gap-4 fade-in hover:border-white/15 transition-colors">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-[#6b7280] text-xs font-medium">{title}</p>
        <p className="text-2xl font-black text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-[#4b5563] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: overview } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data),
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
    color: TIER_COLORS[t.tier],
  })) || [];

  return (
    <DashboardShell>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Workers" value={overview?.totalWorkers ?? '—'} sub="Registered on platform" icon={Users} color="bg-[#0F6E56]" />
        <KpiCard title="Certified Today" value={overview?.certifiedToday ?? '—'} sub="KaamCards issued today" icon={Award} color="bg-purple-600" />
        <KpiCard title="Average Score" value={overview?.averageScore ? `${overview.averageScore}/100` : '—'} sub="Platform-wide average" icon={TrendingUp} color="bg-blue-600" />
        <KpiCard title="Active Cities" value={overview?.activeCities ?? '—'} sub="Cities with workers" icon={MapPin} color="bg-orange-600" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Tier Pie */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} className="text-[#0F6E56]" />
            <h3 className="text-sm font-semibold text-white">Tier Distribution</h3>
          </div>
          {tierData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {tierData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {tierData.map(t => (
                  <span key={t.name} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    {t.name} ({t.value})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-[#4b5563] text-sm">No data yet</div>
          )}
        </div>

        {/* Score Histogram */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-[#0F6E56]" />
            <h3 className="text-sm font-semibold text-white">Score Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={185}>
            <BarChart data={scoreBands || []} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="count" fill="#0F6E56" radius={[4, 4, 0, 0]} name="Workers" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Certifications Line Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-[#0F6E56]" />
            <h3 className="text-sm font-semibold text-white">Certifications (30 days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={185}>
            <LineChart data={certData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v.substring(5)} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="count" stroke="#0F6E56" strokeWidth={2} dot={false}
                name="Certs Issued" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
        {(scoringLogs && scoringLogs.length > 0) ? (
          <div className="space-y-2">
            {scoringLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                <span className="text-base">{SIGNAL_ICONS[log.signalType] || '📊'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium">
                    {log.signalType.replace('_', ' ')} — Score: {Math.round(log.outputScore)}/100
                  </p>
                  <p className="text-[10px] text-[#4b5563]">{log.notes}</p>
                </div>
                <span className="text-[10px] text-[#4b5563] flex-shrink-0">{timeAgo(log.scoredAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[#4b5563] text-sm">No activity yet. Onboard workers to see scoring events here.</div>
        )}
      </div>
    </DashboardShell>
  );
}
