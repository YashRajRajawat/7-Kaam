'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { admin, accessToken, refreshToken } = res.data;
      login(admin, accessToken, refreshToken);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Invalid work email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb] px-4 relative overflow-hidden">
      {/* Background Soft Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#4648d4] opacity-5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#4648d4] mb-3.5 shadow-lg shadow-[#4648d4]/25 text-white font-extrabold text-2xl tracking-tight">
            7K
          </div>
          <h1 className="text-2xl font-extrabold text-[#191c1e] tracking-tight">7 Kaam Enterprise Portal</h1>
          <p className="text-[#565e74] mt-1 text-xs font-medium">Sign in to manage skill verifications & workforce data</p>
        </div>

        {/* Corporate Sign In Card */}
        <div className="bg-white border border-[#e0e3e5] rounded-2xl p-8 shadow-sm fade-in">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#191c1e] mb-1.5">Work Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#191c1e]">Password</label>
                <a href="#" onClick={e => e.preventDefault()} className="text-[11px] font-bold text-[#4648d4] hover:underline">
                  Forgot?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-[#191c1e] text-xs placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] focus:bg-white transition-all font-medium"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 accent-[#4648d4] rounded" />
                <span className="text-xs text-[#565e74] font-medium">Keep me signed in</span>
              </label>
            </div>

            <button
              id="signin-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>

          {/* Security Badge Footer */}
          <div className="mt-6 pt-5 border-t border-[#f2f4f6] flex items-center justify-center gap-2 text-[11px] text-[#767586] font-medium">
            <ShieldCheck size={14} className="text-[#059669]" />
            <span>256-Bit Encrypted & SOC-2 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
