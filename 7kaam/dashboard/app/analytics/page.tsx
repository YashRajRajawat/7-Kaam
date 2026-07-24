'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { TradeBreakdown, CityBreakdown, ScoreBand, CertificationDataPoint } from '@/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { BarChart3, TrendingUp, MapPin, Layers, Sparkles } from 'lucide-react';

const TRADE_COLORS = ['#4648d4', '#2563eb', '#7c3aed', '#d97706', '#059669', '#0891b2'];

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

  const chartTooltipStyle = {
    background: '#ffffff',
    border: '1px solid #e0e3e5',
    borderRadius: 12,
    fontSize: 12,
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    color: '#191c1e',
  };

  const totalCerts = certData?.reduce((acc, curr) => acc + curr.count, 0) || 0;
  const topCity = cityData?.[0]?.city || 'Bangalore';

  return (
    <DashboardShell>
      <div className="space-y-6 fade-in">
        {/* Header & Highlights */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-[#4648d4]" />
              <h1 className="text-xl font-bold text-[#191c1e] tracking-tight">Analytics Detail & Platform Metrics</h1>
            </div>
            <p className="text-xs text-[#565e74] mt-1">
              Operational intelligence across worker trade distribution, skill scores, and city performance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-center">
              <p className="text-[10px] text-[#767586] uppercase font-bold">30d Total Certs</p>
              <p className="text-base font-extrabold text-[#4648d4]">{totalCerts}</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-center">
              <p className="text-[10px] text-[#767586] uppercase font-bold">Top Performing City</p>
              <p className="text-base font-extrabold text-[#7c3aed]">{topCity}</p>
            </div>
          </div>
        </div>

        {/* Certifications velocity line chart */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f2f4f6]">
            <div>
              <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                <TrendingUp size={18} className="text-[#059669]" />
                Certifications Issued Velocity (30-Day Trend)
              </h3>
              <p className="text-xs text-[#565e74]">Daily volume of issued digital KaamCards.</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={certData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#565e74' }} axisLine={false} tickLine={false}
                tickFormatter={v => v.substring(5)} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: '#565e74' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#4648d4" strokeWidth={3} dot={{ fill: '#4648d4', r: 4 }} name="Certs Issued" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 2-Column Grid: Trade Distribution & Score Histogram */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trade breakdown */}
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f2f4f6]">
              <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                <Layers size={18} className="text-[#2563eb]" />
                Workers by Skilled Trade
              </h3>
              <span className="text-xs text-[#767586]">Trade Count</span>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={tradeData?.map(d => ({ ...d, trade: d.trade.replace('_', ' ') })) || []} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#565e74' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="trade" type="category" tick={{ fontSize: 10, fill: '#191c1e' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Workers">
                  {tradeData?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={TRADE_COLORS[index % TRADE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Score distribution */}
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#f2f4f6]">
              <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
                <Sparkles size={18} className="text-[#7c3aed]" />
                Skill Score Frequency Distribution
              </h3>
              <span className="text-xs text-[#767586]">Score Range</span>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={scoreBands || []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#565e74' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#565e74' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(70,72,212,0.04)' }} />
                <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Workers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Performance Table */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f2f4f6] flex items-center justify-between bg-[#f7f9fb]">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[#059669]" />
              <h3 className="text-base font-bold text-[#191c1e]">City Operational Performance</h3>
            </div>
            <span className="text-xs text-[#767586]">Regional breakdown</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e3e5] bg-[#f2f4f6]">
                  {['City', 'Total Workers', 'Certified Workers', 'Certification Rate', 'Avg Score'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-[#767586] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e3e5]">
                {cityData?.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-[#767586] text-xs">No city data logged yet.</td></tr>
                ) : (
                  cityData?.map(city => {
                    const certRate = city.workers > 0 ? Math.round((city.certified / city.workers) * 100) : 0;
                    return (
                      <tr key={city.city} className="hover:bg-[#f7f9fb] transition-colors">
                        <td className="px-6 py-4 text-[#191c1e] font-bold text-xs flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
                          {city.city}
                        </td>
                        <td className="px-6 py-4 text-[#565e74] text-xs font-medium">{city.workers}</td>
                        <td className="px-6 py-4 text-[#565e74] text-xs font-medium">{city.certified}</td>
                        <td className="px-6 py-4 text-xs">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[#f2f4f6] rounded-full overflow-hidden w-28">
                              <div
                                className="h-full bg-[#4648d4] rounded-full"
                                style={{ width: `${certRate}%` }}
                              />
                            </div>
                            <span className="text-[#191c1e] font-bold w-10 text-right">{certRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-[#4648d4]">{city.avgScore}/100</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
