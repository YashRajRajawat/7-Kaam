'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { TradeBreakdown, CityBreakdown, ScoreBand, CertificationDataPoint } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

export default function AnalyticsPage() {
  const { data: certData } = useQuery<CertificationDataPoint[]>({
    queryKey: ['analytics', 'certs-over-time'],
    queryFn: () => api.get('/analytics/certifications-over-time').then(r => r.data),
  });

  const { data: tradeData } = useQuery<TradeBreakdown[]>({
    queryKey: ['analytics', 'by-trade'],
    queryFn: () => api.get('/analytics/by-trade').then(r => r.data),
  });

  const { data: scoreBands } = useQuery<ScoreBand[]>({
    queryKey: ['analytics', 'score-dist'],
    queryFn: () => api.get('/analytics/score-distribution').then(r => r.data),
  });

  const { data: cityData } = useQuery<CityBreakdown[]>({
    queryKey: ['analytics', 'by-city'],
    queryFn: () => api.get('/analytics/by-city').then(r => r.data),
  });

  const chartStyle = { background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 };

  return (
    <DashboardShell>
      <div className="space-y-5">
        {/* Certs over time */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Certifications Issued — Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={certData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false}
                tickFormatter={v => v.substring(5)} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartStyle} />
              <Line type="monotone" dataKey="count" stroke="#0F6E56" strokeWidth={2.5} dot={false} name="Certs Issued" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Workers by trade */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Workers by Trade</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tradeData?.map(d => ({ ...d, trade: d.trade.replace('_', ' ') })) || []} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="trade" type="category" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={chartStyle} />
                <Bar dataKey="count" fill="#0F6E56" radius={[0, 4, 4, 0]} name="Workers" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Score distribution */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Score Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreBands || []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" fill="#0F6E56" radius={[4, 4, 0, 0]} name="Workers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Breakdown Table */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">City Breakdown</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['City', 'Workers', 'Certified', 'Cert Rate', 'Avg Score'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#4b5563] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cityData?.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-[#4b5563] text-xs">No city data available.</td></tr>
              ) : (
                cityData?.map(city => (
                  <tr key={city.city} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-white font-medium text-xs">{city.city}</td>
                    <td className="px-4 py-3 text-[#94a3b8] text-xs">{city.workers}</td>
                    <td className="px-4 py-3 text-[#94a3b8] text-xs">{city.certified}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0F6E56] rounded-full"
                            style={{ width: `${city.workers > 0 ? (city.certified / city.workers) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-[#6b7280] w-8 text-right">
                          {city.workers > 0 ? `${Math.round((city.certified / city.workers) * 100)}%` : '0%'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-white">{city.avgScore}/100</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
