'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuthStore } from '@/lib/store';
import {
  User,
  Sliders,
  Shield,
  Bell,
  Key,
  Database,
  CheckCircle2,
  Save,
  Cpu,
  Globe,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const { admin } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'general' | 'scoring' | 'api' | 'notifications'>('general');
  const [saved, setSaved] = useState(false);

  // Settings State
  const [videoWeight, setVideoWeight] = useState('35');
  const [testWeight, setTestWeight] = useState('40');
  const [historyWeight, setHistoryWeight] = useState('25');
  const [expertThreshold, setExpertThreshold] = useState('85');
  const [goldThreshold, setGoldThreshold] = useState('70');
  const [silverThreshold, setSilverThreshold] = useState('45');
  
  const [autoApproveVerified, setAutoApproveVerified] = useState(true);
  const [revocationAlerts, setRevocationAlerts] = useState(true);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-[#191c1e] flex items-center gap-2 tracking-tight">
              <Sliders size={20} className="text-[#4648d4]" />
              Platform Settings & Control Center
            </h2>
            <p className="text-xs text-[#565e74] mt-1">
              Configure AI scoring parameters, threshold limits, API connections, and administrator controls.
            </p>
          </div>
          {saved && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#d1fae5] border border-emerald-200 text-[#059669] text-xs font-bold animate-pulse">
              <CheckCircle2 size={16} />
              <span>Settings saved successfully!</span>
            </div>
          )}
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex border-b border-[#e0e3e5] gap-1 overflow-x-auto">
          {[
            { id: 'general', label: 'Admin Profile & Regional', icon: User },
            { id: 'scoring', label: 'AI Scoring Engine', icon: Cpu },
            { id: 'api', label: 'API & Database Integrations', icon: Key },
            { id: 'notifications', label: 'Security & Alerts', icon: Bell },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-[#4648d4] text-[#4648d4] bg-[#e1e0ff]/30'
                    : 'border-transparent text-[#565e74] hover:text-[#191c1e] hover:bg-[#f2f4f6]'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* TAB 1: GENERAL & PROFILE */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#191c1e] flex items-center gap-2 border-b border-[#f2f4f6] pb-3">
                  <User size={18} className="text-[#4648d4]" />
                  Administrator Account
                </h3>
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-[#565e74] mb-1 font-bold">Logged in Email</label>
                    <input
                      type="text"
                      disabled
                      value={admin?.email || 'admin@7kaam.in'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-[#191c1e] font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[#565e74] mb-1 font-bold">Assigned Role</label>
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-bold">
                      <Shield size={16} />
                      <span>{admin?.role || 'SUPER ADMIN'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#565e74] mb-1 font-bold">Operational Jurisdiction</label>
                    <input
                      type="text"
                      defaultValue="Pan-India Headquarters (Bangalore Hub)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-[#191c1e] focus:border-[#4648d4] outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#191c1e] flex items-center gap-2 border-b border-[#f2f4f6] pb-3">
                  <Globe size={18} className="text-[#4648d4]" />
                  Active Operational Cities
                </h3>
                <p className="text-xs text-[#565e74]">
                  Cities configured for worker onboarding, local trade evaluation, and employer hiring.
                </p>
                <div className="space-y-2">
                  {['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune'].map(city => (
                    <div key={city} className="flex items-center justify-between p-3 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] text-xs text-[#191c1e]">
                      <span className="font-bold">{city}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#d1fae5] text-[#059669] border border-emerald-200">
                        Operational
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI SCORING ENGINE */}
          {activeTab === 'scoring' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-[#191c1e] flex items-center gap-2 border-b border-[#f2f4f6] pb-3">
                  <Sparkles size={18} className="text-[#4648d4]" />
                  Tri-Signal Score Weighting Engine
                </h3>
                <p className="text-xs text-[#565e74]">
                  7-Kaam combines 3 evaluation signals into a unified score (0-100). Total must equal 100%.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] space-y-2">
                    <label className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5">
                      🎬 Practical Video Score
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={videoWeight}
                        onChange={e => setVideoWeight(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e3e5] text-[#191c1e] text-sm font-extrabold focus:border-[#4648d4] outline-none"
                      />
                      <span className="text-xs text-[#565e74] font-bold">%</span>
                    </div>
                    <p className="text-[11px] text-[#767586]">CV Computer Vision posture & safety checks</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] space-y-2">
                    <label className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5">
                      📝 Trade MCQ Test
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={testWeight}
                        onChange={e => setTestWeight(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e3e5] text-[#191c1e] text-sm font-extrabold focus:border-[#4648d4] outline-none"
                      />
                      <span className="text-xs text-[#565e74] font-bold">%</span>
                    </div>
                    <p className="text-[11px] text-[#767586]">Groq LLaMA 3.3 automated reasoning evaluation</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] space-y-2">
                    <label className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5">
                      💼 Work History & Ratings
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={historyWeight}
                        onChange={e => setHistoryWeight(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#e0e3e5] text-[#191c1e] text-sm font-extrabold focus:border-[#4648d4] outline-none"
                      />
                      <span className="text-xs text-[#565e74] font-bold">%</span>
                    </div>
                    <p className="text-[11px] text-[#767586]">Verified employer tenure & ratings</p>
                  </div>
                </div>
              </div>

              {/* Tier Cutoffs */}
              <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#191c1e] flex items-center gap-2 border-b border-[#f2f4f6] pb-3">
                  <Shield size={18} className="text-[#4648d4]" />
                  KaamCard Certification Tier Cutoffs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-700">EXPERT TIER</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#565e74]">Min Score:</span>
                      <input
                        type="number"
                        value={expertThreshold}
                        onChange={e => setExpertThreshold(e.target.value)}
                        className="w-20 px-2.5 py-1 rounded-lg bg-white border border-purple-300 text-[#191c1e] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800">GOLD TIER</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#565e74]">Min Score:</span>
                      <input
                        type="number"
                        value={goldThreshold}
                        onChange={e => setGoldThreshold(e.target.value)}
                        className="w-20 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-[#191c1e] text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-slate-700">SILVER TIER</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#565e74]">Min Score:</span>
                      <input
                        type="number"
                        value={silverThreshold}
                        onChange={e => setSilverThreshold(e.target.value)}
                        className="w-20 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[#191c1e] text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: API & DATABASE */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#191c1e] flex items-center gap-2 border-b border-[#f2f4f6] pb-3">
                  <Database size={18} className="text-[#4648d4]" />
                  Connected Services Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center font-bold text-xs">
                        DB
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#191c1e]">Supabase PostgreSQL</p>
                        {/* Read from the environment rather than hard-coded, so the
                            project URL is not baked into the repository. */}
                        <p className="text-[11px] text-[#767586]">
                          {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Configured via backend environment'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#d1fae5] text-[#059669] border border-emerald-200">
                      Connected (Active)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                        AI
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#191c1e]">Groq LLaMA 3.3 LLM API</p>
                        {/* Never render key material, not even a prefix — the key
                            lives in the backend environment and stays there. */}
                        <p className="text-[11px] text-[#767586]">Key held server-side (Versatile Mode)</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                      Operational
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & ALERTS */}
          {activeTab === 'notifications' && (
            <div className="bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-[#191c1e] flex items-center gap-2 border-b border-[#f2f4f6] pb-3">
                <Bell size={18} className="text-[#4648d4]" />
                Security & Platform Automation
              </h3>
              <div className="space-y-4 text-xs">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] cursor-pointer hover:bg-white transition-colors">
                  <div>
                    <p className="font-bold text-[#191c1e]">Auto-issue KaamCard upon score completion</p>
                    <p className="text-[#767586] text-[11px]">Automatically generate digital KaamCard once final score ≥ 45</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoApproveVerified}
                    onChange={e => setAutoApproveVerified(e.target.checked)}
                    className="w-4 h-4 accent-[#4648d4]"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#f7f9fb] border border-[#e0e3e5] cursor-pointer hover:bg-white transition-colors">
                  <div>
                    <p className="font-bold text-[#191c1e]">Email alerts on KaamCard revocation</p>
                    <p className="text-[#767586] text-[11px]">Notify regional reviewers when a card is flagged or revoked</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={revocationAlerts}
                    onChange={e => setRevocationAlerts(e.target.checked)}
                    className="w-4 h-4 accent-[#4648d4]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Save Action */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
